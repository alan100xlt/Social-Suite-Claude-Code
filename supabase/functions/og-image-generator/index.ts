/// <reference types="npm:@types/react@18" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, corsHeaders } from "../_shared/authorize.ts";
import satori from "npm:satori@0.12.0";
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { loadFonts } from "./utils/fonts.ts";
import { imageToBase64 } from "./utils/image-to-base64.ts";
import { getTemplate, getAllTemplates, getAvailableTemplates, fallbackTemplateId, renderFromConfig } from "./templates/registry.ts";
import type { TemplateInput, OgVisibilitySettings, OgFontOverride } from "./templates/types.ts";
import { DEFAULT_VISIBILITY } from "./templates/types.ts";
import { FONT_FAMILY_MAP } from "./utils/fonts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Cost per 1M tokens (USD) — gemini-2.5-flash-lite
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash-lite": { input: 0.075, output: 0.30 },
};

// Initialize WASM at module level (top-level await, same pattern as rss-poll ImageMagick)
const wasmResp = await fetch(
  "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"
);
try {
  await initWasm(await wasmResp.arrayBuffer());
} catch (_) {
  // Already initialized in a warm invocation
}

// Eagerly start font loading
const fontsPromise = loadFonts();

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
  return Math.round(((tokens.prompt_tokens / 1e6) * costs.input + (tokens.completion_tokens / 1e6) * costs.output) * 1e6) / 1e6;
}

async function logApiCall(
  admin: ReturnType<typeof createClient>,
  opts: {
    action: string; companyId: string | null; userId: string | null;
    durationMs: number; success: boolean; statusCode: number | null;
    errorMessage: string | null; tokenUsage: unknown; estimatedCostUsd: number | null;
  }
) {
  try {
    await admin.from("api_call_logs").insert({
      function_name: "og-image-generator",
      action: opts.action,
      company_id: opts.companyId,
      user_id: opts.userId,
      duration_ms: opts.durationMs,
      success: opts.success,
      status_code: opts.statusCode,
      error_message: opts.errorMessage,
      request_body: { action: opts.action },
      response_body: { token_usage: opts.tokenUsage, estimated_cost_usd: opts.estimatedCostUsd },
    });
  } catch (e) {
    console.warn("Failed to log API call:", e);
  }
}

/** Call Gemini to recommend a template */
async function aiRecommend(
  title: string,
  description: string | null,
  hasImage: boolean,
  sourceName: string | null,
  opts?: {
    hasLogo?: boolean;
    hasBrandColor?: boolean;
    categoryTag?: string;
    disabledIds?: string[];
    preferredIds?: string[];
  }
): Promise<{ templateId: string; reasoning: string; tokenUsage: unknown; costUsd: number | null }> {
  const available = getAvailableTemplates(hasImage, opts?.disabledIds);
  const templateList = available
    .map(t => `- ${t.id} (${t.category}, ${t.layout.archetype}${t.requiresImage ? ', requires image' : ''}): ${t.name} [${t.tags.join(', ')}]`)
    .join('\n');

  const preferredNote = opts?.preferredIds?.length
    ? `\n- Company prefers these templates (give them priority): ${opts.preferredIds.join(', ')}`
    : '';

  const systemPrompt = `You are an OG image template selector for media companies. Given an article's metadata, pick the best template.

Available templates:
${templateList}

Rules:
- If has_image is false, NEVER pick a template that requires image
- Breaking/urgent news → prefer news-* templates
- Data-heavy articles with numbers/stats → prefer stats-* templates
- Opinion pieces, quotes, interviews → prefer editorial/quote templates
- General articles with good photos → prefer photo-* templates
- Articles without images → prefer gradient-* or brand-* templates
- If has_logo is true, prefer templates with prominent logo positions
- If has_brand_color is true, prefer templates that use brand color (check brandColorSlots)
- If category_tag is provided, prefer templates with category badge support
- Consider the source name for brand-appropriate choices
- Vary recommendations — avoid always picking the same template for similar articles${preferredNote}

Respond with JSON only: {"template_id": "...", "reasoning": "..."}`;

  const model = "gemini-2.5-flash-lite";
  const resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              title,
              description: (description || "").substring(0, 200),
              has_image: hasImage,
              source_name: sourceName || "Unknown",
              has_logo: opts?.hasLogo ?? false,
              has_brand_color: opts?.hasBrandColor ?? false,
              category_tag: opts?.categoryTag || null,
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const tokenUsage = extractTokenUsage(data);
  const costUsd = tokenUsage ? estimateCost(model, tokenUsage) : null;

  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed: { template_id?: string; reasoning?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  const templateId = parsed.template_id && getTemplate(parsed.template_id)
    ? parsed.template_id
    : fallbackTemplateId(title, hasImage);

  // Validate: don't pick a requiresImage template if no image
  const chosen = getTemplate(templateId)!;
  const finalId = (chosen.requiresImage && !hasImage) ? fallbackTemplateId(title, false) : templateId;

  return {
    templateId: finalId,
    reasoning: parsed.reasoning || "AI selection",
    tokenUsage,
    costUsd,
  };
}

/** Fetch company OG settings (returns defaults if none exist) */
async function fetchCompanyOgSettings(
  adminClient: ReturnType<typeof createClient>,
  companyId: string
): Promise<{
  visibility: OgVisibilitySettings;
  fontOverride?: OgFontOverride;
  brandColor?: string;
  brandColorSecondary?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  disabledTemplateIds: string[];
  preferredTemplateIds: string[];
}> {
  const { data } = await adminClient
    .from("og_company_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!data) {
    return { visibility: { ...DEFAULT_VISIBILITY }, disabledTemplateIds: [], preferredTemplateIds: [] };
  }

  return {
    visibility: {
      showTitle: data.show_title ?? true,
      showDescription: data.show_description ?? true,
      showAuthor: data.show_author ?? false,
      showDate: data.show_date ?? false,
      showLogo: data.show_logo ?? true,
      showCategoryTag: data.show_category_tag ?? false,
      showSourceName: data.show_source_name ?? true,
    },
    fontOverride: data.font_family ? {
      fontFamily: data.font_family as 'sans' | 'serif' | 'mono',
      fontFamilyTitle: data.font_family_title as 'sans' | 'serif' | 'mono' | undefined,
    } : undefined,
    brandColor: data.brand_color || undefined,
    brandColorSecondary: data.brand_color_secondary || undefined,
    logoUrl: data.logo_url || undefined,
    logoDarkUrl: data.logo_dark_url || undefined,
    disabledTemplateIds: data.disabled_template_ids || [],
    preferredTemplateIds: data.preferred_template_ids || [],
  };
}

/** Render template to PNG buffer using config-driven renderer */
async function renderTemplate(templateId: string, input: TemplateInput): Promise<Uint8Array> {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const fonts = await fontsPromise;
  const rawJsx = await renderFromConfig(template, input);
  // JSON roundtrip strips $typeof Symbols — Satori needs plain objects with fontFamily
  const jsx = JSON.parse(JSON.stringify(rawJsx));

  const svg = await satori(jsx, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width" as const, value: OG_WIDTH },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let userId: string | null = null;
  let companyId: string | null = null;

  try {
    const body = await req.json();
    const { action } = body;

    // Auth: allow service_role or JWT
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const auth = await authorize(req, { allowServiceRole: true });
        userId = auth.userId;
      } catch {
        // Service role calls from rss-poll won't have a user
      }
    }

    // ─── ACTION: recommend ───────────────────────────────────
    if (action === "recommend") {
      const { title, description, hasImage } = body;
      if (!title) {
        return new Response(JSON.stringify({ error: "title is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await aiRecommend(title, description, hasImage ?? false, null);

      await logApiCall(admin, {
        action: "recommend", companyId, userId,
        durationMs: Date.now() - startTime, success: true, statusCode: 200,
        errorMessage: null, tokenUsage: result.tokenUsage, estimatedCostUsd: result.costUsd,
      });

      return new Response(JSON.stringify({
        template_id: result.templateId,
        reasoning: result.reasoning,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: test-render ─────────────────────────────────
    if (action === "test-render") {
      const fonts = await fontsPromise;
      const template = body.templateId ? getTemplate(body.templateId) : null;

      if (template) {
        // Test with real config-driven renderer
        try {
          const { renderFromConfig: renderFn } = await import("./templates/registry.ts");
          const testInput: TemplateInput = {
            title: body.title || 'Test Render',
            description: body.description,
            visibility: { ...DEFAULT_VISIBILITY },
          };
          const jsx = renderFn(template, testInput);

          // If ?inspect, return the JSX tree structure
          if (body.inspect) {
            function inspectElement(el: any, depth = 0): any {
              if (!el || typeof el !== 'object') return el;
              if (Array.isArray(el)) return el.map(c => inspectElement(c, depth));
              const type = typeof el.type === 'string' ? el.type : typeof el.type === 'function' ? el.type.name : String(el.type);
              const style = el.props?.style || {};
              const children = el.props?.children;
              return {
                type, style,
                children: Array.isArray(children) ? children.map((c: any) => inspectElement(c, depth + 1)) : inspectElement(children, depth + 1)
              };
            }
            return new Response(JSON.stringify(inspectElement(jsx), null, 2), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // JSON roundtrip strips $typeof Symbols and other non-serializable props
          const cleanTree = JSON.parse(JSON.stringify(jsx));
          const svg = await satori(cleanTree, { width: 1200, height: 630, fonts });
          const resvg = new Resvg(svg, { fitTo: { mode: "width" as const, value: 1200 } });
          const png = resvg.render().asPng();
          return new Response(png, { headers: { ...corsHeaders, "Content-Type": "image/png" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e), stack: (e as Error).stack }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Minimal test with plain object
      const testJsx = {
        type: 'div',
        props: {
          style: { display: 'flex', fontFamily: 'Inter', width: 1200, height: 630, backgroundColor: '#1e293b', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: 48 },
          children: body.title || 'Test Render'
        }
      };
      const svg = await satori(testJsx as any, { width: 1200, height: 630, fonts });
      const resvg = new Resvg(svg, { fitTo: { mode: "width" as const, value: 1200 } });
      const png = resvg.render().asPng();
      return new Response(png, { headers: { ...corsHeaders, "Content-Type": "image/png" } });
    }

    // ─── ACTION: preview ─────────────────────────────────────
    if (action === "preview") {
      const { templateId, title, description, imageUrl, brandColor, sourceName, author, companyId: previewCompanyId } = body;
      if (!templateId || !title) {
        return new Response(JSON.stringify({ error: "templateId and title required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let imageBase64: string | undefined;
      if (imageUrl) {
        imageBase64 = (await imageToBase64(imageUrl)) || undefined;
      }

      // Optionally load company settings for preview
      let visibility = { ...DEFAULT_VISIBILITY };
      let fontOverride: OgFontOverride | undefined;
      if (previewCompanyId) {
        const settings = await fetchCompanyOgSettings(admin, previewCompanyId);
        visibility = settings.visibility;
        fontOverride = settings.fontOverride;
      }

      let png: Uint8Array;
      try {
        png = await renderTemplate(templateId, {
          title,
          description,
          imageBase64,
          brandColor,
          sourceName,
          author,
          visibility,
          fontOverride,
        });
      } catch (renderErr) {
        const stack = renderErr instanceof Error ? renderErr.stack : String(renderErr);
        console.error("Render error:", stack);
        return new Response(JSON.stringify({ error: String(renderErr), stack }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(png, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ─── ACTION: generate / regenerate ───────────────────────
    if (action === "generate" || action === "regenerate") {
      const { feedItemId, templateId: overrideTemplateId } = body;
      if (!feedItemId) {
        return new Response(JSON.stringify({ error: "feedItemId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch feed item + feed info
      const { data: item, error: itemError } = await admin
        .from("rss_feed_items")
        .select("*, rss_feeds!inner(name, company_id)")
        .eq("id", feedItemId)
        .single();

      if (itemError || !item) {
        return new Response(JSON.stringify({ error: "Feed item not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Skip if already generated (unless regenerate)
      if (action === "generate" && item.og_image_url) {
        return new Response(JSON.stringify({
          og_image_url: item.og_image_url,
          template_id: item.og_template_id,
          reasoning: item.og_ai_reasoning,
          skipped: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const feed = item.rss_feeds as { name: string; company_id: string };
      companyId = feed.company_id;

      // Fetch company OG settings + article image in parallel
      const [ogSettings, articleImageB64] = await Promise.all([
        fetchCompanyOgSettings(admin, companyId),
        item.image_url ? imageToBase64(item.image_url) : Promise.resolve(null),
      ]);
      const imageBase64 = articleImageB64 || undefined;
      const hasImage = !!imageBase64;

      // Fetch logo images if company has them
      let logoBase64: string | undefined;
      let logoDarkBase64: string | undefined;
      if (ogSettings.logoUrl) {
        logoBase64 = (await imageToBase64(ogSettings.logoUrl)) || undefined;
      }
      if (ogSettings.logoDarkUrl) {
        logoDarkBase64 = (await imageToBase64(ogSettings.logoDarkUrl)) || undefined;
      }

      // Determine template
      let chosenTemplateId: string;
      let reasoning: string;
      let tokenUsage: unknown = null;
      let costUsd: number | null = null;

      if (overrideTemplateId && getTemplate(overrideTemplateId)) {
        chosenTemplateId = overrideTemplateId;
        reasoning = "User override";
      } else {
        try {
          const aiResult = await aiRecommend(
            item.title || "Untitled",
            item.description,
            hasImage,
            feed.name,
            {
              hasLogo: !!logoBase64,
              hasBrandColor: !!ogSettings.brandColor,
              categoryTag: item.category || undefined,
              disabledIds: ogSettings.disabledTemplateIds,
              preferredIds: ogSettings.preferredTemplateIds,
            }
          );
          chosenTemplateId = aiResult.templateId;
          reasoning = aiResult.reasoning;
          tokenUsage = aiResult.tokenUsage;
          costUsd = aiResult.costUsd;
        } catch (err) {
          console.warn("AI recommendation failed, using fallback:", err);
          chosenTemplateId = fallbackTemplateId(item.title || "Untitled", hasImage);
          reasoning = "Fallback (AI unavailable)";
        }
      }

      // Build full TemplateInput with company settings
      const templateInput: TemplateInput = {
        title: item.title || "Untitled",
        description: item.description || undefined,
        author: item.author || undefined,
        imageBase64,
        sourceName: feed.name,
        publishedAt: item.published_at || undefined,
        brandColor: ogSettings.brandColor,
        brandColorSecondary: ogSettings.brandColorSecondary,
        logoBase64,
        logoDarkBase64,
        categoryTag: item.category || undefined,
        visibility: ogSettings.visibility,
        fontOverride: ogSettings.fontOverride,
      };

      // Render PNG
      const png = await renderTemplate(chosenTemplateId, templateInput);

      // Upload to storage
      const storagePath = `og/${companyId}/${feedItemId}.png`;
      const { error: uploadError } = await admin.storage
        .from("post-images")
        .upload(storagePath, png, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = admin.storage
        .from("post-images")
        .getPublicUrl(storagePath);

      const ogImageUrl = urlData.publicUrl;

      // Update feed item
      const { error: updateError } = await admin
        .from("rss_feed_items")
        .update({
          og_image_url: ogImageUrl,
          og_template_id: chosenTemplateId,
          og_ai_reasoning: reasoning,
        })
        .eq("id", feedItemId);

      if (updateError) {
        console.error("Failed to update feed item:", updateError);
      }

      await logApiCall(admin, {
        action: action === "regenerate" ? "regenerate" : "generate",
        companyId, userId,
        durationMs: Date.now() - startTime, success: true, statusCode: 200,
        errorMessage: null, tokenUsage, estimatedCostUsd: costUsd,
      });

      return new Response(JSON.stringify({
        og_image_url: ogImageUrl,
        template_id: chosenTemplateId,
        reasoning,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: list-templates ──────────────────────────────
    if (action === "list-templates") {
      const templates = getAllTemplates().map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        requiresImage: t.requiresImage,
        tags: t.tags,
        archetype: t.layout.archetype,
        theme: t.layout.theme,
      }));

      return new Response(JSON.stringify({ templates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OG image generator error:", msg);

    await logApiCall(admin, {
      action: "error", companyId, userId,
      durationMs: Date.now() - startTime, success: false, statusCode: 500,
      errorMessage: msg, tokenUsage: null, estimatedCostUsd: null,
    });

    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
