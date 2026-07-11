-- MVDA Phase A pt 2: EDD preview requests. The /edit UI (and later the agent)
-- sets videos.edd_preview = {"fromSec": 12, "toSec": 30, "version": 4} to ask
-- the render farm for a true-fidelity 480p preview of that document (whole
-- video when the range is omitted; the active version when version is
-- omitted). The farm clears the flag, renders, and stores an asset with
-- kind='preview' (pruned to the newest 2 per video). null = no request.

alter table videos
  add column if not exists edd_preview jsonb;

-- Preview outputs are asset rows; the kind enum (0001) predates them.
-- (ADD VALUE is transaction-safe on PG12+ as long as nothing in this same
-- migration uses the new value — nothing here does.)
alter type asset_kind add value if not exists 'preview';
