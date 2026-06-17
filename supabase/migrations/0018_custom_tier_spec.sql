-- Custom Full-Auto tier: a saved per-project recipe (hero/b-roll models, clip
-- lengths, and a hard price cap). Null until the operator saves a default;
-- otherwise the recipe is chosen per-run in the Full Auto-Generate panel.
--   { heroModel, brollModel, heroSec, brollSec, maxUsd }
alter table projects add column if not exists custom_spec jsonb;
