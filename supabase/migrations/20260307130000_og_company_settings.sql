-- OG Image company-level settings
create table if not exists og_company_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  show_title boolean not null default true,
  show_description boolean not null default true,
  show_author boolean not null default false,
  show_date boolean not null default false,
  show_logo boolean not null default true,
  show_category_tag boolean not null default false,
  show_source_name boolean not null default true,
  logo_url text,
  logo_dark_url text,
  brand_color text default '#3B82F6',
  brand_color_secondary text,
  font_family text default 'sans',          -- 'sans' | 'serif' | 'mono' — overrides template default for all text
  font_family_title text,                   -- optional separate font for titles only (null = use font_family)
  preferred_template_ids text[] default '{}',
  disabled_template_ids text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: company members can read their own settings
alter table og_company_settings enable row level security;

create policy "Members can view own company OG settings"
  on og_company_settings for select
  using (
    company_id in (
      select cm.company_id from company_memberships cm where cm.user_id = auth.uid()
    )
  );

-- Only owners/admins can update
create policy "Admins can update own company OG settings"
  on og_company_settings for update
  using (
    company_id in (
      select cm.company_id from company_memberships cm
      where cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  );

create policy "Admins can insert own company OG settings"
  on og_company_settings for insert
  with check (
    company_id in (
      select cm.company_id from company_memberships cm
      where cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  );

-- Service role bypass (for edge functions)
create policy "Service role full access to OG settings"
  on og_company_settings for all
  using (auth.role() = 'service_role');

-- Updated_at trigger
create or replace function update_og_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger og_settings_updated_at
  before update on og_company_settings
  for each row execute function update_og_settings_timestamp();
