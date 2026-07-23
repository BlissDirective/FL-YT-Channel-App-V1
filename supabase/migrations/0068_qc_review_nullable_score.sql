-- Degraded QC reviews (no key / API failure / unparseable judge payload) are
-- NOT a measurement. The pipeline used to record the neutral placeholder 6.0
-- for them, which the library surfaced as a real QC score. We now record a NULL
-- score for a degraded review (the video still holds — degraded => qcErrored),
-- and the library skips null-score rows so the tile shows the latest GENUINE
-- score. That requires the column to be nullable. Idempotent + safe (widening).
alter table qc_reviews
  alter column score drop not null;
