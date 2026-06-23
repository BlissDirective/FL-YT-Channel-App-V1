-- Per-video caption toggle. Word-window captions render on every scene by
-- default; turning them off is useful when Kinetic Highlights are on (the two
-- overlap on screen and together look cluttered).
alter table videos
  add column if not exists enable_captions boolean not null default true;
