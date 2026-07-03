-- Harness C1 (Fable5-Agentic-Harness-Plan.md): judge calibration.
--
-- * qc_reviews gains the per-criterion binary verdicts (the calibration
--   unit), the judge model, and whether the cascade escalated.
-- * judge_labels — the operator's agree/disagree on reviews they see anyway
--   (review queue / video page). ~50 labels in, the calibration report can
--   measure per-criterion agreement and name the rubric lines to rewrite.

alter table qc_reviews add column if not exists criteria jsonb;
alter table qc_reviews add column if not exists judge_model text;
alter table qc_reviews add column if not exists escalated boolean not null default false;

create table if not exists judge_labels (
  id uuid primary key default gen_random_uuid(),
  qc_review_id uuid not null references qc_reviews(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  gate text not null,
  agree boolean not null,
  -- Optional: which specific criterion the operator disputes (null = overall).
  criterion_id text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists judge_labels_review_idx on judge_labels (qc_review_id);
create index if not exists judge_labels_gate_idx on judge_labels (gate, created_at desc);

alter table judge_labels enable row level security;
do $$ begin
  create policy authenticated_full_access on judge_labels
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
