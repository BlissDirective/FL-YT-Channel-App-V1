-- Auto Pilot Operator (Phase B). Per-video approval state for operator-owned
-- videos: when the approval card was sent, the QC score it carried, and the
-- decision. Drives the Telegram approve/skip flow + the auto-approve-after-N-hours
-- fallback. See docs/Auto-Pilot-Operator-build-plan.md.

alter table videos
  -- { notifiedAt: ISO, qc: number, decided: 'approved'|'skipped'|null, by: string }
  add column if not exists operator_review jsonb not null default '{}'::jsonb;
