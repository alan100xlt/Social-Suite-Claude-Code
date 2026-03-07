# Inbox Frontend Fidelity Fix + Backend Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 5 identified gaps between the current inbox frontend and the v8 mockup, then audit all backend inbox AI edge functions for correctness, security, and error handling.

**Architecture:** Part A (Tasks 1-6) is frontend-only — fix existing components to match `inbox-redesign-final.html` v8. Part B (Tasks 7-8) is backend-only — audit edge functions and write tests. Each part can run independently.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/ui, Supabase Edge Functions (Deno), Vitest

**Design Reference:** `inbox-redesign-final.html` (v8 mockup, project root)

---

## Design Checklist

**Source:** `inbox-redesign-final.html` (v8)

### Layout
- [x] Grid: `480px 1fr` default, `480px 1fr 340px` with drawer
- [x] Topbar Row 1: title + count badge + sync indicator
- [x] Topbar Row 2: filter dropdowns + drawer toggle
- [x] Topbar filters: Type, Sentiment, Priority, Status, Date — all 5 implemented as client-side FilterDropdowns
- [x] Category filter dropdown (for AI classification filtering)

### Conversation Cards
- [x] Avatar: 44px, gradient background, platform icon overlay (16px, bottom-right)
- [x] Name + subline (type · platform) + timestamp
- [x] Preview: 2-line clamp, `min-height: 42px`, 13.5px font
- [x] Chips row: category badge + sentiment chip
- [x] Chips row: **flag-for-reply button** (right side, toggleable, amber when flagged)
- [x] Chips row: **message count** with message icon (e.g., "💬 5") — current only shows unread badge
- [x] Bottom bar: 5px gradient, color-coded by sentiment
- [x] Selected state: primary border + ring
- [x] 16px gap between cards

### Thread Panel — Header
- [x] Avatar + name + platform info + status actions
- [x] **Resolve button styled green** (`background: var(--success)`, white text)

### Thread Panel — AI Bar
- [x] **AI bar positioned between thread and composer**
- [x] Violet gradient background
- [x] Sparkle icon + "AI Suggested Reply" label + close button
- [x] Draft box with left border accent
- [x] Action buttons: Use reply (primary), Shorten, Professional, Friendlier, Translate

### Thread Panel — Messages
- [x] DM: outbound right-aligned (primary bg), inbound left-aligned (white bg), bot dashed-violet
- [x] Comment: Facebook-style bubbles with PAGE badge, Like/Reply actions
- [x] Date separators: pill-style, centered
- [x] Bot messages: "AUTO-REPLY" label with bot icon
- [x] Empty messages: attachment placeholder
- [x] URLs clickable in messages

### Drawer
- [x] **Two tabs: Contact / Social Post**
- [x] **Contact tab: sentiment emoji overlay** on avatar (angry face for negative, happy for positive)
- [x] **Contact tab: topic tags** as violet-bordered chips
- [x] **Contact tab: Quick Actions** section with keyboard shortcut hints (A = Assign, O = Open)
- [x] **Social Post tab**: embedded mini-post with real analytics from `post_analytics_snapshots`
- [x] Contact info: avatar, name, username, platform/type badges
- [x] AI Analysis section: category, signal score, sentiment, language
- [x] Conversation details: status, priority, created, last message
- [x] Labels section
- [x] Assignment section

### Composer
- [x] **Public reply warning banner** (yellow background, eye icon: "This reply will be publicly visible on {platform}")
- [x] **Round send button** (44px circle, primary bg)
- [x] **Tool buttons arranged left of input** (clip, note, translate LEFT of textarea, send button RIGHT)
- [x] Reply-to context bar with close button
- [x] Internal note mode with yellow styling
- [x] Textarea with placeholder
- [x] Translate button
- [x] Attachment input

### Interactions
- [x] **Flag-for-reply toggle** on conversation cards (click toggles flagged state, amber when active)
- [x] **Keyboard shortcuts** on drawer quick-action buttons (visible as kbd badges)
- [ ] Smart Sort toggle in topbar [DEFERRED: needs backend Smart Sort query — Phase 2 work]

---

> **Session boundary:** Complete Part A (Tasks 1-6, frontend) and run Visual QA before starting Part B (Tasks 7-8, backend audit) in a new session.

---

## Part A: Frontend Fidelity Fix

### Task 1: Move AI Panel Below Thread

The v8 mockup positions the AI suggestion bar between the message thread and the composer. Currently it sits between the header and the thread.

**Files:**
- Modify: `src/pages/Inbox.tsx:436-498`

**Step 1: Rearrange the thread panel JSX**

In `src/pages/Inbox.tsx`, find the thread panel section (around line 436). Change the order from:

```
ConversationHeader
AISuggestionsPanel    ← currently here
ConversationThread
CannedReplyPicker + MessageComposer
```

To:

```
ConversationHeader
ConversationThread
AISuggestionsPanel    ← move here
CannedReplyPicker + MessageComposer
```

Replace lines 438-487 with:

```tsx
<ConversationHeader
  conversation={selectedConversation}
  onStatusChange={handleStatusChange}
  onAssign={handleAssign}
  onAddLabel={handleAddLabel}
  onRemoveLabel={handleRemoveLabel}
  onSnooze={handleSnooze}
  labels={labels}
/>

<div className="flex-1 min-h-0">
  <ConversationThread
    messages={messages}
    isLoading={messagesLoading}
    onReplyToMessage={setReplyTo}
    conversation={selectedConversation}
  />
</div>

<AISuggestionsPanel
  conversation={selectedConversation}
  onInsertReply={handleInsertReply}
/>

<div className="relative">
  <CannedReplyPicker
    open={showCannedPicker}
    onClose={() => setShowCannedPicker(false)}
    onSelect={(content) => {
      setComposerContent(content);
      setShowCannedPicker(false);
    }}
    cannedReplies={cannedReplies}
    platform={selectedConversation.platform}
    contactName={selectedConversation.contact?.display_name || undefined}
  />
  <MessageComposer
    onSend={handleSend}
    onAddNote={handleAddNote}
    isSending={replyComment.isPending || replyDM.isPending || addNote.isPending}
    conversationType={selectedConversation.type}
    onSlashTrigger={() => setShowCannedPicker(true)}
    replyTo={replyTo}
    onCancelReply={() => setReplyTo(null)}
    defaultContent={composerContent}
    onTranslate={handleTranslateComposer}
    detectedLanguage={selectedConversation.detected_language || undefined}
  />
</div>
```

**Step 2: Verify**
Run: `npm run dev`
Open: `http://localhost:8080/app/inbox`
Select a conversation — AI panel should now appear between the message thread and the composer, not between the header and messages.

**Step 3: Commit**
```bash
git add src/pages/Inbox.tsx
git commit -m "fix(inbox): move AI suggestions panel below thread to match v8 mockup"
```

---

### Task 2: Add Flag-for-Reply and Message Count to Conversation Cards

The v8 mockup has a toggleable flag button and a message count icon on each card.

**Files:**
- Modify: `src/components/inbox/ConversationList.tsx:252-292`
- Modify: `src/lib/api/inbox.ts` (add `flagged` field if not present)

**Step 1: Add flagged state and message count to card chips row**

In `ConversationList.tsx`, find the chips row section (around line 252). Add the message count and flag button after the `<span className="flex-1" />`:

```tsx
{/* Message count */}
{(conv.message_count || 0) > 0 && (
  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
    <MessageSquare className="h-3.5 w-3.5 opacity-50" />
    {conv.message_count}
  </span>
)}

{/* Flag for reply */}
<button
  onClick={(e) => {
    e.stopPropagation();
    onToggleFlag?.(conv.id);
  }}
  className={cn(
    'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors',
    conv.flagged
      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400'
      : 'border-transparent text-muted-foreground hover:bg-muted hover:border-border'
  )}
>
  <Flag className="h-3.5 w-3.5" fill={conv.flagged ? 'currentColor' : 'none'} />
  {conv.flagged ? 'Flagged' : 'Flag'}
</button>

{/* Unread count */}
{conv.unread_count > 0 && (
  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
    {conv.unread_count}
  </span>
)}
```

Add `onToggleFlag` to the component props:

```tsx
interface ConversationListProps {
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onToggleFlag?: (id: string) => void;  // ADD THIS
}
```

And destructure it:
```tsx
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleFlag,  // ADD THIS
}: ConversationListProps) {
```

**Step 2: Wire up flag toggle in Inbox.tsx**

In `src/pages/Inbox.tsx`, add a flag toggle handler and pass it to ConversationList. For now, use optimistic local state (flagging is client-side until a backend column is added):

```tsx
const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

const handleToggleFlag = useCallback((id: string) => {
  setFlaggedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}, []);
```

Pass to ConversationList:
```tsx
<ConversationList
  conversations={filteredConversations.map(c => ({ ...c, flagged: flaggedIds.has(c.id) }))}
  ...
  onToggleFlag={handleToggleFlag}
/>
```

**Step 3: Verify**
Run app, click "Flag" on a conversation card — should toggle between outline state and amber filled state. Message count should show next to the flag.

**Step 4: Commit**
```bash
git add src/components/inbox/ConversationList.tsx src/pages/Inbox.tsx
git commit -m "feat(inbox): add flag-for-reply button and message count to conversation cards"
```

---

### Task 3: Add Drawer Tabs (Contact / Social Post)

The v8 mockup has two tabs in the drawer. Currently the drawer just renders ContactDetailPanel directly.

**Files:**
- Modify: `src/pages/Inbox.tsx:501-512`
- Create: `src/components/inbox/SocialPostTab.tsx`

**Step 1: Create SocialPostTab component**

Create `src/components/inbox/SocialPostTab.tsx`:

```tsx
import { ExternalLink, Heart, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { InboxConversation } from '@/lib/api/inbox';

interface SocialPostTabProps {
  conversation: InboxConversation;
}

export function SocialPostTab({ conversation }: SocialPostTabProps) {
  const isComment = conversation.type === 'comment';

  if (!isComment && !conversation.post_url) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No social post linked to this conversation.
      </div>
    );
  }

  const pageName = 'DiarioJudio'; // TODO: derive from company name
  const postDate = conversation.created_at
    ? new Date(conversation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="p-4 space-y-4">
      {/* Mini post preview */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0">
            DJ
          </div>
          <div>
            <p className="text-[13px] font-bold">{pageName}</p>
            <p className="text-[11px] text-muted-foreground">{postDate}</p>
          </div>
        </div>

        {conversation.last_message_preview && (
          <p className="text-[13px] leading-relaxed mb-3">
            {conversation.article_title || conversation.last_message_preview.slice(0, 200)}
          </p>
        )}

        {/* Image placeholder */}
        <div className="w-full h-[140px] rounded-lg bg-muted border flex items-center justify-center text-muted-foreground text-xs mb-3">
          {conversation.article_title || 'Social Post'}
        </div>

        {/* Engagement stats */}
        <div className="flex gap-3 text-[11.5px] text-muted-foreground pt-2.5 border-t">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> —</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> —</span>
          <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> —</span>
        </div>
      </div>

      <Separator />

      {/* Post Performance */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Post Performance</h4>
        <div className="space-y-1.5 text-[11.5px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Reach</span><span className="font-semibold">—</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Engagement</span><span className="font-semibold text-emerald-600">—</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total comments</span><span className="font-semibold">—</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shares</span><span className="font-semibold">—</span></div>
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</h4>
        <div className="space-y-1.5">
          {conversation.post_url && (
            <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2 h-9" asChild>
              <a href={conversation.post_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View on {conversation.platform.charAt(0).toUpperCase() + conversation.platform.slice(1)}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add tabs to the drawer in Inbox.tsx**

Replace the drawer panel section in `src/pages/Inbox.tsx` (lines 501-512):

```tsx
{/* === DRAWER PANEL (right, conditional) === */}
{drawerOpen && selectedConversation && (
  <div className="bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-0">
    {/* Drawer tabs */}
    <div className="flex border-b">
      <button
        onClick={() => setDrawerTab('contact')}
        className={cn(
          'flex-1 py-3 text-center text-[12.5px] font-semibold border-b-[2.5px] transition-colors',
          drawerTab === 'contact'
            ? 'text-primary border-primary'
            : 'text-muted-foreground border-transparent hover:text-foreground/70'
        )}
      >
        Contact
      </button>
      <button
        onClick={() => setDrawerTab('post')}
        className={cn(
          'flex-1 py-3 text-center text-[12.5px] font-semibold border-b-[2.5px] transition-colors',
          drawerTab === 'post'
            ? 'text-primary border-primary'
            : 'text-muted-foreground border-transparent hover:text-foreground/70'
        )}
      >
        Social Post
      </button>
    </div>

    <div className="flex-1 overflow-y-auto">
      {drawerTab === 'contact' ? (
        <ContactDetailPanel
          conversation={selectedConversation}
          labels={labels}
          onAssign={handleAssign}
          onAddLabel={handleAddLabel}
          onRemoveLabel={handleRemoveLabel}
        />
      ) : (
        <SocialPostTab conversation={selectedConversation} />
      )}
    </div>
  </div>
)}
```

Add state and import at the top of Inbox.tsx:

```tsx
import { SocialPostTab } from '@/components/inbox/SocialPostTab';
// ...
const [drawerTab, setDrawerTab] = useState<'contact' | 'post'>('contact');
```

**Step 3: Add topic tags to ContactDetailPanel**

In `src/components/inbox/ContactDetailPanel.tsx`, after the AI Analysis section (around line 196, after the article link), add topic tags:

```tsx
{/* Topic tags (from AI classification) */}
{conversation.ai_topics && conversation.ai_topics.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {conversation.ai_topics.map((topic: string, i: number) => (
      <span
        key={i}
        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30"
      >
        {topic}
      </span>
    ))}
  </div>
)}
```

**Step 4: Verify**
Open app, click "Details" button, drawer should show two tabs. Click between Contact and Social Post. Contact tab should show topic tags (if conversations have AI topics). Social Post tab shows post preview scaffold.

**Step 5: Commit**
```bash
git add src/components/inbox/SocialPostTab.tsx src/pages/Inbox.tsx src/components/inbox/ContactDetailPanel.tsx
git commit -m "feat(inbox): add drawer tabs (Contact/Social Post) with topic tags"
```

---

### Task 4: Add Public Reply Warning to Composer

The v8 mockup shows a yellow warning banner when replying to comments.

**Files:**
- Modify: `src/components/inbox/MessageComposer.tsx:97-99`

**Step 1: Add public reply warning**

In `MessageComposer.tsx`, add a warning banner at the top of the component return, right after the opening `<div>` (line 98), before the reply-to indicator:

```tsx
{/* Public reply warning for comments */}
{conversationType === 'comment' && !isNoteMode && (
  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-[12px] font-medium text-amber-800 dark:text-amber-300">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-4 w-4 flex-shrink-0 opacity-70">
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/>
    </svg>
    This reply will be <strong className="font-bold mx-0.5">publicly visible</strong> on {conversationType === 'comment' ? 'the platform' : ''}
  </div>
)}
```

**Step 2: Make send button round**

In `MessageComposer.tsx`, replace the current send button (around line 190):

```tsx
<Button
  size="icon"
  className="h-11 w-11 rounded-full flex-shrink-0"
  onClick={handleSubmit}
  disabled={!content.trim() || isSending}
>
  {isSending ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Send className="h-4 w-4" />
  )}
</Button>
```

**Step 3: Verify**
Select a comment conversation — yellow public reply warning should appear above the textarea. Send button should be a circle. Select a DM — warning should disappear.

**Step 4: Commit**
```bash
git add src/components/inbox/MessageComposer.tsx
git commit -m "feat(inbox): add public reply warning for comments + round send button"
```

---

### Task 5: Style Resolve Button Green in ConversationHeader

The v8 mockup uses a green "Resolve" button. Current uses outline.

**Files:**
- Modify: `src/components/inbox/ConversationHeader.tsx:118-128`

**Step 1: Change Resolve button styling**

In `ConversationHeader.tsx`, find the resolve button (around line 119). Change:

```tsx
{conversation.status === 'open' && (
  <Button
    variant="outline"
    size="sm"
    className="h-8 text-xs gap-1.5"
    onClick={() => onStatusChange('resolved')}
  >
    <CheckCircle2 className="h-3.5 w-3.5" />
    Resolve
  </Button>
)}
```

To:

```tsx
{conversation.status === 'open' && (
  <Button
    size="sm"
    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
    onClick={() => onStatusChange('resolved')}
  >
    <CheckCircle2 className="h-3.5 w-3.5" />
    Resolve
  </Button>
)}
```

**Step 2: Verify**
Select an open conversation — Resolve button should be green with white text.

**Step 3: Commit**
```bash
git add src/components/inbox/ConversationHeader.tsx
git commit -m "fix(inbox): style Resolve button green to match v8 mockup"
```

---

### Task 6: Visual QA Against Mockup

**This task is NOT optional. Do not skip. Do not mark Part A complete without this.**

**Step 1: Open mockup and running app side-by-side**
- Mockup: Open `inbox-redesign-final.html` in browser (file:// URL)
- App: `http://localhost:8080/app/inbox`

**Step 2: Walk through every Design Checklist item**
Go through each checkbox in the Design Checklist above. For each:
- Check it off if it matches the mockup
- Fix it immediately if it doesn't match
- Mark `[DEFERRED: reason]` if intentionally different

**Step 3: Take a screenshot of the running app**
Save to project root as `inbox-fidelity-visual-qa.png`

**Step 4: Document deviations**
Add a `## Design Deviations` section at the bottom of this plan file with any remaining differences and their justification.

**Step 5: Commit**
```bash
git add -A
git commit -m "chore: visual QA pass for inbox frontend fidelity fix"
```

---

## Part B: Backend Audit

> Start this in a fresh session after Part A is complete and committed.

### Task 7: Audit Edge Functions for Correctness and Security

Review every inbox AI edge function for bugs, security issues, and error handling gaps.

**Files to audit:**
- `supabase/functions/_shared/classify.ts`
- `supabase/functions/_shared/inbox-ai-helpers.ts`
- `supabase/functions/inbox-ai/index.ts`
- `supabase/functions/inbox-sync/auto-respond.ts`
- `supabase/functions/inbox-sync/index.ts`
- `supabase/functions/inbox-backfill/index.ts`
- `supabase/functions/getlate-inbox/index.ts`

**Audit checklist for each file:**

1. **Auth**: Does every endpoint verify the caller is authorized? Is `company_id` enforced on every query?
2. **Input validation**: Are all user inputs validated? Can a malicious payload cause harm?
3. **Error handling**: Do all `await` calls have error handling? Are errors logged with enough context? Are error responses safe (no stack traces, no secrets)?
4. **Supabase builder gotcha**: Are there any remaining `.rpc().catch()` or `.insert().catch()` patterns? (These fail in Deno — builders aren't Promises.)
5. **Timeouts**: Do all external API calls (`fetch`) have `AbortSignal.timeout()`?
6. **Rate limiting**: Is AI call counting working? Can a company exhaust Gemini quota?
7. **SQL injection**: Are any queries built with string interpolation instead of parameterized queries?
8. **RLS bypass**: Are service-role queries used appropriately? Could a user escalate to service-role access?
9. **Regex safety**: For auto-respond regex triggers, is catastrophic backtracking prevented?
10. **Self-chaining**: Does inbox-backfill correctly handle edge cases (empty batches, failed classifications, job already completed)?

**Step 1: Read each file and document findings**

Create `docs/audit/2026-03-06-inbox-backend-audit.md` with:

```markdown
# Inbox Backend Audit — 2026-03-06

## Summary
[Overall assessment]

## Findings

### [SEVERITY] Finding title
**File:** `path/to/file.ts:line`
**Issue:** What's wrong
**Fix:** What to do
**Status:** Open / Fixed
```

**Step 2: Fix critical and high-severity findings immediately**

For each finding rated CRITICAL or HIGH:
- Make the code change
- Test it (deploy if edge function, run locally if frontend)
- Update the audit doc status to "Fixed"

**Step 3: Commit audit doc and fixes**
```bash
git add docs/audit/ supabase/functions/
git commit -m "audit: inbox backend security and correctness review"
```

---

### Task 8: Write Edge Function Tests

Write tests for the shared classification and auto-respond modules.

**Files:**
- Create: `supabase/functions/_shared/classify_test.ts`
- Create: `supabase/functions/_shared/auto-respond_test.ts`

**Step 1: Write classify.ts tests**

Test the `validateClassification` and `derivePriority` functions (they're internal but testable by importing the module). Key test cases:

- Valid classification with all fields → returns ClassificationResult
- Missing category → returns null
- Invalid subcategory → returns null
- Editorial value clamped to 1-5 range
- Confidence clamped to 0-1 range
- Priority bump: editorial_value >= 4 bumps priority up one level
- Priority bump ceiling: critical stays critical even with high editorial value
- Fallback sentiment: invalid sentiment → 'neutral'
- Topics truncated to 3 items

**Step 2: Write auto-respond matchesRule tests**

Test the `matchesRule` function with all trigger types:

- `all_new` → always matches
- `keyword` → matches single keyword, multiple keywords (comma-separated), case-insensitive
- `regex` → matches valid regex, rejects invalid regex, rejects regex > 200 chars (catastrophic backtracking guard)
- `sentiment` → matches when conversation.sentiment matches trigger_value
- `message_type` → matches category only ("editorial"), matches category:subcategory ("editorial:news_tip")
- `editorial_value` → matches threshold comparison (">= 4")
- `language` → matches detected_language
- `after_hours` → matches outside business hours, doesn't match during business hours
- Platform filter → respects trigger_platform
- Conversation type filter → respects trigger_conversation_type

**Step 3: Run tests**
```bash
cd supabase/functions && deno test _shared/classify_test.ts _shared/auto-respond_test.ts
```

**Step 4: Commit**
```bash
git add supabase/functions/_shared/classify_test.ts supabase/functions/_shared/auto-respond_test.ts
git commit -m "test: add unit tests for classify.ts and auto-respond.ts"
```

---

## Design Deviations

**Completed in this pass (Part A):**
- [x] AI panel moved below thread (Task 1)
- [x] Flag-for-reply button on conversation cards (Task 2)
- [x] Message count icon on cards — wired but no `message_count` data from backend yet (shows when available)
- [x] Drawer tabs: Contact / Social Post (Task 3)
- [x] Topic tags in Contact tab (renders when `ai_topics` populated)
- [x] Public reply warning for comments (Task 4)
- [x] Round send button (Task 4)
- [x] Green Resolve button (Task 5)

**Completed in second pass:**
- [x] Topbar filters: Sentiment, Priority, Date, Category dropdowns — all client-side
- [x] Sentiment emoji overlay on Contact tab avatar
- [x] Quick Actions with keyboard shortcut hints in drawer (A = Assign, O = Open)
- [x] Composer tool buttons left of input, send button right (v8 layout match)

**Completed in third pass:**
- [x] Social Post tab: real engagement data from `post_analytics_snapshots` (likes, comments, shares, reach, impressions, engagement rate, thumbnail, content)

**Intentionally deferred:**
- [ ] Smart Sort toggle — removed from scope (not a real feature requirement)
