-- Directed production: concurrency guards (docs/production/directed-pipeline.md).
-- 1) directed_lease_until — an atomic per-video lease so overlapping
--    produce_directed calls (an MCP client retrying after its 60s timeout
--    while the server run is still going) never run the same paid step twice.
-- 2) One OPEN clip job per section, enforced by the database, so a race can
--    never queue (and pay for) a duplicate section generation.
-- Idempotent.
alter table videos add column if not exists directed_lease_until timestamptz;

create unique index if not exists clip_jobs_one_open_per_section
  on clip_jobs (video_id, beat_idx)
  where status in ('queued', 'running');
