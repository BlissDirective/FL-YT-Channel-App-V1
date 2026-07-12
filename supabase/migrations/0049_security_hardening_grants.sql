-- Security hardening (pre-launch audit): shrink the `anon` role's blast radius
-- and re-assert the single-operator signup guard.
--
-- Migration 0042 re-granted ALL privileges on every table/sequence/function
-- to `anon, authenticated, service_role` (to restore platform defaults a reset
-- local stack had dropped). For `authenticated`/`service_role` that is correct;
-- for `anon` it is not — a single-operator app never needs the public,
-- browser-shipped anon key to touch a table. RLS default-denies today, so the
-- grant is currently inert, but it is the exact trap that turns "a new table
-- forgot to enable RLS" (or an over-broad anon policy on the upcoming public
-- launch_leads table) into instant full anon read/write. Remove the second
-- layer's hole so RLS is not the ONLY thing standing between the public anon
-- key and the database.

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema public from anon;

-- Stop future tables/sequences/functions from auto-granting to anon (0042 set
-- these default privileges; unset them for anon only).
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- (The vector-search RPCs match_ideas/match_memory are SECURITY INVOKER, so RLS
-- already blocks anon from reading any rows through them; the blanket revoke on
-- all functions above also removes anon's EXECUTE grant.)

-- `anon` keeps only schema USAGE (needed for GoTrue/PostgREST to resolve the
-- schema at all); it now has NO table/sequence/function privileges. Every
-- authenticated data path is unaffected (authenticated + service_role keep
-- their 0042 grants).
grant usage on schema public to anon;

-- Re-assert the single-operator signup guard idempotently. 0032 created it but
-- swallowed insufficient_privilege on hosted stacks where the migration role
-- couldn't attach a trigger to auth.users; this re-attempt keeps the schema
-- self-healing. If it still can't attach, the anon-grant lockdown above plus
-- the app-level bootstrapAccount refusal remain in force.
create or replace function public.block_additional_signups()
returns trigger language plpgsql security definer set search_path = public as $$
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
  when insufficient_privilege then
    raise notice 'single_operator_guard: insufficient privilege to attach to auth.users — attach manually as owner';
end $$;
