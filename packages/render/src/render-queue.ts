/**
 * Render farm worker (GitHub Actions, cron). Picks up videos sitting at
 * ASSEMBLING with live assets, renders the long-form MP4 + a Short via
 * Remotion, and stores BOTH cuts in object storage (Cloudflare R2 when
 * configured — no per-file size cap — else Supabase Storage), records assets
 * (including the beat timeline for retention mapping), and advances the video
 * to FINAL_REVIEW. Every render is downloadable; YouTube upload is a separate,
 * operator-chosen step (publish_requested → publishStagedVideos). Mock-asset
 * videos are handled in-app and never reach here.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { isR2Path, r2Configured, r2Get, r2Put, r2SignedGetUrl, stripR2, toR2Path } from "@studio/storage";
import {
  FPS,
  INTRO_SEC,
  beatTimeline,
  longFormDurationSec,
  verticalShortDurationSec,
  type Highlight,
  type RenderBeat,
  type StickCast,
  type StickScene,
  type VideoProps,
} from "./types";
import { critiqueStickFrames, type CritiqueFrame } from "./stick/frame-critic";
import { critiqueFootageFrames, type FootageFrame } from "./footage/frame-critic";
import { pickThumbnail, type ThumbPlacement } from "./thumbnail-pick";
import { verifyRenderedChart } from "./dataviz/chart-verify";
import { runMediaQc } from "./media-qc";
import { uploadVideo, youtubeUploadConfigured } from "./youtube";
import { shortDurationSec } from "./VideoComp";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const sign = async (path: string): Promise<string | null> => {
  if (!path || path.startsWith("mock/")) return null;
  if (isR2Path(path)) {
    try {
      return await r2SignedGetUrl(stripR2(path), 7200);
    } catch {
      return null;
    }
  }
  const { data } = await db.storage.from("media").createSignedUrl(path, 7200);
  return data?.signedUrl ?? null;
};

/**
 * Store a finished render and return the persisted storage_path + provider.
 * R2 (when configured) takes any size in a single PUT — `r2:`-prefixed path.
 * Otherwise Supabase Storage, falling back to a resumable (TUS) upload for
 * cuts past the standard body cap. A long-form too big for Supabase with no R2
 * is a hard error pointing at the fix.
 */
async function storeRender(
  videoId: string,
  storageName: string,
  file: Buffer,
  variant: "long" | "short",
): Promise<{ storagePath: string; provider: string }> {
  const key = `videos/${videoId}/${storageName}.mp4`;
  if (r2Configured()) {
    await r2Put(key, file, "video/mp4");
    console.log(`☁️  ${videoId} [${variant}]: stored ${Math.round(file.length / 1e6)}MB → R2 (${key})`);
    return { storagePath: toR2Path(key), provider: "r2" };
  }
  const { error: upErr } = await db.storage
    .from("media")
    .upload(key, file, { contentType: "video/mp4", upsert: true });
  if (upErr) {
    if (file.length > TUS_CHUNK) {
      console.log(`↻ ${videoId} [${variant}]: standard upload rejected (${upErr.message}); retrying resumable…`);
      try {
        await resumableUpload(key, file, "video/mp4");
      } catch (resErr) {
        const detail = resErr instanceof Error ? resErr.message : String(resErr);
        if (variant === "long") {
          throw new Error(
            `Long-form (${Math.round(file.length / 1e6)}MB) exceeded Supabase Storage limits ` +
              `(${detail.slice(0, 120)}). Configure Cloudflare R2 (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / ` +
              `R2_SECRET_ACCESS_KEY / R2_BUCKET) for unlimited download storage, or YouTube OAuth to ` +
              `publish instead — see docs/YouTube-API-creation.md.`,
          );
        }
        throw new Error(`upload failed: ${detail}`);
      }
    } else {
      throw new Error(`upload failed: ${upErr.message}`);
    }
  }
  console.log(`📦 ${videoId} [${variant}]: stored ${Math.round(file.length / 1e6)}MB → Supabase Storage (${key})`);
  return { storagePath: key, provider: "remotion" };
}

/** Fetch a stored render's bytes for a video+variant, from R2 or Supabase. */
async function fetchRenderFile(videoId: string, variant: "long" | "short"): Promise<Buffer> {
  const { data: asset } = await db
    .from("assets")
    .select("storage_path")
    .eq("video_id", videoId)
    .eq("kind", "render")
    .filter("meta->>variant", "eq", variant)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const path = asset?.storage_path as string | null | undefined;
  if (!path) throw new Error(`no ${variant} render asset for ${videoId}`);
  if (isR2Path(path)) return r2Get(stripR2(path));
  const { data: file, error } = await db.storage.from("media").download(path);
  if (error || !file) throw new Error(`download ${path}: ${error?.message ?? "missing"}`);
  return Buffer.from(await file.arrayBuffer());
}

/** Store a thumbnail image (R2 when configured, else Supabase) → storage_path. */
async function storeImage(videoId: string, bytes: Buffer): Promise<string> {
  const key = `videos/${videoId}/thumb-0.jpg`;
  if (r2Configured()) {
    await r2Put(key, bytes, "image/jpeg");
    return toR2Path(key);
  }
  await db.storage.from("media").upload(key, bytes, { contentType: "image/jpeg", upsert: true });
  return key;
}

/** Brand-safe kinetic phrase for the thumbnail: prefer the script's phrase,
    else the first curated highlight, else a trimmed (brand names not stripped)
    slice of the title as a last resort. */
function thumbPhraseFor(
  scriptPhrase: string | undefined,
  video: { title: string; highlights?: unknown },
  preferred?: string,
): string {
  const fromScript = (scriptPhrase ?? "").trim();
  if (fromScript) return fromScript;
  // Tier 6: a vision-matched highlight is the next-best source after the script.
  const pref = (preferred ?? "").trim();
  if (pref) return pref;
  const hl = (video.highlights as { text?: string }[] | null) ?? [];
  const fromHl = hl.find((h) => h.text && h.text.trim())?.text?.trim();
  if (fromHl) return fromHl;
  return video.title
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

/** Supabase resumable (TUS) uploads must be sent in 6MB chunks (except last). */
const TUS_CHUNK = 6 * 1024 * 1024;

/** TUS Upload-Metadata is a comma-joined list of `key base64(value)` pairs. */
function tusMetadata(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${k} ${Buffer.from(v).toString("base64")}`)
    .join(",");
}

/**
 * Upload a file to Supabase Storage via the resumable (TUS) protocol — the
 * supported path for files past the standard-upload body cap. Streams the
 * buffer in 6MB chunks up to the bucket's file_size_limit. Used as a safety
 * net for large renders when the direct YouTube upload isn't available.
 */
async function resumableUpload(
  objectName: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const create = await fetch(`${SUPABASE_URL}/storage/v1/upload/resumable`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SERVICE_KEY}`,
      "x-upsert": "true",
      "tus-resumable": "1.0.0",
      "upload-length": String(data.length),
      "upload-metadata": tusMetadata({
        bucketName: "media",
        objectName,
        contentType,
        cacheControl: "3600",
      }),
    },
  });
  if (create.status !== 201) {
    throw new Error(`resumable create ${create.status}: ${(await create.text()).slice(0, 160)}`);
  }
  const location = create.headers.get("location");
  if (!location) throw new Error("resumable: no upload URL returned");
  const uploadUrl = location.startsWith("http")
    ? location
    : `${SUPABASE_URL}/storage/v1${location.startsWith("/") ? "" : "/"}${location}`;

  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + TUS_CHUNK, data.length);
    const patch = await fetch(uploadUrl, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${SERVICE_KEY}`,
        "tus-resumable": "1.0.0",
        "upload-offset": String(offset),
        "content-type": "application/offset+octet-stream",
      },
      body: new Uint8Array(data.subarray(offset, end)),
    });
    if (patch.status !== 204) {
      throw new Error(`resumable patch @${offset} ${patch.status}: ${(await patch.text()).slice(0, 160)}`);
    }
    const acked = Number(patch.headers.get("upload-offset"));
    offset = Number.isFinite(acked) && acked > offset ? acked : end;
  }
}

/** Curated highlight as stored on the video (no timing — resolved here). */
type CuratedHighlight = Omit<Highlight, "startMs" | "endMs"> & { beatIdx: number };

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}$%.]/gu, "");

/**
 * Resolve curated highlights to beat-local timing using the beat's word
 * timestamps: a highlight appears when its emphasis word is spoken and holds
 * long enough to read. Falls back to ~20% into the beat when the word can't
 * be located (e.g. a rewritten phrase with no shared token). Multiple
 * highlights on one beat (the hook always has ≥2 for the Short) are then
 * de-overlapped so they play in sequence rather than stacking on screen.
 */
const HL_GAP_MS = 200;

function resolveHighlights(
  curated: CuratedHighlight[],
  words: { w: string; start: number; end: number }[],
  durationSec: number,
): Highlight[] {
  const beatMs = Math.max(0, durationSec * 1000);
  const resolved = curated.map((h) => {
    const wordCount = h.text.trim().split(/\s+/).filter(Boolean).length;
    const readMs = Math.max(1600, wordCount * 340);

    let startMs = Math.round(beatMs * 0.2);
    const emph = h.emphasisWord ? normWord(h.emphasisWord.split(/\s+/)[0] ?? "") : "";
    if (emph && words.length) {
      const hit =
        words.find((w) => normWord(w.w) === emph) ??
        words.find((w) => normWord(w.w).includes(emph) && emph.length >= 3);
      if (hit) startMs = Math.round(hit.start * 1000);
    }

    let endMs = startMs + readMs;
    if (beatMs > 0) {
      endMs = Math.min(endMs, beatMs - 50);
      if (endMs - startMs < 800) startMs = Math.max(0, endMs - readMs);
    }
    return { ...h, startMs, endMs };
  });

  // De-overlap within the beat: keep highlights sequential with a small gap so
  // two never share the screen. Push later ones back; clamp to the beat.
  resolved.sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1];
    const cur = resolved[i];
    if (cur.startMs < prev.endMs + HL_GAP_MS) {
      const readMs = Math.max(1600, cur.text.trim().split(/\s+/).filter(Boolean).length * 340);
      cur.startMs = prev.endMs + HL_GAP_MS;
      cur.endMs = cur.startMs + readMs;
    }
    if (beatMs > 0 && cur.endMs > beatMs - 50) {
      cur.endMs = beatMs - 50;
      if (cur.startMs > cur.endMs - 600) cur.startMs = Math.max(0, cur.endMs - 600);
    }
  }
  return resolved;
}

async function buildProps(videoId: string): Promise<{
  props: VideoProps;
  project: { id: string };
  video: { id: string; title: string; target_length_sec: number; kind: string; project_id: string; highlights?: unknown };
} | null> {
  const { data: video } = await db.from("videos").select("*").eq("id", videoId).single();
  if (!video) return null;
  const { data: project } = await db
    .from("projects")
    .select("*")
    .eq("id", video.project_id)
    .single();

  // Repurposed shorts reuse the parent long-form's script + rendered assets
  // (no new VO/clip spend); native shorts and long-forms use their own.
  const isDerived = video.kind === "short" && video.parent_video_id;
  const sourceId: string = isDerived ? video.parent_video_id : videoId;

  const { data: script } = await db
    .from("scripts")
    .select("beats, metadata")
    .eq("video_id", sourceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: assets } = await db.from("assets").select("*").eq("video_id", sourceId);
  if (!project || !script || !assets) return null;

  let scriptBeats = script.beats as { idx: number; text: string; shotType: string; motion?: string }[];
  // Cut the segment: keep only the parent beats this short was derived from,
  // in the segment's order. Original beat idx is preserved so asset lookup and
  // highlight anchoring (by beatIdx) stay valid.
  const segment = (video.source_segment ?? null) as { beats?: number[] } | null;
  if (isDerived && segment?.beats?.length) {
    const order = new Map(segment.beats.map((idx, i) => [idx, i] as const));
    scriptBeats = scriptBeats
      .filter((b) => order.has(b.idx))
      .sort((a, b) => (order.get(a.idx) ?? 0) - (order.get(b.idx) ?? 0));
  }
  // Curated highlights live on the video (opt-in); timing is resolved per beat
  // below from the beat's word timestamps.
  const curated = (
    video.enable_highlights ? ((video.highlights as CuratedHighlight[] | null) ?? []) : []
  );
  const beats: RenderBeat[] = [];
  for (const sb of scriptBeats) {
    const vo = assets.find((a) => a.kind === "vo" && a.beat_index === sb.idx);
    const clip = assets.find((a) => a.kind === "clip" && a.beat_index === sb.idx);
    const voMeta = (vo?.meta ?? {}) as {
      durationSec?: number;
      words?: { w: string; start: number; end: number }[];
    };
    const clipMeta = (clip?.meta ?? {}) as {
      url?: string;
      stillImage?: boolean;
      isVideo?: boolean;
      heroHold?: boolean;
      durationSec?: number;
      stickScene?: StickScene;
      /** Tier 9 #4 — extra still paths/urls for a multi-image section. */
      images?: string[];
      /** Tier 9.5 — programmatic data-viz spec; render draws the chart. */
      dataViz?: RenderBeat["dataViz"];
      /** Tier 9.5 — Lottie b-roll spec (url may be a storage path to sign). */
      lottie?: { url?: string; loop?: boolean };
    };
    // Generated video clips live in Storage (no meta.url) — sign the path and
    // treat as video. Stills are signed as images. External (Pexels) use url.
    const clipSigned = clip?.storage_path ? await sign(clip.storage_path) : null;
    const isVideoClip = Boolean(clipMeta.isVideo || clipMeta.url);
    const durationSec = Number(voMeta.durationSec ?? 5);
    const words = voMeta.words ?? [];
    // Tier 9 #4 — resolve extra stills (external urls pass through; storage
    // paths get signed). The primary still leads, so the cross-dissolve always
    // includes the frame the rest of the pipeline already vetted/cached.
    const primaryStill = !isVideoClip ? (clipSigned ?? undefined) : undefined;
    let images: string[] | undefined;
    if (!isVideoClip && clipMeta.images?.length) {
      const extra = await Promise.all(
        clipMeta.images.map((p) => (/^https?:\/\//.test(p) ? Promise.resolve(p) : sign(p))),
      );
      images = [primaryStill, ...extra].filter((u): u is string => Boolean(u));
      if (images.length < 2) images = undefined;
    }
    beats.push({
      idx: sb.idx,
      text: sb.text,
      shotType: sb.shotType,
      motion: sb.motion,
      durationSec,
      words,
      voUrl: vo ? await sign(vo.storage_path) : null,
      videoUrl: clipMeta.url ?? (clipMeta.isVideo ? (clipSigned ?? undefined) : undefined),
      videoDurationSec: clipMeta.durationSec,
      heroHold: Boolean(clipMeta.heroHold),
      imageUrl: primaryStill,
      images,
      // Stick Studio: a stick scene on the clip asset drives programmatic
      // rendering instead of footage (Phase 2 writes it; here we just pass it).
      stickScene: clipMeta.stickScene,
      // Tier 9.5 — programmatic b-roll inserts (data-viz / Lottie).
      dataViz: clipMeta.dataViz,
      lottie: clipMeta.lottie?.url
        ? {
            url: /^https?:\/\//.test(clipMeta.lottie.url)
              ? clipMeta.lottie.url
              : ((await sign(clipMeta.lottie.url)) ?? clipMeta.lottie.url),
            loop: clipMeta.lottie.loop,
          }
        : undefined,
      highlights: resolveHighlights(
        curated.filter((h) => h.beatIdx === sb.idx),
        words,
        durationSec,
      ),
    });
  }
  // A render without narration would be silent — treat as not ready.
  if (!beats.some((b) => b.voUrl)) return null;

  // Tier 9 #2 — narrated intro title card. Hero shot = the strongest available
  // frame (a hero still, else the first still/clip); phrase = the script's
  // kinetic thumb phrase (falls back to the title in IntroSting). The optional
  // narrated hook is stored as a vo asset at beat_index -1 by asset gen.
  const scriptMeta = (script.metadata ?? {}) as { thumbPhrase?: string };
  const heroBeat =
    beats.find((b) => b.shotType === "hero" && (b.imageUrl || b.videoUrl)) ??
    beats.find((b) => b.imageUrl) ??
    beats.find((b) => b.videoUrl);
  const introVo = assets.find((a) => a.kind === "vo" && a.beat_index === -1);
  const introVoUrl = introVo?.storage_path ? await sign(introVo.storage_path) : undefined;

  return {
    props: {
      title: video.title,
      projectName: project.name,
      brand: {
        primary: project.brand_kit?.primary ?? "#F5B829",
        secondary: project.brand_kit?.secondary ?? "#17150F",
      },
      beats,
      captions: video.enable_captions ?? true,
      // Stick Studio: recurring character identity (Phase 2 migration adds the
      // column; undefined falls back to the default cast at render).
      stickCast: (project.stick_cast as StickCast | null) ?? undefined,
      heroImageUrl: heroBeat?.imageUrl,
      heroVideoUrl: heroBeat?.imageUrl ? undefined : heroBeat?.videoUrl,
      introPhrase: scriptMeta.thumbPhrase?.trim() || video.title,
      introVoUrl: introVoUrl ?? undefined,
    },
    project,
    video,
  };
}

async function renderOne(
  serveUrl: string,
  videoId: string,
): Promise<"rendered" | "skipped"> {
  const built = await buildProps(videoId);
  if (!built) {
    console.log(`⏭  ${videoId}: not render-ready (no live VO) — leaving for in-app mock path`);
    return "skipped";
  }
  const { props, video } = built;
  const outDir = mkdtempSync(join(tmpdir(), "render-"));
  const timeline = beatTimeline(props);

  // Short videos (native or repurposed) render a single 9:16 cut across all
  // their beats. Long-forms render the 16:9 cut plus the free beat-0 Short.
  // Both are stored for download; neither is uploaded to YouTube here.
  type RenderPlan = {
    variant: "long" | "short";
    compId: "LongForm" | "Short" | "VerticalShort";
    storageName: string;
  };
  const plans: RenderPlan[] =
    video.kind === "short"
      ? [{ variant: "short", compId: "VerticalShort", storageName: "short" }]
      : [
          { variant: "long", compId: "LongForm", storageName: "final" },
          { variant: "short", compId: "Short", storageName: "short-0" },
        ];

  // Local path of the deliverable cut (LongForm for longs, VerticalShort for
  // native shorts) — kept for the free ffmpeg media-QC pass after the loop.
  let primaryRenderPath: string | null = null;
  let primaryRenderVariant: "long" | "short" = video.kind === "short" ? "short" : "long";

  for (const { variant, compId, storageName } of plans) {
   try {
    const out = join(outDir, `${compId}.mp4`);
    const composition = await selectComposition({
      serveUrl,
      id: compId,
      inputProps: props,
    });
    console.log(`🎬 ${video.title} [${compId}] — ${composition.durationInFrames} frames`);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: out,
      inputProps: props,
      timeoutInMilliseconds: 120000,
      // Render frames across all runner cores (Remotion defaults to ~half) and
      // use a faster x264 preset — a 13-min cut was overrunning the 30-min job
      // at the default settings. jpeg frames keep capture fast; crf 23 is
      // visually clean at a fraction of the encode time/size of the crf-18 default.
      concurrency: Math.max(2, cpus().length),
      imageFormat: "jpeg",
      jpegQuality: 80,
      crf: 23,
      x264Preset: "faster",
    });
    const durationSec =
      compId === "LongForm"
        ? Math.round(longFormDurationSec(props))
        : compId === "VerticalShort"
          ? Math.round(verticalShortDurationSec(props))
          : Math.round(shortDurationSec(props));
    const baseMeta = {
      variant,
      resolution: variant === "long" ? "1080p" : "1080x1920",
      durationSec,
      // Retention curves map back to script beats through this (idea #2).
      beats: variant === "long" ? timeline : undefined,
    };

    // Always store both cuts so every video is downloadable regardless of size
    // (R2 when configured, else Supabase with a resumable fallback). YouTube
    // upload is a separate, operator-chosen step — see publishStagedVideos.
    const file = readFileSync(out);
    const { storagePath, provider } = await storeRender(videoId, storageName, file, variant);

    await db.from("assets").delete().eq("video_id", videoId).eq("kind", "render")
      .filter("meta->>variant", "eq", variant);
    await db.from("assets").insert({
      video_id: videoId,
      kind: "render",
      provider,
      storage_path: storagePath,
      meta: baseMeta,
      cost_usd: 0,
    });
    if (compId === "LongForm" || compId === "VerticalShort") {
      primaryRenderPath = out;
      primaryRenderVariant = variant;
    }
   } catch (err) {
    // The beat-0 freebie Short is non-critical: a failure must not strand the
    // long-form (already rendered + stored) at ASSEMBLING. The LongForm and the
    // native/derived VerticalShort ARE the deliverable, so re-throw those.
    if (compId === "Short") {
      console.error(`⚠️  freebie Short failed (non-fatal): ${String(err).slice(0, 160)}`);
      continue;
    }
    throw err;
   }
  }

  // ── Tier 9.5 post-render data-viz QC gate. For each chart beat, render the
  //    ACTUAL frame at the beat's midpoint and have Claude vision confirm the
  //    graphic represents the data accurately and isn't misleading. Fail-closed:
  //    a failed/uncertain chart marks the video for human review (it still
  //    rendered — we just don't auto-publish a misleading statistic). Long-form
  //    only (charts live in the long cut); best-effort, never fails the render.
  if (video.kind !== "short") {
    const chartBeats = props.beats.filter((b) => b.dataViz);
    const chartIssues: string[] = [];
    for (const cb of chartBeats) {
      try {
        const t = timeline.find((x) => x.idx === cb.idx);
        if (!t) continue;
        const midFrame = Math.max(1, Math.round(((t.start + t.end) / 2) * FPS));
        const comp = await selectComposition({ serveUrl, id: "LongForm", inputProps: props });
        const stillOut = join(outDir, `chart-${cb.idx}.jpg`);
        await renderStill({
          composition: comp,
          serveUrl,
          output: stillOut,
          inputProps: props,
          frame: Math.min(midFrame, comp.durationInFrames - 1),
          imageFormat: "jpeg",
          jpegQuality: 85,
        });
        const verdict = await verifyRenderedChart({
          spec: cb.dataViz!,
          imageBase64: readFileSync(stillOut).toString("base64"),
          mediaType: "image/jpeg",
        });
        if (verdict.costUsd > 0) {
          await db.from("cost_ledger").insert({
            project_id: built.project.id,
            video_id: videoId,
            provider: "anthropic",
            description: "Data-viz post-render QC",
            usd: verdict.costUsd,
          });
        }
        if (!verdict.ok) {
          chartIssues.push(`Beat ${cb.idx} ("${cb.dataViz!.title}"): ${verdict.issues.join("; ") || "inaccurate/misleading"}`);
        }
        console.log(`📊 ${video.title}: chart beat ${cb.idx} → ${verdict.ok ? "ok" : "FLAGGED"}`);
      } catch (err) {
        console.error(`⚠️  chart QC failed (non-fatal) beat ${cb.idx}: ${String(err).slice(0, 140)}`);
      }
    }
    if (chartIssues.length) {
      await db
        .from("videos")
        .update({
          auto_publish: false,
          paused_reason: `Held — data-viz QC flagged a chart as inaccurate/misleading: ${chartIssues[0]}. Review the chart data.`,
        })
        .eq("id", videoId);
    }
  }

  // ── Thumbnail: a hero frame + a brand-safe Claude kinetic phrase rendered
  //    as a still. Deterministic text → no AI-image hallucinated brand names.
  //    Best-effort; a thumbnail failure never fails the video render.
  try {
    const { data: scriptRow } = await db
      .from("scripts")
      .select("metadata")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const meta = (scriptRow?.metadata ?? {}) as { thumbPhrase?: string };

    // Tier 6 — vision pick: score the existing beat stills, choose the most
    // thumbnail-worthy frame + a subject-avoiding headline placement (one call).
    const candidates = props.beats
      .filter((b) => b.imageUrl)
      .map((b) => ({ beatIdx: b.idx, imageUrl: b.imageUrl as string, text: b.text }));
    const highlightTexts = (((video.highlights as { text?: string }[] | null) ?? [])
      .map((h) => (h.text ?? "").trim())
      .filter(Boolean));
    let chosenBeatIdx: number | undefined;
    let placement: ThumbPlacement = "bottom-left";
    let matchedHighlight: string | undefined;
    try {
      const pick = await pickThumbnail({ title: video.title, candidates, highlights: highlightTexts });
      if (pick) {
        chosenBeatIdx = pick.beatIdx;
        placement = pick.placement;
        if (pick.highlightIdx >= 0) matchedHighlight = highlightTexts[pick.highlightIdx];
        if (pick.costUsd > 0) {
          const { data: vrow } = await db.from("videos").select("total_cost_usd").eq("id", videoId).maybeSingle();
          await db.from("cost_ledger").insert({
            project_id: video.project_id,
            video_id: videoId,
            provider: "anthropic",
            description: "Thumbnail vision pick",
            usd: pick.costUsd,
          });
          await db
            .from("videos")
            .update({ total_cost_usd: Number(vrow?.total_cost_usd ?? 0) + pick.costUsd })
            .eq("id", videoId);
        }
      }
    } catch (err) {
      console.error(`⚠️  thumbnail vision pick failed (fallback to first hero): ${String(err).slice(0, 160)}`);
    }

    const heroBeat =
      (chosenBeatIdx != null ? props.beats.find((b) => b.idx === chosenBeatIdx) : undefined) ??
      props.beats.find((b) => b.shotType === "hero" && (b.imageUrl || b.videoUrl)) ??
      props.beats.find((b) => b.imageUrl || b.videoUrl) ??
      props.beats[0];
    // Script phrase stays primary; the vision-matched highlight is the fallback.
    const phrase = thumbPhraseFor(meta.thumbPhrase, video, matchedHighlight);
    const thumbProps = {
      imageUrl: heroBeat?.imageUrl ?? null,
      videoUrl: heroBeat?.videoUrl ?? null,
      phrase,
      placement,
      brand: props.brand,
    };
    const thumbComp = await selectComposition({ serveUrl, id: "Thumbnail", inputProps: thumbProps });
    const thumbOut = join(outDir, "thumb.jpg");
    await renderStill({
      composition: thumbComp,
      serveUrl,
      output: thumbOut,
      inputProps: thumbProps,
      imageFormat: "jpeg",
      jpegQuality: 90,
    });
    const thumbPath = await storeImage(videoId, readFileSync(thumbOut));
    await db.from("assets").delete().eq("video_id", videoId).eq("kind", "thumb");
    await db.from("assets").insert({
      video_id: videoId,
      kind: "thumb",
      provider: "remotion",
      storage_path: thumbPath,
      meta: { variant: 0, format: "hero-kinetic", phrase, placement, beatIdx: heroBeat?.idx, selected: true },
      cost_usd: 0,
    });
    console.log(`🖼️  ${video.title}: thumbnail "${phrase}" → ${thumbPath}`);
  } catch (err) {
    console.error(`⚠️  thumbnail render failed (non-fatal): ${String(err).slice(0, 160)}`);
  }

  const isShort = video.kind === "short";
  await db.from("cost_ledger").insert({
    project_id: built.project.id,
    video_id: videoId,
    provider: "remotion",
    description: isShort
      ? "Short render (GitHub Actions) — free"
      : "Final render + Short (GitHub Actions) — free",
    usd: 0,
  });

  // ── Harness C6, layer one: free ffmpeg structural QC on every render.
  //    Black/frozen frames, silence gaps, and loudness — defects a vision
  //    model can't reliably see. A hard structural defect (black frames, a
  //    long silence gap) HOLDS the video for a human rather than
  //    auto-publishing a broken cut; the verdict is stored on the render
  //    asset and gates whether the paid vision critic needs to run.
  let mediaQcHardFail = false;
  if (primaryRenderPath) {
    try {
      const qc = await runMediaQc(primaryRenderPath);
      if (qc.ran) {
        // Merge onto the stored render meta (keep durationSec/beats/resolution).
        const { data: renderAsset } = await db
          .from("assets")
          .select("id, meta")
          .eq("video_id", videoId)
          .eq("kind", "render")
          .filter("meta->>variant", "eq", primaryRenderVariant)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (renderAsset) {
          await db
            .from("assets")
            .update({ meta: { ...(renderAsset.meta as Record<string, unknown>), mediaQc: qc } })
            .eq("id", renderAsset.id);
        }
        const failed = qc.checks.filter((c) => !c.pass);
        console.log(
          `🔎 ${video.title}: media QC ${qc.hardFail ? "HARD-FAIL" : failed.length ? "warn" : "clean"}` +
            (failed.length ? ` — ${failed.map((c) => c.id).join(", ")}` : "") +
            (qc.lufs != null ? ` · ${qc.lufs.toFixed(1)} LUFS` : ""),
        );
        mediaQcHardFail = qc.hardFail;
      }
    } catch (err) {
      console.error(`⚠️  media QC skipped (non-fatal): ${String(err).slice(0, 140)}`);
    }
  }

  // Clear any prior paused_reason (e.g. an earlier storage failure) so the
  // project "needs attention" banner clears once this render succeeds — unless
  // media QC found a hard structural defect, which holds for manual review.
  if (mediaQcHardFail) {
    await db
      .from("videos")
      .update({
        status: "FINAL_REVIEW",
        auto_publish: false,
        paused_reason: "Held — media QC found a structural defect (black frames or a long silence gap). Check the render.",
      })
      .eq("id", videoId);
    console.log(`⛔ ${video.title}: rendered but HELD by media QC → FINAL_REVIEW`);
  } else {
    await db.from("videos").update({ status: "FINAL_REVIEW", paused_reason: null }).eq("id", videoId);
    console.log(
      `✅ ${video.title}: rendered ${isShort ? "vertical short" : "long + short"} → FINAL_REVIEW`,
    );
  }

  // Tier-1 vision critique: only for stick shorts (programmatic, so issues map
  // to tunable params). Best-effort — never fails the render.
  const afCfg = (built.project as { autofix_config?: { critiqueFrames?: number | string } }).autofix_config;
  const isStick = props.beats.some((b) => b.stickScene);
  if (isShort && isStick) {
    try {
      const n = critiqueFrameCount(props.beats.length, true, afCfg);
      await runFrameCritic(serveUrl, props, videoId, built.project.id, video.title, n);
    } catch (err) {
      console.error(`⚠️  vision critique failed (non-fatal): ${String(err).slice(0, 160)}`);
    }
  } else if (
    // Footage Tier-1 critique for channels on the AI-clip auto-fix loop, so
    // footage videos get the same per-frame vision_review as stick. Critique the
    // delivered cut: the 9:16 short for shorts, the 16:9 long-form for longs.
    (built.project as { autofix_loop?: string }).autofix_loop === "aiclip" &&
    props.beats.some((b) => !b.stickScene && (b.imageUrl || b.videoUrl))
  ) {
    try {
      const compId = isShort ? "VerticalShort" : "LongForm";
      const startOffsetSec = isShort ? 0 : INTRO_SEC;
      const n = critiqueFrameCount(props.beats.length, isShort, afCfg);
      await runFootageCritic(serveUrl, props, videoId, built.project.id, video.title, compId, startOffsetSec, n);
    } catch (err) {
      console.error(`⚠️  footage vision critique failed (non-fatal): ${String(err).slice(0, 160)}`);
    }
  }
  return "rendered";
}

/**
 * How many mid-beat keyframes the vision critic should analyse. Honours the
 * channel's autofix_config.critiqueFrames override (a fixed number), else scales
 * with length: shorts are short so a low cap suffices; long-form (tens of beats)
 * gets one-per-beat up to a higher cap so coverage isn't ~10% of the video.
 * More frames cost linearly (~1.8k vision tokens each) with diminishing returns
 * past ~12, so the caps stay modest. See docs/Auto-Fix-Loop.md §4.
 */
function critiqueFrameCount(
  beatCount: number,
  isShort: boolean,
  cfg?: { critiqueFrames?: number | string },
): number {
  const override = cfg?.critiqueFrames;
  if (typeof override === "number" && override > 0) return Math.min(beatCount, Math.round(override));
  return Math.min(beatCount, isShort ? 8 : 15);
}

/** Pick `n` indices spread evenly across `[0, len)`. */
function sampleEvenly(len: number, n: number): number[] {
  if (len <= n) return Array.from({ length: len }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.round((i * (len - 1)) / (n - 1)));
  return [...new Set(out)];
}

/**
 * Tier-1 vision critique: render up to 5 keyframe stills of the stick short
 * (one mid-beat) and have Claude score them against the animation rubric, then
 * store the structured result on videos.vision_review. See
 * docs/stick-studio/Vision-Optimizer-Loop.md.
 */
async function runFrameCritic(
  serveUrl: string,
  props: VideoProps,
  videoId: string,
  projectId: string,
  title: string,
  maxFrames = 5,
): Promise<void> {
  const beats = props.beats;
  if (beats.length === 0) return;

  // Mid-beat frame offsets in the VerticalShort timeline (beats play back-to-back).
  const starts: number[] = [];
  let cum = 0;
  for (const b of beats) {
    starts.push(cum);
    cum += Math.max(1, b.durationSec);
  }
  const composition = await selectComposition({ serveUrl, id: "VerticalShort", inputProps: props });
  const outDir = mkdtempSync(join(tmpdir(), "critic-"));
  const frames: CritiqueFrame[] = [];
  for (const i of sampleEvenly(beats.length, maxFrames)) {
    const midSec = starts[i] + Math.max(1, beats[i].durationSec) / 2;
    const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(midSec * FPS)));
    const out = join(outDir, `kf-${i}.jpg`);
    await renderStill({ composition, serveUrl, output: out, frame, inputProps: props, imageFormat: "jpeg", jpegQuality: 80 });
    const scene = beats[i].stickScene;
    frames.push({
      beatIdx: beats[i].idx,
      jpegBase64: readFileSync(out).toString("base64"),
      action: scene?.actors?.[0]?.action ?? "idle",
      setting: scene?.setting ?? "void",
      text: beats[i].text,
    });
  }

  const critique = await critiqueStickFrames({ title, frames });
  await db
    .from("videos")
    .update({
      vision_review: {
        score: critique.score,
        scores: critique.scores,
        issues: critique.issues,
        strengths: critique.strengths,
        provider: critique.provider,
        at: new Date().toISOString(),
      },
    })
    .eq("id", videoId);
  if (critique.costUsd > 0) {
    await db.from("cost_ledger").insert({
      project_id: projectId,
      video_id: videoId,
      provider: "anthropic",
      description: "Stick vision critique (Tier 1)",
      usd: critique.costUsd,
    });
  }
  console.log(`👁️  ${title}: vision critique ${critique.score}/10 (${critique.provider}, ${critique.issues.length} issues)`);
}

/**
 * Footage Tier-1 critique: render up to 5 mid-beat keyframe stills from the
 * delivered composition and have Claude score the visuals against the footage
 * rubric (relevance, framing, captions, variety), then store the result on
 * videos.vision_review in the same shape the stick critic uses. The app's
 * AI-clip auto-fix loop reads it directly.
 */
async function runFootageCritic(
  serveUrl: string,
  props: VideoProps,
  videoId: string,
  projectId: string,
  title: string,
  compId: "LongForm" | "VerticalShort",
  startOffsetSec: number,
  maxFrames = 5,
): Promise<void> {
  const beats = props.beats;
  if (beats.length === 0) return;

  // Mid-beat frame offsets in the chosen composition's timeline (long-form is
  // offset by the intro sting; the vertical short starts at 0).
  const starts: number[] = [];
  let cum = startOffsetSec;
  for (const b of beats) {
    starts.push(cum);
    cum += Math.max(1, b.durationSec);
  }
  const composition = await selectComposition({ serveUrl, id: compId, inputProps: props });
  const outDir = mkdtempSync(join(tmpdir(), "footcritic-"));
  const frames: FootageFrame[] = [];
  for (const i of sampleEvenly(beats.length, maxFrames)) {
    const midSec = starts[i] + Math.max(1, beats[i].durationSec) / 2;
    const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(midSec * FPS)));
    const out = join(outDir, `kf-${i}.jpg`);
    await renderStill({ composition, serveUrl, output: out, frame, inputProps: props, imageFormat: "jpeg", jpegQuality: 80 });
    frames.push({
      beatIdx: beats[i].idx,
      jpegBase64: readFileSync(out).toString("base64"),
      shotType: beats[i].shotType,
      isVideo: Boolean(beats[i].videoUrl),
      text: beats[i].text,
    });
  }

  const critique = await critiqueFootageFrames({ title, frames });
  await db
    .from("videos")
    .update({
      vision_review: {
        score: critique.score,
        scores: critique.scores,
        issues: critique.issues,
        strengths: critique.strengths,
        provider: critique.provider,
        at: new Date().toISOString(),
      },
    })
    .eq("id", videoId);
  if (critique.costUsd > 0) {
    await db.from("cost_ledger").insert({
      project_id: projectId,
      video_id: videoId,
      provider: "anthropic",
      description: "Footage vision critique (Tier 1)",
      usd: critique.costUsd,
    });
  }
  console.log(`👁️  ${title}: footage critique ${critique.score}/10 (${critique.provider}, ${critique.issues.length} issues)`);
}

// A video whose render throws stays at ASSEMBLING (so a transient failure —
// farm timeout, provider blip — retries on the next pass), but a poisoned
// video must not re-render (and re-bill vision QC) every 10 minutes forever.
// The attempt count is encoded in paused_reason; at the cap the farm skips
// the video and leaves it surfaced for the operator via needs-attention.
const MAX_RENDER_ATTEMPTS = 3;

function renderAttempts(reason: string | null | undefined): number {
  const m = /^Render failed \(attempt (\d+)\/\d+\)/.exec(reason ?? "");
  if (m) return Number(m[1]);
  return reason?.startsWith("Render failed") ? 1 : 0;
}

async function main() {
  const { data: rows } = await db
    .from("videos")
    .select("id, title, paused_reason")
    .eq("status", "ASSEMBLING")
    .order("updated_at", { ascending: true })
    .limit(10);

  const skipped = (rows ?? []).filter((v) => renderAttempts(v.paused_reason) >= MAX_RENDER_ATTEMPTS);
  for (const v of skipped) {
    console.log(`⏭️  ${v.title}: skipped — ${MAX_RENDER_ATTEMPTS} failed render attempts (needs operator attention)`);
  }
  const queue = (rows ?? [])
    .filter((v) => renderAttempts(v.paused_reason) < MAX_RENDER_ATTEMPTS)
    .slice(0, 5);

  if (queue.length > 0) {
    console.log(`Queue: ${queue.length} video(s)`);
    await ensureBrowser();
    const entry = fileURLToPath(new URL("./index.ts", import.meta.url));
    const serveUrl = await bundle({ entryPoint: entry });

    // Wall-clock budget: the job is SIGKILLed at 60 min (workflow timeout),
    // which would skip the catch below and strand a mid-render video at
    // ASSEMBLING with no paused_reason. Stop STARTING new renders at ~45 min
    // so the batch always ends cleanly; the rest wait for the next pass.
    const startedAt = Date.now();
    const WALL_BUDGET_MS = 45 * 60 * 1000;

    for (const v of queue) {
      if (Date.now() - startedAt > WALL_BUDGET_MS) {
        console.log(`⏳ wall-clock budget reached — deferring remaining videos to the next pass`);
        break;
      }
      try {
        await renderOne(serveUrl, v.id);
      } catch (err) {
        console.error(`❌ ${v.title}:`, err);
        const attempt = renderAttempts(v.paused_reason) + 1;
        await db
          .from("videos")
          .update({
            paused_reason: `Render failed (attempt ${attempt}/${MAX_RENDER_ATTEMPTS}): ${String(err).slice(0, 140)}`,
          })
          .eq("id", v.id);
      }
    }
  } else {
    console.log("Queue empty — nothing to render.");
  }

  // Independent of the render queue: publish any videos (long or short) the
  // operator has tapped Publish on. Runs even when the render queue is empty.
  await publishStagedVideos();
}

/**
 * Upload videos the operator flagged for publish (long-form or Short). The farm
 * holds the YouTube OAuth creds (the app never does), so it does the upload
 * here: fetch the stored cut (R2 or Supabase) → upload (long-form as an unlisted
 * draft; Short as #Shorts) → stamp youtube_video_id + TRACKING. No-op when OAuth
 * isn't configured, leaving the manual download + "mark uploaded" path.
 */
async function publishStagedVideos() {
  if (!youtubeUploadConfigured()) return;

  // Heal rows stranded by a partial update: the upload succeeded
  // (youtube_video_id persisted) but the follow-up status write failed.
  // Without this they never reach TRACKING — the select below excludes
  // rows that already have a youtube_video_id.
  const { data: stranded } = await db
    .from("videos")
    .select("id, title")
    .eq("publish_requested", true)
    .in("status", ["FINAL_REVIEW", "APPROVED"])
    .not("youtube_video_id", "is", null)
    .limit(5);
  for (const v of stranded ?? []) {
    await db
      .from("videos")
      .update({
        status: "TRACKING",
        published_at: new Date().toISOString(),
        publish_requested: false,
      })
      .eq("id", v.id);
    console.log(`🩹 ${v.title}: healed stranded publish → TRACKING`);
  }

  const { data: pending } = await db
    .from("videos")
    .select("id, title, kind, project_id, source_segment, publish_privacy")
    .eq("publish_requested", true)
    .in("status", ["FINAL_REVIEW", "APPROVED"])
    .is("youtube_video_id", null)
    .limit(5);
  if (!pending || pending.length === 0) return;
  console.log(`Publish: ${pending.length} staged video(s)`);

  for (const v of pending) {
    const variant: "long" | "short" = v.kind === "short" ? "short" : "long";
    try {
      // Per-project channel token (its own channel) → falls back to the global
      // default channel when the project hasn't set one.
      let refreshToken: string | undefined;
      if (v.project_id) {
        const { data: proj } = await db
          .from("projects")
          .select("youtube_refresh_token")
          .eq("id", v.project_id)
          .maybeSingle();
        refreshToken = (proj?.youtube_refresh_token as string | null) || undefined;
      }
      const file = await fetchRenderFile(v.id, variant);
      const tmp = join(mkdtempSync(join(tmpdir(), "publish-")), `${variant}.mp4`);
      writeFileSync(tmp, file);

      let description: string;
      let tags: string[];
      if (variant === "short") {
        // Derived Shorts carry a hook caption; native Shorts fall back to title.
        const caption = (v.source_segment as { caption?: string } | null)?.caption || v.title;
        description = `${caption}\n\n#Shorts`.trim();
        tags = ["Shorts"];
      } else {
        const { data: scriptRow } = await db
          .from("scripts")
          .select("metadata")
          .eq("video_id", v.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const sm = (scriptRow?.metadata ?? {}) as { description?: string; tags?: string[] };
        description = sm.description ?? "";
        tags = sm.tags ?? [];
      }

      // Build & Post sets publish_privacy from the final QC score (P5):
      // >= 8.0 → public, 7.0–8.0 → unlisted. Manual publishes leave it null →
      // the worker's default (YOUTUBE_UPLOAD_PRIVACY, then 'unlisted').
      const privacy = (v.publish_privacy as string | null) || undefined;
      const ytId = await uploadVideo({ filePath: tmp, title: v.title, description, tags, refreshToken, privacy });
      // Persist youtube_video_id FIRST, on its own. The select filter excludes
      // rows with a youtube_video_id, so this guarantees the video is never
      // uploaded twice even if the fuller status update below fails — a
      // duplicate public upload is far worse than a lagged status.
      await db.from("videos").update({ youtube_video_id: ytId }).eq("id", v.id);
      await db
        .from("videos")
        .update({
          status: "TRACKING",
          published_at: new Date().toISOString(),
          publish_requested: false,
        })
        .eq("id", v.id);
      console.log(`📺 ${v.title}: published ${variant} → ${ytId}${refreshToken ? " (project channel)" : ""}`);
    } catch (err) {
      console.error(`❌ publish ${v.title}:`, err);
      // Leave publish_requested set so the next pass retries.
    }
  }
}

main().then(() => process.exit(0));
