import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { callGemini } from '../_shared/inbox-ai-helpers.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, platforms, companyId } = await req.json();

    if (!text || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing text or companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = await authorize(req, { companyId });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand voice settings for this company
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: brandVoice } = await supabase
      .from('brand_voice_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    const brandVoiceContext = brandVoice
      ? `Brand voice: tone=${brandVoice.tone || 'professional'}, style=${brandVoice.writing_style || 'balanced'}`
      : 'No brand voice settings configured.';

    // Run quality checks via Gemini
    const prompt = `You are a social media content quality checker. Analyze this post and return a JSON object with quality checks.

Post text: "${text}"
Target platforms: ${(platforms || []).join(', ')}
${brandVoiceContext}

Return JSON with this structure:
{
  "checks": [
    {
      "type": "brand_voice",
      "status": "pass" | "warn" | "fail",
      "message": "Brief explanation"
    },
    {
      "type": "platform_rules",
      "status": "pass" | "warn" | "fail",
      "message": "Brief explanation (check char limits: Twitter 280, LinkedIn 3000, Instagram 2200, Facebook 63206)"
    },
    {
      "type": "sensitivity",
      "status": "pass" | "warn" | "fail",
      "message": "Brief explanation of any sensitive content found"
    }
  ],
  "overall": "pass" | "warn" | "fail"
}

Rules:
- brand_voice: Check tone, vocabulary, and style alignment
- platform_rules: Check character limits, hashtag counts, mention formats per platform
- sensitivity: Flag potentially controversial, offensive, or legally risky content
- overall: "fail" if any check is "fail", "warn" if any is "warn", else "pass"`;

    const response = await callGemini(geminiApiKey, prompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    const result = JSON.parse(response);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Quality check error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
