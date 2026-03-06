/**
 * inbox-historical-sync — Self-chaining edge function for full historical inbox import.
 *
 * First call (user-initiated):  POST { companyId }
 *   → Creates job, fires self-chain for DM phase
 *
 * Subsequent calls (self-chain): POST { companyId, jobId, cursorState }
 *   → Processes one page of DMs or comments, then fires next chain
 *
 * Uses _shared/inbox-processing.ts for data writes (same as inbox-sync and getlate-webhook).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { fetchWithRetry } from '../_shared/fetch-utils.ts';
import {
  upsertContact,
  upsertConversation,
  insertMessageIfNew,
  linkArticleToConversation,
} from '../_shared/inbox-processing.ts';

const GETLATE_API_URL = 'https://getlate.dev/api/v1';
const PAGE_SIZE = 50;
const MAX_CHAIN_COUNT = 500;
const THROTTLE_MS = 200;
const DEADLINE_MS = 40_000; // 40s — leaves 5s buffer for DB writes + self-chain fire

interface CursorState {
  phase: 'dms' | 'comments' | 'complete';
  dmCursor: string | null;
  commentCursor: string | null;
  chainCount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const getlateApiKey = Deno.env.get('GETLATE_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { companyId, jobId, cursorState } = body;

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth: self-chain uses service role, user-initiated requires company membership
    if (jobId) {
      await authorize(req, { allowServiceRole: true, companyId });
    } else {
      await authorize(req, { allowServiceRole: true, companyId });
    }

    // First invocation — create job and start
    if (!jobId) {
      return await startHistoricalSync(supabase, supabaseUrl, supabaseServiceKey, companyId);
    }

    // Subsequent invocation — continue processing
    const startTime = Date.now();
    const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

    return await continueHistoricalSync(
      supabase, supabaseUrl, supabaseServiceKey, getlateApiKey,
      companyId, jobId, cursorState, pastDeadline,
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('inbox-historical-sync error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── First Call: Create Job ───────────────────────────────────

async function startHistoricalSync(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  companyId: string,
) {
  // Check for existing active historical_sync job
  const { data: existing } = await supabase
    .from('inbox_backfill_jobs')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('job_type', 'historical_sync')
    .in('status', ['pending', 'running'])
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Historical sync already in progress',
      jobId: existing[0].id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify company has a getlate_profile_id
  const { data: company } = await supabase
    .from('companies')
    .select('id, getlate_profile_id')
    .eq('id', companyId)
    .not('getlate_profile_id', 'is', null)
    .maybeSingle();

  if (!company) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Company not found or no GetLate profile linked',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create the job
  const initialCursor: CursorState = {
    phase: 'dms',
    dmCursor: null,
    commentCursor: null,
    chainCount: 0,
  };

  const { data: job, error } = await supabase
    .from('inbox_backfill_jobs')
    .insert({
      company_id: companyId,
      job_type: 'historical_sync',
      status: 'running',
      total_conversations: 0,
      classified_conversations: 0,
      synced_conversations: 0,
      synced_messages: 0,
      cursor_state: initialCursor,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;

  // Fire-and-forget self-chain
  selfChain(supabaseUrl, serviceKey, companyId, job.id, initialCursor);

  return new Response(JSON.stringify({
    success: true,
    jobId: job.id,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Subsequent Call: Process One Page ────────────────────────

async function continueHistoricalSync(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  apiKey: string,
  companyId: string,
  jobId: string,
  cursorState: CursorState,
  pastDeadline: () => boolean,
) {
  // Safety guard
  if (cursorState.chainCount >= MAX_CHAIN_COUNT) {
    await supabase
      .from('inbox_backfill_jobs')
      .update({
        status: 'completed',
        cursor_state: cursorState,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    console.log(`[historical-sync] Chain limit reached (${MAX_CHAIN_COUNT}), marking complete`);
    return jsonResponse({ success: true, status: 'completed', reason: 'max_chain_reached' });
  }

  // Get company's profile
  const { data: company } = await supabase
    .from('companies')
    .select('id, getlate_profile_id')
    .eq('id', companyId)
    .not('getlate_profile_id', 'is', null)
    .maybeSingle();

  if (!company) {
    await markFailed(supabase, jobId, 'Company or profile not found');
    return jsonResponse({ success: false, error: 'Company not found' }, 400);
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  let nextCursor = { ...cursorState, chainCount: cursorState.chainCount + 1 };

  try {
    if (cursorState.phase === 'dms') {
      nextCursor = await processDMPage(supabase, company, headers, pastDeadline, jobId, nextCursor);
    } else if (cursorState.phase === 'comments') {
      nextCursor = await processCommentPage(supabase, company, headers, pastDeadline, jobId, nextCursor);
    } else if (cursorState.phase === 'complete') {
      await completeJob(supabase, supabaseUrl, serviceKey, companyId, jobId);
      return jsonResponse({ success: true, status: 'completed' });
    }
  } catch (err) {
    console.error(`[historical-sync] Error in ${cursorState.phase} phase:`, err);
    // Don't fail the whole job on a single page error — advance to next phase
    if (cursorState.phase === 'dms') {
      nextCursor.phase = 'comments';
      nextCursor.dmCursor = null;
    } else if (cursorState.phase === 'comments') {
      nextCursor.phase = 'complete';
    }
  }

  // Save cursor state to DB for debuggability
  await supabase
    .from('inbox_backfill_jobs')
    .update({ cursor_state: nextCursor, updated_at: new Date().toISOString() })
    .eq('id', jobId);

  // Self-chain for next page
  if (nextCursor.phase !== 'complete') {
    selfChain(supabaseUrl, serviceKey, companyId, jobId, nextCursor);
  } else {
    // Final chain to run completion logic
    selfChain(supabaseUrl, serviceKey, companyId, jobId, nextCursor);
  }

  return jsonResponse({
    success: true,
    phase: nextCursor.phase,
    chainCount: nextCursor.chainCount,
  });
}

// ─── DM Page Processing ──────────────────────────────────────

async function processDMPage(
  supabase: ReturnType<typeof createClient>,
  company: { id: string; getlate_profile_id: string },
  headers: Record<string, string>,
  pastDeadline: () => boolean,
  jobId: string,
  cursor: CursorState,
): Promise<CursorState> {
  const params = new URLSearchParams({
    profileId: company.getlate_profile_id,
    limit: String(PAGE_SIZE),
  });
  if (cursor.dmCursor) params.set('cursor', cursor.dmCursor);

  const response = await fetchWithRetry(
    `${GETLATE_API_URL}/inbox/conversations?${params}`,
    { headers },
    pastDeadline,
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`conversations API returned ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const conversations = data.conversations || data.data || [];

  let syncedConvs = 0;
  let syncedMsgs = 0;

  for (const conv of conversations) {
    if (pastDeadline()) break;

    try {
      const contactId = await upsertContact(supabase, company.id, {
        platform: conv.platform || 'unknown',
        platformUserId: conv.id || 'unknown',
        username: conv.participantName,
        displayName: conv.participantName,
      });

      const convKey = `dm-${conv.platform}-${conv.id}`;
      const convResult = await upsertConversation(supabase, company.id, {
        platform: conv.platform || 'unknown',
        platformConversationId: convKey,
        type: 'dm',
        subject: conv.participantName || 'DM',
        contactId,
        lastMessageAt: conv.lastMessageTime || new Date().toISOString(),
        lastMessagePreview: (conv.lastMessage || '').slice(0, 200),
        unreadCount: conv.unreadCount || 0,
      });

      syncedConvs++;

      // Fetch messages for this conversation
      if (!pastDeadline()) {
        const msgsResponse = await fetchWithRetry(
          `${GETLATE_API_URL}/inbox/conversations/${conv.id}/messages?accountId=${conv.accountId}`,
          { headers },
          pastDeadline,
        );

        if (msgsResponse.ok) {
          const msgsData = await msgsResponse.json();
          const messages = msgsData.data || msgsData.messages || [];

          for (const msg of messages) {
            const platformMsgId = msg.id || msg._id || `${conv.id}-${msg.createdAt}`;
            const isFromUs = msg.isFromBrand || msg.direction === 'outbound' || msg.isOwn === true;

            const msgResult = await insertMessageIfNew(supabase, company.id, convResult.id, {
              platformMessageId: platformMsgId,
              contactId: isFromUs ? null : contactId,
              senderType: isFromUs ? 'agent' : 'contact',
              content: msg.text || msg.content || msg.message || '',
              contentType: msg.mediaUrl || msg.attachments?.length ? 'image' : 'text',
              mediaUrl: msg.mediaUrl,
              metadata: { raw: msg },
              createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
            });

            if (msgResult.inserted) syncedMsgs++;
          }
        }
      }

      // Throttle between conversations
      await new Promise(r => setTimeout(r, THROTTLE_MS));
    } catch (err) {
      console.error(`[historical-sync] DM ${conv.id} error:`, err);
    }
  }

  // Update progress counters
  await incrementProgress(supabase, jobId, syncedConvs, syncedMsgs);

  // Determine next cursor
  const nextDmCursor = data.pagination?.cursor || null;
  const hasMore = data.pagination?.hasMore === true && !!nextDmCursor;

  if (hasMore) {
    return { ...cursor, dmCursor: nextDmCursor };
  }

  // DMs done — move to comments phase
  return { ...cursor, phase: 'comments', dmCursor: null };
}

// ─── Comment Page Processing ─────────────────────────────────

async function processCommentPage(
  supabase: ReturnType<typeof createClient>,
  company: { id: string; getlate_profile_id: string },
  headers: Record<string, string>,
  pastDeadline: () => boolean,
  jobId: string,
  cursor: CursorState,
): Promise<CursorState> {
  const params = new URLSearchParams({
    profile: company.getlate_profile_id,
    limit: String(PAGE_SIZE),
  });
  if (cursor.commentCursor) params.set('cursor', cursor.commentCursor);

  const response = await fetchWithRetry(
    `${GETLATE_API_URL}/inbox/comments?${params}`,
    { headers },
    pastDeadline,
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`comments API returned ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const posts = data.data || data.posts || [];

  let syncedConvs = 0;
  let syncedMsgs = 0;

  // Collect posts with comments
  const postsWithComments: Array<{
    postId: string;
    accountId: string;
    platform: string;
    platformPostUrl?: string;
    content?: string;
  }> = [];

  for (const post of posts) {
    const commentCount = post.commentCount ?? post.comments ?? 0;
    if (commentCount > 0) {
      postsWithComments.push({
        postId: post.postId || post._id || post.id,
        accountId: post.accountId || post.account_id || post.socialAccountId,
        platform: post.platform || post.type,
        platformPostUrl: post.platformPostUrl || post.url || post.permalink,
        content: post.content || post.text || post.caption,
      });
    }
  }

  for (const post of postsWithComments) {
    if (pastDeadline()) break;

    try {
      const commentParams = new URLSearchParams({ postId: post.postId, accountId: post.accountId });
      const commentsResponse = await fetchWithRetry(
        `${GETLATE_API_URL}/inbox/comments/${post.postId}?${commentParams}`,
        { headers },
        pastDeadline,
      );

      if (!commentsResponse.ok) continue;

      const commentsData = await commentsResponse.json();
      const comments = commentsData.data || [];

      for (const comment of comments) {
        try {
          const contactId = await upsertContact(supabase, company.id, {
            platform: post.platform || 'unknown',
            platformUserId: comment.author?.id || 'unknown',
            username: comment.author?.handle,
            displayName: comment.author?.name,
            avatarUrl: comment.author?.profileUrl,
          });

          const convKey = `${post.platform}-${post.postId}`;
          const convResult = await upsertConversation(supabase, company.id, {
            platform: post.platform || 'unknown',
            platformConversationId: convKey,
            type: 'comment',
            subject: post.content ? post.content.slice(0, 100) : 'Comment thread',
            contactId,
            postId: post.postId,
            postUrl: post.platformPostUrl,
            lastMessageAt: comment.createdAt || new Date().toISOString(),
            lastMessagePreview: (comment.text || '').slice(0, 200),
          });

          if (convResult.isNew) {
            syncedConvs++;
            if (post.postId) {
              await linkArticleToConversation(supabase, post.postId, convResult.id, company.id);
            }
          }

          const platformMsgId = comment.id;
          if (!platformMsgId) continue;

          const msgResult = await insertMessageIfNew(supabase, company.id, convResult.id, {
            platformMessageId: platformMsgId,
            contactId,
            senderType: 'contact',
            content: comment.text || '',
            metadata: {
              likeCount: comment.likeCount,
              replyCount: comment.replyCount,
              hidden: comment.hidden,
              accountId: post.accountId,
            },
            createdAt: comment.createdAt || new Date().toISOString(),
          });

          if (msgResult.inserted) syncedMsgs++;
        } catch (err) {
          console.error(`[historical-sync] Comment ${comment.id} error:`, err);
        }
      }

      await new Promise(r => setTimeout(r, THROTTLE_MS));
    } catch (err) {
      console.error(`[historical-sync] Post ${post.postId} error:`, err);
    }
  }

  await incrementProgress(supabase, jobId, syncedConvs, syncedMsgs);

  const nextCommentCursor = data.pagination?.cursor || null;
  const hasMore = data.pagination?.hasMore === true && !!nextCommentCursor;

  if (hasMore) {
    return { ...cursor, commentCursor: nextCommentCursor };
  }

  // Comments done — move to complete
  return { ...cursor, phase: 'complete', commentCursor: null };
}

// ─── Job Completion ──────────────────────────────────────────

async function completeJob(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  companyId: string,
  jobId: string,
) {
  // Update inbox_sync_state so incremental cron picks up from here
  const now = new Date().toISOString();
  await supabase.from('inbox_sync_state').upsert({
    company_id: companyId,
    platform: 'all',
    sync_type: 'dms',
    last_synced_at: now,
  });
  await supabase.from('inbox_sync_state').upsert({
    company_id: companyId,
    platform: 'all',
    sync_type: 'comments',
    last_synced_at: now,
  });

  // Mark job completed
  await supabase
    .from('inbox_backfill_jobs')
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', jobId);

  console.log(`[historical-sync] Job ${jobId} completed for company ${companyId}`);

  // Fire-and-forget: trigger AI classification backfill for the imported data
  fetch(`${supabaseUrl}/functions/v1/inbox-backfill`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ companyId }),
  }).catch(() => {});
}

// ─── Helpers ─────────────────────────────────────────────────

function selfChain(
  supabaseUrl: string,
  serviceKey: string,
  companyId: string,
  jobId: string,
  cursorState: CursorState,
) {
  fetch(`${supabaseUrl}/functions/v1/inbox-historical-sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ companyId, jobId, cursorState }),
  }).catch(() => {}); // Fire-and-forget
}

async function incrementProgress(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  conversations: number,
  messages: number,
) {
  if (conversations === 0 && messages === 0) return;

  // Read current values then increment (Supabase doesn't support atomic increment on client)
  const { data: job } = await supabase
    .from('inbox_backfill_jobs')
    .select('synced_conversations, synced_messages')
    .eq('id', jobId)
    .single();

  if (job) {
    await supabase
      .from('inbox_backfill_jobs')
      .update({
        synced_conversations: (job.synced_conversations || 0) + conversations,
        synced_messages: (job.synced_messages || 0) + messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  error: string,
) {
  await supabase
    .from('inbox_backfill_jobs')
    .update({
      status: 'failed',
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
