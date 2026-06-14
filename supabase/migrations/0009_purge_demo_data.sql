-- Phase 10 handoff — purge seeded demo data before going live.
-- Deletes demo projects only (is_demo = true); the FK `on delete cascade`
-- / `set null` rules clean up their videos, scripts, assets, ideas,
-- approvals, analytics_snapshots, insights, and cost-ledger rows. Real
-- projects are never matched. Idempotent and one-time (tracked in
-- public._migrations); the Settings → Danger zone button does the same
-- on demand afterward.
delete from projects where is_demo = true;
