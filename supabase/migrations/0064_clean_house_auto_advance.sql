-- Clean House auto-advance follow-up (Clean-House-Build-Spec.md §3).
-- A run now drives itself hands-off across many cron ticks. Add the state the
-- tick loop needs: a double-run lock, termination-rail counters, and per-item
-- stall tracking. All additive + idempotent.

alter table clean_house_runs
  -- Idempotency / double-run lock: the cron sweep and the "Advance now" button
  -- can fire at the same instant. A tick claims the run by stamping locked_at;
  -- a stale claim (older than the lease) is reclaimable so a crashed tick never
  -- wedges the run.
  add column if not exists locked_at timestamptz,
  -- Termination rails.
  add column if not exists tick_count int not null default 0,
  add column if not exists no_progress_ticks int not null default 0,
  -- Progress signature (resolved-item count) from the previous tick, to detect
  -- a wedged run that advances nothing.
  add column if not exists last_progress int not null default 0,
  -- Why the rails auto-paused (surfaced to the operator + notification).
  add column if not exists paused_reason text;

alter table clean_house_items
  -- When this item was advanced into an async worker stage, for stall handling.
  add column if not exists inflight_since timestamptz,
  -- How many times the run has nudged this stuck in-flight asset.
  add column if not exists nudges int not null default 0;
