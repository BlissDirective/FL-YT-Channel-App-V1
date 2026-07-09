-- 0042: Re-assert the standard Supabase API-role grants on the public schema.
--
-- Hosted Supabase projects carry these grants by default, but a freshly
-- reset local stack (supabase db reset in the e2e-authed CI job, CLI
-- `latest`) began denying the `authenticated` role table access on
-- 2026-07-07 with no migration change in the window — createProject fails
-- with `permission denied for table projects` and the golden path dies at
-- the first insert. Asserting the grants explicitly makes the schema
-- self-sufficient on any stack instead of relying on platform defaults.
--
-- Idempotent, and a no-op wherever the grants already exist. Row-level
-- security (authenticated_full_access policies + the single-operator
-- signup guard) remains the real access control; these grants only restore
-- the table-privilege layer beneath it.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

-- Future tables/sequences/functions created by the migration role inherit
-- the same grants, so a new migration can't silently miss them.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
