-- Part B4 (Fable5-Agentic-Harness-Plan.md): sharper reward signals than raw
-- views for the outcome audit (C3) and the format bandit (C5).
--
-- retention_pct / watch_minutes / subs_gained / engaged_views are populated
-- from the YouTube Analytics API when a project has OAuth (youtube_refresh_
-- token); null otherwise. Engaged views matter because since Mar 2025 a raw
-- "view" counts any Shorts swipe-past, so the algorithm runs on engaged views.
-- (Impression CTR is deliberately absent — the Analytics API doesn't expose
-- it; the channel-summary CTR already reports null rather than a fake 0.)
alter table analytics_snapshots add column if not exists retention_pct double precision;
alter table analytics_snapshots add column if not exists watch_minutes double precision;
alter table analytics_snapshots add column if not exists subs_gained integer;
alter table analytics_snapshots add column if not exists engaged_views bigint;
