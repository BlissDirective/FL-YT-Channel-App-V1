-- Full Auto-Generate tier revision (base / economy / premium / platinum / custom).
--
-- The chosen tier is passed per-run to fullAutoGenerate() and never persisted,
-- so there is NO stored tier column to remap — the rename is code-only
-- (src/lib/adapters/auto-tiers.ts). The only data change this revision needs is
-- per-video budget headroom:
--
--   Platinum/Custom mixes (Kling/Seedance hero bookends + length-scaled b-roll)
--   can run ~$5–8 of AI video, exceeding the old $4 per-video budget default
--   (projects.max_video_usd). Under that cap the selector silently downgrades
--   hero beats to stills. Raise the default so the premium tiers are usable,
--   and lift any project still on the legacy $4 default (custom budgets kept).
--
-- Cheaper tiers are unaffected: Base places no AI video and Economy is bounded
-- by ai_clip_cap (~$0.4), so a higher ceiling never increases their spend — it
-- only stops throttling the premium tiers.
alter table projects alter column max_video_usd set default 8;
update projects set max_video_usd = 8 where max_video_usd = 4;
