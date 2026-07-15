-- Visual Craft Engine V1 — the Visual Bible (Fable-5-Visual-Craft-Engine-Build-Spec.md §2.1).
--
-- videos.visual_bible — a per-video "visual continuity bible" the MVDA derives
-- once from the whole script: the concrete subjects (with photoreal descriptors),
-- setting, palette, style contract, recurring motifs, and an AVOID list of
-- clichés. Every beat's image/video prompt is conditioned on it so visuals are
-- specific to the video's real subjects (not generic stock cliché) and
-- consistent beat-to-beat. Nullable + feature-flagged (app_settings key 'vce') —
-- absent bible → prompts build exactly as before this phase.
--
-- Shape:
--   { "subjects": [{ "id","label","descriptor" }], "setting","palette":[…],
--     "styleContract","motifs":[…],"avoid":[…],"version","model","createdAt" }

alter table videos add column if not exists visual_bible jsonb;
