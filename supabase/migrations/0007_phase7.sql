-- Phase 7 — Publish Kit & Live Stats Tracking
-- Adds the publish/tracking columns and wires analytics_snapshots into the
-- Realtime feed so the dashboard updates the moment new stats land.

-- Configurable niche RPM (USD per 1,000 views) → drives estimated revenue.
alter table projects
  add column if not exists rpm_usd numeric not null default 2.0;

-- When the operator marked the video uploaded (start of the tracking window).
alter table videos
  add column if not exists published_at timestamptz;

-- One tracked video is looked up by its YouTube id during stat refreshes.
create index if not exists videos_youtube_idx
  on videos (youtube_video_id)
  where youtube_video_id is not null;

-- Stat snapshots stream to the overview/video pages as they're captured.
do $$ begin
  alter publication supabase_realtime add table analytics_snapshots;
exception when duplicate_object then null; end $$;
