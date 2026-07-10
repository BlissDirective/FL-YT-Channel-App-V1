-- Phase A of the Master Video Development Agent: the first EXPLICIT timeline.
-- An edit_document is a versioned, validated description of a video's cut
-- (tracks: video/audio/captions/overlays). buildProps renders the active
-- version when videos.edit_document_version is set; else the legacy
-- beats+assets derivation. Rows are append-only — every agent turn or human
-- save inserts a new version (undo/diff/audit fall out of this). See
-- Fable-5-MVDA-Build-Plan.md §2 + §11.

create table if not exists edit_documents (
  id              uuid primary key default gen_random_uuid(),
  video_id        uuid not null references videos(id) on delete cascade,
  version         int  not null,                        -- monotonic per video
  parent_version  int,                                  -- lineage for diff/undo (null = root)
  script_id       uuid not null references scripts(id), -- PINNED script version (restrict: provenance)
  author          text not null default 'agent'
                    check (author in ('agent','human','compiler')),
  status          text not null default 'draft'
                    check (status in ('draft','previewed','approved','rendered','superseded')),
  inputs_stale    boolean not null default false,       -- script/assets changed under this version
  doc             jsonb not null,                       -- the EDD body (validateEdd-gated)
  judge           jsonb not null default '{}'::jsonb,   -- per-dimension QC/watch scores for THIS version
  note            text not null default '',             -- agent rationale / human comment
  created_at      timestamptz not null default now(),
  unique (video_id, version)
);

create index if not exists edit_documents_video_idx
  on edit_documents (video_id, version desc);

-- The active version pointer. null = legacy render path (nothing changes for
-- existing videos until an EDD is compiled + selected).
alter table videos
  add column if not exists edit_document_version int;

alter table edit_documents enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'edit_documents' and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on edit_documents
      for all to authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'edit_documents' and policyname = 'service_role_full_access'
  ) then
    create policy service_role_full_access on edit_documents
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Live version history in /edit (and so an agent write is visible to a human
-- viewing the editor). Not load-bearing — the editor reads its own writes.
do $$ begin
  alter publication supabase_realtime add table edit_documents;
exception when duplicate_object then null; end $$;
