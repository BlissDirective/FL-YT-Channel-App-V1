/**
 * Long-clip worker (GitHub Actions, cron + dispatch).
 *
 * Claims `clip_jobs` at status='queued' and produces ONE mp4 per section:
 *   • veo-extend       — Veo-3.1 i2v (8s) then chained extend-video to target
 *   • stitch           — N base clips concatenated (hard cuts)
 *   • stitch-seamless   — N base clips chained via last-frame → next keyframe
 * The result replaces the section's clip asset; cost is ledgered against the
 * $100/mo video cap. Bounded + guarded; analysis-free, generation only.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FAL_KEY = process.env.FAL_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const BUCKET = "media";
const VIDEO_PROVIDER = "fal-video";
const VIDEO_MONTHLY_CAP_USD = 100;

// Per-second price estimates (mirror src/lib/adapters/video-models).
const PRICE_PER_SEC: Record<string, number> = {
  "seedance-2-fast": 0.022,
  "seedance-2": 0.07,
  "kling-2-5-turbo": 0.07,
  "veo-3-1": 0.4,
  "veo-3-1-extend": 0.4,
};
const SEG_MAX: Record<string, number> = {
  "seedance-2-fast": 15,
  "seedance-2": 15,
  "kling-2-5-turbo": 10,
  "veo-3-1": 8,
};
const ENDPOINT_I2V: Record<string, string> = {
  "seedance-2-fast": "bytedance/seedance-2.0/fast/image-to-video",
  "seedance-2": "bytedance/seedance-2.0/image-to-video",
  "kling-2-5-turbo": "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  "veo-3-1": "fal-ai/veo3.1/image-to-video",
  "veo-3-1-extend": "fal-ai/veo3.1/image-to-video",
};
const VEO_EXTEND_ENDPOINT = "fal-ai/veo3.1/extend-video";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const run = (cmd: string, args: string[], cwd?: string) =>
  execFileSync(cmd, args, { cwd, stdio: "pipe", timeout: 180_000 });

async function falQueue(endpoint: string, input: Record<string, unknown>): Promise<string> {
  const headers = { Authorization: `Key ${FAL_KEY}`, "content-type": "application/json" };
  const sub = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!sub.ok) throw new Error(`fal ${endpoint} submit ${sub.status}: ${(await sub.text()).slice(0, 160)}`);
  const q = (await sub.json()) as { status_url?: string; response_url?: string };
  if (!q.status_url || !q.response_url) throw new Error("fal queue: no status/response url");
  const deadline = Date.now() + 280_000;
  for (;;) {
    if (Date.now() > deadline) throw new Error("fal job timed out");
    await sleep(5000);
    const st = await fetch(q.status_url, { headers });
    if (!st.ok) continue;
    const s = (await st.json()) as { status?: string };
    if (s.status === "COMPLETED") break;
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error("fal job failed");
  }
  const resp = await fetch(q.response_url, { headers });
  if (!resp.ok) throw new Error(`fal result ${resp.status}`);
  const out = (await resp.json()) as { video?: { url?: string } };
  if (!out.video?.url) throw new Error("fal returned no video url");
  return out.video.url;
}

async function download(url: string, path: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

async function signedUrl(path: string): Promise<string | null> {
  if (!path || path.startsWith("mock/")) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 7200);
  return data?.signedUrl ?? null;
}

async function monthVideoSpend(): Promise<number> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("provider", VIDEO_PROVIDER)
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

type Job = {
  id: string;
  video_id: string;
  project_id: string | null;
  beat_idx: number;
  method: "veo-extend" | "stitch" | "stitch-seamless";
  model: string;
  target_sec: number;
};

/** Veo-3.1: base 8s i2v, then chained extends (+7s) until >= target (<=30s). */
async function makeVeoExtend(prompt: string, imageUrl: string | null, target: number, dir: string): Promise<string> {
  let url = await falQueue(ENDPOINT_I2V["veo-3-1"], {
    prompt,
    duration: "8s",
    ...(imageUrl ? { image_url: imageUrl } : {}),
  });
  let total = 8;
  while (total < Math.min(target, 30)) {
    url = await falQueue(VEO_EXTEND_ENDPOINT, { video_url: url, prompt });
    total += 7;
  }
  const out = join(dir, "out.mp4");
  await download(url, out);
  return out;
}

/** Auto-stitch: N base clips, concatenated. Seamless chains each clip's last
    frame into the next clip's start image so there's no visible cut. */
async function makeStitch(
  prompt: string,
  model: string,
  imageUrl: string | null,
  target: number,
  seamless: boolean,
  dir: string,
): Promise<string> {
  const segMax = SEG_MAX[model] ?? 15;
  const count = Math.max(1, Math.ceil(target / segMax));
  const endpoint = ENDPOINT_I2V[model] ?? ENDPOINT_I2V["seedance-2-fast"];
  const segPaths: string[] = [];
  let nextImage = imageUrl;
  for (let i = 0; i < count; i++) {
    const segSec = Math.min(segMax, target - i * segMax);
    const url = await falQueue(endpoint, {
      prompt,
      duration: model.startsWith("veo") ? `${segSec}s` : segSec,
      ...(nextImage ? { image_url: nextImage } : {}),
    });
    const seg = join(dir, `seg${i}.mp4`);
    await download(url, seg);
    segPaths.push(seg);
    if (seamless && i < count - 1) {
      // Pull this segment's last frame → upload → use as next start image.
      const frame = join(dir, `frame${i}.jpg`);
      run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-sseof", "-0.1", "-i", seg, "-frames:v", "1", frame]);
      const fpath = `videos/${dir.split("/").pop()}/chain-${i}.jpg`;
      await db.storage.from(BUCKET).upload(fpath, readFileSync(frame), { contentType: "image/jpeg", upsert: true });
      nextImage = await signedUrl(fpath);
    }
  }
  if (segPaths.length === 1) return segPaths[0];
  // Concatenate (re-encode so mismatched segment params still join cleanly).
  const list = join(dir, "list.txt");
  writeFileSync(list, segPaths.map((p) => `file '${p}'`).join("\n"));
  const out = join(dir, "out.mp4");
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-pix_fmt", "yuv420p", out]);
  return out;
}

async function processJob(job: Job) {
  if (!FAL_KEY) throw new Error("FAL_KEY not set in worker");
  const est = (PRICE_PER_SEC[job.model] ?? 0.05) * job.target_sec;
  if ((await monthVideoSpend()) + est > VIDEO_MONTHLY_CAP_USD) {
    throw new Error(`Monthly video budget reached ($${VIDEO_MONTHLY_CAP_USD})`);
  }

  const { data: video } = await db.from("videos").select("*").eq("id", job.video_id).maybeSingle();
  if (!video) throw new Error("Video not found");
  const { data: project } = await db.from("projects").select("brand_kit").eq("id", video.project_id).maybeSingle();
  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", job.video_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beat = ((script?.beats ?? []) as { idx: number; visualPrompt: string }[]).find((b) => b.idx === job.beat_idx);
  if (!beat) throw new Error("Section not found");
  const style = (project?.brand_kit as { thumbnailStyle?: string })?.thumbnailStyle ?? "cinematic";
  const prompt = `${beat.visualPrompt}. ${style} style, cinematic 16:9, no text, no watermark`;

  // image-to-video from our existing keyframe still, if present.
  const { data: still } = await db
    .from("assets")
    .select("storage_path, meta")
    .eq("video_id", job.video_id)
    .eq("kind", "clip")
    .eq("beat_index", job.beat_idx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const isStill = still?.storage_path && !(still.meta as { isVideo?: boolean })?.isVideo;
  const imageUrl = isStill ? await signedUrl(still!.storage_path) : null;

  const dir = mkdtempSync(join(tmpdir(), `clip-${job.video_id.slice(0, 8)}-`));
  try {
    const file =
      job.method === "veo-extend"
        ? await makeVeoExtend(prompt, imageUrl, job.target_sec, dir)
        : await makeStitch(prompt, job.model, imageUrl, job.target_sec, job.method === "stitch-seamless", dir);

    const path = `videos/${job.video_id}/beat-${job.beat_idx}-long.mp4`;
    await db.storage.from(BUCKET).upload(path, readFileSync(file), { contentType: "video/mp4", upsert: true });

    const costUsd = Math.round(est * 100) / 100;
    await db.from("assets").delete().eq("video_id", job.video_id).eq("kind", "clip").eq("beat_index", job.beat_idx);
    await db.from("assets").insert({
      video_id: job.video_id,
      kind: "clip",
      provider: VIDEO_PROVIDER,
      storage_path: path,
      beat_index: job.beat_idx,
      meta: { isVideo: true, longClip: true, method: job.method, model: job.model, durationSec: job.target_sec },
      cost_usd: costUsd,
    });
    await db.from("cost_ledger").insert({
      project_id: job.project_id,
      video_id: job.video_id,
      provider: VIDEO_PROVIDER,
      description: `Long clip (${job.method}) — section ${job.beat_idx + 1}`,
      usd: costUsd,
    });
    await db.from("clip_jobs").update({ status: "done", result_path: path, cost_usd: costUsd, error: null }).eq("id", job.id);
    console.log(`✅ ${job.id}: ${job.method} ${job.target_sec}s → $${costUsd.toFixed(2)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  for (let i = 0; i < 4; i++) {
    const { data: job } = await db
      .from("clip_jobs")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!job) {
      if (i === 0) console.log("No queued clip jobs.");
      return;
    }
    await db.from("clip_jobs").update({ status: "running" }).eq("id", job.id);
    try {
      await processJob(job as Job);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${job.id}: ${msg}`);
      await db.from("clip_jobs").update({ status: "error", error: msg }).eq("id", job.id);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
