-- 0044: integrity guard for the EDD active-version pointer (Phase A audit A6).
-- videos.edit_document_version may only point at a version row that exists for
-- THAT video — a dangling pointer would silently flip the render path back to
-- legacy (or break buildProps' EDD branch). MATCH SIMPLE skips the null case
-- (null = legacy path), so existing videos are untouched. As a bonus this
-- mechanically enforces append-only for any version a video points at: a
-- direct delete of that edit_documents row is now rejected (rows still die
-- with their video via the existing cascade — the pointer row goes first).

alter table videos
  drop constraint if exists videos_edit_document_version_fkey;
alter table videos
  add constraint videos_edit_document_version_fkey
  foreign key (id, edit_document_version)
  references edit_documents (video_id, version);
