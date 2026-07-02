-- Phase 1 security hardening (Fable5-Enhancement-Plan.md)
--
-- 1. audit_log — every remote mutation (studio-mcp control surface) is
--    recorded: which token scope, which tool, which arguments.
-- 2. Signup lockdown — the app is single-operator by design: the committed
--    anon key + blanket authenticated RLS assume nobody else can ever become
--    "authenticated". bootstrapAccount refuses a second app account, but
--    GoTrue's public /signup endpoint is a dashboard setting we can't verify
--    from code. This trigger makes the guarantee live in the database:
--    once one user exists, further auth.users inserts are rejected.
--    To intentionally add a user later: drop trigger single_operator_guard
--    on auth.users, create the user, re-create the trigger.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,           -- e.g. 'mcp:control', 'mcp:read'
  action text not null,          -- tool/action name
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log (created_at desc);

alter table audit_log enable row level security;
do $$ begin
  create policy authenticated_full_access on audit_log
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Single-operator signup guard on auth.users.
create or replace function public.block_additional_signups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from auth.users) >= 1 then
    raise exception 'signups are disabled: this studio is single-operator';
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger single_operator_guard
    before insert on auth.users
    for each row execute function public.block_additional_signups();
exception
  when duplicate_object then null;
  -- If the migration role can't create triggers on auth.users in this
  -- environment, don't fail the whole migration — the app-level guard
  -- (bootstrapAccount) still applies; re-run from the SQL editor as owner.
  when insufficient_privilege then
    raise notice 'could not create trigger on auth.users (insufficient privilege) — create it manually';
end $$;
