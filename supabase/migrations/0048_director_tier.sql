-- MVDA Phase E: the Director tier + the editing-craft research columns (§11.6).
--
-- videos.director_cut — per-video marker set by fullAutoGenerate when the run
-- tier is 'director': the clip worker's maybeFinish routes this video to an
-- agent cut session even when the project-level mvda_enabled flag is off
-- (Director is a per-run opt-in that rides beside Platinum).
--
-- memory_entries research columns — the Editing-Craft Knowledge System's
-- provenance fields (KD1-KD3): which trust tier a lesson came from, its
-- source, a stable technique id (dedupe/promotion key), the measured
-- first-party retention delta once confirmed, and an applies_when hint the
-- authoring context can filter on.

alter table videos
  add column if not exists director_cut boolean not null default false;

alter table memory_entries
  add column if not exists source_tier text
    check (source_tier is null or source_tier in ('A','B','C'));
alter table memory_entries
  add column if not exists source_url text;
alter table memory_entries
  add column if not exists technique_id text;
alter table memory_entries
  add column if not exists retention_delta numeric;
alter table memory_entries
  add column if not exists applies_when text;

create index if not exists memory_entries_technique_idx
  on memory_entries (technique_id) where technique_id is not null;
