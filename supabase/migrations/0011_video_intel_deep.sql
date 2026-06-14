-- Phase C — deep perception on video_intel. The "deep" scan adds Gemini
-- native-URL perception (timestamped notes + transcript) on an operator-vouched
-- video, folded into the Claude blueprint. yt-dlp/ffmpeg frame sampling is a
-- later precise-fallback increment (the worker lane).

alter table video_intel
  add column if not exists depth text not null default 'quick',   -- quick | deep
  add column if not exists source_url text,
  add column if not exists vouched boolean not null default false,
  add column if not exists perception jsonb,                       -- {notes:[{t,sceneDesc,...}],transcript}
  add column if not exists error text;
