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
  beatTimeline,
  longFormDurationSec,
  verticalShortDurationSec,
  type Highlight,
  type RenderBeat,
  type StickCast,
  type StickScene,
  type VideoProps,
} from "./types";
import { uploadVideo, youtubeUploadConfigured } from "./youtube";

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
function thumbPhraseFor(scriptPhrase: string | undefined, video: { title: string; highlights?: unknown }): string {
  const fromScript = (scriptPhrase ?? "").trim();
  if (fromScript) return fromScript;
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
  video: { id: string; title: string; target_length_sec: number; kind: string };
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
    .select("beats")
    .eq("video_id", sourceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: assets } = await db.from("assets").select("*").eq("video_id", sourceId);
  if (!project || !script || !assets) return null;

  let scriptBeats = script.beats as { idx: number; text: string; shotType: string }[];
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
    };
    // Generated video clips live in Storage (no meta.url) — sign the path and
    // treat as video. Stills are signed as images. External (Pexels) use url.
    const clipSigned = clip?.storage_path ? await sign(clip.storage_path) : null;
    const isVideoClip = Boolean(clipMeta.isVideo || clipMeta.url);
    const durationSec = Number(voMeta.durationSec ?? 5);
    const words = voMeta.words ?? [];
    beats.push({
      idx: sb.idx,
      text: sb.text,
      shotType: sb.shotType,
      durationSec,
      words,
      voUrl: vo ? await sign(vo.storage_path) : null,
      videoUrl: clipMeta.url ?? (clipMeta.isVideo ? (clipSigned ?? undefined) : undefined),
      videoDurationSec: clipMeta.durationSec,
      heroHold: Boolean(clipMeta.heroHold),
      imageUrl: !isVideoClip ? (clipSigned ?? undefined) : undefined,
      // Stick Studio: a stick scene on the clip asset drives programmatic
      // rendering instead of footage (Phase 2 writes it; here we just pass it).
      stickScene: clipMeta.stickScene,
      highlights: resolveHighlights(
        curated.filter((h) => h.beatIdx === sb.idx),
        words,
        durationSec,
      ),
    });
  }
  // A render without narration would be silent — treat as not ready.
  if (!beats.some((b) => b.voUrl)) return null;

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
          : Math.round(props.beats[0]?.durationSec ?? 0) + 2;
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
    const heroBeat =
      props.beats.find((b) => b.shotType === "hero" && (b.imageUrl || b.videoUrl)) ??
      props.beats.find((b) => b.imageUrl || b.videoUrl) ??
      props.beats[0];
    const phrase = thumbPhraseFor(meta.thumbPhrase, video);
    const thumbProps = {
      imageUrl: heroBeat?.imageUrl ?? null,
      videoUrl: heroBeat?.videoUrl ?? null,
      phrase,
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
      meta: { variant: 0, format: "hero-kinetic", phrase, selected: true },
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
  // Clear any prior paused_reason (e.g. an earlier storage failure) so the
  // project "needs attention" banner clears once this render succeeds.
  await db.from("videos").update({ status: "FINAL_REVIEW", paused_reason: null }).eq("id", videoId);
  console.log(
    `✅ ${video.title}: rendered ${isShort ? "vertical short" : "long + short"} → FINAL_REVIEW`,
  );
  return "rendered";
}

async function main() {
  const { data: queue } = await db
    .from("videos")
    .select("id, title")
    .eq("status", "ASSEMBLING")
    .order("updated_at", { ascending: true })
    .limit(5);

  if (queue && queue.length > 0) {
    console.log(`Queue: ${queue.length} video(s)`);
    await ensureBrowser();
    const entry = fileURLToPath(new URL("./index.ts", import.meta.url));
    const serveUrl = await bundle({ entryPoint: entry });

    for (const v of queue) {
      try {
        await renderOne(serveUrl, v.id);
      } catch (err) {
        console.error(`❌ ${v.title}:`, err);
        await db
          .from("videos")
          .update({ paused_reason: `Render failed: ${String(err).slice(0, 140)}` })
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
