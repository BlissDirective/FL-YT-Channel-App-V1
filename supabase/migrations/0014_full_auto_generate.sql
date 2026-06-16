-- Full Auto-Generate support.
--  • videos.auto_finish  — worker auto-advances to render (then pauses at Final)
--  • clip_jobs.hero_hold — render slow-pans this hero clip instead of looping
--  • projects.clip_confirm_usd — operator-set confirm threshold (default $3)
alter table videos add column if not exists auto_finish boolean not null default false;
alter table clip_jobs add column if not exists hero_hold boolean not null default false;
alter table projects add column if not exists clip_confirm_usd numeric not null default 3;
