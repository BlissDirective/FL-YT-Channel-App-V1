-- Cost controls (Full Auto economy).
--  • clip_jobs.fal_request_id / fal_response_url — resume a timed-out fal job
--    instead of paying for a fresh generation on retry (#2 cost-leak fix).
--  • clip_jobs.attempts — cap retries so a flaky beat can't bill forever.
--  • projects.max_video_usd — hard per-video budget the smart-mix respects by
--    downgrading beats to free stills/stock when projected to exceed (#3).
--  • projects.ai_clip_cap — max AI-video beats per video in the economy mix (#1).
alter table clip_jobs add column if not exists fal_request_id text;
alter table clip_jobs add column if not exists fal_response_url text;
alter table clip_jobs add column if not exists attempts int not null default 0;
alter table projects add column if not exists max_video_usd numeric not null default 4;
alter table projects add column if not exists ai_clip_cap int not null default 3;
