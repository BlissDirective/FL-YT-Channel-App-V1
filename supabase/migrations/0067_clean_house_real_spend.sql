-- Clean House spend accuracy: separate the pre-flight ESTIMATE from reconciled
-- REAL dollars. `spent_usd` now tracks money actually booked to the cost ledger
-- (anthropic/render/etc.) for the run's assets; `committed_usd` tracks the
-- accumulated estimate the budget stop caps on — the ledger lags async workers,
-- so the estimate is the leading guard while real spend catches up. Additive +
-- idempotent. Operators see real dollars; the ceiling stays honest via the max
-- of the two (packages/core cleanHouseCommittedSpend).
alter table clean_house_runs
  add column if not exists committed_usd numeric not null default 0;
