import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authorize, corsHeaders } from '../_shared/authorize.ts'

const DUMMY_PLATFORM_MAP: Record<string, string> = {
  'dummy-facebook': 'facebook',
  'dummy-instagram': 'instagram',
  'dummy-twitter': 'twitter',
  'dummy-linkedin': 'linkedin',
  'dummy-tiktok': 'tiktok',
  'dummy-threads': 'threads',
  'dummy-bluesky': 'bluesky',
  'dummy-pinterest': 'pinterest',
}

async function resolveAccountPlatforms(
  accountIds: string[],
  profileId: string | null,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Record<string, string>> {
  const mapping: Record<string, string> = {}

  // Map dummy accounts directly
  const realIds: string[] = []
  for (const id of accountIds) {
    if (DUMMY_PLATFORM_MAP[id]) {
      mapping[id] = DUMMY_PLATFORM_MAP[id]
    } else {
      realIds.push(id)
    }
  }

  // Fetch real account platforms from GetLate
  if (realIds.length > 0 && profileId) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/getlate-accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'list', profileId }),
      })
      if (res.ok) {
        const { accounts } = await res.json()
        for (const acc of (accounts || [])) {
          if (realIds.includes(acc.id || acc._id)) {
            mapping[acc.id || acc._id] = acc.platform || 'unknown'
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch GetLate accounts:', e)
    }
  }

  // Fallback: any unmapped IDs get 'unknown'
  for (const id of accountIds) {
    if (!mapping[id]) mapping[id] = 'unknown'
  }

  return mapping
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Authenticate: require valid JWT or service role
        try {
          await authorize(req, { allowServiceRole: true })
        } catch (authError) {
          if (authError instanceof Response) {
            send({ step: 'error', message: 'Unauthorized' })
            controller.close()
            return
          }
          throw authError
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        // Helper: fetch with retry for transient AI gateway errors
        async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const res = await fetch(url, options)
            if (res.ok || res.status < 500 || attempt === maxRetries) return res
            console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})...`)
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          }
          return fetch(url, options) // fallback
        }

        const { articleId, ruleId } = await req.json()
        if (!articleId || !ruleId) {
          send({ step: 'error', message: 'Missing articleId or ruleId' })
          controller.close()
          return
        }

        // Load article
        send({ step: 'loading', message: 'Loading article...' })
        const { data: article, error: artErr } = await supabase
          .from('rss_feed_items')
          .select('*, rss_feeds!inner(company_id)')
          .eq('id', articleId)
          .single()

        if (artErr || !article) {
          send({ step: 'error', message: 'Article not found' })
          controller.close()
          return
        }

        // Load rule
        const { data: rule, error: ruleErr } = await supabase
          .from('automation_rules')
          .select('*')
          .eq('id', ruleId)
          .single()

        if (ruleErr || !rule) {
          send({ step: 'error', message: 'Automation rule not found' })
          controller.close()
          return
        }

        const companyId = (article as any).rss_feeds.company_id

        // Fetch company voice settings for AI review check
        const { data: voiceSettingsData } = await supabase
          .from('company_voice_settings')
          .select('voice_mode, require_ai_review')
          .eq('company_id', companyId)
          .maybeSingle()

        const requireAiReview = voiceSettingsData?.require_ai_review || false
        const voiceMode = voiceSettingsData?.voice_mode || 'default'
        const isAiMode = ['custom_dynamic_ai', 'custom_strict_ai', 'ai_decides'].includes(voiceMode)

        // Fetch company's GetLate profile ID for account resolution
        const { data: companyData } = await supabase
          .from('companies')
          .select('getlate_profile_id')
          .eq('id', companyId)
          .single()
        const profileId = companyData?.getlate_profile_id || null

        const accountMapping = await resolveAccountPlatforms(
          rule.account_ids || [],
          profileId,
          supabaseUrl,
          serviceRoleKey,
        )
        const platforms = [...new Set(Object.values(accountMapping).filter(p => p !== 'unknown'))]
        if (platforms.length === 0) {
          send({ step: 'error', message: 'No platforms configured on this rule' })
          controller.close()
          return
        }

        // Skip fullContent in automation calls — title + description are sufficient
        // and large content payloads cause AI gateway issues in edge-to-edge calls

        // Step 1: Generate strategy
        send({ step: 'strategy', message: 'Generating content strategy...' })
        const strategyRes = await fetchWithRetry(`${supabaseUrl}/functions/v1/generate-social-post`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'strategy',
            title: article.title,
            description: article.description,
            link: article.link,
            fullContent: null,
            objective: rule.objective === 'auto' ? 'reach' : rule.objective,
            platforms,
          }),
        })

        if (!strategyRes.ok) {
          send({ step: 'error', message: 'Strategy generation failed' })
          controller.close()
          return
        }

        const { strategy } = await strategyRes.json()
        if (!strategy) {
          send({ step: 'error', message: 'Empty strategy returned' })
          controller.close()
          return
        }
        send({ step: 'strategy_done', message: 'Strategy generated' })

        // Step 2: Generate posts
        send({ step: 'posts', message: 'Generating social posts...' })
        const postsRes = await fetchWithRetry(`${supabaseUrl}/functions/v1/generate-social-post`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'posts',
            title: article.title,
            description: article.description,
            link: article.link,
            fullContent: null,
            imageUrl: article.image_url,
            objective: rule.objective === 'auto' ? 'reach' : rule.objective,
            platforms,
            approvedStrategy: strategy,
          }),
        })

        if (!postsRes.ok) {
          send({ step: 'error', message: 'Post generation failed' })
          controller.close()
          return
        }

        const { posts: platformContents } = await postsRes.json()
        if (!platformContents || Object.keys(platformContents).length === 0) {
          send({ step: 'error', message: 'No posts were generated' })
          controller.close()
          return
        }
        send({ step: 'posts_done', message: `Generated posts for ${Object.keys(platformContents).join(', ')}` })

        // Step 3: Execute action
        // If AI review is required and we're in an AI voice mode, force draft
        let effectiveAction = rule.action
        if (isAiMode && requireAiReview && rule.action === 'publish') {
          effectiveAction = 'draft'
          send({ step: 'action', message: 'AI voice mode active with review required — creating draft instead of publishing...' })
        } else {
          send({ step: 'action', message: `Executing action: ${effectiveAction}...` })
        }

        const { data: companyUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('company_id', companyId)
          .limit(1)
          .single()

        let creatorId = companyUser?.id
        // Fallback: use the company creator if no profile found
        if (!creatorId) {
          const { data: company } = await supabase
            .from('companies')
            .select('created_by')
            .eq('id', companyId)
            .single()
          creatorId = company?.created_by
        }

        let draftId: string | null = null

        const isDummy = (rule.account_ids || []).every((id: string) => id.startsWith('dummy-'))

        if (effectiveAction === 'publish' && !isDummy) {
          // Publish directly to GetLate using ONLY the rule's selected account IDs
          const { data: companyForPublish } = await supabase
            .from('companies')
            .select('getlate_profile_id')
            .eq('id', companyId)
            .single()

          const pubProfileId = companyForPublish?.getlate_profile_id
          if (!pubProfileId) {
            send({ step: 'error', message: 'Company has no connected profile. Connect accounts first.' })
            controller.close()
            return
          }

          // Use the first available platform content as the main text
          const contentText = Object.values(platformContents)[0] || ''
          const mediaItems = article.image_url ? [{ url: article.image_url, type: 'image' }] : []

          // Build explicit per-account platforms array to prevent cross-posting
          const platformsPayload = (rule.account_ids || []).map((accountId: string) => {
            // Try to find platform-specific content for this account
            const accountPlatform = accountMapping[accountId] || 'unknown'
            const specificContent = platformContents[accountPlatform] || contentText
            return { accountId, content: specificContent, platform: accountPlatform }
          })

          console.log(`Publishing to GetLate: profileId=${pubProfileId}, accounts=${(rule.account_ids || []).join(',')}`)

          const publishRes = await fetchWithRetry(`${supabaseUrl}/functions/v1/getlate-posts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'create',
              profileId: pubProfileId,
              accountIds: rule.account_ids,
              content: contentText,
              mediaItems,
              publishNow: true,
              platforms: platformsPayload,
              source: 'automation',
              objective: rule.objective === 'auto' ? 'reach' : rule.objective,
            }),
          })

          const publishData = await publishRes.json()
          if (!publishRes.ok || !publishData.success) {
            send({ step: 'error', message: publishData.error || 'Failed to publish to GetLate' })
            controller.close()
            return
          }

          const postId = publishData.post?._id || publishData.post?.id || null
          send({ step: 'published', message: `Published successfully (post ID: ${postId})`, postId })

          // Update feed item with post ID
          await supabase
            .from('rss_feed_items')
            .update({ status: 'posted', processed_at: new Date().toISOString(), post_id: postId })
            .eq('id', articleId)

        } else if (effectiveAction === 'draft' || isDummy) {
          if (!creatorId) {
            send({ step: 'error', message: 'No user found in company for draft creation' })
            controller.close()
            return
          }
          // Create draft
          const { data: draft, error: draftErr } = await supabase
            .from('post_drafts')
            .insert({
              company_id: companyId,
              created_by: creatorId || '00000000-0000-0000-0000-000000000000',
              title: article.title || 'Untitled',
              post_source: 'automation',
              selected_article_id: articleId,
              objective: rule.objective === 'auto' ? 'reach' : rule.objective,
              selected_account_ids: rule.account_ids,
              strategy,
              platform_contents: platformContents,
              image_url: article.image_url || null,
              compose_phase: 'editing',
              status: 'draft',
              current_step: 4,
            })
            .select('id')
            .single()

          if (draftErr) {
            send({ step: 'error', message: `Draft creation failed: ${draftErr.message}` })
            controller.close()
            return
          }
          draftId = draft?.id || null
        } else if (effectiveAction === 'send_approval') {
          for (const email of (rule.approval_emails || [])) {
            const { data: approval } = await supabase
              .from('post_approvals')
              .insert({
                company_id: companyId,
                created_by: creatorId || '00000000-0000-0000-0000-000000000000',
                recipient_email: email,
                platform_contents: platformContents,
                article_title: article.title || null,
                article_link: article.link || null,
                article_image_url: article.image_url || null,
                objective: rule.objective === 'auto' ? 'reach' : rule.objective,
                image_url: article.image_url || null,
                selected_account_ids: rule.account_ids,
              })
              .select('id, token')
              .single()

            // Send email
            const resendKey = Deno.env.get('RESEND_API_KEY')
            if (resendKey && approval) {
              const appUrl = Deno.env.get('SITE_URL') || 'https://social.longtale.ai'
              const approvalUrl = `${appUrl}/approve/${approval.token}`
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: 'Longtale.ai <noreply@longtale.ai>',
                  to: [email],
                  subject: `Review & Approve Posts${article.title ? `: ${article.title}` : ''}`,
                  html: `<p>An automation has generated posts for your approval.</p><a href="${approvalUrl}">Review & Approve</a>`,
                }),
              })
            }
          }
        }

        // Log automation
        await supabase.from('automation_logs').insert({
          company_id: companyId,
          rule_id: rule.id,
          rule_name: rule.name,
          feed_id: article.feed_id,
          feed_item_id: articleId,
          article_title: article.title || null,
          article_link: article.link || null,
          action: rule.action,
          result: 'success',
          details: { platforms, triggered_by: 'manual', draft_id: draftId },
        })

        // Only mark article as posted if it was actually published (not just drafted)
        const isDraftOnly = effectiveAction === 'draft' || (rule.account_ids || []).every((id: string) => id.startsWith('dummy-'))
        if (!isDraftOnly) {
          await supabase
            .from('rss_feed_items')
            .update({ status: 'posted', processed_at: new Date().toISOString() })
            .eq('id', articleId)
        }

        // Send in-app notification to the company user
        if (creatorId) {
          const actionLabel = effectiveAction === 'draft' ? 'Draft created' : effectiveAction === 'send_approval' ? 'Sent for approval' : 'Completed';
          fetch(`${supabaseUrl}/functions/v1/send-in-app-notification`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: creatorId,
              title: '🤖 Automation Complete',
              body: `${actionLabel}: "${article.title || 'Untitled'}" on ${platforms.join(', ')}.`,
              actionUrl: draftId ? `/posts?draft=${draftId}` : '/automations/logs',
            }),
          }).catch(e => console.error('In-app notification error:', e))
        }

        send({
          step: 'complete',
          message: 'Automation complete!',
          action: rule.action,
          draftId,
          platforms,
        })
      } catch (err) {
        send({ step: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})
