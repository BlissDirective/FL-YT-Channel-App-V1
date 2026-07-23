-- Clean House v2 — budget allocation strategy
-- (Precision-Editing-and-Clean-House-v2-Spec.md §A). Additive + idempotent.

-- Which strategy the operator chose for how a capped budget is allocated:
-- salvageability (default) | cheapest | closest-to-floor.
alter table clean_house_runs
  add column if not exists budget_strategy text not null default 'salvageability';

-- The asset's QC score at triage time — powers the closest-to-floor ranking
-- (nullable: an asset may never have been scored).
alter table clean_house_items
  add column if not exists qc_score numeric;
