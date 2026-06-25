-- Stick Studio — Tier-1 vision critique (see docs/stick-studio/Vision-Optimizer-Loop.md).
-- After a stick video renders, the farm renders a few keyframe stills and has
-- Claude (vision) critique them against a rubric (pose readability, composition,
-- caption legibility, character consistency). The structured result is stored
-- here so the app can surface it and flag the weak beats.
--   { score, scores:{readability,composition,captions,consistency},
--     issues:[{ beatIdx, category, severity, note, fix }], strengths:[], at }

alter table videos
  add column if not exists vision_review jsonb;
