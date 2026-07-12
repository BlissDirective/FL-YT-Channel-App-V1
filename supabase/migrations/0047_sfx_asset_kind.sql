-- MVDA Phase D (D7 — generated SFX): sound-effect assets.
--
-- Generated sound effects (ElevenLabs sound-generation) are stored as normal
-- asset rows with kind='sfx'; EDD audio cues reference them via
-- { source:'generated', assetId } (validated by validateEdd, rendered by
-- EddVideo, signed into the player payload by render-queue/edd-player-data —
-- all of which already handle the kind). The curated-library path
-- (DEFAULT_SFX_LIBRARY) needs no schema at all.

alter type asset_kind add value if not exists 'sfx';
