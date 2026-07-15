-- Visual Craft Engine V2 — shot plan + asset provenance (§2.2).
--
-- videos.shot_plan — the per-beat shot decomposition + the Medium Router's
-- chosen medium/cost/reason per shot. Drives cost-aware generation when the
-- vce.router flag is on; null otherwise (flag-off = today's flat generation).
--
-- assets provenance columns (nullable, back-compatible): which medium produced
-- the asset, its last beat-relevance score, and (V4) the grounding reference.
alter table videos add column if not exists shot_plan jsonb;

alter table assets add column if not exists medium text;
alter table assets add column if not exists relevance_score numeric;
alter table assets add column if not exists grounded_ref jsonb;
