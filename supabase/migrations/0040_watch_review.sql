-- Self-Watch Loop, Phase 0–1 (Fable5-Self-Watch-Loop-Plan.md): the pre-publish
-- watch verdict. Mirrors `videos.vision_review` — a jsonb blob holding the
-- WatchVerdict (overall score, per-dimension timing/script-match results, the
-- fix plan, and applied `quality`-namespace lessons). Written when a video is
-- settled at FINAL_REVIEW; read by the operator publish gate + the review card.
alter table videos add column if not exists watch_review jsonb;
