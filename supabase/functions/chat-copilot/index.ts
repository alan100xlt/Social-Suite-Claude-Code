import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatRequest {
  thread_id: string | null;
  message: string;
  action?: { type: string; payload: string };
  context?: { page?: string; draft_id?: string };
  company_id: string;
}

interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Gemini tool definitions (function declarations)
// ---------------------------------------------------------------------------

const TOOL_DECLARATIONS: GeminiToolDeclaration[] = [
  {
    name: "get_analytics",
    description:
      "Retrieve analytics summary for the company over a time period. Returns total views, likes, engagement rate, and top platform.",
    parameters: {
      type: "OBJECT",
      properties: {
        period: {
          type: "STRING",
          enum: ["7d", "30d", "90d"],
          description: "Time period to query",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_top_posts",
    description:
      "Get the top-performing posts by views for the company over a time period.",
    parameters: {
      type: "OBJECT",
      properties: {
        period: {
          type: "STRING",
          enum: ["7d", "30d"],
          description: "Time period",
        },
        limit: { type: "INTEGER", description: "Max number of posts to return" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_drafts",
    description: "Retrieve recent post drafts for the company.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "INTEGER", description: "Max number of drafts to return" },
      },
    },
  },
  {
    name: "create_draft",
    description:
      "Create a new post draft for the company with platform-specific content.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Draft title" },
        platform_contents: {
          type: "OBJECT",
          description:
            "Map of platform name to post content, e.g. {twitter: '...', linkedin: '...'}",
        },
        objective: {
          type: "STRING",
          description: "Post objective (reach, engagement, clicks)",
        },
        selected_account_ids: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Account IDs to post to",
        },
      },
      required: ["title", "platform_contents"],
    },
  },
  {
    name: "update_draft",
    description: "Update an existing post draft.",
    parameters: {
      type: "OBJECT",
      properties: {
        draft_id: { type: "STRING", description: "ID of the draft to update" },
        platform_contents: {
          type: "OBJECT",
          description: "Updated platform contents map",
        },
        title: { type: "STRING", description: "Updated title" },
        objective: { type: "STRING", description: "Updated objective" },
      },
      required: ["draft_id"],
    },
  },
  {
    name: "generate_post_content",
    description:
      "Generate social media post content for given platforms using AI, optionally based on an article URL.",
    parameters: {
      type: "OBJECT",
      properties: {
        topic: { type: "STRING", description: "Topic or article title" },
        platforms: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Target platforms (twitter, linkedin, facebook, etc.)",
        },
        objective: {
          type: "STRING",
          description: "Post objective (reach, engagement, clicks)",
        },
        article_url: {
          type: "STRING",
          description: "Optional article URL to base the post on",
        },
      },
      required: ["topic", "platforms"],
    },
  },
  {
    name: "get_accounts",
    description:
      "List connected social media accounts for the company. Returns account IDs, platforms, and display names.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_voice_settings",
    description:
      "Get the company's brand voice settings (tone, content length, emoji style, hashtag strategy, etc.).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "update_voice_settings",
    description: "Update the company's brand voice settings.",
    parameters: {
      type: "OBJECT",
      properties: {
        tone: {
          type: "STRING",
          description: "Voice tone (neutral, friendly, urgent, engagement)",
        },
        content_length: {
          type: "STRING",
          description: "Content length (headline, bullets, standard, full)",
        },
        emoji_style: {
          type: "STRING",
          description: "Emoji style (none, minimalist, contextual, heavy)",
        },
        hashtag_strategy: {
          type: "STRING",
          description:
            "Hashtag strategy (none, smart, brand_only, smart_and_brand)",
        },
        custom_instructions: {
          type: "STRING",
          description: "Custom instructions for the AI",
        },
      },
    },
  },
  {
    name: "get_automations",
    description: "List automation rules for the company.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: {
          type: "INTEGER",
          description: "Max number of automations to return",
        },
      },
    },
  },
  {
    name: "update_automation",
    description: "Update an automation rule (toggle active, rename, etc.).",
    parameters: {
      type: "OBJECT",
      properties: {
        automation_id: {
          type: "STRING",
          description: "ID of the automation rule",
        },
        is_active: { type: "BOOLEAN", description: "Whether the rule is active" },
        name: { type: "STRING", description: "New name for the rule" },
      },
      required: ["automation_id"],
    },
  },
  {
    name: "submit_feedback",
    description:
      "Submit user feedback, feature requests, or bug reports. Koko should conversationally gather the feedback type, description, and priority from the user before calling this tool. Posts to Linear and captures in PostHog.",
    parameters: {
      type: "OBJECT",
      properties: {
        feedback_type: {
          type: "STRING",
          enum: ["feature", "bug", "general"],
          description: "Type of feedback",
        },
        title: {
          type: "STRING",
          description: "Short summary title for the feedback",
        },
        description: {
          type: "STRING",
          description: "Detailed description of the feedback, bug, or feature request",
        },
        priority: {
          type: "INTEGER",
          description: "Priority: 0=no priority, 1=urgent, 2=high, 3=medium, 4=low",
        },
      },
      required: ["feedback_type", "description"],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDays(period: string): number {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function buildSystemPrompt(
  companyName: string,
  voiceSettings: Record<string, unknown> | null,
  connectedPlatforms: string[],
  pageContext: string
): string {
  const voiceBlock = voiceSettings
    ? `Current brand voice: ${voiceSettings.tone || "neutral"} tone, ${voiceSettings.content_length || "standard"} length, ${voiceSettings.emoji_style || "contextual"} emojis, ${voiceSettings.hashtag_strategy || "smart"} hashtags.`
    : "No brand voice settings configured yet.";

  const platformBlock =
    connectedPlatforms.length > 0
      ? `Connected platforms: ${connectedPlatforms.join(", ")}.`
      : "No platforms connected yet.";

  return `You are Koko, a friendly and helpful AI copilot for social media management. You work for ${companyName}.

${voiceBlock}
${platformBlock}
User is currently on: ${pageContext || "the dashboard"}.

CRITICAL RULE: Ask only ONE question at a time. Wait for the user's answer before asking the next question. Never combine multiple questions in a single message.

## Post Creation Flow

When a user wants to create a post, follow these steps IN ORDER, one question per message:

Step 1 — SOURCE: Ask "Would you like to write from scratch, or base it on an article/URL?"
  - If article: ask them to share the link or describe the article.
  - If scratch: move to Step 2.

Step 2 — OBJECTIVE: Ask "What's the goal for this post?" and present three options:
  - Reach — maximize visibility and shares
  - Engagement — spark conversation and interaction
  - Clicks — drive traffic to a link

Step 3 — CHANNELS: Ask "Which platforms should I write for?" (e.g. ${connectedPlatforms.length > 0 ? connectedPlatforms.join(", ") : "Facebook, Instagram, X, LinkedIn, etc."})

Step 4 — GENERATE: Use generate_post_content to create a strategy and draft. Show the user the result and ask if they'd like to refine it.

Step 5 — REFINE (optional): If the user wants changes, apply them and show the updated draft. Offer quick refinements like "make it shorter", "more casual", "add urgency".

Step 6 — SAVE: When the user is happy, use create_draft to save it. Confirm it's saved and offer to create for more platforms or schedule it.

If the user provides enough context upfront (e.g. "Write a LinkedIn post about our Q1 results to drive engagement"), skip the questions they already answered and proceed to generation.

## Draft Refinement

When a user wants to refine an existing draft, use get_drafts to find it, show the current content, and ask what they'd like to change. Apply changes one at a time.

## Feedback Collection

When a user wants to send feedback, ask ONE question at a time:
1. What type? (feature request, bug report, or general feedback)
2. Describe the issue or idea
3. How urgent is it? (low, medium, high)
Then use the submit_feedback tool to submit it.

## General Rules

- Be concise and actionable. Keep messages short.
- Respect platform character limits and brand voice when generating posts.
- After completing an action, suggest 2-3 relevant follow-up actions.
- Never dump walls of text. Use short paragraphs and bullet points.`;
}

function suggestFollowUpActions(
  toolsUsed: string[],
  pageContext: string
): Array<{ label: string; action_type: string; payload: string }> {
  const suggestions: Array<{
    label: string;
    action_type: string;
    payload: string;
  }>[] = [];

  // Context-aware suggestions based on which tools were invoked
  if (
    toolsUsed.includes("get_analytics") ||
    toolsUsed.includes("get_top_posts")
  ) {
    suggestions.push([
      {
        label: "Show top posts this week",
        action_type: "send_message",
        payload: "Show me my top performing posts this week",
      },
      {
        label: "Compare to last month",
        action_type: "send_message",
        payload: "How does this compare to last month?",
      },
      {
        label: "Create a post based on top content",
        action_type: "send_message",
        payload:
          "Create a new post inspired by my best-performing content",
      },
    ]);
  }

  if (
    toolsUsed.includes("create_draft") ||
    toolsUsed.includes("generate_post_content")
  ) {
    suggestions.push([
      {
        label: "Make it shorter",
        action_type: "send_message",
        payload: "Make it shorter and punchier",
      },
      {
        label: "Add more platforms",
        action_type: "send_message",
        payload: "Generate versions for more platforms",
      },
      {
        label: "Check my analytics",
        action_type: "send_message",
        payload: "Show my analytics for the last 7 days",
      },
    ]);
  }

  if (toolsUsed.includes("get_drafts")) {
    suggestions.push([
      {
        label: "Edit latest draft",
        action_type: "send_message",
        payload: "Edit my most recent draft",
      },
      {
        label: "Create a new post",
        action_type: "send_message",
        payload: "Help me create a new social media post",
      },
      {
        label: "Show analytics",
        action_type: "send_message",
        payload: "Show my analytics summary",
      },
    ]);
  }

  if (
    toolsUsed.includes("get_voice_settings") ||
    toolsUsed.includes("update_voice_settings")
  ) {
    suggestions.push([
      {
        label: "Try a different tone",
        action_type: "send_message",
        payload: "What other tone options are available?",
      },
      {
        label: "Generate a sample post",
        action_type: "send_message",
        payload: "Generate a sample post with these voice settings",
      },
      {
        label: "View automations",
        action_type: "send_message",
        payload: "Show my automation rules",
      },
    ]);
  }

  if (suggestions.length > 0) {
    return suggestions[0];
  }

  // Default suggestions based on page context
  if (pageContext?.includes("content")) {
    return [
      {
        label: "Create a new post",
        action_type: "send_message",
        payload: "Help me write a new social media post",
      },
      {
        label: "Show my drafts",
        action_type: "send_message",
        payload: "Show my recent drafts",
      },
      {
        label: "Check analytics",
        action_type: "send_message",
        payload: "How are my posts performing?",
      },
    ];
  }

  if (pageContext?.includes("analytics")) {
    return [
      {
        label: "Show top posts",
        action_type: "send_message",
        payload: "What are my top posts this month?",
      },
      {
        label: "Weekly summary",
        action_type: "send_message",
        payload: "Give me a weekly analytics summary",
      },
      {
        label: "Create a post",
        action_type: "send_message",
        payload: "Help me create a post",
      },
    ];
  }

  return [
    {
      label: "Show analytics",
      action_type: "send_message",
      payload: "Show my analytics for the last 7 days",
    },
    {
      label: "Create a post",
      action_type: "send_message",
      payload: "Help me write a social media post",
    },
    {
      label: "View my drafts",
      action_type: "send_message",
      payload: "Show my recent drafts",
    },
  ];
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  companyId: string,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string
): Promise<unknown> {
  switch (name) {
    // ----- get_analytics -----
    case "get_analytics": {
      const days = periodToDays(args.period as string);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from("post_analytics_snapshots")
        .select("views, likes, comments, shares, engagement_rate, platform")
        .eq("company_id", companyId)
        .gte("snapshot_date", since.toISOString().slice(0, 10));

      if (error) throw new Error(`Analytics query failed: ${error.message}`);

      const rows = data || [];
      const totalViews = rows.reduce((s, r) => s + (r.views || 0), 0);
      const totalLikes = rows.reduce((s, r) => s + (r.likes || 0), 0);
      const totalComments = rows.reduce((s, r) => s + (r.comments || 0), 0);
      const totalShares = rows.reduce((s, r) => s + (r.shares || 0), 0);
      const avgEngagement =
        rows.length > 0
          ? rows.reduce((s, r) => s + (r.engagement_rate || 0), 0) / rows.length
          : 0;

      // Find top platform
      const platformCounts: Record<string, number> = {};
      for (const r of rows) {
        platformCounts[r.platform] =
          (platformCounts[r.platform] || 0) + (r.views || 0);
      }
      const topPlatform =
        Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "none";

      return {
        period: args.period,
        total_posts: rows.length,
        total_views: totalViews,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
        top_platform: topPlatform,
      };
    }

    // ----- get_top_posts -----
    case "get_top_posts": {
      const days = periodToDays(args.period as string);
      const limit = Math.min((args.limit as number) || 5, 20);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from("post_analytics_snapshots")
        .select(
          "post_id, content, views, likes, comments, shares, engagement_rate, platform, published_at, post_url"
        )
        .eq("company_id", companyId)
        .gte("snapshot_date", since.toISOString().slice(0, 10))
        .order("views", { ascending: false })
        .limit(limit);

      if (error) throw new Error(`Top posts query failed: ${error.message}`);

      return (data || []).map((p) => ({
        post_id: p.post_id,
        content_preview: (p.content || "").substring(0, 120),
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        engagement_rate: p.engagement_rate,
        platform: p.platform,
        published_at: p.published_at,
        post_url: p.post_url,
      }));
    }

    // ----- get_drafts -----
    case "get_drafts": {
      const limit = Math.min((args.limit as number) || 10, 30);

      const { data, error } = await supabaseAdmin
        .from("post_drafts")
        .select(
          "id, title, status, platform_contents, objective, created_at, updated_at"
        )
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(`Drafts query failed: ${error.message}`);

      return (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        platforms: d.platform_contents
          ? Object.keys(d.platform_contents as Record<string, unknown>)
          : [],
        objective: d.objective,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }

    // ----- create_draft -----
    case "create_draft": {
      const { data, error } = await supabaseAdmin
        .from("post_drafts")
        .insert({
          company_id: companyId,
          created_by: userId,
          title: (args.title as string) || "Untitled Draft",
          platform_contents: args.platform_contents || {},
          objective: (args.objective as string) || null,
          selected_account_ids: (args.selected_account_ids as string[]) || [],
          status: "draft",
        })
        .select("id, title, status, created_at")
        .single();

      if (error) throw new Error(`Create draft failed: ${error.message}`);
      return data;
    }

    // ----- update_draft -----
    case "update_draft": {
      const updates: Record<string, unknown> = { updated_by: userId };
      if (args.platform_contents) updates.platform_contents = args.platform_contents;
      if (args.title) updates.title = args.title;
      if (args.objective) updates.objective = args.objective;

      const { data, error } = await supabaseAdmin
        .from("post_drafts")
        .update(updates)
        .eq("id", args.draft_id as string)
        .eq("company_id", companyId)
        .select("id, title, status, updated_at")
        .single();

      if (error) throw new Error(`Update draft failed: ${error.message}`);
      return data;
    }

    // ----- generate_post_content -----
    case "generate_post_content": {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-social-post`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "posts",
            title: args.topic,
            description: args.topic,
            link: args.article_url || "",
            objective: args.objective || "reach",
            platforms: args.platforms || ["twitter", "linkedin"],
            companyId,
            approvedStrategy: `Write a compelling post about: ${args.topic}`,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `generate-social-post failed (${response.status}): ${errText.substring(0, 200)}`
        );
      }

      const result = await response.json();
      return { posts: result.posts || {} };
    }

    // ----- get_accounts -----
    case "get_accounts": {
      // Accounts are stored in post_schedules / analytics snapshots as account_ids.
      // There is no dedicated social_accounts table — return distinct platforms from analytics.
      const { data, error } = await supabaseAdmin
        .from("post_analytics_snapshots")
        .select("platform, account_id")
        .eq("company_id", companyId)
        .not("account_id", "is", null)
        .limit(100);

      if (error) throw new Error(`Accounts query failed: ${error.message}`);

      // Deduplicate by account_id
      const seen = new Map<string, { account_id: string; platform: string }>();
      for (const row of data || []) {
        if (row.account_id && !seen.has(row.account_id)) {
          seen.set(row.account_id, {
            account_id: row.account_id,
            platform: row.platform,
          });
        }
      }

      return Array.from(seen.values());
    }

    // ----- get_voice_settings -----
    case "get_voice_settings": {
      const { data, error } = await supabaseAdmin
        .from("company_voice_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error)
        throw new Error(`Voice settings query failed: ${error.message}`);

      if (!data) return { message: "No voice settings configured for this company." };

      return {
        tone: data.tone,
        content_length: data.content_length,
        emoji_style: data.emoji_style,
        hashtag_strategy: data.hashtag_strategy,
        brand_tags: data.brand_tags,
        custom_instructions: data.custom_instructions,
        voice_mode: data.voice_mode,
        extract_locations: data.extract_locations,
      };
    }

    // ----- update_voice_settings -----
    case "update_voice_settings": {
      const updates: Record<string, unknown> = {};
      if (args.tone) updates.tone = args.tone;
      if (args.content_length) updates.content_length = args.content_length;
      if (args.emoji_style) updates.emoji_style = args.emoji_style;
      if (args.hashtag_strategy) updates.hashtag_strategy = args.hashtag_strategy;
      if (args.custom_instructions !== undefined)
        updates.custom_instructions = args.custom_instructions;

      // Upsert: update if exists, insert if not
      const { data: existing } = await supabaseAdmin
        .from("company_voice_settings")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from("company_voice_settings")
          .update(updates)
          .eq("company_id", companyId)
          .select("tone, content_length, emoji_style, hashtag_strategy, custom_instructions")
          .single();

        if (error)
          throw new Error(`Update voice settings failed: ${error.message}`);
        return data;
      } else {
        const { data, error } = await supabaseAdmin
          .from("company_voice_settings")
          .insert({ company_id: companyId, ...updates })
          .select("tone, content_length, emoji_style, hashtag_strategy, custom_instructions")
          .single();

        if (error)
          throw new Error(`Insert voice settings failed: ${error.message}`);
        return data;
      }
    }

    // ----- get_automations -----
    case "get_automations": {
      const limit = Math.min((args.limit as number) || 10, 30);

      const { data, error } = await supabaseAdmin
        .from("automation_rules")
        .select("id, name, is_active, action, objective, scheduling, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error)
        throw new Error(`Automations query failed: ${error.message}`);

      return data || [];
    }

    // ----- update_automation -----
    case "update_automation": {
      const updates: Record<string, unknown> = {};
      if (args.is_active !== undefined) updates.is_active = args.is_active;
      if (args.name) updates.name = args.name;

      const { data, error } = await supabaseAdmin
        .from("automation_rules")
        .update(updates)
        .eq("id", args.automation_id as string)
        .eq("company_id", companyId)
        .select("id, name, is_active")
        .single();

      if (error)
        throw new Error(`Update automation failed: ${error.message}`);
      return data;
    }

    // ----- submit_feedback -----
    case "submit_feedback": {
      const feedbackType = (args.feedback_type as string) || "general";
      const title = (args.title as string) || "";
      const description = args.description as string;
      const priority = (args.priority as number) ?? 0;

      // Get user info for context
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("name, website_url")
        .eq("id", companyId)
        .single();

      const companyName = company?.name || "";
      const companyWebsite = company?.website_url || "";
      let companyDomain = "";
      try {
        if (companyWebsite) companyDomain = new URL(companyWebsite).hostname.replace("www.", "");
      } catch { /* ignore */ }

      // Submit to Linear via existing edge function
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/linear-feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            feedbackText: description,
            feedbackTitle: title || undefined,
            feedbackType,
            priority,
            companyName,
            companyDomain,
            companyWebsite,
            userName: profile?.full_name || "",
            userEmail: profile?.email || "",
            source: "koko-copilot",
          }),
        });

        const linearResult = await res.json();

        return {
          success: true,
          feedback_type: feedbackType,
          title: title || "(no title)",
          linear_issue: linearResult?.issue?.identifier || null,
          message: "Feedback submitted successfully! Thank you.",
        };
      } catch (err) {
        console.error("Failed to submit feedback:", err);
        return {
          success: false,
          error: "Failed to submit feedback to tracking system",
        };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Gemini streaming helpers
// ---------------------------------------------------------------------------

interface GeminiMessage {
  role: "user" | "model";
  parts: Array<Record<string, unknown>>;
}

function dbMessagesToGemini(
  messages: Array<{ role: string; content: string }>
): GeminiMessage[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

async function* streamGemini(
  apiKey: string,
  systemInstruction: string,
  contents: GeminiMessage[],
  tools: GeminiToolDeclaration[],
  companyId: string,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string
): AsyncGenerator<string> {
  const currentContents = [...contents];
  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;

    const requestBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: currentContents,
      tools: [{ function_declarations: tools }],
      generation_config: {
        temperature: 0.7,
        max_output_tokens: 2048,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      yield sseEvent({
        type: "error",
        error: `Gemini ${response.status}: ${errText.slice(0, 200)}`,
      });
      yield sseEvent({
        type: "text",
        content: "Sorry, I encountered an error generating a response. Please try again.",
      });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield sseEvent({ type: "text", content: "Stream unavailable." });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let pendingFunctionCalls: Array<{
      name: string;
      args: Record<string, unknown>;
      thoughtSignature?: string;
    }> = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        const candidates = parsed.candidates as Array<Record<string, unknown>> | undefined;
        if (!candidates || candidates.length === 0) continue;

        const candidate = candidates[0];
        const content = candidate.content as Record<string, unknown> | undefined;
        if (!content) continue;

        const parts = content.parts as Array<Record<string, unknown>> | undefined;
        if (!parts) continue;

        for (const part of parts) {
          // Text chunk
          if (part.text) {
            yield sseEvent({ type: "text", content: part.text });
          }

          // Function call — preserve thoughtSignature for Gemini 3.x
          if (part.functionCall) {
            const fc = part.functionCall as {
              name: string;
              args: Record<string, unknown>;
            };
            pendingFunctionCalls.push({
              name: fc.name,
              args: fc.args || {},
              thoughtSignature: part.thoughtSignature as string | undefined,
            });
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith("data: ")) {
        const jsonStr = remaining.slice(6).trim();
        if (jsonStr && jsonStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(jsonStr);
            const candidates = parsed.candidates as Array<Record<string, unknown>> | undefined;
            if (candidates && candidates.length > 0) {
              const parts = (candidates[0].content as Record<string, unknown>)
                ?.parts as Array<Record<string, unknown>> | undefined;
              if (parts) {
                for (const part of parts) {
                  if (part.text) {
                    yield sseEvent({ type: "text", content: part.text });
                  }
                  if (part.functionCall) {
                    const fc = part.functionCall as {
                      name: string;
                      args: Record<string, unknown>;
                    };
                    pendingFunctionCalls.push({
                      name: fc.name,
                      args: fc.args || {},
                      thoughtSignature: part.thoughtSignature as string | undefined,
                    });
                  }
                }
              }
            }
          } catch {
            // ignore parse errors on trailing buffer
          }
        }
      }
    }

    // Execute function calls and continue the loop
    if (pendingFunctionCalls.length > 0) {
      // Add model's function call response to contents
      // Gemini 3.x: thoughtSignature MUST be preserved on functionCall parts
      const modelParts = pendingFunctionCalls.map((fc) => {
        const part: Record<string, unknown> = {
          functionCall: { name: fc.name, args: fc.args },
        };
        if (fc.thoughtSignature) {
          part.thoughtSignature = fc.thoughtSignature;
        }
        return part;
      });
      currentContents.push({ role: "model", parts: modelParts });

      // Execute each function call and collect results
      const functionResponseParts: Array<Record<string, unknown>> = [];

      for (const fc of pendingFunctionCalls) {
        yield sseEvent({
          type: "tool_call",
          name: fc.name,
          args: fc.args,
        });

        let result: unknown;
        try {
          result = await executeTool(
            fc.name,
            fc.args,
            companyId,
            userId,
            supabaseAdmin,
            authHeader
          );
        } catch (err) {
          console.error(`Tool ${fc.name} failed:`, err);
          result = {
            error: err instanceof Error ? err.message : "Tool execution failed",
          };
        }

        yield sseEvent({
          type: "tool_result",
          name: fc.name,
          result,
        });

        functionResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result },
          },
        });
      }

      // Add function results to contents for next Gemini call
      currentContents.push({
        role: "user",
        parts: functionResponseParts,
      });

      pendingFunctionCalls = [];
      continueLoop = true; // Continue the loop for Gemini to process the tool results
    }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // We need the raw auth header to pass to internal calls
  const authHeader = req.headers.get("Authorization") || "";

  try {
    const body: ChatRequest = await req.json();
    const { thread_id, message, action, context, company_id } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!message && !action) {
      return new Response(
        JSON.stringify({ error: "message or action is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate
    let auth;
    try {
      auth = await authorize(req, { companyId: company_id });
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ----- Thread management -----
    let currentThreadId = thread_id;

    if (!currentThreadId) {
      const { data: newThread, error: threadErr } = await supabaseAdmin
        .from("chat_threads")
        .insert({
          company_id,
          created_by: auth.userId,
          title: (message || "New conversation").substring(0, 100),
        })
        .select("id")
        .single();

      if (threadErr) {
        console.error("Failed to create thread:", threadErr);
        return new Response(
          JSON.stringify({ error: "Failed to create chat thread" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      currentThreadId = newThread.id;
    }

    // ----- Save user message -----
    const userContent = action
      ? `[Action: ${action.type}] ${action.payload || message}`
      : message;

    const { data: userMsg, error: userMsgErr } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        thread_id: currentThreadId,
        role: "user",
        content: userContent,
        tool_calls: null,
        tool_results: context ? { context } : null,
      })
      .select("id")
      .single();

    if (userMsgErr) {
      console.error("Failed to save user message:", userMsgErr);
      // Continue anyway — don't block the response
    }

    // ----- Load conversation history (last 20 messages) -----
    const { data: historyRows } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("thread_id", currentThreadId)
      .order("created_at", { ascending: true })
      .limit(20);

    const history = (historyRows || []).map((m) => ({
      role: m.role as string,
      content: m.content as string,
    }));

    // ----- Fetch company context -----
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", company_id)
      .single();

    const { data: voiceSettings } = await supabaseAdmin
      .from("company_voice_settings")
      .select("tone, content_length, emoji_style, hashtag_strategy")
      .eq("company_id", company_id)
      .maybeSingle();

    // Get connected platforms from analytics data
    const { data: platformRows } = await supabaseAdmin
      .from("post_analytics_snapshots")
      .select("platform")
      .eq("company_id", company_id)
      .limit(50);

    const connectedPlatforms = [
      ...new Set((platformRows || []).map((r) => r.platform)),
    ];

    const companyName = company?.name || "your company";
    const pageContext = context?.page || "";

    const systemPrompt = buildSystemPrompt(
      companyName,
      voiceSettings as Record<string, unknown> | null,
      connectedPlatforms,
      pageContext
    );

    // ----- Build Gemini contents from history -----
    const geminiContents = dbMessagesToGemini(history);

    // ----- Stream response via SSE -----
    const toolsUsed: string[] = [];
    let fullAssistantText = "";
    let tokensUsed = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();

          for await (const event of streamGemini(
            GEMINI_API_KEY,
            systemPrompt,
            geminiContents,
            TOOL_DECLARATIONS,
            company_id,
            auth.userId,
            supabaseAdmin,
            authHeader
          )) {
            controller.enqueue(encoder.encode(event));

            // Track text and tools for follow-up suggestions
            try {
              const parsed = JSON.parse(
                event.replace("data: ", "").trim()
              );
              if (parsed.type === "text") {
                fullAssistantText += parsed.content;
                tokensUsed += 1; // Rough token estimate per chunk
              }
              if (parsed.type === "tool_call" && parsed.name) {
                toolsUsed.push(parsed.name);
              }
            } catch {
              // ignore parse errors on event tracking
            }
          }

          // ----- Save assistant message -----
          let assistantMsgId: string | null = null;
          if (fullAssistantText) {
            const { data: asstMsg } = await supabaseAdmin
              .from("chat_messages")
              .insert({
                thread_id: currentThreadId,
                role: "assistant",
                content: fullAssistantText,
                tool_calls: toolsUsed.length > 0 ? toolsUsed : null,
                tokens_used: tokensUsed || null,
              })
              .select("id")
              .single();

            assistantMsgId = asstMsg?.id || null;
          }

          // ----- Send follow-up action suggestions -----
          const actions = suggestFollowUpActions(toolsUsed, pageContext);
          controller.enqueue(
            encoder.encode(sseEvent({ type: "actions", actions }))
          );

          // ----- Send done event -----
          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "done",
                thread_id: currentThreadId,
                message_id: assistantMsgId || userMsg?.id || null,
                tokens_used: tokensUsed,
              })
            )
          );

          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          const encoder = new TextEncoder();
          try {
            controller.enqueue(
              encoder.encode(
                sseEvent({
                  type: "text",
                  content:
                    "\n\nSorry, something went wrong. Please try again.",
                })
              )
            );
            controller.enqueue(
              encoder.encode(
                sseEvent({
                  type: "done",
                  thread_id: currentThreadId,
                  message_id: null,
                  tokens_used: 0,
                })
              )
            );
          } catch {
            // controller may already be closed
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("chat-copilot error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
