-- Phase 4 (Fable5-Enhancement-Plan.md): learning-loop hardening.
--
-- * videos.fact_check           — prose fact-check verdict at the SCRIPT gate
--                                 ({risk, claims[], searched, at}).
-- * projects.auto_apply_insights — optimizer proposals auto-apply as a canary
--                                 template version instead of waiting for a click.
-- * insights.canary             — canary bookkeeping ({templateId, kind,
--                                 appliedAt, baselineQc, evaluatedAt, outcome}).
-- * pgvector + ideas.embedding  — semantic idea dedup (Tier 5): lexical
--                                 matching misses near-duplicate ANGLES.

alter table videos add column if not exists fact_check jsonb;
alter table projects add column if not exists auto_apply_insights boolean not null default false;
alter table insights add column if not exists canary jsonb;

-- Semantic dedup. The extension ships with Supabase; vector(1536) matches
-- text-embedding-3-small and the deterministic mock embedding.
create extension if not exists vector;

alter table ideas add column if not exists embedding vector(1536);
alter table ideas add column if not exists embedding_model text;

-- Cosine-distance neighbor lookup (PostgREST can't express <=> directly).
create or replace function match_ideas(
  p_project uuid,
  p_embedding vector(1536),
  p_count int default 5
)
returns table (id uuid, title text, similarity double precision)
language sql stable
as $$
  select i.id, i.title, 1 - (i.embedding <=> p_embedding) as similarity
  from ideas i
  where i.project_id = p_project and i.embedding is not null
  order by i.embedding <=> p_embedding
  limit p_count;
$$;
