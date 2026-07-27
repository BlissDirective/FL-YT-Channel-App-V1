alter table projects add column if not exists preferred_song_model text;
alter table videos add column if not exists song_model text;
-- Per-video voice/song-model selection.
--
-- Sing-along channels don't have one "channel voice" the way a narrated channel
-- does — the singer IS the song model (MiniMax vs ElevenLabs Music). Locking a
-- single model channel-wide made per-video voice testing impossible.
--
-- projects.preferred_song_model  — the channel default the operator can re-lock.
-- videos.song_model              — a per-video override chosen at creation time.
--
-- Resolution order when a song is written or re-sung:
--   explicit request  >  video.song_model  >  project.preferred_song_model  >
--   the built-in DEFAULT_SONG_MODEL_ID. Both columns are nullable, so existing
--   projects and videos keep today's default behavior untouched.
