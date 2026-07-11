import "server-only";
// Import the PURE module directly — not the player surface, whose EddVideo
// import graph carries client-side React hooks that a server module (this
// file is imported by the /edit server page) must never pull in.
import { resolveClipMedia } from "@studio/render/src/clip-media";
import type { EddClipMedia, EddPayload } from "@studio/render/src/types";
import { getSignedMediaUrl } from "@/lib/storage";
import type { Asset, ScriptBeat } from "@/lib/db/types";

/**
 * Build the <Player> media/audio maps for the /edit editor. Media resolution
 * is the render farm's OWN resolveClipMedia (clip-media.ts) with the app's
 * signer injected — the preview can never drift from what the farm renders.
 * URLs live long enough for an editing session (2h).
 */

const SIGN_TTL_SEC = 7200;

const sign = (path: string) => getSignedMediaUrl(path, SIGN_TTL_SEC);

/** media/audio/beatText for EVERY live clip/vo/sfx asset (not just the ones
    the current document references) so the editor's swap picker can preview
    any candidate without a round trip. */
export async function buildPlayerMaps(
  assets: Asset[],
  beats: Pick<ScriptBeat, "idx" | "text">[],
): Promise<Pick<EddPayload, "media" | "audio" | "beatText" | "sfxLibrary">> {
  const media: Record<string, EddClipMedia> = {};
  const audio: Record<string, string> = {};
  await Promise.all(
    assets.map(async (a) => {
      if (a.kind === "clip") {
        const { heroHold: _hero, ...m } = await resolveClipMedia(a, sign);
        media[a.id] = m;
      } else if (a.kind === "vo" || (a.kind as string) === "sfx") {
        // "sfx" arrives with generated sound effects (Phase C/D — not in the
        // Asset kind union yet); resolving it now keeps the player ready.
        const url = a.storage_path ? await sign(a.storage_path) : null;
        if (url) audio[a.id] = url;
      }
    }),
  );
  return {
    media,
    audio,
    sfxLibrary: {},
    beatText: Object.fromEntries(beats.map((b) => [String(b.idx), b.text])),
  };
}
