-- Message reactions for inbox teamwork (Sprint 1)
-- Internal-only emoji reactions on inbox messages

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.inbox_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  -- One reaction per emoji per user per message
  unique (message_id, user_id, emoji)
);

-- Indexes
create index idx_message_reactions_message on public.message_reactions(message_id);
create index idx_message_reactions_company on public.message_reactions(company_id);

-- RLS
alter table public.message_reactions enable row level security;

-- Members of the company can view reactions
create policy "Company members can view reactions"
  on public.message_reactions for select
  using (
    company_id in (
      select company_id from public.company_memberships where user_id = auth.uid()
    )
  );

-- Members can insert their own reactions
create policy "Company members can add reactions"
  on public.message_reactions for insert
  with check (
    user_id = auth.uid()
    and company_id in (
      select company_id from public.company_memberships where user_id = auth.uid()
    )
  );

-- Users can delete their own reactions
create policy "Users can remove own reactions"
  on public.message_reactions for delete
  using (user_id = auth.uid());

-- Also add RLS policy for inbox_read_status (needed for read receipts feature)
-- The table exists but may lack policies for client-side querying

-- Allow company members to read read_status for conversations in their company
create policy "Company members can view read status"
  on public.inbox_read_status for select
  using (
    conversation_id in (
      select ic.id from public.inbox_conversations ic
      join public.company_memberships cm on cm.company_id = ic.company_id
      where cm.user_id = auth.uid()
    )
  );
