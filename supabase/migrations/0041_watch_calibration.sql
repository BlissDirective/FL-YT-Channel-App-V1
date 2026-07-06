-- Self-Watch Loop, Phase 4 (Fable5-Self-Watch-Loop-Plan.md): calibration.
--
-- The operator's 👍/👎 on a Self-Watch verdict reuses the C1 `judge_labels`
-- table (gate = 'WATCH') so the existing judge-calibration surface shows it
-- automatically. Watch verdicts aren't `qc_reviews`, so the review-id becomes
-- optional — a watch label carries `video_id` + `gate` + `agree` and no
-- `qc_review_id`.
alter table judge_labels alter column qc_review_id drop not null;
