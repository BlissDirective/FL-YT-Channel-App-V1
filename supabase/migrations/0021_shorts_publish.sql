-- One-tap publish for staged shorts (see docs/Shorts-Engine-Design.md §5).
--
-- Shorts render and stage in Storage at FINAL_REVIEW; they are never
-- auto-uploaded. The operator taps Publish, which sets publish_requested. The
-- render farm — which holds the YouTube OAuth credentials — uploads the staged
-- 9:16 MP4 on its next pass and stamps youtube_video_id + TRACKING. The app
-- itself never holds OAuth (uploads stay out of the app by design); when the
-- farm has no OAuth the operator still has the manual download + "mark
-- uploaded" path.

alter table videos
  add column if not exists publish_requested boolean not null default false;
