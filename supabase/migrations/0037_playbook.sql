-- Harness C4 (Fable5-Agentic-Harness-Plan.md): the governed, evidence-gated
-- playbook. Tagged bullets with confidence, evidence, and timestamps —
-- replacing the flat, ungoverned string arrays. Capped + expired on write;
-- raw outcomes remain immutable in qc_reviews / autofix_runs / analytics.
alter table projects add column if not exists playbook jsonb not null default '[]'::jsonb;
