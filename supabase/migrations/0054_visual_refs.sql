-- Visual Craft Engine V4 — grounded generation references (§2.3).
--
-- visual_refs — a real, licensed reference selected for a FACTUAL beat (a named
-- entity, product, place, or statistic) so its visual is grounded in reality
-- rather than hallucinated. The reference becomes the i2v seed / style anchor,
-- and its attribution flows to the publish kit's credits.
create table if not exists visual_refs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  beat_idx int,
  source text not null,          -- 'stock'|'intel-frame'|'operator-upload'|'source-image'
  url text not null,
  license text,
  attribution text,
  created_at timestamptz not null default now()
);
create index if not exists visual_refs_video_beat_idx on visual_refs (video_id, beat_idx);

alter table visual_refs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'visual_refs' and policyname = 'authenticated_full_access') then
    create policy authenticated_full_access on visual_refs for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'visual_refs' and policyname = 'service_role_full_access') then
    create policy service_role_full_access on visual_refs for all to service_role using (true) with check (true);
  end if;
end $$;
