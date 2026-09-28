-- Directed production (docs/production/directed-pipeline.md): a video whose
-- script was authored by a director/brief and must be executed verbatim.
--   videos.directed  — gates every autonomous rewrite pass (art director,
--                      shot router, relevance re-rolls, data-viz swaps) off.
--   clip_jobs.spec   — the exact generation request for a directed section
--                      (verbatim prompt, aspect, refs, end frame, look,
--                      native-audio flag). Null on autonomous jobs.
--   clip_jobs.quote_usd / quote_credits — Higgsfield's /estimate quote for
--                      the job (summed over stitched segments), so the ledger
--                      price can be told apart from the catalog fallback.
-- Idempotent.

alter table videos add column if not exists directed boolean not null default false;
alter table clip_jobs add column if not exists spec jsonb;
alter table clip_jobs add column if not exists quote_usd numeric(10, 4);
alter table clip_jobs add column if not exists quote_credits numeric(12, 2);
