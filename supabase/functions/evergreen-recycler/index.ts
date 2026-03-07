import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';
import { callGemini } from '../_shared/inbox-ai-helpers.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check feature config
    const { data: config } = await supabase
      .from('company_feature_config')
      .select('config')
      .eq('company_id', companyId)
      .maybeSingle();

    const featureConfig = config?.config as any;
    const evergreenConfig = featureConfig?.evergreen_recycling;

    if (!evergreenConfig?.enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Evergreen recycling disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find top-performing evergreen articles not recently recycled
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: articles, error: articleError } = await supabase
      .from('rss_feed_items')
      .select('id, title, full_content, content_classification, last_recycled_at, feed_id, rss_feeds!inner(company_id)')
      .eq('rss_feeds.company_id', companyId)
      .not('content_classification', 'is', null)
      .or(`last_recycled_at.is.null,last_recycled_at.lt.${thirtyDaysAgo}`)
      .limit(10);

    if (articleError) throw articleError;

    // Filter to evergreen only
    const evergreenArticles = (articles || []).filter((a: any) => {
      const classification = a.content_classification;
      return classification?.is_evergreen === true && (classification?.evergreen_score || 0) > 0.6;
    });

    if (evergreenArticles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, queued: 0, reason: 'No eligible evergreen articles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let queued = 0;

    for (const article of evergreenArticles.slice(0, 3)) {
      const content = article.full_content || article.title || '';

      const prompt = `Rewrite this social media post about the article below. Create a fresh variation that:
- Maintains the same key message and facts
- Uses different wording, angle, or hook
- Is suitable for social media (concise, engaging)
- Includes a call-to-action

Original article: "${content.slice(0, 1000)}"

Return JSON: { "variation": "the rewritten post text" }`;

      try {
        const response = await callGemini(geminiApiKey, prompt, {
          temperature: 0.8,
          maxOutputTokens: 512,
        });

        const { variation } = JSON.parse(response);

        if (variation) {
          await supabase.from('evergreen_queue').insert({
            company_id: companyId,
            article_id: article.id,
            variation_text: variation,
            status: 'pending',
          });

          await supabase
            .from('rss_feed_items')
            .update({ last_recycled_at: new Date().toISOString() })
            .eq('id', article.id);

          queued++;
        }
      } catch (err) {
        console.error(`Failed to generate variation for article ${article.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, queued }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Evergreen recycler error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
