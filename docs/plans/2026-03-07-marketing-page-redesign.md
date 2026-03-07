# Marketing Page — Design & Implementation Notes

## Current State (2026-03-07)
- **File**: `src/pages/MarketingPage.tsx` (single file, ~1050 lines)
- **Route**: `/marketing` (eagerly imported in App.tsx)
- **CSS**: `scroll-behavior: smooth` added to `html` in `src/index.css`
- **No external dependencies** — pure React + Lucide + react-icons, CSS-only visuals

## Design Direction
- **ICP**: Media companies & publishers — newsroom editors, social media managers, media group executives
- **Aesthetic**: Clean, warm, approachable. NOT developer-focused. Light backgrounds (~90%), ONE dark section (competitive matrix)
- **Inspiration**: Framer.com — hero showcases output quality, value props as bold single-word scroll sections, spacious layout
- **Conversion pattern**: Single CTA "Book a Demo" everywhere. "No credit card. No commitment."

## Architecture — CSS Variable Theme System
All colors flow through CSS custom properties (`var(--m-*)`). No hardcoded Tailwind color classes for page-level styling. Components use inline `style` props referencing variables.

### Variables (14 total)
```
--m-bg, --m-bg-alt, --m-bg-accent, --m-bg-dark, --m-surface, --m-border,
--m-text, --m-text-secondary, --m-text-muted,
--m-accent, --m-accent-hover, --m-accent-light, --m-accent-subtle,
--m-heading-font, --m-body-font
```

### How it works
- Palette vars applied as **inline style** on `.marketing-page` div (not via `<style>` tag — that caused flicker/revert bugs)
- Font rules in a static `<style>` tag (fontCSS) — these don't change between palettes
- Selection persisted to `localStorage` key `marketing-palette`
- `getSavedPalette()` reads on mount, `handleChange()` writes on selection

### Current Palettes (6)
1. **Warm Editorial** — amber/stone, the original warm editorial feel (`#d97706`)
2. **Ocean** — bright sky blue, airy (`#0284c7`) — USER FAVORITE
3. **Ocean Deep** — darker cyan, more editorial weight (`#0e7490`)
4. **Ocean Slate** — neutral slate grays + vivid blue, corporate/professional (`#2563eb`)
5. **Ocean Storm** — blue-violet indigo, dramatic, premium (`#4f46e5`)
6. **Ocean Mist** — green-blue teal, fresh and calm (`#0d9488`)

User liked Ocean the most. 4 variations created to test different tones. Final palette TBD.

## Page Structure (9 Sections)

### 1. Nav + Hero
- Fixed nav: Logo | Features | Publishers | Compare | Book a Demo
- Two-column layout: left copy, right social post card showcase
- 4 CSS-drawn social post cards (Facebook, X, LinkedIn, Instagram) with floating animation
- Each card shows a different platform with platform-colored top bar, headline, engagement metrics
- Trust strip: 10+ Platforms / 90% Time Saved / 24/7 Automation / 60s AI Audit

### 2. The Problem
- 4 white cards on `var(--m-bg)` -> `var(--m-bg-alt)` gradient
- Pain points: 6 tools/8 platforms, unanswered comments, lost insights, zero bandwidth

### 3. Pipeline — "How It Works"
- Horizontal timeline (desktop) / grid (mobile) on `var(--m-bg-alt)`
- 8 steps with icon circles, dashed connecting line
- First 2 steps use accent fill, rest use outlined style

### 4. Value Props — Framer-style (THE CENTERPIECE)
- 4 full-width alternating sections with bold single-word headings
- Each has a CSS-drawn visual on the opposite side

| Section | Heading | Visual Component |
|---------|---------|-----------------|
| 4a | "Automate." | `AutomateVisual` — pipeline mini-diagram (Article -> AI -> Posts -> Published) |
| 4b | "Understand." | `UnderstandVisual` — inbox mockup with AI-classified messages (Lead/Crisis/Low priority) |
| 4c | "Publish." | `PublishVisual` — 3 platform-adapted post cards (LinkedIn/X/Instagram) |
| 4d | "Scale." | `ScaleVisual` — org chart with parent -> child publications + rollup stats |

- "Scale." section has **"Only on Longtale"** badge — the exclusive differentiator

### 5. For Publishers — Use Cases
- 4 white cards on `var(--m-bg-accent)` (light amber tint)
- Left accent border on each card
- Daily Newspaper (20hrs/week saved), Digital-First (compete 10x), Regional Media Group (Enterprise), National Network (Enterprise)
- Regional + National get "Enterprise" pill badge

### 6. Platform Grid
- 10 platforms with brand-colored icons on `var(--m-bg)`
- Facebook, Instagram, X/Twitter, LinkedIn, TikTok, YouTube, Bluesky, Threads, Pinterest, Reddit

### 7. Competitive Matrix (THE ONE DARK SECTION)
- `var(--m-bg-dark)` background
- 6 competitors x 11 features table, horizontal scroll mobile
- Longtale column highlighted with accent
- "Media Company Hierarchy" and "Ad Network" rows marked "Exclusive" (only Longtale has these)
- `CellDisplay` component renders full/yes/partial/no/text cells

### 8. AI Audit CTA
- Soft gradient `var(--m-accent-subtle)` -> `var(--m-accent-light)`
- "See what your newsroom is missing" headline
- 4 small cards: Sentiment Analysis, Posting Windows, Content Decay, Editorial Leads

### 9. Trust + Footer
- 4 trust cards (multi-tenant isolation, RLS, RBAC, enterprise infra) on `var(--m-bg)`
- Footer: logo, Product/Company/Legal columns, social icons

## Theme Picker UI
- Floating button bottom-right corner (accent-colored circle with Palette icon)
- Click expands panel showing all palettes with color swatch dots + checkmark on active
- Panel styled with `var(--m-*)` so it matches the active theme
- Closes on selection

## Key Components (internal to file)
- `useReveal()` — IntersectionObserver hook, fires once, disconnects
- `RevealSection` — wrapper with fade-in + translate-y animation, configurable delay
- `SocialPostCard` — hero showcase card with platform bar, text, metric
- `ValuePropSection` — reusable full-width alternating layout (heading + description + visual)
- `AutomateVisual`, `UnderstandVisual`, `PublishVisual`, `ScaleVisual` — section-specific visuals
- `ThemePicker` — floating palette selector
- `CellDisplay` — comparison table cell renderer

## Bugs Fixed
- **Theme revert on selection**: Was using `<style>` tag injection which caused browser to tear down/re-apply CSS on content change. Fixed by applying palette vars as inline `style` prop on the container div.
- **No persistence**: Theme selection reset on HMR/reload. Fixed by persisting to `localStorage`.
- **Hardcoded amber in dark section**: Comparison table had hardcoded `text-amber-*` / `bg-amber-*` Tailwind classes that didn't respond to palette changes. Replaced with `var(--m-accent)` references.

## Future Ideas / Next Steps
- **Final palette selection** — user is testing Ocean variations, needs to pick one
- **Responsive polish** — verify at 375px, 768px, 1440px breakpoints
- **Hero cards on mobile** — currently hidden (`hidden lg:block`), could show a simpler 2-card stack
- **Lazy loading** — MarketingPage is eagerly imported; could lazy-load since it's a standalone marketing route
- **Animation refinement** — add staggered entrance to pipeline steps, parallax on hero cards
- **Real social proof** — replace placeholder metrics with real customer data when available
- **A/B testing** — palette picker could feed into PostHog to track which palette converts better
- **Dark mode variant** — could add a full dark palette option (not just the one dark section)
- **CTA destination** — currently `mailto:hello@longtale.ai`, should become a proper booking form (Calendly/HubSpot)
- **SEO meta tags** — page has no `<title>` or meta description override yet
- **OG image** — when OG generator ships, create a branded OG image for the marketing page
