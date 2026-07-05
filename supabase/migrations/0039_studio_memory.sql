-- Harness C8 (Fable5-Agentic-Harness-Plan.md §C8): the Studio Memory Service —
-- a persistent, queryable, cross-agent memory that generalizes the C4 playbook.
--
-- Two-tier scope with HARD read isolation:
--   * tier='global'  (project_id null) — generalizable *craft* lessons, shared
--     across every channel.
--   * tier='channel' (project_id set)  — that channel's lessons only; a channel
--     never reads another channel's rows (enforced in match_memory + the app).
--
-- Governance change vs C4: storage is UNCAPPED; retrieval is semantic top-k;
-- lessons decay by confidence and retire on an outcome floor (not a hard 90-day
-- expiry); operator-pinned lessons never decay/retire. Raw outcomes stay
-- immutable in their own tables (qc_reviews / analytics / outcome_audits) — this
-- table holds only distilled, evidence-gated knowledge.

create extension if not exists vector;

create table if not exists memory_entries (
  id uuid primary key default gen_random_uuid(),
  tier text not null default 'channel' check (tier in ('global', 'channel')),
  project_id uuid references projects(id) on delete cascade,
  namespace text not null,               -- quality|idea|script|visual|audio|editing|packaging|competitive|outcome
  kind text not null default 'lesson',   -- lesson | criterion
  status text not null default 'active' check (status in ('active', 'shadow', 'retired')),
  text text not null,
  evidence text not null,                -- evidence-gated write policy (non-empty)
  evidence_count int not null default 1,
  confidence double precision not null default 0.34,
  pinned boolean not null default false,
  embedding vector(1536),
  embedding_model text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  -- tier and project_id must agree: global rows are channel-agnostic (no
  -- project); channel rows are always scoped to exactly one project.
  constraint memory_scope_agrees check (
    (tier = 'global' and project_id is null) or
    (tier = 'channel' and project_id is not null)
  )
);

create index if not exists memory_entries_lookup_idx
  on memory_entries (namespace, tier, project_id, status);

-- Two-tier cosine-neighbor lookup (PostgREST can't express <=> directly). Read
-- isolation lives HERE: a channel query returns its own rows plus the shared
-- global-craft rows — never another channel's.
create or replace function match_memory(
  p_namespace text,
  p_embedding vector(1536),
  p_project uuid,
  p_count int default 8,
  p_include_shadow boolean default false
)
returns table (
  id uuid,
  text text,
  confidence double precision,
  tier text,
  similarity double precision
)
language sql stable
as $$
  select m.id, m.text, m.confidence, m.tier,
         1 - (m.embedding <=> p_embedding) as similarity
  from memory_entries m
  where m.namespace = p_namespace
    and (m.status = 'active' or (p_include_shadow and m.status = 'shadow'))
    and (m.tier = 'global' or m.project_id = p_project)
    and m.embedding is not null
  order by m.embedding <=> p_embedding
  limit p_count;
$$;

alter table memory_entries enable row level security;
do $$ begin
  create policy authenticated_full_access on memory_entries
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- One-time backfill: migrate the existing governed playbook bullets
-- (projects.playbook JSON) into channel-scoped memory rows. Each bullet's stage
-- becomes the namespace. Embeddings are left null and get populated on the next
-- reinforcement write; the lexical fallback covers retrieval until then.
-- projects.playbook is kept intact as a rollback path. Guarded so re-running the
-- migration set never double-inserts.
do $$
begin
  if not exists (select 1 from memory_entries) then
    insert into memory_entries
      (tier, project_id, namespace, kind, status, text, evidence,
       evidence_count, confidence, created_at, last_confirmed_at)
    select
      'channel',
      p.id,
      coalesce(nullif(e->>'stage', ''), 'script'),
      'lesson',
      'active',
      e->>'text',
      coalesce(nullif(e->>'evidence', ''), 'migrated from C4 playbook'),
      coalesce((e->>'evidenceCount')::int, 1),
      coalesce((e->>'confidence')::double precision, 0.34),
      coalesce((e->>'createdAt')::timestamptz, now()),
      coalesce((e->>'lastConfirmedAt')::timestamptz, now())
    from projects p
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p.playbook) = 'array' then p.playbook else '[]'::jsonb end
    ) as e
    where coalesce(e->>'text', '') <> '';
  end if;
end $$;
