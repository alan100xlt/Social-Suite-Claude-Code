# Teamwork Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all 9 remaining teamwork features for the Social Suite inbox — assignment queue, team workload dashboard, activity feed, collision detection, correction compliance, notification preferences, beat/desk routing, team metrics, and cross-outlet assignment.

**Architecture:** Option B — Dedicated `/app/inbox/team` route for team-centric views (workload, activity, metrics). Collision detection and correction pipeline integrate inline into existing inbox. Notification preferences go in Settings.

**Tech Stack:** React 18, TypeScript, Supabase (Postgres + Realtime Presence), TanStack Query v5, AG Grid Community, Recharts, Shadcn/ui

**Design Reference:** None — no visual design. Follow existing inbox UI patterns.

---

## Phase 0: Database Migrations (4 new tables + 1 ALTER)

All 4 migrations must deploy before any frontend work begins.

### Task 0.1: Create `inbox_activity_log` table

**Files:**
- Create: `supabase/migrations/20260308040000_inbox_activity_log.sql`

**Step 1: Write migration**

```sql
-- Team activity feed: logs all team actions on inbox conversations
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

**Step 2: Deploy**
```bash
npx supabase db push
```

**Step 3: Verify**
Run: `npx supabase db push --dry-run`
Expected: "No changes to push"

### Task 0.2: Create `corrections` table

**Files:**
- Create: `supabase/migrations/20260308040001_corrections.sql`

**Step 1: Write migration**

```sql
-- Correction compliance pipeline
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

### Task 0.3: Create `notification_preferences` table

**Files:**
- Create: `supabase/migrations/20260308040002_notification_preferences.sql`

**Step 1: Write migration**

```sql
-- Per-user notification preferences
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

### Task 0.4: Create `routing_rules` table

**Files:**
- Create: `supabase/migrations/20260308040003_routing_rules.sql`

**Step 1: Write migration**

```sql
-- Beat/desk routing rules
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

### Task 0.5: ALTER `inbox_conversations` for cross-outlet

**Files:**
- Create: `supabase/migrations/20260308040004_cross_outlet_assignment.sql`

**Step 1: Write migration**

```sql
-- Cross-outlet assignment support
ALTER TABLE inbox_conversations ADD COLUMN IF NOT EXISTS cross_outlet_source uuid REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_cross_outlet ON inbox_conversations(cross_outlet_source) WHERE cross_outlet_source IS NOT NULL;
```

### Task 0.6: Deploy all migrations + regen types

**Step 1: Deploy**
```bash
npx supabase db push
```

**Step 2: Regen types**
```bash
npx supabase gen types typescript --project-id "$VITE_SUPABASE_PROJECT_ID" > src/integrations/supabase/types.ts
```

**Step 3: Type check**
```bash
npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add supabase/migrations/2026030804* src/integrations/supabase/types.ts
git commit -m "feat: add teamwork tables — activity_log, corrections, notification_preferences, routing_rules, cross_outlet"
```

---

## Phase 1: Assignment Queue (#13)

AG Grid table showing assigned conversations as a "My Queue" tab in inbox topbar.

### Task 1.1: Write unit test for AssignmentQueue

**Files:**
- Create: `src/test/assignment-queue.test.ts`

**Step 1: Write test**

```typescript
import { describe, test, expect } from 'vitest';

describe('AssignmentQueue', () => {
  test('module exports AssignmentQueue component', async () => {
    const mod = await import('@/components/inbox/AssignmentQueue');
    expect(mod.AssignmentQueue).toBeDefined();
  });
});
```

**Step 2: Run — should fail (RED)**
```bash
npm run test -- --run src/test/assignment-queue.test.ts
```

### Task 1.2: Create AssignmentQueue component

**Files:**
- Create: `src/components/inbox/AssignmentQueue.tsx`

```typescript
import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { InboxConversation } from '@/lib/api/inbox';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AssignmentQueueProps {
  conversations: InboxConversation[];
  currentUserId?: string;
  onSelectConversation: (id: string) => void;
  filter: 'mine' | 'unassigned' | 'all';
}

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function AssignmentQueue({ conversations, currentUserId, onSelectConversation, filter }: AssignmentQueueProps) {
  const filtered = useMemo(() => {
    let result = conversations;
    if (filter === 'mine') result = result.filter(c => c.assigned_to === currentUserId);
    else if (filter === 'unassigned') result = result.filter(c => !c.assigned_to);
    return [...result].sort((a, b) => {
      const pa = priorityOrder[a.priority || 'normal'] ?? 2;
      const pb = priorityOrder[b.priority || 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.last_activity_at || b.updated_at).getTime() - new Date(a.last_activity_at || a.updated_at).getTime();
    });
  }, [conversations, currentUserId, filter]);

  const columnDefs: ColDef[] = useMemo(() => [
    { field: 'subject', headerName: 'Subject', flex: 2, minWidth: 200,
      valueGetter: (p: any) => p.data?.subject || p.data?.contact_name || 'No subject' },
    { field: 'platform', headerName: 'Platform', width: 110,
      cellRenderer: (p: any) => <Badge variant="outline" className="capitalize">{p.value}</Badge> },
    { field: 'priority', headerName: 'Priority', width: 100,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = { urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', normal: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-800' };
        return <Badge className={colors[p.value || 'normal'] || colors.normal}>{p.value || 'normal'}</Badge>;
      }},
    { field: 'status', headerName: 'Status', width: 100 },
    { field: 'sentiment', headerName: 'Sentiment', width: 110 },
    { field: 'last_activity_at', headerName: 'Last Activity', width: 150,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '-' },
  ], []);

  return (
    <div className="ag-theme-alpine h-full w-full" style={{ minHeight: 400 }}>
      <AgGridReact
        rowData={filtered}
        columnDefs={columnDefs}
        domLayout="autoHeight"
        rowSelection="single"
        onRowClicked={(e) => e.data?.id && onSelectConversation(e.data.id)}
        getRowId={(p) => p.data.id}
        suppressCellFocus
      />
    </div>
  );
}
```

**Step 3: Run test — should pass (GREEN)**
```bash
npm run test -- --run src/test/assignment-queue.test.ts
```

### Task 1.3: Add "My Queue" tab to Inbox page

**Files:**
- Modify: `src/pages/Inbox.tsx`

**Step 1: Add import at top (after existing inbox imports)**
```typescript
import { AssignmentQueue } from '@/components/inbox/AssignmentQueue';
```

**Step 2: Add state for queue view**
After the `flaggedIds` state (~line 76), add:
```typescript
const [viewMode, setViewMode] = useState<'conversations' | 'queue'>('conversations');
const [queueFilter, setQueueFilter] = useState<'mine' | 'unassigned' | 'all'>('mine');
```

**Step 3: Add tab toggle in the topbar filter row**
Add a segmented toggle between the search bar and the type tabs that switches `viewMode`.

**Step 4: Render AssignmentQueue when viewMode === 'queue'**
In the main content area, conditionally render `<AssignmentQueue>` instead of `<ConversationList>` when in queue mode.

**Step 5: Commit**
```bash
git commit -am "feat: assignment queue tab in inbox (#13)"
```

---

## Phase 2: Activity Feed + Activity Logging (#15)

### Task 2.1: Create useActivityFeed hook

**Files:**
- Create: `src/hooks/useActivityFeed.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { supabase } from '@/integrations/supabase/client';

export type ActivityAction = 'assigned' | 'status_changed' | 'replied' | 'noted' | 'labeled' | 'escalated' | 'correction_created' | 'correction_resolved';

export interface ActivityEntry {
  id: string;
  company_id: string;
  user_id: string;
  action: ActivityAction;
  conversation_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined fields
  user_name?: string;
  user_avatar?: string;
}

export function useActivityFeed(limit = 50) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['activity-feed', selectedCompanyId, limit],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('inbox_activity_log')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ActivityEntry[];
    },
    enabled: !!selectedCompanyId && !isDemo,
    staleTime: 30000,
  });
}

export function useLogActivity() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, conversationId, metadata }: { action: ActivityAction; conversationId?: string; metadata?: Record<string, any> }) => {
      if (!selectedCompanyId) throw new Error('No company');
      const { error } = await supabase
        .from('inbox_activity_log')
        .insert({
          company_id: selectedCompanyId,
          user_id: (await supabase.auth.getUser()).data.user!.id,
          action,
          conversation_id: conversationId || null,
          metadata: metadata || {},
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-feed', selectedCompanyId] });
    },
  });
}
```

### Task 2.2: Create ActivityFeed component

**Files:**
- Create: `src/components/inbox/ActivityFeed.tsx`

A vertical timeline of team actions. Each entry: avatar + action text + relative timestamp. Grouped by date. Color-coded by action type.

```typescript
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionLabels: Record<string, { label: string; color: string }> = {
  assigned: { label: 'assigned', color: 'bg-blue-100 text-blue-800' },
  status_changed: { label: 'changed status', color: 'bg-green-100 text-green-800' },
  replied: { label: 'replied', color: 'bg-purple-100 text-purple-800' },
  noted: { label: 'added note', color: 'bg-yellow-100 text-yellow-800' },
  labeled: { label: 'labeled', color: 'bg-gray-100 text-gray-800' },
  escalated: { label: 'escalated', color: 'bg-red-100 text-red-800' },
  correction_created: { label: 'flagged correction', color: 'bg-orange-100 text-orange-800' },
  correction_resolved: { label: 'resolved correction', color: 'bg-emerald-100 text-emerald-800' },
};

export function ActivityFeed() {
  const { data: entries = [], isLoading } = useActivityFeed();

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (entries.length === 0) return <p className="text-sm text-muted-foreground p-4">No activity yet.</p>;

  return (
    <div className="space-y-3 p-4">
      {entries.map(entry => {
        const info = actionLabels[entry.action] || { label: entry.action, color: 'bg-gray-100' };
        return (
          <div key={entry.id} className="flex items-start gap-3">
            <Avatar className="h-7 w-7 mt-0.5">
              <AvatarFallback className="text-xs">{(entry.metadata?.user_name || '?')[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{entry.metadata?.user_name || 'Someone'}</span>{' '}
                <Badge variant="outline" className={`text-xs ${info.color}`}>{info.label}</Badge>{' '}
                {entry.metadata?.target && <span className="text-muted-foreground">on {entry.metadata.target}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Task 2.3: Wire activity logging into existing mutations

**Files:**
- Modify: `src/hooks/useInboxConversations.ts`

Add activity log inserts to `useAssignConversation` (action: 'assigned'), `useUpdateConversationStatus` (action: 'status_changed'), and `useBulkUpdateStatus` (action: 'status_changed').

In each mutation's `onSuccess`, insert into `inbox_activity_log` via supabase. Use fire-and-forget (no await, catch error silently).

**Step 1:** Add supabase import if missing:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

**Step 2:** In `useAssignConversation.onSuccess` (after the notification send), add:
```typescript
supabase.from('inbox_activity_log').insert({
  company_id: selectedCompanyId,
  user_id: user?.id,
  action: 'assigned',
  conversation_id: conversationId,
  metadata: { assignee_id: assigneeId, user_name: user?.user_metadata?.full_name || user?.email },
}).then(() => {});
```

**Step 3:** Same pattern in `useUpdateConversationStatus.onSuccess` with action `'status_changed'`.

**Step 4: Commit**
```bash
git commit -am "feat: activity feed + activity logging (#15)"
```

---

## Phase 3: Collision Detection (#18)

### Task 3.1: Create useConversationPresence hook

**Files:**
- Create: `src/hooks/useConversationPresence.ts`

```typescript
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  conversationId: string;
  userId: string;
  userName: string;
  action: 'viewing' | 'typing';
}

export function useConversationPresence(conversationId: string | null) {
  const { selectedCompanyId } = useSelectedCompany();
  const { user } = useAuth();
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!selectedCompanyId || !user?.id || !conversationId) {
      setOthers([]);
      return;
    }

    const channel = supabase.channel(`inbox:${selectedCompanyId}`, {
      config: { presence: { key: `user:${user.id}` } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const present: PresenceUser[] = [];
      for (const [, entries] of Object.entries(state)) {
        for (const entry of entries as any[]) {
          if (entry.userId !== user.id && entry.conversationId === conversationId) {
            present.push(entry as PresenceUser);
          }
        }
      }
      setOthers(present);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          conversationId,
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email || 'Unknown',
          action: 'viewing',
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedCompanyId, user?.id, conversationId]);

  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user?.id || !conversationId) return;
    await channelRef.current.track({
      conversationId,
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email || 'Unknown',
      action: isTyping ? 'typing' : 'viewing',
    });
  }, [user, conversationId]);

  return { others, broadcastTyping };
}
```

### Task 3.2: Create PresenceBanner component

**Files:**
- Create: `src/components/inbox/PresenceBanner.tsx`

```typescript
import { cn } from '@/lib/utils';
import { Eye, PenTool } from 'lucide-react';
import type { PresenceUser } from '@/hooks/useConversationPresence';

interface PresenceBannerProps {
  others: PresenceUser[];
}

export function PresenceBanner({ others }: PresenceBannerProps) {
  if (others.length === 0) return null;

  const typing = others.filter(o => o.action === 'typing');
  const viewing = others.filter(o => o.action === 'viewing');
  const hasCollision = typing.length > 0;

  return (
    <div className={cn(
      'px-3 py-1.5 text-xs flex items-center gap-2 border-b',
      hasCollision ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'
    )}>
      {typing.length > 0 && (
        <span className="flex items-center gap-1">
          <PenTool className="h-3 w-3" />
          {typing.map(t => t.userName).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing a reply...
        </span>
      )}
      {viewing.length > 0 && typing.length === 0 && (
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {viewing.map(v => v.userName).join(', ')} {viewing.length === 1 ? 'is' : 'are'} also viewing
        </span>
      )}
    </div>
  );
}
```

### Task 3.3: Integrate presence into Inbox page

**Files:**
- Modify: `src/pages/Inbox.tsx`
- Modify: `src/components/inbox/MessageComposer.tsx`

**Step 1:** In `Inbox.tsx`, import and use the hook:
```typescript
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { PresenceBanner } from '@/components/inbox/PresenceBanner';
```

Call `useConversationPresence(selectedConversationId)` and render `<PresenceBanner others={others} />` above the thread panel.

**Step 2:** In `MessageComposer.tsx`, accept a `onTypingChange?: (isTyping: boolean) => void` prop. Call it on input focus/blur and debounce 2s after last keystroke.

**Step 3: Commit**
```bash
git commit -am "feat: collision detection with Supabase Realtime Presence (#18)"
```

---

## Phase 4: Correction Compliance Pipeline (#28)

### Task 4.1: Create useCorrections hook

**Files:**
- Create: `src/hooks/useCorrections.ts`

Standard TanStack Query hook: `useCorrections(companyId)` fetches from `corrections` table. `useCreateCorrection` mutation inserts + logs activity. `useUpdateCorrectionStatus` mutation updates status + logs activity.

### Task 4.2: Create CorrectionBadge component

**Files:**
- Create: `src/components/inbox/CorrectionBadge.tsx`

Small badge showing correction status (open/in_progress/resolved/rejected) with color coding. Used on conversation cards.

### Task 4.3: Create CorrectionsPanel component

**Files:**
- Create: `src/components/inbox/CorrectionsPanel.tsx`

Panel showing correction details: status flow buttons, notes textarea, resolution summary. Displayed in the drawer when a conversation has an active correction.

### Task 4.4: Add correction button to ConversationHeader

**Files:**
- Modify: `src/components/inbox/ConversationHeader.tsx`

Add a "Flag as Correction" button in the header's action dropdown. When clicked, opens a dialog to create a correction request.

**Commit:**
```bash
git commit -am "feat: correction compliance pipeline (#28)"
```

---

## Phase 5: Team Workload Dashboard (#12) + Team Metrics (#20)

### Task 5.1: Create useTeamWorkload hook

**Files:**
- Create: `src/hooks/useTeamWorkload.ts`

Aggregates from `inbox_conversations` joined with `company_memberships` and `profiles`. Returns per-member stats: assigned count, resolved today count.

### Task 5.2: Create useTeamMetrics hook

**Files:**
- Create: `src/hooks/useTeamMetrics.ts`

Computes from `inbox_activity_log` + `inbox_conversations`: avg first response time, avg resolution time, conversations per member, sentiment distribution. Accepts time range parameter.

### Task 5.3: Create TeamWorkload page

**Files:**
- Create: `src/pages/TeamWorkload.tsx`

Two tabs: **Workload** and **Metrics**.

**Workload tab:**
- Cards per team member: avatar, name, assigned count, resolved today
- Bar chart of assignments per member (Recharts)
- AG Grid table of all assignments (member, conversation subject, status, age)
- Embedded ActivityFeed panel on the right side

**Metrics tab:**
- Time range selector (7d/30d/90d)
- Summary cards: avg first response, avg resolution, total conversations
- Per-member breakdown table (AG Grid)

### Task 5.4: Add route to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1:** Add lazy import:
```typescript
const TeamWorkload = React.lazy(() => import("./pages/TeamWorkload"));
```

**Step 2:** Add route after the inbox route (line ~124):
```typescript
<Route path="/app/inbox/team" element={<ProtectedRoute><TeamWorkload /></ProtectedRoute>} />
```

### Task 5.5: Add sidebar link

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

Add "Team" link under the Inbox sidebar item, pointing to `/app/inbox/team`.

**Commit:**
```bash
git commit -am "feat: team workload dashboard + metrics (#12, #20)"
```

---

## Phase 6: Notification Preferences (#25)

### Task 6.1: Create useNotificationPreferences hook

**Files:**
- Create: `src/hooks/useNotificationPreferences.ts`

CRUD hook for `notification_preferences` table. Fetches all preferences for current user + company. `useUpdatePreference` mutation upserts a single row.

### Task 6.2: Create NotificationPreferencesPanel component

**Files:**
- Create: `src/components/settings/NotificationPreferencesPanel.tsx`

Table with rows = event types (assignment, mention, reply, status_change, correction, escalation, sla_breach), columns = channels (In-App toggle, Email toggle). Each cell is a Switch component.

### Task 6.3: Replace existing NotificationsTab content

**Files:**
- Modify: `src/components/settings/NotificationsTab.tsx`

Replace current content with the new `NotificationPreferencesPanel`. The Settings page already has a "Notifications" tab.

### Task 6.4: Check preferences before sending notifications

**Files:**
- Modify: `supabase/functions/send-in-app-notification/index.ts`

Before sending, query `notification_preferences` for the target user + event type. If `in_app === false`, skip. Default behavior (no row exists): send.

**Commit:**
```bash
git commit -am "feat: notification preferences in Settings (#25)"
```

---

## Phase 7: Beat/Desk Routing (#26)

### Task 7.1: Create useRoutingRules hook

**Files:**
- Create: `src/hooks/useRoutingRules.ts`

CRUD for `routing_rules` table. List rules, create rule, update rule, delete rule.

### Task 7.2: Create RoutingRulesPanel component

**Files:**
- Create: `src/components/inbox/RoutingRulesPanel.tsx`

Admin UI: AG Grid table of routing rules (category, subcategory, assigned member, desk name, priority override, enabled toggle). Add/edit dialog for new rules. Delete with confirmation.

### Task 7.3: Add RoutingRulesPanel to TeamWorkload page

**Files:**
- Modify: `src/pages/TeamWorkload.tsx`

Add a third tab: "Routing Rules" — renders `<RoutingRulesPanel />`. Only visible to owner/admin roles.

### Task 7.4: Wire routing into inbox-sync

**Files:**
- Modify: `supabase/functions/inbox-sync/index.ts`

After AI classification assigns a category to a conversation, query `routing_rules` for a matching rule. If found and enabled, auto-assign the conversation to the rule's `assigned_to` user.

**Commit:**
```bash
git commit -am "feat: beat/desk routing rules (#26)"
```

---

## Phase 8: Cross-Outlet Assignment (#29)

### Task 8.1: Create useCrossOutletMembers hook

**Files:**
- Create: `src/hooks/useCrossOutletMembers.ts`

Queries `media_company_children` to find sibling outlets, then fetches their members from `company_memberships` + `profiles`. Returns combined member list with outlet name annotation.

### Task 8.2: Extend MemberPicker for cross-outlet

**Files:**
- Modify: `src/components/inbox/MemberPicker.tsx`

Add a "Cross-Outlet" section below the current member list. Show members from sibling outlets with their outlet name as a subtitle. When assigning cross-outlet, set `cross_outlet_source` on the conversation.

### Task 8.3: Update useInboxConversations for cross-assigned

**Files:**
- Modify: `src/hooks/useInboxConversations.ts`

In the query, also include conversations where `cross_outlet_source` matches the current company (conversations assigned to us from other outlets).

**Commit:**
```bash
git commit -am "feat: cross-outlet assignment (#29)"
```

---

## Phase 9: Demo Data + Dead Code Cleanup

### Task 9.1: Add demo data fixtures

**Files:**
- Modify: `src/lib/demo/demo-data.ts`

Add exports:
- `DEMO_ACTIVITY_FEED` — 10 recent activity entries
- `DEMO_CORRECTIONS` — 2 correction requests (1 open, 1 resolved)
- `DEMO_NOTIFICATION_PREFERENCES` — default preferences for demo user
- `DEMO_ROUTING_RULES` — 3 sample routing rules
- `DEMO_TEAM_WORKLOAD` — per-member stats for 3 demo team members
- `DEMO_TEAM_METRICS` — aggregate metrics

### Task 9.2: Populate DemoDataProvider

**Files:**
- Modify: `src/lib/demo/DemoDataProvider.tsx`

Add `setQueryData` calls for:
- `['activity-feed', DEMO_COMPANY_ID, 50]`
- `['corrections', DEMO_COMPANY_ID]`
- `['notification-preferences', undefined, DEMO_COMPANY_ID]`
- `['routing-rules', DEMO_COMPANY_ID]`
- `['team-workload', DEMO_COMPANY_ID]`
- `['team-metrics', DEMO_COMPANY_ID, ...]`

### Task 9.3: Remove dead code

**Files:**
- Delete: `src/components/collaboration/RealTimeCollaboration.tsx`

This file imports server-only `ioredis`, uses all mock data, and is never imported. Safe to delete.

**Commit:**
```bash
git commit -am "feat: demo data for teamwork features + remove dead RealTimeCollaboration"
```

---

## Phase 10: Integration Tests

### Task 10.1: RLS isolation tests for new tables

**Files:**
- Create: `src/tests/integration/teamwork-rls.test.ts`

Test that:
- User A in Company 1 cannot read Company 2's `inbox_activity_log`
- User A in Company 1 cannot read Company 2's `corrections`
- Users can only read/write their own `notification_preferences`
- `routing_rules` respect company membership

### Task 10.2: Edge function health probes

**Files:**
- Modify: `src/tests/integration/edge-function-health.test.ts`

Verify `send-in-app-notification` still boots (already listed, but confirm notification_preferences check doesn't break boot).

### Task 10.3: Final verification

**Step 1: Run all tests**
```bash
npm run test
npx tsc --noEmit
npm run build
```

**Step 2: Commit**
```bash
git commit -am "test: teamwork feature integration tests"
```

---

## Test Architecture

| Phase | Test Layer | What to Test | Pure Logic to Extract | Source Import |
|-------|-----------|-------------|----------------------|--------------|
| Phase 0 | L2 Integration | RLS isolation, column existence | N/A (migrations) | N/A |
| Phase 1 | L4 Unit | AssignmentQueue filtering/sorting | `priorityOrder` sorting in component | `import { AssignmentQueue } from '@/components/inbox/AssignmentQueue'` |
| Phase 2 | L4 Unit | Activity log action types, hook query keys | N/A (standard hook) | `import { useActivityFeed } from '@/hooks/useActivityFeed'` |
| Phase 3 | L4 Unit | Presence state deduplication | N/A (state in hook) | `import { useConversationPresence } from '@/hooks/useConversationPresence'` |
| Phase 4 | L4 Unit | Correction status transitions | Status validation | `import { useCorrections } from '@/hooks/useCorrections'` |
| Phase 5 | L4 Unit | Team metrics aggregation | `computeTeamMetrics` if extracted | `import { useTeamMetrics } from '@/hooks/useTeamMetrics'` |
| Phase 6 | L2 Integration | Preference upsert behavior | N/A (DB constraint) | N/A |
| Phase 7 | L2 Integration | Routing rule matching | Category match logic | `import { useRoutingRules } from '@/hooks/useRoutingRules'` |
| Phase 8 | L2 Integration | Cross-outlet member resolution | N/A (DB join) | N/A |

---

## Dependency Graph

```
Phase 0 (Migrations) ──┬→ Phase 1 (Assignment Queue)
                        ├→ Phase 2 (Activity Feed)
                        ├→ Phase 3 (Collision Detection)
                        ├→ Phase 4 (Corrections)
                        ├→ Phase 5 (Workload + Metrics) ← depends on Phase 2 for activity data
                        ├→ Phase 6 (Notification Preferences)
                        ├→ Phase 7 (Routing Rules)
                        └→ Phase 8 (Cross-Outlet Assignment)

Phase 9 (Demo Data) ← depends on Phases 1-8 (needs all hooks to exist)
Phase 10 (Integration Tests) ← depends on Phase 0 (needs tables to exist)
```

**Parallelizable after Phase 0:** Phases 1, 2, 3, 4, 6, 7, 8 are all independent. Phase 5 needs Phase 2 done first. Phase 9 needs all features done.

---

## Execution Strategy

**Recommended: Parallel Session** — 9 features with mostly independent phases after migrations deploy. This session has extensive planning context loaded.

### Parallel execution groups (after Phase 0 deploys):

**Group A:** Phase 1 (Assignment Queue) + Phase 3 (Collision Detection)
**Group B:** Phase 2 (Activity Feed) + Phase 4 (Corrections)
**Group C:** Phase 6 (Notification Preferences) + Phase 7 (Routing Rules)
**Group D:** Phase 8 (Cross-Outlet Assignment)

Then sequentially: Phase 5 (needs Phase 2), Phase 9 (needs all), Phase 10 (tests).
