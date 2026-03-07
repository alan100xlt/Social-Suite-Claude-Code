import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';
import { callGemini } from '../_shared/inbox-ai-helpers.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { companyId, action } = await req.json();
    if (!companyId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'backfill-evergreen') {
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiApiKey) {
        return new Response(
          JSON.stringify({ error: 'Gemini API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get articles without classification that have full_content
      const { data: articles, error } = await supabase
        .from('rss_feed_items')
        .select('id, title, full_content, description, feed_id, rss_feeds!inner(company_id)')
        .eq('rss_feeds.company_id', companyId)
        .is('content_classification', null)
        .not('full_content', 'is', null)
        .limit(20);

      if (error) throw error;

      let classified = 0;

      for (const article of articles || []) {
        const content = article.full_content || article.description || article.title || '';

        const prompt = `Classify this article for evergreen content recycling. Return JSON.

Title: "${article.title}"
Content: "${content.slice(0, 1500)}"

Return JSON:
{
  "type": "evergreen" | "timely" | "seasonal",
  "is_evergreen": boolean,
  "evergreen_score": 0.0-1.0,
  "suggested_reshare_window": "30d" | "90d" | "180d" | "never",
  "ai_reasoning": "brief explanation"
}

Rules:
- "evergreen": content that remains relevant for months/years (how-to, guides, timeless topics)
- "timely": news, events, announcements with a specific date
- "seasonal": content tied to seasons/holidays but recurring`;

        try {
          const response = await callGemini(geminiApiKey, prompt, {
            temperature: 0.3,
            maxOutputTokens: 512,
          });

          const classification = JSON.parse(response);

          await supabase
            .from('rss_feed_items')
            .update({ content_classification: classification })
            .eq('id', article.id);

          classified++;

          // Rate limiting: 100ms between calls
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Failed to classify article ${article.id}:`, err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, classified, total: (articles || []).length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'backfill-bylines') {
      // Extract bylines from stored article metadata
      const { data: articles, error } = await supabase
        .from('rss_feed_items')
        .select('id, title, description, full_content, feed_id, rss_feeds!inner(company_id)')
        .eq('rss_feeds.company_id', companyId)
        .is('byline', null)
        .limit(100);

      if (error) throw error;

      let updated = 0;

      for (const article of articles || []) {
        // Try to extract byline from content patterns
        const content = article.full_content || article.description || '';
        const bylineMatch = content.match(/(?:by|author|written by|reporter)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);

        if (bylineMatch) {
          const bylineName = bylineMatch[1].trim();

          // Upsert journalist
          const { data: journalist } = await supabase
            .from('journalists')
            .upsert(
              { company_id: companyId, name: bylineName },
              { onConflict: 'company_id,name' }
            )
            .select('id')
            .single();

          if (journalist) {
            await supabase
              .from('rss_feed_items')
              .update({ byline: bylineName, journalist_id: journalist.id })
              .eq('id', article.id);
            updated++;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, updated, total: (articles || []).length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Content backfill error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
