# Koko Copilot — AI Chat Compose & Copilot

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A slide-over AI copilot panel ("Koko") accessible from any `/app/*` page that helps users create posts, refine drafts, query analytics, and manage voice/automation settings via conversational chat.

**Architecture:** Single Supabase edge function (`chat-copilot`) using Gemini 3.1 Flash Lite with native tool calling. SSE streaming for token-by-token responses. Full conversation history persisted in Supabase. Quick action chips and inline action buttons for guided interaction.

**Tech Stack:** Gemini 3.1 Flash Lite, Supabase Edge Functions (SSE), React slide-over panel, TanStack Query

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI placement | Slide-over panel (right) | Available everywhere, non-intrusive |
| AI model | Gemini 3.1 Flash Lite | Cheapest ($0.10-$0.25/1M input), fast, sufficient for chat |
| Streaming | SSE (Server-Sent Events) | Native browser support, works with edge functions |
| Tool calling | Gemini native function calling | Clean routing, Gemini decides when to use tools |
| Analytics data | Direct DB queries in edge function | No extra HTTP hops, data already in Supabase |
| Content generation | Calls existing `generate-social-post` | Reuses prompt engineering, platform rules, compliance |
| Conversation history | Full history with threads | User requested, enables resume and search |
| Name | Koko | Communication pioneer (sign language gorilla), fits social media brand |
| Avatar | Custom SVG monkey face | Friendly, distinctive, matches Longtale brand |
| Keyboard shortcut | None | Just the floating button for now |

---

## Database Schema

### `chat_threads`
```sql
CREATE TABLE chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text, -- AI-generated from first message
  context_type text DEFAULT 'general', -- 'general' | 'draft' | 'analytics' | 'settings'
  context_id uuid, -- e.g. draft ID if working on a specific draft
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: company_id filter
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own company threads"
  ON chat_threads FOR ALL
  USING (company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid()));
```

### `chat_messages`
```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool_result')),
  content text, -- message text
  tool_calls jsonb, -- array of tool calls Gemini made
  tool_results jsonb, -- results from tool execution
  actions jsonb, -- quick action chips [{label, action_type, payload}]
  tokens_used int,
  created_at timestamptz DEFAULT now()
);

-- RLS inherited via thread_id join
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access messages in own threads"
  ON chat_messages FOR ALL
  USING (thread_id IN (SELECT id FROM chat_threads WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  )));
```

---

## Edge Function: `chat-copilot`

**Endpoint:** POST `/functions/v1/chat-copilot`

**Request:**
```json
{
  "thread_id": "uuid | null (creates new thread)",
  "message": "user message text",
  "action": { "type": "quick_action", "payload": {...} },
  "context": { "page": "/app/content", "draft_id": "uuid" }
}
```

**Response:** SSE stream with event types:
- `text` — `{ content: "token chunk" }`
- `tool_call` — `{ name: "get_analytics", args: {...} }`
- `tool_result` — `{ name: "get_analytics", result: {...} }`
- `actions` — `[{ label: "Make shorter", action_type: "send_message", payload: "Make it shorter" }]`
- `done` — `{ thread_id: "uuid", message_id: "uuid", tokens_used: 123 }`

### Gemini Tools

**Direct DB queries:**
| Tool | Table(s) | Operation |
|------|----------|-----------|
| `get_analytics` | `post_analytics_snapshots`, RPC `get_post_analytics_by_date` | SELECT |
| `get_top_posts` | `post_analytics_snapshots` | SELECT ORDER BY views DESC |
| `get_drafts` | `post_drafts` | SELECT |
| `create_draft` | `post_drafts` | INSERT |
| `update_draft` | `post_drafts` | UPDATE |
| `get_accounts` | via GetLate API (accounts already cached) | SELECT |
| `get_voice_settings` | `company_voice_settings` | SELECT |
| `update_voice_settings` | `company_voice_settings` | UPDATE |
| `get_automations` | `automation_rules` | SELECT |
| `update_automation` | `automation_rules` | UPDATE |

**Calls existing edge function:**
| Tool | Edge Function | Purpose |
|------|--------------|---------|
| `generate_post_content` | `generate-social-post` | Content generation with platform rules + compliance |

### System Prompt
Includes: company name, brand voice settings summary, connected platforms list, current page context, user's name. Instructs Koko to be helpful, concise, and suggest actions via chips.

### Conversation History
Loads last 20 messages from `chat_messages` for the thread. Passed as Gemini conversation history.

---

## Frontend Components

```
KokoCopilot (slide-over panel, global — mounted in App.tsx)
├── KokoHeader (title, thread selector dropdown, new thread btn, close btn)
├── KokoMessageList (scrollable, auto-scroll on new messages)
│   ├── WelcomeScreen (greeting + initial quick action chips)
│   ├── KokoMessage (per message bubble)
│   │   ├── TextContent (markdown-rendered via react-markdown)
│   │   ├── DraftPreviewCard (inline draft with platform tabs + Edit/Schedule buttons)
│   │   ├── AnalyticsCard (mini stat display)
│   │   ├── ToolCallIndicator ("Koko is checking your analytics...")
│   │   └── ActionChips (follow-up suggestion buttons)
│   └── StreamingMessage (in-progress assistant message with cursor)
├── KokoInput (auto-resize textarea, send button, URL attach button)
└── KokoFab (floating action button — bottom-right, monkey SVG icon)
```

### KokoContext (React Context)
- `isOpen: boolean` — panel visibility
- `activeThreadId: string | null` — current thread
- `pageContext: { page: string, draftId?: string }` — route-aware
- `toggle()`, `open(context?)`, `close()`

### Hooks
- `useKokoChat(threadId)` — SSE streaming, message state, send function
- `useKokoThreads()` — list threads for company
- `useCreateKokoThread()` — create new thread

### Styling
- Panel: 420px wide, glassmorphism card (same as ChartCard)
- Messages: user = right-aligned primary bg, Koko = left-aligned card bg with monkey avatar
- Action chips: rounded-full, outline style, hover highlight
- Inline cards: bordered, compact versions of existing dashboard cards
- Font: Inter (body), Space Grotesk (Koko name/headers)

---

## SSE Event Types

```typescript
type KokoSSEEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: Record<string, unknown> }
  | { type: 'actions'; actions: KokoAction[] }
  | { type: 'done'; thread_id: string; message_id: string; tokens_used: number };

type KokoAction = {
  label: string;
  action_type: 'send_message' | 'navigate' | 'open_draft';
  payload: string;
};
```

---

## V1 Scope

**In:**
- Slide-over panel with FAB on all `/app/*` pages
- Token-by-token SSE streaming
- Welcome screen with quick action chips
- Follow-up suggestion chips
- Inline draft preview cards with action buttons
- Inline analytics summary cards
- All 11 tools (create/update/get drafts, generate content, analytics, accounts, voice, automations)
- Full conversation history with thread management
- Page context awareness
- Simple SVG monkey avatar
- Gemini 3.1 Flash Lite

**Deferred (V2):**
- Avatar animation / personality typing indicator
- Image generation / media in chat
- Direct "Schedule" / "Post now" from chat (V1 saves drafts)
- Proactive suggestions
- Voice input
- Multi-user thread sharing
- Keyboard shortcut
