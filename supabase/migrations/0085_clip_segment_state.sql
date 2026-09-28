-- Directed chained sections (> 30s) resume per segment: finished segments are
-- saved to storage and listed here, and the in-flight segment's Higgsfield
-- request id rides provider_request_id. A worker timeout or crash never
-- re-generates (and re-pays for) segments that already landed.
-- Shape: { "done": [{ "i": 0, "path": "videos/<vid>/seg-<beat>-<hash>-0.mp4" }], "current": 1 }
-- Idempotent.
alter table clip_jobs add column if not exists segment_state jsonb;
