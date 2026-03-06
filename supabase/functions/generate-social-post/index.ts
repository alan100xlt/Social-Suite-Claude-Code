import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

const objectivePrompts: Record<string, string> = {
  reach:
    "Maximize REACH: Write viral, shareable content. Use bold hooks, universally relatable angles, and language that makes people want to share. Keep it punchy and scroll-stopping.",
  engagement:
    "Maximize ENGAGEMENT: Write content that sparks conversation. Ask thought-provoking questions, share hot takes or opinions, and include clear calls to interact (comment, like, share your experience).",
  clicks:
    "Maximize CLICKS to the article: Create a curiosity gap that compels readers to click the link. Use intriguing hooks, tease key insights without giving everything away, and include a clear CTA to read the full article. ALWAYS include the article link.",
};

const platformRules: Record<string, string> = {
  twitter: "Max 280 characters TOTAL including any URLs. URLs are NOT shortened — count the full URL length toward the 280 character limit. If including a link, the post text must be short enough that text + space + full URL stays under 280 characters. No more than 2-3 hashtags. Concise and punchy.",
  bluesky: "Max 300 characters TOTAL including any URLs. URLs are NOT shortened — count the full URL length toward the 300 character limit. If including a link, the post text must be short enough that text + space + full URL stays under 300 characters. Conversational tone. Similar to Twitter style.",
  linkedin: "Max 3000 characters. Professional tone. Use line breaks for readability. Hashtags at end (3-5 max).",
  facebook: "Max 63206 characters. Conversational. Emoji welcome. Medium length preferred (under 500 chars for best engagement).",
  instagram: "Max 2200 characters. Visual-first captions. 5-10 relevant hashtags. Emoji rich. No clickable links in captions.",
  tiktok: "Max 2200 characters. Trendy, casual, Gen-Z friendly. Use trending hashtags. Short and catchy.",
  threads: "Max 500 characters. Conversational. Similar to Twitter but slightly more relaxed.",
  pinterest: "Max 500 characters. Descriptive, keyword-rich for search. Include relevant hashtags.",
};

// Rough cost per 1M tokens (USD) for supported models
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gemini-3.1-flash-lite-preview": { input: 0.075, output: 0.30 },
};

function extractTokenUsage(data: Record<string, unknown>) {
  const usage = data?.usage as Record<string, number> | undefined;
  if (!usage) return null;
  return {
    prompt_tokens: usage.prompt_tokens ?? 0,
    completion_tokens: usage.completion_tokens ?? 0,
    total_tokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
  };
}

function estimateCost(model: string, tokens: { prompt_tokens: number; completion_tokens: number }) {
  const costs = MODEL_COSTS[model];
  if (!costs) return null;
  const inputCost = (tokens.prompt_tokens / 1_000_000) * costs.input;
  const outputCost = (tokens.completion_tokens / 1_000_000) * costs.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // round to 6 decimals
}

async function logAiCall(
  supabaseAdmin: ReturnType<typeof createClient>,
  opts: {
    companyId: string | null;
    userId: string | null;
    mode: string;
    model: string;
    platforms: string[];
    durationMs: number;
    success: boolean;
    statusCode: number | null;
    errorMessage: string | null;
    tokenUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
    estimatedCostUsd: number | null;
  }
) {
  try {
    await supabaseAdmin.from("api_call_logs").insert({
      function_name: "generate-social-post",
      action: `ai-${opts.mode}`,
      company_id: opts.companyId,
      user_id: opts.userId,
      platform: opts.platforms.join(",") || null,
      duration_ms: opts.durationMs,
      success: opts.success,
      status_code: opts.statusCode,
      error_message: opts.errorMessage,
      request_body: { mode: opts.mode, model: opts.model, platforms: opts.platforms },
      response_body: {
        token_usage: opts.tokenUsage,
        estimated_cost_usd: opts.estimatedCostUsd,
      },
    });
  } catch (e) {
    console.error("Failed to log AI call:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { mode = "strategy", title, description, link, imageUrl, objective, platforms, approvedStrategy, chatMessages, posts: postsToCheck, fullContent, companyId, voiceSettings: providedVoiceSettings } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Authenticate: allow anonymous access for onboarding sample posts
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ") && authHeader.replace("Bearer ", "").length > 0) {
      try {
        const auth = await authorize(req, { allowServiceRole: true });
        userId = auth.userId;
      } catch (authError) {
        // If token is present but invalid, allow anonymous fallback instead of blocking
        console.warn("Auth failed, proceeding anonymously:", authError instanceof Response ? "invalid token" : authError);
      }
    }

    // Admin client for logging
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const objectiveInstruction = objectivePrompts[objective] || objectivePrompts.reach;
    const model = "gemini-3.1-flash-lite-preview";
    const platformList = (platforms as string[]) || [];

    // --- Voice Settings Resolution ---
    let voiceSettings: Record<string, unknown> | null = providedVoiceSettings || null;
    let voiceMode = "default";

    if (!voiceSettings && companyId) {
      // Fetch company voice settings
      const { data: companyVoice } = await supabaseAdmin
        .from("company_voice_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (companyVoice) {
        voiceMode = companyVoice.voice_mode || "default";
        if (voiceMode === "default") {
          // Fetch global defaults
          const { data: globalDefaults } = await supabaseAdmin
            .from("global_voice_defaults")
            .select("*")
            .limit(1)
            .maybeSingle();
          voiceSettings = globalDefaults || null;
        } else {
          voiceSettings = companyVoice;
        }
      }
    } else if (voiceSettings) {
      voiceMode = (voiceSettings as any).voice_mode || "custom";
    }

    // Build voice prompt blocks
    let voicePromptBlock = "";
    if (voiceSettings) {
      const toneInstructions: Record<string, string> = {
        neutral: "Write in a neutral, journalistic, objective voice. Be factual and trustworthy. Avoid opinions or hype.",
        friendly: "Write in a warm, community-focused voice. Be inviting and conversational. Use 'we' and 'you'. Foster community spirit.",
        urgent: "Write in an urgent, alert-style voice. Use caps for emphasis. Lead with the critical information. Make it scroll-stopping.",
        engagement: "Write to start conversations. Ask thought-provoking questions. Include clear calls to comment or share experiences.",
      };
      const lengthInstructions: Record<string, string> = {
        headline: "Write a single headline-length sentence. Maximum 1-2 lines.",
        bullets: "Structure as a brief intro followed by bullet points with key details (When, Where, What).",
        standard: "Write a standard 2-3 sentence summary providing context without overwhelming the reader.",
        full: "Write a full-length post appropriate for the platform's maximum length.",
      };
      const emojiInstructions: Record<string, string> = {
        none: "Do NOT use any emojis whatsoever.",
        minimalist: "Use emojis only as functional directional cues (e.g. a single pointing finger). Maximum 1-2 per post.",
        contextual: "Use emojis that visually match the specific topic mentioned. Place them naturally within the text.",
        heavy: "Use emojis liberally for engagement and visual appeal.",
      };
      const hashtagInstructions: Record<string, string> = {
        none: "Do NOT include any hashtags.",
        smart: "Generate 3-5 relevant, discoverable hashtags based on the content topics.",
        brand_only: `Include ONLY these brand hashtags: ${((voiceSettings as any).brand_tags || []).join(" ")}. No others.`,
        smart_and_brand: `Generate 2-3 topic hashtags AND always include these brand tags: ${((voiceSettings as any).brand_tags || []).join(" ")}.`,
      };

      const vs = voiceSettings as any;
      const parts: string[] = [];
      if (vs.tone && toneInstructions[vs.tone]) parts.push(`TONE: ${toneInstructions[vs.tone]}`);
      if (vs.content_length && lengthInstructions[vs.content_length]) parts.push(`LENGTH: ${lengthInstructions[vs.content_length]}`);
      if (vs.emoji_style && emojiInstructions[vs.emoji_style]) parts.push(`EMOJIS: ${emojiInstructions[vs.emoji_style]}`);
      if (vs.hashtag_strategy && hashtagInstructions[vs.hashtag_strategy]) parts.push(`HASHTAGS: ${hashtagInstructions[vs.hashtag_strategy]}`);
      if (vs.extract_locations) parts.push("Additionally, extract and include specific neighborhood or area names mentioned in the content as hashtags.");
      if (vs.custom_instructions) parts.push(`ADDITIONAL INSTRUCTIONS: ${vs.custom_instructions}`);

      // AI autonomy mode instructions
      if (voiceMode === "custom_dynamic_ai") {
        parts.push("AI AUTONOMY: You are allowed to deviate from the voice settings above ONLY if you are 60%+ confident the change will meaningfully improve engagement, safety, or quality. If you deviate, include an 'ai_reasoning' field in your response explaining why, and set 'ai_deviated' to true.");
      } else if (voiceMode === "custom_strict_ai") {
        parts.push("AI AUTONOMY: You are allowed to deviate from the voice settings above ONLY if you are 90%+ confident. The bar is very high. If you deviate, include an 'ai_reasoning' field explaining why, and set 'ai_deviated' to true.");
      } else if (voiceMode === "ai_decides") {
        parts.push("AI AUTONOMY: Choose the optimal tone, length, emoji usage, and hashtag strategy for this specific article and platform. Optimize for engagement and quality. Include an 'ai_reasoning' field explaining your choices.");
      }

      voicePromptBlock = parts.length > 0 ? "\n\n--- BRAND VOICE SETTINGS ---\n" + parts.join("\n") + "\n--- END VOICE SETTINGS ---\n" : "";
    }

    // Helper to call AI and log
    async function callAI(requestBody: Record<string, unknown>, currentMode: string) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify(requestBody),
        }
      );

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);

        await logAiCall(supabaseAdmin, {
          companyId: companyId || null,
          userId,
          mode: currentMode,
          model,
          platforms: platformList,
          durationMs,
          success: false,
          statusCode: response.status,
          errorMessage: errText.substring(0, 500),
          tokenUsage: null,
          estimatedCostUsd: null,
        });

        if (response.status === 429) {
          return { error: "Rate limit exceeded. Please try again in a moment.", status: 429 };
        }
        if (response.status === 402) {
          return { error: "AI credits exhausted. Please add funds to continue.", status: 402 };
        }
        return { error: "AI generation failed", status: 500 };
      }

      const data = await response.json();
      const tokenUsage = extractTokenUsage(data);
      const estimatedCostUsd = tokenUsage ? estimateCost(model, tokenUsage) : null;

      await logAiCall(supabaseAdmin, {
        companyId: companyId || null,
        userId,
        mode: currentMode,
        model,
        platforms: platformList,
        durationMs,
        success: true,
        statusCode: 200,
        errorMessage: null,
        tokenUsage,
        estimatedCostUsd,
      });

      return { data, tokenUsage, estimatedCostUsd };
    }

    if (mode === "strategy") {
      const systemPrompt = `You are an expert social media strategist. Given an article (or topic) and an objective, generate a structured content strategy using the exact format below.

You MUST use this exact structure with these exact section headers:

**📰 Article Summary**
• [2-3 bullet points summarizing the key points of the article/topic]

**✍️ Post Approach**
• [2-3 bullet points describing the tone, hook, angle, and content approach for the social posts]

**🎯 Objective & CTA**
• Objective: [the specific objective in one line]
• Call to Action: [the specific CTA to include]
• Key metric to optimize: [what success looks like]

${objectiveInstruction}

Return ONLY the formatted strategy using the structure above. No extra explanations or metadata. Be specific and actionable in each bullet point.${voicePromptBlock}`;

      const messages: Array<{role: string; content: string}> = [
        { role: "system", content: systemPrompt },
      ];

      if (chatMessages && Array.isArray(chatMessages) && chatMessages.length > 0) {
        for (const msg of chatMessages) {
          messages.push({ role: msg.role, content: msg.content });
        }
      } else {
        const userPrompt = `Article Title: ${title || "Untitled"}
Article Description: ${description || "No description available"}
${fullContent ? `\nFull Article Content:\n${fullContent.substring(0, 8000)}\n` : ""}Article Link: ${link || "No link"}
Objective: ${objective || "reach"}
Target Platforms: ${(platforms || []).join(", ")}

Generate the content strategy now.`;
        messages.push({ role: "user", content: userPrompt });
      }

      const result = await callAI({ model, messages }, "strategy");
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }),
          { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const strategy = result.data.choices?.[0]?.message?.content?.trim() || "";

      return new Response(JSON.stringify({ strategy, token_usage: result.tokenUsage, estimated_cost_usd: result.estimatedCostUsd }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "posts") {
      const imageInstruction = imageUrl
        ? `\n\nThis article has an associated image. Write the post as if the image will be displayed alongside it. Reference it naturally when relevant.`
        : "";

      const rulesBlock = platformList.map(p => `- ${p}: ${platformRules[p] || "Standard social media post"}`).join("\n");

      const systemPrompt = `You are an expert social media copywriter. Generate individual posts for each specified platform based on the approved content strategy.

Approved Strategy: ${approvedStrategy}

${objectiveInstruction}

Platform rules (MUST follow strictly):
${rulesBlock}

${objective === "clicks" ? `IMPORTANT: Always include this link in posts: ${link}` : `Optionally include this link if it fits naturally: ${link}`}${imageInstruction}

Generate an optimized post for EACH platform, tailored to that platform's style and character limits. Ensure each post strictly follows the platform's rules above.${voicePromptBlock}`;

      const userPrompt = `Article Title: ${title || "Untitled"}
Article Description: ${description || "No description available"}
${fullContent ? `\nFull Article Content:\n${fullContent.substring(0, 8000)}\n` : ""}Article Link: ${link || "No link"}${imageUrl ? `\nArticle Image: ${imageUrl}` : ""}

Generate posts for these platforms: ${platformList.join(", ")}`;

      const requestBody: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_platform_posts",
              description: "Generate individual social media posts for each platform",
              parameters: {
                type: "object",
                properties: {
                  posts: {
                    type: "object",
                    properties: Object.fromEntries(
                      platformList.map((p: string) => [p, { type: "string", description: `Post content for ${p}` }])
                    ),
                    required: platformList,
                  },
                },
                required: ["posts"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_platform_posts" } },
      };

      const result = await callAI(requestBody, "posts");
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }),
          { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          const posts = parsed.posts || parsed;
          return new Response(JSON.stringify({ posts, token_usage: result.tokenUsage, estimated_cost_usd: result.estimatedCostUsd }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (parseErr) {
          console.error("Failed to parse tool call arguments:", parseErr);
          throw new Error("Failed to parse AI response");
        }
      }

      const content = result.data.choices?.[0]?.message?.content?.trim() || "";
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ posts: parsed.posts || parsed, token_usage: result.tokenUsage, estimated_cost_usd: result.estimatedCostUsd }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        const posts: Record<string, string> = {};
        for (const p of platformList) {
          posts[p] = content;
        }
        return new Response(JSON.stringify({ posts, token_usage: result.tokenUsage, estimated_cost_usd: result.estimatedCostUsd }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (mode === "compliance") {
      const posts = postsToCheck as Record<string, string>;
      if (!posts || typeof posts !== "object") {
        throw new Error("Posts to check are required for compliance mode");
      }

      const compliancePlatformList = Object.keys(posts);
      const rulesBlock = compliancePlatformList.map(p => `- ${p}: ${platformRules[p] || "Standard social media post"}`).join("\n");
      const postsBlock = compliancePlatformList.map(p => `### ${p}\n${posts[p]}`).join("\n\n");

      const systemPrompt = `You are a social media compliance checker. Review each post against the platform's rules and fix any violations.

Platform rules:
${rulesBlock}

For each post:
1. Check character count against the platform limit
2. Check hashtag count and usage
3. Check tone/style matches platform expectations
4. Check link inclusion rules
5. If the post violates ANY rule, rewrite it to comply while preserving the original message and intent

Return ALL posts (both compliant and fixed ones) via the tool call. If a post was already compliant, return it unchanged.`;

      const userPrompt = `Review and fix these posts:\n\n${postsBlock}`;

      const requestBody: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_compliant_posts",
              description: "Return the compliant versions of all posts",
              parameters: {
                type: "object",
                properties: {
                  posts: {
                    type: "object",
                    properties: Object.fromEntries(
                      compliancePlatformList.map((p: string) => [p, { type: "string", description: `Compliant post for ${p}` }])
                    ),
                    required: compliancePlatformList,
                  },
                },
                required: ["posts"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_compliant_posts" } },
      };

      const result = await callAI(requestBody, "compliance");
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }),
          { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          const compliantPosts = parsed.posts || parsed;
          return new Response(JSON.stringify({ posts: compliantPosts, token_usage: result.tokenUsage, estimated_cost_usd: result.estimatedCostUsd }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (parseErr) {
          console.error("Failed to parse compliance response:", parseErr);
          return new Response(JSON.stringify({ posts }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({ posts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ error: `Unknown mode: ${mode}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-social-post error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
