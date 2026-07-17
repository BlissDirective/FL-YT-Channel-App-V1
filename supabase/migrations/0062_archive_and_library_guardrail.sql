-- Clean House Phase 1: archive state + library-size guardrail
-- (Clean-House-Build-Spec.md §4/§5).

-- Archive is orthogonal to pipeline status: a published (TRACKING) video can be
-- archived. Archived assets leave the ACTIVE library (they're hidden from the
-- working sections into an Archive filter) — the mechanism that shrinks the
-- working library after a Clean House sweep.
alter table videos
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamptz;

-- Per-project cap on how many assets may sit in the WORKING pipeline at once
-- (Ideas → Ready, excluding Published/Tracking, Killed, and Archived). When the
-- count reaches this, autonomous seeding pauses. Editable anytime in settings.
alter table projects
  add column if not exists library_size_limit int not null default 5;

create index if not exists videos_archived_idx on videos (project_id, archived);
