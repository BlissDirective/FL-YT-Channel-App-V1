/**
 * Render farm worker (GitHub Actions, cron). Picks up videos sitting at
 * ASSEMBLING with live assets, renders the long-form MP4 + a Short via
 * Remotion, uploads both to Supabase Storage, records assets (including
 * the beat timeline for retention mapping), and advances the video to
 * FINAL_REVIEW. Mock-asset videos are handled in-app and never reach here.
 */
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { beatTimeline, longFormDurationSec, type RenderBeat, type VideoProps } from "./types";

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

async function buildProps(videoId: string): Promise<{
  props: VideoProps;
  project: { id: string };
  video: { id: string; title: string; target_length_sec: number };
} | null> {
  const { data: video } = await db.from("videos").select("*").eq("id", videoId).single();
  if (!video) return null;
  const { data: project } = await db
    .from("projects")
    .select("*")
    .eq("id", video.project_id)
    .single();
  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: assets } = await db.from("assets").select("*").eq("video_id", videoId);
  if (!project || !script || !assets) return null;

  const scriptBeats = script.beats as { idx: number; text: string; shotType: string }[];
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
      durationSec?: number;
    };
    beats.push({
      idx: sb.idx,
      text: sb.text,
      shotType: sb.shotType,
      durationSec: Number(voMeta.durationSec ?? 5),
      words: voMeta.words ?? [],
      voUrl: vo ? await sign(vo.storage_path) : null,
      videoUrl: clipMeta.url ?? undefined,
      videoDurationSec: clipMeta.durationSec,
      imageUrl: clip?.storage_path
        ? ((await sign(clip.storage_path)) ?? undefined)
        : undefined,
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

  for (const variant of ["long", "short"] as const) {
    const compId = variant === "long" ? "LongForm" : "Short";
    const out = join(outDir, `${variant}.mp4`);
    const composition = await selectComposition({
      serveUrl,
      id: compId,
      inputProps: props,
    });
    console.log(`🎬 ${video.title} [${variant}] — ${composition.durationInFrames} frames`);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: out,
      inputProps: props,
      timeoutInMilliseconds: 120000,
    });
    const file = readFileSync(out);
    const storagePath = `videos/${videoId}/${variant === "long" ? "final" : "short-0"}.mp4`;
    const { error: upErr } = await db.storage
      .from("media")
      .upload(storagePath, file, { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);

    await db.from("assets").delete().eq("video_id", videoId).eq("kind", "render")
      .filter("meta->>variant", "eq", variant);
    await db.from("assets").insert({
      video_id: videoId,
      kind: "render",
      provider: "remotion",
      storage_path: storagePath,
      meta: {
        variant,
        resolution: variant === "long" ? "1080p" : "1080x1920",
        durationSec:
          variant === "long"
            ? Math.round(longFormDurationSec(props))
            : Math.round(props.beats[0]?.durationSec ?? 0) + 2,
        // Retention curves map back to script beats through this (idea #2).
        beats: variant === "long" ? timeline : undefined,
      },
      cost_usd: 0,
    });
  }

  await db.from("cost_ledger").insert({
    project_id: built.project.id,
    video_id: videoId,
    provider: "remotion",
    description: "Final render + Short (GitHub Actions) — free",
    usd: 0,
  });
  await db.from("videos").update({ status: "FINAL_REVIEW" }).eq("id", videoId);
  console.log(`✅ ${video.title}: rendered long + short → FINAL_REVIEW`);
  return "rendered";
}

async function main() {
  const { data: queue } = await db
    .from("videos")
    .select("id, title")
    .eq("status", "ASSEMBLING")
    .order("updated_at", { ascending: true })
    .limit(5);
  if (!queue || queue.length === 0) {
    console.log("Queue empty — nothing to render.");
    return;
  }
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
}

main().then(() => process.exit(0));
