-- Character Studio, Phase 2: per-character spend accounting.
--
-- Character design spend is real money spent OUTSIDE a video: candidate grids,
-- turnaround sheets, portrait looks. It ledgers at SYSTEM scope (project_id
-- null, like research spend) so a design session can never eat a project's
-- monthly production cap — but it still has to be attributable, because the
-- Studio shows a running per-character meter and warns (never blocks) past a
-- soft budget (decision Q10).
alter table cost_ledger add column if not exists character_id uuid references characters(id) on delete set null;
create index if not exists ledger_character_idx on cost_ledger (character_id) where character_id is not null;
