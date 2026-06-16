-- Full Auto-Generate tier revision (base / economy / premium / platinum / custom).
--
-- The chosen tier is passed per-run to fullAutoGenerate() and never persisted,
-- so there is NO stored tier column to remap — the rename is code-only
-- (src/lib/adapters/auto-tiers.ts). The only data change this revision needs is
-- per-video budget headroom:
--
--   Platinum's smart mix (Seedance 2.0 b-roll + Kling hero) runs ~$4.8 of AI
--   video on a 7-min script, which exceeds the old $4 per-video budget default
--   (projects.max_video_usd). Under that cap the selector silently downgrades
--   hero beats to stills. Raise the default so Platinum is usable, and lift any
--   project still sitting on the legacy $4 default (custom budgets untouched).
--
-- Cheaper tiers are unaffected: Base places no AI video and Economy is bounded
-- by ai_clip_cap (~$0.4), so a higher ceiling never increases their spend — it
-- only stops throttling the premium tiers.
alter table projects alter column max_video_usd set default 7;
update projects set max_video_usd = 7 where max_video_usd = 4;
