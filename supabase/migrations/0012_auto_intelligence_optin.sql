-- Make daily intelligence opt-in per project (default off). The nightly cron
-- only runs for projects that have explicitly enabled it; on-demand "Generate
-- ideas" is always available from the project page.
alter table projects
  add column if not exists auto_intelligence boolean not null default false;
