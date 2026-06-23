-- Per-project YouTube channel. Each project (treated as a channel) can publish
-- to its own YouTube channel by storing that channel's OAuth refresh token; the
-- render farm uses it instead of the global default-channel token. A refresh
-- token is bound to the channel chosen during OAuth consent, so each channel
-- needs its own authorization (one Google account can own many channels).
alter table projects
  add column if not exists youtube_refresh_token text,
  add column if not exists youtube_channel_title text;
