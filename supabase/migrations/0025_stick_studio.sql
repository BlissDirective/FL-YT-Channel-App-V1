-- Stick Studio (Phase 2): projects can render as programmatic stick-figure
-- videos instead of AI footage. `visual_style` routes the asset stage to the
-- choreographer; `stick_cast` is the recurring character identity (colour,
-- build, accessory) used at render. See docs/stick-studio/Stick-Studio-Design.md.

alter table projects
  add column if not exists visual_style text not null default 'footage';

alter table projects
  add column if not exists stick_cast jsonb;
