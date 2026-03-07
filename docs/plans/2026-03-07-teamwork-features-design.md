# Teamwork Features — Design Document

> **Date:** 2026-03-07
> **Source:** `C:\Users\alana\Downloads\teamwork-features.json`
> **Architecture:** Option B — Dedicated team section + inline integration

## Overview

9 remaining teamwork features for the Social Suite inbox. Team-centric views (queue, workload, activity feed, metrics) get a dedicated `/app/inbox/team` route. Collision detection and correction pipeline integrate inline into the existing inbox. Notification preferences go in Settings.

## Already Built (Sprint 1 + Done)

- Member picker for assignment (`MemberPicker.tsx`)
- @mentions in internal notes (`mentions.ts`)
- Assignment notifications (`notifications.ts` + `send-in-app-notification`)
- @mention notifications (same system)
- Emoji reactions (`MessageReactions.tsx` + `useMessageReactions.ts`)
- Team read receipts (`ReadReceiptAvatars.tsx` + `useReadReceipts.ts`)

## Features to Build

### 1. Assignment Queue (#13) — Sprint 1, S effort

Add "My Queue" tab to inbox topbar. AG Grid table showing assigned conversations with columns: subject, platform, priority, status, assigned date, last activity, sentiment. Filters: assigned to me, unassigned, all team. Sort by priority then last activity. Click row opens conversation in thread panel.

**Files:**
- Create: `src/components/inbox/AssignmentQueue.tsx`
- Modify: `src/pages/Inbox.tsx` (add tab)

**Data:** Reads existing `inbox_conversations` table filtered by `assigned_to`.

### 2. Team Workload Dashboard (#12) — Sprint 2, M effort

New page at `/app/inbox/team`. Cards per team member showing avatar, name, assigned count, avg response time, resolved today. Bar chart of assignments per member (Recharts). Table of all assignments with member, conversation, status, age.

**Files:**
- Create: `src/pages/TeamWorkload.tsx`
- Create: `src/hooks/useTeamWorkload.ts`
- Modify: `src/App.tsx` (add route)

**Data:** Aggregates from `inbox_conversations` joined with `company_memberships` and `profiles`.

### 3. Team Activity Feed (#15) — Sprint 3, M effort

New `inbox_activity_log` table tracking team actions. Actions: assigned, status_changed, replied, noted, labeled, escalated. Written by existing mutation hooks. UI: vertical timeline with avatar + action + timestamp. Lives as a panel in the team workload page.

**Files:**
- Create: `supabase/migrations/YYYYMMDD_inbox_activity_log.sql`
- Create: `src/hooks/useActivityFeed.ts`
- Create: `src/components/inbox/ActivityFeed.tsx`
- Modify: mutation hooks to insert activity log entries

**Table:**
```sql
CREATE TABLE public.inbox_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('assigned','status_changed','replied','noted','labeled','escalated','correction_created','correction_resolved')),
  conversation_id uuid REFERENCES inbox_conversations(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_log_company ON inbox_activity_log(company_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON inbox_activity_log(company_id, user_id);

ALTER TABLE inbox_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view activity" ON inbox_activity_log
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Company members can insert activity" ON inbox_activity_log
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
```

### 4. Collision Detection (#18) — Sprint 3, M effort

Supabase Realtime Presence — no new tables. Each user broadcasts `{ conversationId, userId, userName, action: 'viewing' | 'typing' }`. Banner at top of thread panel: "Sarah is also viewing" or "Sarah is typing a reply...". Yellow warning if two people compose simultaneously.

**Files:**
- Create: `src/hooks/useConversationPresence.ts`
- Create: `src/components/inbox/PresenceBanner.tsx`
- Modify: `src/pages/Inbox.tsx` (add banner)
- Modify: `src/components/inbox/MessageComposer.tsx` (broadcast typing state)

**Implementation:**
```typescript
const channel = supabase.channel(`inbox:${companyId}`, { config: { presence: { key: `user:${userId}` } } });
channel.on('presence', { event: 'sync' }, () => { /* update presence state */ });
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({ conversationId, userId, userName, action: 'viewing' });
  }
});
```

### 5. Correction Compliance Pipeline (#28) — Sprint 3, L effort

New `corrections` table for tracking correction requests. Flag conversation as correction request from header. Simple status flow: open → in_progress → resolved → rejected. When resolved, option to notify original complainants.

**Files:**
- Create: `supabase/migrations/YYYYMMDD_corrections.sql`
- Create: `src/hooks/useCorrections.ts`
- Create: `src/components/inbox/CorrectionBadge.tsx`
- Create: `src/components/inbox/CorrectionsPanel.tsx`
- Modify: `src/components/inbox/ConversationHeader.tsx` (add correction button)

**Table:**
```sql
CREATE TABLE public.corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  conversation_id uuid NOT NULL REFERENCES inbox_conversations(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','rejected')),
  assigned_to uuid REFERENCES auth.users(id),
  reporter_contact_ids uuid[] DEFAULT '{}',
  notes text,
  resolution_summary text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_corrections_company ON corrections(company_id, status);

ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage corrections" ON corrections
  FOR ALL USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
```

### 6. Notification Preferences (#25) — Sprint 4, M effort

New `notification_preferences` table. UI in Settings page: table with toggles per event type × channel. Check preferences before sending notifications.

**Files:**
- Create: `supabase/migrations/YYYYMMDD_notification_preferences.sql`
- Create: `src/hooks/useNotificationPreferences.ts`
- Create: `src/components/settings/NotificationPreferencesTab.tsx`
- Modify: `supabase/functions/send-in-app-notification/index.ts` (check prefs)

**Table:**
```sql
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  event_type text NOT NULL CHECK (event_type IN ('assignment','mention','reply','status_change','correction','escalation','sla_breach')),
  in_app boolean DEFAULT true,
  email boolean DEFAULT false,
  PRIMARY KEY (user_id, company_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());
```

**Default:** All in-app enabled, all email disabled. Row created on first toggle.

### 7. Beat/Desk Routing (#26) — Sprint 4, L effort

New `routing_rules` table mapping AI categories to team members. Admin UI to configure rules. Hook into inbox-sync classification step for auto-assignment.

**Files:**
- Create: `supabase/migrations/YYYYMMDD_routing_rules.sql`
- Create: `src/hooks/useRoutingRules.ts`
- Create: `src/components/inbox/RoutingRules.tsx`
- Modify: `supabase/functions/inbox-sync/index.ts` (auto-assign after classify)

**Table:**
```sql
CREATE TABLE public.routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  category text NOT NULL,
  subcategory text,
  assigned_to uuid REFERENCES auth.users(id),
  desk_name text,
  priority_override text CHECK (priority_override IN ('low','normal','high','urgent')),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_routing_rules_company ON routing_rules(company_id, enabled);

ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage routing" ON routing_rules
  FOR ALL USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
```

### 8. Team Performance Metrics (#20) — Sprint 5, L effort

Analytics computed from `inbox_activity_log` + `inbox_conversations`. Metrics: avg first response time, avg resolution time, conversations per member, sentiment distribution. Time range selector. Per-member breakdown + team summary cards.

**Files:**
- Create: `src/components/inbox/TeamMetrics.tsx`
- Create: `src/hooks/useTeamMetrics.ts`
- Modify: `src/pages/TeamWorkload.tsx` (add metrics tab)

**Data:** SQL aggregation queries on `inbox_activity_log` and `inbox_conversations`.

### 9. Cross-Outlet Assignment (#29) — Sprint 5, M effort

Leverage `media_company_children` to show members from sibling outlets in MemberPicker. Add `cross_outlet_source` column to `inbox_conversations`. Conversation appears in assignee's inbox regardless of outlet.

**Files:**
- Create: `supabase/migrations/YYYYMMDD_cross_outlet_assignment.sql`
- Create: `src/hooks/useCrossOutletMembers.ts`
- Modify: `src/components/inbox/MemberPicker.tsx` (show cross-outlet members)
- Modify: `src/hooks/useInboxConversations.ts` (include cross-assigned)

**Migration:**
```sql
ALTER TABLE inbox_conversations ADD COLUMN cross_outlet_source uuid REFERENCES companies(id);
CREATE INDEX idx_inbox_conv_cross_outlet ON inbox_conversations(cross_outlet_source) WHERE cross_outlet_source IS NOT NULL;
```

## Database Summary

| Table | Feature | New? |
|-------|---------|------|
| `inbox_activity_log` | Activity feed + metrics | New |
| `corrections` | Correction pipeline | New |
| `notification_preferences` | Notification settings | New |
| `routing_rules` | Beat/desk routing | New |
| `inbox_conversations` | Cross-outlet assignment | Alter (add column) |

## Demo Data

All 9 features get fixtures in `demo-data.ts` + cache entries in `DemoDataProvider.tsx`.

## Dead Code Cleanup

`RealTimeCollaboration.tsx` is dead code (imports server-only ioredis, all mock data, never imported). Should be removed.
