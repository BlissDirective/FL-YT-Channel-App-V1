-- Shorts Engine — first-class short-form videos (see docs/Shorts-Engine-Design.md).
--
-- A `kind` distinguishes long-form from shorts. Shorts come in two flavours,
-- both `kind='short'` rows that share every gate, track, and ledger entry with
-- long-forms:
--   * Repurposed — cut from a published long-form. `parent_video_id` points at
--     the source and `source_segment` records which parent beats this short is
--     cut from; the render farm reuses the parent's VO + clips (free render).
--   * Native — built from their own idea like any long-form (own assets).
--
-- Nothing here auto-derives or auto-publishes: derivation is a manual click and
-- publishing is a separate operator action.

alter table videos
  add column if not exists kind text not null default 'long';

-- 'long' | 'short'. Drives script targets, tiers, highlight density, render path.
alter table videos
  add constraint videos_kind_check check (kind in ('long', 'short')) not valid;

-- Set on repurposed shorts → the source long-form. Null for native/long.
-- on delete set null: orphan a derived short rather than cascade-delete it.
alter table videos
  add column if not exists parent_video_id uuid references videos(id) on delete set null;

-- Which parent beats this short is cut from: { beats:number[], label:string }.
-- Null for native shorts and long-forms.
alter table videos
  add column if not exists source_segment jsonb;

create index if not exists videos_parent_video_id_idx on videos (parent_video_id);

-- Project defaults for the "Derive Shorts" modal.
alter table projects
  add column if not exists derive_shorts_count int not null default 3;

alter table projects
  add column if not exists derive_shorts_smart boolean not null default true;
