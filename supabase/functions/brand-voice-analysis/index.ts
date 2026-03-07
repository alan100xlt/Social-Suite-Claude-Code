import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
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

    const auth = await authorize(req, { companyId, requiredRoles: ['owner', 'admin', 'manager'] });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get top-performing posts (by engagement) for analysis
    const { data: snapshots } = await supabase
      .from('post_analytics_snapshots')
      .select('post_text, likes, comments, shares, platform')
      .eq('company_id', companyId)
      .order('likes', { ascending: false })
      .limit(30);

    if (!snapshots || snapshots.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Not enough post data for analysis. Need at least some published posts with analytics.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const postTexts = snapshots
      .filter((s: any) => s.post_text)
      .map((s: any) => `[${s.platform}] (${s.likes} likes, ${s.comments} comments): ${s.post_text}`)
      .join('\n\n');

    const prompt = `Analyze these top-performing social media posts and extract the brand voice patterns. Return JSON.

Posts:
${postTexts}

Return JSON with this structure:
{
  "tone": "one of: professional, casual, humorous, authoritative, empathetic, bold",
  "writing_style": "one of: formal, conversational, storytelling, data-driven, inspirational",
  "vocabulary_patterns": ["list of commonly used words/phrases"],
  "sentence_structure": "short/medium/long/varied",
  "emoji_usage": "none/minimal/moderate/heavy",
  "hashtag_style": "none/branded/trending/mixed",
  "call_to_action_style": "description of CTA patterns",
  "key_themes": ["list of recurring topics/themes"],
  "dos": ["list of style guidelines to follow"],
  "donts": ["list of style guidelines to avoid"]
}`;

    const response = await callGemini(geminiApiKey, prompt, {
      temperature: 0.5,
      maxOutputTokens: 2048,
    });

    const analysis = JSON.parse(response);

    // Update brand_voice_settings
    const { error: upsertError } = await supabase
      .from('brand_voice_settings')
      .upsert({
        company_id: companyId,
        tone: analysis.tone,
        writing_style: analysis.writing_style,
        ai_analysis: analysis,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });

    if (upsertError) {
      console.error('Failed to save brand voice analysis:', upsertError);
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Brand voice analysis error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
