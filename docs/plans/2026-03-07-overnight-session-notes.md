# Overnight Session Notes — Content Page Overhaul

## Concerns & Questions for Morning Review

### Architecture Concerns
1. **`app_role` is a Postgres enum** — adding new values requires `ALTER TYPE app_role ADD VALUE`. This is non-reversible in Postgres (can't remove enum values). Need to be confident in the 5 role names before migration.
2. **Article-post linking is fragile** — `ContentV2.tsx` uses title matching (~line 66). Plan adds explicit FK but this means existing data won't be linked until backfill runs.
3. **Gemini rate limits during backfill** — running AI classification on all existing `rss_feed_items` could hit Gemini API limits. Need batch processing with delays.
4. **ImageKit account setup** — plan assumes ImageKit account exists. Need credentials and URL endpoint before Phase 4.
5. **Courier notification templates** — Breaking News and Performance Alerts need Courier templates created in the Courier dashboard, not just code.

### Implementation Decisions Made During Session
(Will be populated as work progresses)

### Issues Encountered
(Will be populated as work progresses)

### Questions Parked for Tomorrow
(Will be populated as work progresses)
