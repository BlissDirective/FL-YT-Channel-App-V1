-- Phase 3 reliability (Fable5-Enhancement-Plan.md): make queue claims
-- atomic and stale work recoverable.
--
-- * operator_runs.last_seed_key — CAS target for the daily seed: the tick
--   that writes today's key owns the slot; a concurrent tick matches zero
--   rows and skips (previously: check-then-act on a count → double seed).
-- * clip_jobs.claimed_at / video_intel.claimed_at + attempts — lets a
--   reaper send crashed 'running' rows back to 'queued' (bounded by
--   attempts) instead of stranding them forever, which also blocked
--   clips' maybeFinish from ever advancing the video.

alter table operator_runs add column if not exists last_seed_key text;

alter table clip_jobs add column if not exists claimed_at timestamptz;

alter table video_intel add column if not exists claimed_at timestamptz;
alter table video_intel add column if not exists attempts int not null default 0;
