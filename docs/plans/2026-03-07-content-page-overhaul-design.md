# Content Page Overhaul — Design Document

## Context

The Content page is the core of Social Suite — where media companies manage their social content pipeline from RSS ingestion through publishing. After a comprehensive feature audit (56 features across 7 categories, benchmarked against 14 competitors), the user prioritized 19 features for immediate implementation.

## Design Decisions

### Terminology
- **Broadcast** = one piece of content sent to multiple platform posts (native to GetLate's `accountIds[]`)
- **Article** = RSS source article with one or more Broadcasts
- **Campaign** = planned group of 3-7 related posts (manual grouping v1)

### Calendar Enhancement (enhancement, NOT rebuild)
- Article-first: articles as large cards at publish date, posts as smaller cards at scheduled time
- Hover article -> post preview with edit/approve/publish actions
- Hover post -> highlights parent article
- Toggle: All / Articles only / Posts only
- Keep existing dnd-kit, CalendarCard, CalendarSidebar, CalendarFilters

### RBAC + Per-User Overrides
- 5 roles: Owner, Admin, Manager, Collaborator, Community Manager
- Default permission sets per role, per-user toggles to override
- Extends existing `company_memberships` (currently owner/admin/member)

### Feature Configuration
- Every feature reads from `company_feature_config` table
- Settings page design deferred to separate session

### Key Decisions
| Decision | Choice |
|----------|--------|
| Throttling | Per-company global, warn but allow override |
| Breaking News | Publish + notify admins via Courier, mark as pulled (don't delete) |
| Quality Checker | Advisory on save, blocking on publish, applies to auto-generated |
| Evergreen | AI classify at ingest + manual override, feature-gated |
| Evergreen free tier | Throwback Thursday (one auto-suggested post/week) |
| Media library | ImageKit embedded widget |
| Campaigns | Manual grouping v1 |
| Brand Voice Learning | M effort (Gemini analysis), XL deferred |
| Byline storage | `journalists` table (not text field) |
| Data migration | Full backfill (bylines + AI evergreen classification) |
| Alerts | Courier multi-channel |
| First Comment | Verify GetLate API first |

## Deferred to Linear
- Multi-Outlet Distribution, Syndication Rules, Article-to-Thread Generator, Brand Voice Learning XL

## Implementation Plan
See: `C:\Users\alana\.claude\plans\hashed-chasing-noodle.md`
