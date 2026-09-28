-- Directed production (0081) stores section keyframes, prompted end frames and
-- the music bed as their own asset kinds (docs/production/directed-pipeline.md
-- § Asset conventions). asset_kind is an enum, so they must be added here —
-- without them the inserts were rejected. Idempotent.
alter type asset_kind add value if not exists 'keyframe';
alter type asset_kind add value if not exists 'keyframe_end';
alter type asset_kind add value if not exists 'bgm';
