-- AI Avatar build phase A: one fixed presenter image per project — the same
-- image drives every avatar generation, which is what keeps the character
-- visually consistent across clips (identity by construction).
alter table projects add column if not exists presenter_image_path text;
