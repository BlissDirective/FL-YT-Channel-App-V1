-- Scored provider/model selection (#1): store WHY each beat's video model was
-- chosen — winner score, the 7-dimension breakdown, the ranked alternatives,
-- and a human rationale — so the pick is explainable and auditable (feeds the
-- #9 decision audit trail). Nullable: legacy rows and operator-driven single
-- clips simply carry no selection.
alter table clip_jobs
  add column if not exists selection jsonb;

comment on column clip_jobs.selection is
  'Scored model-selection log: { model, rationale, score, estCostUsd, dims, weights, alternatives[], operatorLocked }';
