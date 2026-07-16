-- Editor & Assembly R2 — persist the granular segment plan authored on the
-- Assembly/Storyboard screen. jsonb, nullable; the app reads the SegmentPlan
-- shape. Kept separate from shot_plan (V2 router output) so AUTO can seed the
-- assembly plan without clobbering the router's record.
alter table videos add column if not exists assembly_plan jsonb;
