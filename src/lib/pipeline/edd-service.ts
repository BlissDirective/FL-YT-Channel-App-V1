import "server-only";
import {
  CTA_TEXT,
  DEFAULT_CAPTION_STYLES,
  DEFAULT_OVERLAY_STYLES,
  DEFAULT_SFX_LIBRARY,
  DEFAULT_TRANSITIONS,
  INTRO_SEC,
  OUTRO_SEC,
  SHORT_TAIL_SEC,
  compileEdd,
  isVideoClipMeta,
  resolveHighlightTiming,
  sourceForClipMeta,
  validateEdd,
  type CompileBeat,
  type EddContext,
  type EditDocument,
} from "@studio/core";
import { buildEddContext, cutBeatsToSegment, insertEddVersion, type EddDb } from "@studio/core";
import { createAdminClient } from "@/lib/supabase/admin";

// Moved to @studio/core in Phase C (shared with the agent worker); re-exported
// so existing app imports stay stable.
export { buildEddContext, cutBeatsToSegment, insertEddVersion };
import type { CuratedHighlight, ScriptBeat, ShortSegment } from "@/lib/db/types";

/**
 * EDD service — the app-side bridge between the legacy pipeline and the
 * explicit timeline (MVDA Phase A pt 2, plan §2.4 + audit A7).
 *
 * compileEddFromLegacy() assembles CompileInput from the video's script +
 * assets EXACTLY the way the render farm's buildProps derives its implicit
 * timeline (same VO-welded durations incl. the ??5 default, same derived-short
 * segment cut, same highlight timing resolution), calls the pure compileEdd,
 * validates, and inserts version rows. Nothing here mutates the render path:
 * a video only renders from its EDD once videos.edit_document_version is set
 * (opts.activate, or the /edit UI's Approve).
 */

type AssetRow = {
  id: string;
  kind: string;
  beat_index: number | null;
  provider: string;
  storage_path: string | null;
  meta: Record<string, unknown> | null;
};

type ClipMeta = {
  url?: string;
  isVideo?: boolean;
  stillImage?: boolean;
  heroHold?: boolean;
  durationSec?: number;
  stickScene?: unknown;
  dataViz?: unknown;
};

export type CompileResult =
  | { ok: true; version: number; doc: EditDocument }
  | { ok: false; error: string };

export async function compileEddFromLegacy(
  videoId: string,
  opts: { activate?: boolean } = {},
): Promise<CompileResult> {
  const db = createAdminClient();

  const { data: video } = await db.from("videos").select("*").eq("id", videoId).single();
  if (!video) return { ok: false, error: "video not found" };

  // Repurposed shorts reuse the parent long-form's script + assets — the same
  // sourceId convention as the render farm's buildProps.
  const isDerived = video.kind === "short" && video.parent_video_id;
  const sourceId: string = isDerived ? video.parent_video_id : videoId;

  const { data: script } = await db
    .from("scripts")
    .select("id, beats")
    .eq("video_id", sourceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: assets } = await db.from("assets").select("*").eq("video_id", sourceId);
  if (!script || !assets) return { ok: false, error: "script or assets missing" };

  let scriptBeats = script.beats as ScriptBeat[];
  if (isDerived) {
    scriptBeats = cutBeatsToSegment(scriptBeats, (video.source_segment ?? null) as ShortSegment | null);
  }
  if (scriptBeats.length === 0) return { ok: false, error: "script has no beats" };

  const curated: CuratedHighlight[] = video.enable_highlights ? (video.highlights ?? []) : [];
  const captionsEnabled = video.enable_captions ?? true;

  const beats: CompileBeat[] = scriptBeats.map((sb) => {
    const vo = (assets as AssetRow[]).find((a) => a.kind === "vo" && a.beat_index === sb.idx);
    const clip = (assets as AssetRow[]).find((a) => a.kind === "clip" && a.beat_index === sb.idx);
    const voMeta = (vo?.meta ?? {}) as { durationSec?: number; words?: { w: string; start: number; end: number }[] };
    const clipMeta = (clip?.meta ?? {}) as ClipMeta;
    // buildProps defaults a missing VO duration to 5s — the compiler must too.
    const durationSec = Number(voMeta.durationSec ?? 5);
    const words = voMeta.words ?? [];
    // Shared with the render farm's clipMediaFromAsset (audit A17) — the
    // compiler and renderer must classify an asset identically.
    const isVideo = isVideoClipMeta(clipMeta);
    const source = sourceForClipMeta(clipMeta, clip?.provider);
    return {
      idx: sb.idx,
      text: sb.text,
      durationSec,
      voAssetId: vo?.id ?? null,
      visualAssetId: clip?.id ?? null,
      source,
      heroHold: Boolean(clipMeta.heroHold),
      motion: sb.motion,
      visualIsVideo: isVideo,
      visualDurationSec: isVideo ? clipMeta.durationSec : undefined,
      // Captions off (A7): compile no caption pages, but still resolve
      // highlights below — legacy renders highlights regardless.
      words: captionsEnabled ? words : [],
      highlights: resolveHighlightTiming(
        curated.filter((h) => h.beatIdx === sb.idx),
        words,
        durationSec,
      ).map((h) => ({
        text: h.text,
        startMs: h.startMs,
        endMs: h.endMs,
        stylePreset: h.stylePreset,
        emphasisWord: h.emphasisWord,
        fontFamily: h.fontFamily,
        emphasisColor: h.emphasisColor,
        position: h.position,
        intensity: h.intensity,
        maxLines: h.maxLines,
      })),
    };
  });

  const isShort = video.kind === "short";
  const doc = compileEdd({
    format: isShort ? "short" : "long",
    // A3 — no brief target: the compiled document pins the ACTUAL runtime so
    // v1 always validates, however far the VO drifted from the brief.
    introSec: isShort ? 0 : INTRO_SEC,
    outroSec: isShort ? SHORT_TAIL_SEC : OUTRO_SEC,
    beats,
    captionStyle: "clean",
    ctaText: isShort ? undefined : CTA_TEXT,
  });

  const ctx = buildEddContext(assets as AssetRow[], scriptBeats, doc.meta.targetDurationSec);
  const verdict = validateEdd(doc, ctx);
  if (!verdict.ok) {
    return {
      ok: false,
      error: `compiled document failed validation: ${verdict.errors
        .slice(0, 5)
        .map((e) => `${e.rule}@${e.where}`)
        .join(", ")}${verdict.errors.length > 5 ? ` (+${verdict.errors.length - 5} more)` : ""}`,
    };
  }

  const inserted = await insertEddVersion(db as unknown as EddDb, {
    videoId,
    scriptId: script.id,
    doc,
    author: "compiler",
    note: "Compiled from legacy beats + assets (faithful v1)",
    parentVersion: null,
  });
  if (!inserted.ok) return inserted;

  if (opts.activate) {
    const { error } = await db
      .from("videos")
      .update({ edit_document_version: inserted.version })
      .eq("id", videoId);
    if (error) return { ok: false, error: `activate failed: ${error.message}` };
  }
  return { ok: true, version: inserted.version, doc };
}

/**
 * Queue a true-fidelity 480p preview render of the video's EDD (whole video,
 * or a [fromSec, toSec] range). The render farm picks the request up on its
 * next pass and stores an asset with kind='preview' (newest 2 kept).
 */
export async function requestEddPreview(
  videoId: string,
  opts: { fromSec?: number; toSec?: number; version?: number } = {},
): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await db
    .from("videos")
    .update({ edd_preview: { ...opts, requestedAt: new Date().toISOString() } })
    .eq("id", videoId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
