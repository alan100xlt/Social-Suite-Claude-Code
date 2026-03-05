-- Inbox feature: conversations, messages, contacts, labels, canned replies
-- Architecture: GetLate API (data source) + Supabase (state/workflow) + pg_cron (polling)

-- ─── Contacts ────────────────────────────────────────────────
create table if not exists public.inbox_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  platform text not null,
  platform_user_id text not null,
  username text,
  display_name text,
  avatar_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, platform, platform_user_id)
);

create index idx_inbox_contacts_company on public.inbox_contacts(company_id);
create index idx_inbox_contacts_platform on public.inbox_contacts(company_id, platform);

-- ─── Conversations ──────────────────────────────────────────
create table if not exists public.inbox_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  platform text not null,
  platform_conversation_id text,
  type text not null check (type in ('comment', 'dm', 'review', 'mention')),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed', 'snoozed')),
  subject text,
  contact_id uuid references public.inbox_contacts(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', null)),
  post_id text, -- GetLate post ID this conversation relates to
  post_url text,
  snooze_until timestamptz,
  last_message_at timestamptz default now(),
  last_message_preview text,
  unread_count int default 1,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_inbox_conv_company on public.inbox_conversations(company_id);
create index idx_inbox_conv_status on public.inbox_conversations(company_id, status);
create index idx_inbox_conv_platform on public.inbox_conversations(company_id, platform);
create index idx_inbox_conv_assigned on public.inbox_conversations(company_id, assigned_to);
create index idx_inbox_conv_last_msg on public.inbox_conversations(company_id, last_message_at desc);
create index idx_inbox_conv_snooze on public.inbox_conversations(snooze_until) where snooze_until is not null;

-- ─── Messages ───────────────────────────────────────────────
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  platform_message_id text,
  contact_id uuid references public.inbox_contacts(id) on delete set null,
  sender_type text not null check (sender_type in ('contact', 'agent', 'system', 'bot')),
  sender_user_id uuid references auth.users(id) on delete set null,
  content text not null,
  content_type text default 'text' check (content_type in ('text', 'image', 'video', 'attachment', 'note')),
  media_url text,
  parent_message_id uuid references public.inbox_messages(id) on delete set null,
  is_internal_note boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_inbox_msg_conv on public.inbox_messages(conversation_id, created_at);
create index idx_inbox_msg_company on public.inbox_messages(company_id);
create index idx_inbox_msg_parent on public.inbox_messages(parent_message_id) where parent_message_id is not null;

-- Full-text search index for message content
alter table public.inbox_messages add column if not exists fts tsvector
  generated always as (to_tsvector('english', coalesce(content, ''))) stored;
create index idx_inbox_msg_fts on public.inbox_messages using gin(fts);

-- ─── Labels ─────────────────────────────────────────────────
create table if not exists public.inbox_labels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  color text default '#6c7bf0',
  created_at timestamptz default now(),
  unique(company_id, name)
);

create table if not exists public.inbox_conversation_labels (
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  label_id uuid not null references public.inbox_labels(id) on delete cascade,
  primary key (conversation_id, label_id)
);

-- ─── Canned Replies ─────────────────────────────────────────
create table if not exists public.inbox_canned_replies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  content text not null,
  shortcut text,
  platform text, -- null = all platforms
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_inbox_canned_company on public.inbox_canned_replies(company_id);

-- ─── Read tracking (per-user) ───────────────────────────────
create table if not exists public.inbox_read_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (user_id, conversation_id)
);

-- ─── Sync state (track last poll per company/platform) ──────
create table if not exists public.inbox_sync_state (
  company_id uuid not null references public.companies(id) on delete cascade,
  platform text not null,
  sync_type text not null, -- 'comments', 'dms', 'reviews'
  last_synced_at timestamptz,
  cursor text, -- platform-specific pagination cursor
  metadata jsonb default '{}',
  primary key (company_id, platform, sync_type)
);

-- ─── RLS Policies ───────────────────────────────────────────
alter table public.inbox_contacts enable row level security;
alter table public.inbox_conversations enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.inbox_labels enable row level security;
alter table public.inbox_conversation_labels enable row level security;
alter table public.inbox_canned_replies enable row level security;
alter table public.inbox_read_status enable row level security;
alter table public.inbox_sync_state enable row level security;

-- Helper: check if user belongs to company
-- (reuse existing company_memberships check pattern)

-- Contacts: company members can read/write
create policy "inbox_contacts_select" on public.inbox_contacts for select using (
  exists (select 1 from public.company_memberships where company_id = inbox_contacts.company_id and user_id = auth.uid())
);
create policy "inbox_contacts_insert" on public.inbox_contacts for insert with check (
  exists (select 1 from public.company_memberships where company_id = inbox_contacts.company_id and user_id = auth.uid())
);
create policy "inbox_contacts_update" on public.inbox_contacts for update using (
  exists (select 1 from public.company_memberships where company_id = inbox_contacts.company_id and user_id = auth.uid())
);

-- Conversations: company members can read/write
create policy "inbox_conv_select" on public.inbox_conversations for select using (
  exists (select 1 from public.company_memberships where company_id = inbox_conversations.company_id and user_id = auth.uid())
);
create policy "inbox_conv_insert" on public.inbox_conversations for insert with check (
  exists (select 1 from public.company_memberships where company_id = inbox_conversations.company_id and user_id = auth.uid())
);
create policy "inbox_conv_update" on public.inbox_conversations for update using (
  exists (select 1 from public.company_memberships where company_id = inbox_conversations.company_id and user_id = auth.uid())
);

-- Messages: company members can read/write
create policy "inbox_msg_select" on public.inbox_messages for select using (
  exists (select 1 from public.company_memberships where company_id = inbox_messages.company_id and user_id = auth.uid())
);
create policy "inbox_msg_insert" on public.inbox_messages for insert with check (
  exists (select 1 from public.company_memberships where company_id = inbox_messages.company_id and user_id = auth.uid())
);

-- Labels: company members can CRUD
create policy "inbox_labels_select" on public.inbox_labels for select using (
  exists (select 1 from public.company_memberships where company_id = inbox_labels.company_id and user_id = auth.uid())
);
create policy "inbox_labels_insert" on public.inbox_labels for insert with check (
  exists (select 1 from public.company_memberships where company_id = inbox_labels.company_id and user_id = auth.uid())
);
create policy "inbox_labels_update" on public.inbox_labels for update using (
  exists (select 1 from public.company_memberships where company_id = inbox_labels.company_id and user_id = auth.uid())
);
create policy "inbox_labels_delete" on public.inbox_labels for delete using (
  exists (select 1 from public.company_memberships where company_id = inbox_labels.company_id and user_id = auth.uid())
);

-- Conversation labels: inherit from conversation access
create policy "inbox_conv_labels_select" on public.inbox_conversation_labels for select using (
  exists (
    select 1 from public.inbox_conversations c
    join public.company_memberships cm on cm.company_id = c.company_id
    where c.id = inbox_conversation_labels.conversation_id and cm.user_id = auth.uid()
  )
);
create policy "inbox_conv_labels_insert" on public.inbox_conversation_labels for insert with check (
  exists (
    select 1 from public.inbox_conversations c
    join public.company_memberships cm on cm.company_id = c.company_id
    where c.id = inbox_conversation_labels.conversation_id and cm.user_id = auth.uid()
  )
);
create policy "inbox_conv_labels_delete" on public.inbox_conversation_labels for delete using (
  exists (
    select 1 from public.inbox_conversations c
    join public.company_memberships cm on cm.company_id = c.company_id
    where c.id = inbox_conversation_labels.conversation_id and cm.user_id = auth.uid()
  )
);

-- Canned replies: company members can CRUD
create policy "inbox_canned_select" on public.inbox_canned_replies for select using (
  exists (select 1 from public.company_memberships where company_id = inbox_canned_replies.company_id and user_id = auth.uid())
);
create policy "inbox_canned_insert" on public.inbox_canned_replies for insert with check (
  exists (select 1 from public.company_memberships where company_id = inbox_canned_replies.company_id and user_id = auth.uid())
);
create policy "inbox_canned_update" on public.inbox_canned_replies for update using (
  exists (select 1 from public.company_memberships where company_id = inbox_canned_replies.company_id and user_id = auth.uid())
);
create policy "inbox_canned_delete" on public.inbox_canned_replies for delete using (
  exists (select 1 from public.company_memberships where company_id = inbox_canned_replies.company_id and user_id = auth.uid())
);

-- Read status: users can only manage their own
create policy "inbox_read_select" on public.inbox_read_status for select using (user_id = auth.uid());
create policy "inbox_read_upsert" on public.inbox_read_status for insert with check (user_id = auth.uid());
create policy "inbox_read_update" on public.inbox_read_status for update using (user_id = auth.uid());

-- Sync state: service role only (edge functions use service key)
-- No user-facing RLS needed; edge functions bypass RLS with service role

-- ─── Updated at trigger ─────────────────────────────────────
create or replace function public.update_inbox_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger inbox_contacts_updated before update on public.inbox_contacts
  for each row execute function public.update_inbox_updated_at();
create trigger inbox_conversations_updated before update on public.inbox_conversations
  for each row execute function public.update_inbox_updated_at();
create trigger inbox_canned_replies_updated before update on public.inbox_canned_replies
  for each row execute function public.update_inbox_updated_at();

-- ─── Snooze resurface: update snoozed conversations back to open ──
-- Called by pg_cron every 60 seconds
create or replace function public.inbox_resurface_snoozed()
returns void as $$
begin
  update public.inbox_conversations
  set status = 'open', snooze_until = null, updated_at = now()
  where status = 'snoozed' and snooze_until <= now();
end;
$$ language plpgsql security definer;

-- Grant execute to service role
grant execute on function public.inbox_resurface_snoozed() to service_role;

-- ─── Grants ─────────────────────────────────────────────────
grant select, insert, update on public.inbox_contacts to authenticated;
grant select, insert, update on public.inbox_conversations to authenticated;
grant select, insert on public.inbox_messages to authenticated;
grant select, insert, update, delete on public.inbox_labels to authenticated;
grant select, insert, delete on public.inbox_conversation_labels to authenticated;
grant select, insert, update, delete on public.inbox_canned_replies to authenticated;
grant select, insert, update on public.inbox_read_status to authenticated;
grant all on public.inbox_sync_state to service_role;
