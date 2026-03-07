# GetLate Changelog Tracker

Last checked: 2026-03-07

## Adopted

| Date | Feature | Status | Our Implementation |
|------|---------|--------|--------------------|
| 2026-02-11 | Interactive messaging (quick replies, buttons, carousels) | Partial | `getlate-inbox` supports send message but not interactive features yet |
| 2026-02-11 | Instagram DM profile context (instagramProfile) | Not yet | Could show follower count/verification in contact panel |
| 2026-02-04 | Twitter/X inbox support (DMs + comments) | Adopted | inbox-sync handles all platforms via profileId |
| 2026-01-28 | Private reply to comment | Not yet | Could add to comment actions in ConversationThread |

## Should Adopt

| Date | Feature | Classification | Recommendation |
|------|---------|---------------|----------------|
| 2026-03-06 | Post recycling (`recycling` on POST/PUT /v1/posts) | nice-to-have | Auto-repost feature. Not urgent but useful for content strategy page. |
| 2026-03-03 | Post analytics timeline (`/analytics/post-timeline`) | should-adopt | Daily metrics per post — could power a "post performance over time" chart in analytics. |
| 2026-02-27 | Validation endpoints (`/tools/validate/*`) | should-adopt | Pre-flight content validation before publishing. Would improve post compose UX with real-time validation feedback. |
| 2026-02-26 | Analytics daily-metrics, best-time, content-decay, posting-frequency | should-adopt | We already have analytics widgets for these. Verify our hooks call these exact endpoints. |
| 2026-02-16 | Facebook Reels posting | nice-to-have | Add `contentType: 'reel'` option to post composer when Facebook is selected. |
| 2026-02-16 | Post unpublish endpoint | should-adopt | `POST /v1/posts/{postId}/unpublish` — add "Delete from platform" action to published posts. |
| 2026-02-16 | Private reply for Facebook comments | should-adopt | Extend private reply support (already have Instagram) to Facebook comments. |
| 2026-02-11 | Instagram profile context on DMs | should-adopt | Show follower count, verification badge, isFollower status in inbox contact panel. Valuable for prioritization. |
| 2026-02-05 | Google Business Profile endpoints | nice-to-have | Location management, media, attributes, food menus. Only relevant when GBP accounts are connected. |
| 2026-02-03 | Analytics `source` filter (late vs external) | should-adopt | Filter analytics by posts published via us vs natively. Useful for demonstrating our platform's value. |
| 2026-02-02 | Error categorization on failed posts | should-adopt | `errorCategory`, `errorSource`, `errorMessage` — surface these in post management UI for better error handling. |

## Not Relevant (Current Phase)

| Date | Feature | Reason |
|------|---------|--------|
| 2026-03-06 | `DELETE /inbox/comments/{postId}` 400 response | Minor error code change, already handled |
| 2026-02-20 | LinkedIn document title | Low priority platform feature |
| 2026-02-18 | Scoped API keys | Only relevant if we offer sub-accounts to our users |
| 2026-02-15 | Google Business languageCode | Minor, auto-detected works fine |
| 2026-02-12 | Reddit post flairs | Low priority platform feature |
| 2026-02-10 | Publishing/connection logs endpoints | Internal debugging, not user-facing |
| 2026-01-30 | Multi-page/multi-location posting | Enterprise feature, not needed yet |
| 2026-01-25 | 409 duplicate content detection | Good to handle but not blocking |
| 2026-01-25 | YouTube madeForKids | Niche use case |
| 2026-01-23 | latePostId in analytics | We already correlate via our own post IDs |
| 2026-01-22 | LinkedIn headless OAuth change | Breaking change but we use standard OAuth flow |
| 2026-01-21 | Instagram Reel thumbOffset | Minor platform feature |
| 2026-01-18 | account.connected webhook | Nice but not urgent |
| 2026-01-15 | YouTube daily views | Niche analytics endpoint |
| 2026-01-15 | Auto media compression | Transparent improvement, no code change needed |
| 2026-01-14 | Clone connection removal | Breaking change but we didn't use this |
| 2026-01-12 | YouTube AI content disclosure | Niche compliance feature |
| 2026-01-09 | Instagram Reel audioName | Minor platform feature |
| 2026-01-07 | Instagram trial Reels | Minor platform feature |
| 2026-01-05 | Publishing logs endpoints | Internal debugging |
| 2026-01-05 | Pinterest headless board selection | Low priority platform |
| 2026-01-05 | LinkedIn mentions resolver | Nice for post composer but not blocking |
| 2026-01-01 | includeOverLimit on profiles/accounts | Plan management, not user-facing |
| 2025-12-30 | account.disconnected webhook payload | Already have webhook handling |
