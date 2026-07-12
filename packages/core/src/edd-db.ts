import { validateEdd, type EddContext, type EditDocument } from "./edd";
import { isVideoClipMeta, sourceForClipMeta, type CompileBeat, type CompileInput } from "./edd-compile";
import { CTA_TEXT, INTRO_SEC, OUTRO_SEC, SHORT_TAIL_SEC } from "./render-constants";
import { resolveHighlightTiming } from "./highlight-timing";
import { DEFAULT_CAPTION_STYLES, DEFAULT_OVERLAY_STYLES, DEFAULT_SFX_LIBRARY, DEFAULT_TRANSITIONS } from "./edd";

/**
 * EDD persistence helpers shared by the app (edd-service / save actions) and
 * the agent worker (packages/agent) — ONE version allocator, ONE validation
 * context builder, so human and agent writes can never diverge (A9/A17).
 * Core stays dependency-free: callers pass a structural slice of their
 * supabase-js client.
 */

export type EddDb = {
  from(table: string): {
    select(columns: string): {
      eq(
        col: string,
        val: unknown,
      ): {
        order(
          col: string,
          opts: { ascending: boolean },
        ): { limit(n: number): { maybeSingle(): PromiseLike<{ data: { version?: number } | null }> } };
      };
    };
    insert(row: Record<string, unknown>): PromiseLike<{ error: { code?: string; message: string } | null }>;
  };
};

/** Cut a script's beats down to a derived short's segment, in SEGMENT order —
    the one implementation shared by the compiler, the /edit page, the save
    path, and the agent. */
export function cutBeatsToSegment<T extends { idx: number }>(
  beats: T[],
  segment: { beats?: number[] } | null | undefined,
): T[] {
  if (!segment?.beats?.length) return beats;
  const order = new Map(segment.beats.map((idx, i) => [idx, i] as const));
  return beats
    .filter((b) => order.has(b.idx))
    .sort((a, b) => (order.get(a.idx) ?? 0) - (order.get(b.idx) ?? 0));
}

/** The EDD validation context for a video: its live assets + script beats +
    the v1 registries. */
export function buildEddContext(
  assets: { id: string; kind: string; meta?: Record<string, unknown> | null }[],
  beats: { idx: number; text: string }[],
  targetDurationSec: number,
): EddContext {
  return {
    assets: assets.map((a) => ({
      id: a.id,
      kind: a.kind,
      durationSec:
        typeof (a.meta as { durationSec?: unknown } | null)?.durationSec === "number"
          ? ((a.meta as { durationSec: number }).durationSec)
          : undefined,
    })),
    beats: beats.map((b) => ({ idx: b.idx, hasText: b.text.trim().length > 0 })),
    transitions: DEFAULT_TRANSITIONS,
    captionStyles: new Set<string>(DEFAULT_CAPTION_STYLES),
    sfxLibrary: new Set<string>(Object.keys(DEFAULT_SFX_LIBRARY)),
    overlayStyles: new Set<string>(DEFAULT_OVERLAY_STYLES),
    musicEnabled: false, // D8
    toleranceSec: Math.max(2, targetDurationSec * 0.05),
  };
}

/** Convenience: validate a doc against its video's inputs. */
export function validateAgainst(
  doc: EditDocument,
  assets: { id: string; kind: string; meta?: Record<string, unknown> | null }[],
  beats: { idx: number; text: string }[],
) {
  return validateEdd(doc, buildEddContext(assets, beats, doc.meta.targetDurationSec));
}

/**
 * Append a new EDD version row (max+1, unique-constraint arbitrated).
 * `requireParentHead` = optimistic concurrency for human/agent writes: the
 * new version must land DIRECTLY on parentVersion, including across the
 * unique-violation retry (the TOCTOU window a pre-check can't close).
 * Compiler roots (parentVersion null) just take the next slot.
 */
export async function insertEddVersion(
  db: EddDb,
  args: {
    videoId: string;
    scriptId: string;
    doc: EditDocument;
    author: "agent" | "human" | "compiler";
    note: string;
    parentVersion: number | null;
    requireParentHead?: boolean;
  },
): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: head } = await db
      .from("edit_documents")
      .select("version")
      .eq("video_id", args.videoId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const headVersion = head?.version ?? 0;
    if (args.requireParentHead && headVersion !== (args.parentVersion ?? 0)) {
      return {
        ok: false,
        error: `document changed under you (v${headVersion} is now the head) — reload`,
      };
    }
    const version = headVersion + 1;
    const { error } = await db.from("edit_documents").insert({
      video_id: args.videoId,
      version,
      parent_version: args.parentVersion,
      script_id: args.scriptId,
      author: args.author,
      status: "draft",
      doc: args.doc,
      note: args.note,
    });
    if (!error) return { ok: true, version };
    if (error.code !== "23505") return { ok: false, error: error.message };
    // Unique violation — another writer took this slot; loop re-arbitrates.
  }
  return { ok: false, error: "could not allocate an EDD version (concurrent writers)" };
}

/** Row shapes the assembly needs (structural slices of the app/worker rows). */
export type AssemblyAsset = {
  id: string;
  kind: string;
  beat_index: number | null;
  provider: string;
  meta: Record<string, unknown> | null;
};
export type AssemblyBeat = { idx: number; text: string; motion?: string };
export type AssemblyHighlight = {
  beatIdx: number;
  text: string;
  emphasisWord?: string;
  stylePreset: string;
  fontFamily: string;
  emphasisColor?: string;
  position: "center" | "upper-third" | "lower-third-safe";
  intensity: "subtle" | "med" | "high";
  maxLines: number;
};

/**
 * Assemble CompileInput from a video's rows EXACTLY the way the render farm
 * derives its implicit timeline (VO-welded durations incl. the ??5 default,
 * shared classification, resolved highlight timing) — ONE assembly for the
 * app's edd-service and the agent worker.
 */
export function assembleCompileInput(args: {
  kind: string; // videos.kind
  scriptBeats: AssemblyBeat[];
  assets: AssemblyAsset[];
  curatedHighlights: AssemblyHighlight[];
  captionsEnabled: boolean;
}): CompileInput {
  const beats: CompileBeat[] = args.scriptBeats.map((sb) => {
    const vo = args.assets.find((a) => a.kind === "vo" && a.beat_index === sb.idx);
    const clip = args.assets.find((a) => a.kind === "clip" && a.beat_index === sb.idx);
    const voMeta = (vo?.meta ?? {}) as { durationSec?: number; words?: { w: string; start: number; end: number }[] };
    const clipMeta = (clip?.meta ?? {}) as { heroHold?: boolean; durationSec?: number };
    const durationSec = Number(voMeta.durationSec ?? 5); // buildProps' ??5 default
    const words = voMeta.words ?? [];
    const isVideo = isVideoClipMeta(clip?.meta as { isVideo?: unknown; url?: unknown } | null);
    return {
      idx: sb.idx,
      text: sb.text,
      durationSec,
      voAssetId: vo?.id ?? null,
      visualAssetId: clip?.id ?? null,
      source: sourceForClipMeta(clip?.meta as never, clip?.provider),
      heroHold: Boolean(clipMeta.heroHold),
      motion: sb.motion,
      visualIsVideo: isVideo,
      visualDurationSec: isVideo ? clipMeta.durationSec : undefined,
      words: args.captionsEnabled ? words : [],
      highlights: resolveHighlightTiming(
        args.curatedHighlights.filter((h) => h.beatIdx === sb.idx),
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
  const isShort = args.kind === "short";
  return {
    format: isShort ? "short" : "long",
    introSec: isShort ? 0 : INTRO_SEC,
    outroSec: isShort ? SHORT_TAIL_SEC : OUTRO_SEC,
    beats,
    captionStyle: "clean",
    ctaText: isShort ? undefined : CTA_TEXT,
  };
}
