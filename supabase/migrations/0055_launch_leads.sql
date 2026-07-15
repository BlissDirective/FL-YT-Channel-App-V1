-- Launch waitlist leads (pre-market email capture for the /launch hero page).
-- Insert-only for anonymous visitors; reads reserved for admins/service-role.
-- Designed so the deferred Resend double-opt-in is additive (confirmed_at).

create extension if not exists citext;

create table if not exists launch_leads (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  source text not null default 'launch',
  referrer text,
  utm jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  -- Reserved for the future double-opt-in flow (Resend); null = single opt-in.
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table launch_leads enable row level security;

-- Anonymous visitors may ONLY insert (join the list) — never read the list.
drop policy if exists launch_leads_anon_insert on launch_leads;
create policy launch_leads_anon_insert
  on launch_leads for insert to anon
  with check (true);

-- The service role (admin leads view / exports) has full access.
drop policy if exists launch_leads_service_all on launch_leads;
create policy launch_leads_service_all
  on launch_leads for all to service_role
  using (true) with check (true);

create index if not exists launch_leads_created_at_idx on launch_leads (created_at desc);
