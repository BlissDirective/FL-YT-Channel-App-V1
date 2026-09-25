alter table clip_jobs add column if not exists provider text;
alter table clip_jobs add column if not exists provider_request_id text;
alter table clip_jobs add column if not exists provider_status_url text;
-- Higgsfield becomes the primary visual provider (docs/Higgsfield-Integration-Plan.md).
--
-- clip_jobs.provider             — 'higgsfield' once a Higgsfield request was
--                                  submitted for the job (null on legacy/fal rows).
-- clip_jobs.provider_request_id  — Higgsfield request id, persisted right after
--                                  submit so a worker that times out RESUMES the
--                                  same (billed) generation instead of paying
--                                  twice. Higgsfield has no idempotency key.
-- clip_jobs.provider_status_url  — the status URL Higgsfield returned for it.
--   (fal jobs keep using fal_request_id / fal_response_url, unchanged.)
--
-- All columns are nullable; existing rows keep today's behavior.
