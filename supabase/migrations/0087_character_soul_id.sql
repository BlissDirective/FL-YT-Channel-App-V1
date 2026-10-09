-- Higgsfield Soul ID per character. A Soul ID is a trained identity on
-- Higgsfield (POST /v1/custom-references), one per SOUL model version, used as
-- custom_reference_id on SOUL generations so a locked character keeps its face
-- in Higgsfield-made stills. Shape: {"v1": {"id": "...", "status": "completed"}, "v2": {...}}.
alter table characters add column if not exists higgsfield_soul jsonb not null default '{}'::jsonb;
