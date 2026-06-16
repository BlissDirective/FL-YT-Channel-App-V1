-- Long-form renders (a 10–13 min 1080p MP4 is ~100–150MB) were rejected on
-- upload because the media bucket had no explicit size limit and fell back to
-- the 50MB default. Raise the per-bucket limit to 1GB. NOTE: the project's
-- *global* upload limit still applies — on plans where that default is 50MB it
-- must also be raised in the Supabase dashboard for this to take full effect.
update storage.buckets set file_size_limit = 1073741824 where id = 'media';
