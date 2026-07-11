/**
 * The browser-safe surface of the render package, consumed by the web app's
 * /edit editor (Remotion <Player>). ONLY export things that run in a browser
 * — nothing from render-queue.ts (node:fs, service-role Supabase) may leak
 * through here. The farm scripts remain worker-only.
 */
export { EddVideo } from "./edd/EddVideo";
export { CAPTION_STYLES } from "./edd/EddCaptions";
export { resolveClipMedia, type ClipAssetMeta, type MediaSigner } from "./clip-media";
export { FPS } from "./types";
export type { EddClipMedia, EddPayload, VideoProps } from "./types";
