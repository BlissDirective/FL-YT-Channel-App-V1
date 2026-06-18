/**
 * Render farm worker (GitHub Actions, cron). Picks up videos sitting at
 * ASSEMBLING with live assets, renders the long-form MP4 + a Short via
 * Remotion, uploads both to Supabase Storage, records assets (including
 * the beat timeline for retention mapping), and advances the video to
 * FINAL_REVIEW. Mock-asset videos are handled in-app and never reach here.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import {
  beatTimeline,
  longFormDurationSec,
  verticalShortDurationSec,
  type Highlight,
  type RenderBeat,
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
  const { data } = await db.storage.from("media").createSignedUrl(path, 7200);
  return data?.signedUrl ?? null;
};

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
  // Script-derived metadata for a YouTube upload (description + tags).
  const { data: scriptRow } = await db
    .from("scripts")
    .select("metadata")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sm = (scriptRow?.metadata ?? {}) as { description?: string; tags?: string[] };
  const scriptMeta = { description: sm.description ?? "", tags: sm.tags ?? [] };

  // Short videos (native or repurposed) render a single 9:16 cut across all
  // their beats and are staged in Storage for one-tap publish — no YouTube
  // upload here. Long-forms render the 16:9 cut plus the free beat-0 Short.
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

    // Long-form cuts exceed Supabase's upload limit. When YouTube OAuth is
    // configured, push the long-form straight to YouTube (unlisted draft) and
    // skip Storage; the Short (small) always goes to Storage. Any YouTube
    // failure falls back to Storage so the render still completes.
    let ytId: string | null = null;
    if (variant === "long" && youtubeUploadConfigured()) {
      try {
        ytId = await uploadVideo({
          filePath: out,
          title: video.title,
          description: scriptMeta.description,
          tags: scriptMeta.tags,
        });
        console.log(`📺 ${video.title}: uploaded long-form to YouTube (unlisted) → ${ytId}`);
      } catch (err) {
        console.error(`⚠️  YouTube upload failed, falling back to Storage: ${String(err).slice(0, 160)}`);
      }
    }

    await db.from("assets").delete().eq("video_id", videoId).eq("kind", "render")
      .filter("meta->>variant", "eq", variant);

    if (ytId) {
      await db.from("assets").insert({
        video_id: videoId,
        kind: "render",
        provider: "youtube",
        storage_path: null,
        meta: { ...baseMeta, youtubeId: ytId, url: `https://youtu.be/${ytId}` },
        cost_usd: 0,
      });
      await db.from("videos").update({ youtube_video_id: ytId }).eq("id", videoId);
    } else {
      const file = readFileSync(out);
      const storagePath = `videos/${videoId}/${storageName}.mp4`;
      const { error: upErr } = await db.storage
        .from("media")
        .upload(storagePath, file, { contentType: "video/mp4", upsert: true });
      if (upErr) throw new Error(`upload failed: ${upErr.message}`);
      await db.from("assets").insert({
        video_id: videoId,
        kind: "render",
        provider: "remotion",
        storage_path: storagePath,
        meta: baseMeta,
        cost_usd: 0,
      });
    }
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
  await db.from("videos").update({ status: "FINAL_REVIEW" }).eq("id", videoId);
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

  // Independent of the render queue: publish any Shorts the operator has
  // tapped Publish on. Runs even when the render queue is empty.
  await publishStagedShorts();
}

/**
 * Upload staged Shorts that the operator flagged for publish. The farm holds
 * the YouTube OAuth creds (the app never does), so it does the upload here:
 * download the staged 9:16 MP4 from Storage → upload as a Short (#Shorts) →
 * stamp youtube_video_id + TRACKING. No-op when OAuth isn't configured.
 */
async function publishStagedShorts() {
  if (!youtubeUploadConfigured()) return;
  const { data: pending } = await db
    .from("videos")
    .select("id, title, project_id, source_segment")
    .eq("kind", "short")
    .eq("publish_requested", true)
    .eq("status", "FINAL_REVIEW")
    .is("youtube_video_id", null)
    .limit(5);
  if (!pending || pending.length === 0) return;
  console.log(`Publish: ${pending.length} staged Short(s)`);

  for (const s of pending) {
    try {
      const path = `videos/${s.id}/short.mp4`;
      const { data: file, error: dlErr } = await db.storage.from("media").download(path);
      if (dlErr || !file) throw new Error(`download ${path}: ${dlErr?.message ?? "missing"}`);
      const tmp = join(mkdtempSync(join(tmpdir(), "publish-")), "short.mp4");
      writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));

      const caption = (s.source_segment as { caption?: string } | null)?.caption ?? "";
      const ytId = await uploadVideo({
        filePath: tmp,
        title: s.title,
        description: `${caption}\n\n#Shorts`.trim(),
        tags: ["Shorts"],
      });
      await db
        .from("videos")
        .update({
          youtube_video_id: ytId,
          status: "TRACKING",
          published_at: new Date().toISOString(),
          publish_requested: false,
        })
        .eq("id", s.id);
      console.log(`📺 ${s.title}: published Short → ${ytId}`);
    } catch (err) {
      console.error(`❌ publish ${s.title}:`, err);
      // Leave publish_requested set so the next pass retries.
    }
  }
}

main().then(() => process.exit(0));
