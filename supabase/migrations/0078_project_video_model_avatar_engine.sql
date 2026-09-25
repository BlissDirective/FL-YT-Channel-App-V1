alter table projects add column if not exists preferred_video_model text;
alter table projects add column if not exists avatar_engine text;

-- The Silicon Layer is the ONLY channel on Genjutsu avatar animation
-- (operator decision, Sep 2026). Its motion source is the channel's existing
-- locked-avatar videos; every other channel keeps avatar_engine null.
update projects
   set avatar_engine = 'genjutsu'
 where avatar_engine is null
   and name ilike '%silicon layer%';

-- projects.preferred_video_model — the locked AI-video model for every section:
--   'hf-cinema-studio-4' (Higgsfield Cinema Studio 4.0; also what null means)
--   'hf-seedance-2-5'    (Higgsfield Seedance 2.5)
-- projects.avatar_engine — 'genjutsu' routes avatar shots through Higgsfield
--   Genjutsu motion transfer (driving clip = one of the channel's existing
--   avatar videos, identity = the locked presenter image), lip-synced to the
--   beat's VO via sync.so when SYNC_SO_API_KEY is set. Null = fal avatars.
