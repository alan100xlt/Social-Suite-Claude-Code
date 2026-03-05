-- Automation rules for auto-responses
create table inbox_auto_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  enabled boolean default true,
  trigger_type text not null check (trigger_type in ('keyword', 'regex', 'sentiment', 'all_new')),
  trigger_value text,
  trigger_platform text,
  trigger_conversation_type text,
  action_type text not null check (action_type in ('canned_reply', 'ai_response')),
  canned_reply_id uuid references inbox_canned_replies(id) on delete set null,
  ai_prompt_template text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table inbox_auto_rules enable row level security;

create policy "Users can view automation rules for their company"
  on inbox_auto_rules for select
  using (
    exists (
      select 1 from company_memberships
      where company_memberships.company_id = inbox_auto_rules.company_id
      and company_memberships.user_id = auth.uid()
    )
  );

create policy "Users can manage automation rules for their company"
  on inbox_auto_rules for all
  using (
    exists (
      select 1 from company_memberships
      where company_memberships.company_id = inbox_auto_rules.company_id
      and company_memberships.user_id = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on inbox_auto_rules to authenticated;
grant all on inbox_auto_rules to service_role;

-- Updated_at trigger
create trigger set_inbox_auto_rules_updated_at
  before update on inbox_auto_rules
  for each row
  execute function update_updated_at_column();
