-- Phase 3 — orchestration backbone, budget pauses, web-push subscriptions.

-- Why a pipeline pauses (budget cap, kill switch); null = running normally.
alter table videos add column if not exists paused_reason text;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys jsonb not null default '{}',            -- {p256dh, auth}
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
do $$ begin
  create policy authenticated_full_access on push_subscriptions
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Global kill switch lives in app_settings under this key.
insert into app_settings (key, value)
values ('kill_switch', '{"enabled": false}')
on conflict (key) do nothing;
