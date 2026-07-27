-- Character Studio, Phase 4: the cast group shot.
--
-- A per-character reference fixes each character's own identity but says
-- nothing about how they relate: Breeze is "knee-height to the children" in
-- prose, and a model asked for Bo and Breeze in one frame will happily render
-- a bunny the size of a bear. One group shot per style, generated once from
-- the locked looks, is the cheapest fix — it rides along as an extra reference
-- on multi-character scenes and carries relative scale by construction.
alter table styles add column if not exists group_shot_path text;
