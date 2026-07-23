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
import {
  buildFallbackChain,
  buildVisualPrompt,
  fallbackForAttempt,
  validateMediaSpec,
  type FallbackSelection,
  type MediaSpec,
} from "@studio/core";

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
  "ltx-2": 0.04,
  "wan-2-2": 0.08,
  "veo-3-1": 0.4,
  "veo-3-1-extend": 0.4,
};
const SEG_MAX: Record<string, number> = {
  "seedance-2-fast": 15,
  "seedance-2": 15,
  "kling-2-5-turbo": 10,
  "ltx-2": 20,
  "wan-2-2": 5,
  "veo-3-1": 8,
};
const ENDPOINT_I2V: Record<string, string> = {
  "seedance-2-fast": "bytedance/seedance-2.0/fast/image-to-video",
  "seedance-2": "bytedance/seedance-2.0/image-to-video",
  "kling-2-5-turbo": "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  "ltx-2": "fal-ai/ltx-2/image-to-video/fast",
  "wan-2-2": "fal-ai/wan/v2.2-a14b/image-to-video",
  "veo-3-1": "fal-ai/veo3.1/image-to-video",
  "veo-3-1-extend": "fal-ai/veo3.1/image-to-video",
};
const VEO_EXTEND_ENDPOINT = "fal-ai/veo3.1/extend-video";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const run = (cmd: string, args: string[], cwd?: string) =>
  execFileSync(cmd, args, { cwd, stdio: "pipe", timeout: 180_000 });

const POLL_MS = 280_000;
const MAX_ATTEMPTS = 3;
type FalHandle = { requestId: string; statusUrl: string; responseUrl: string };

async function falSubmit(endpoint: string, input: Record<string, unknown>): Promise<FalHandle> {
  const headers = { Authorization: `Key ${FAL_KEY}`, "content-type": "application/json" };
  const sub = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!sub.ok) throw new Error(`fal ${endpoint} submit ${sub.status}: ${(await sub.text()).slice(0, 160)}`);
  const q = (await sub.json()) as { request_id?: string; status_url?: string; response_url?: string };
  if (!q.status_url || !q.response_url) throw new Error("fal queue: no status/response url");
  return { requestId: q.request_id ?? "", statusUrl: q.status_url, responseUrl: q.response_url };
}

async function falPoll(h: FalHandle): Promise<string> {
  const headers = { Authorization: `Key ${FAL_KEY}` };
  const deadline = Date.now() + POLL_MS;
  for (;;) {
    if (Date.now() > deadline) throw new Error("fal job timed out");
    await sleep(5000);
    const st = await fetch(h.statusUrl, { headers });
    if (!st.ok) continue;
    const s = (await st.json()) as { status?: string };
    if (s.status === "COMPLETED") break;
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error("fal job failed");
  }
  const resp = await fetch(h.responseUrl, { headers });
  if (!resp.ok) throw new Error(`fal result ${resp.status}`);
  const out = (await resp.json()) as { video?: { url?: string } };
  if (!out.video?.url) throw new Error("fal returned no video url");
  return out.video.url;
}

/** Submit + wait. Used for multi-segment / veo chains (not resume-tracked). */
async function falOnce(endpoint: string, input: Record<string, unknown>): Promise<string> {
  return falPoll(await falSubmit(endpoint, input));
}

/**
 * Single-clip generate that survives our poll giving up. fal bills on
 * *completion*, so if we submitted and then timed out waiting, the job is
 * still running (and will be charged) — re-submitting would pay twice. We
 * persist the fal handle on submit; on a retry we resume that same generation
 * instead of starting a new one. (Handles are only saved after a *successful*
 * submit, which means the keyframe was valid — so a resume never reuses a
 * generation made from a since-replaced placeholder.)
 */
async function genResumable(job: Job, endpoint: string, input: Record<string, unknown>): Promise<string> {
  if (job.fal_request_id && job.fal_response_url) {
    try {
      const headers = { Authorization: `Key ${FAL_KEY}` };
      const statusUrl = `${job.fal_response_url}/status`;
      const st = await fetch(statusUrl, { headers });
      if (st.ok) {
        const s = (await st.json()) as { status?: string };
        if (s.status !== "FAILED" && s.status !== "ERROR") {
          console.log(`↩️  ${job.id}: resuming in-flight fal job ${job.fal_request_id}`);
          return await falPoll({ requestId: job.fal_request_id, statusUrl, responseUrl: job.fal_response_url });
        }
      }
    } catch {
      // fall through to a fresh submit
    }
  }
  const h = await falSubmit(endpoint, input);
  await db.from("clip_jobs").update({ fal_request_id: h.requestId, fal_response_url: h.responseUrl }).eq("id", job.id);
  return falPoll(h);
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
  hero_hold: boolean;
  attempts: number;
  fal_request_id: string | null;
  fal_response_url: string | null;
  /** Scored provider-selection log (#1) — carried onto the landed asset for
      regenerable-asset provenance. */
  selection?: unknown;
};

/** Probe a local media file with ffprobe → a normalised MediaSpec (#7). Returns
    null when ffprobe is unavailable or errors, so validation is simply skipped
    (never a false reject). Synchronous — the worker processes one job at a time. */
function ffprobeSpec(file: string): MediaSpec | null {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-hide_banner", "-loglevel", "error", "-show_format", "-show_streams", "-print_format", "json", file],
      { encoding: "utf8", timeout: 30_000 },
    );
    const doc = JSON.parse(out) as { format?: { duration?: string }; streams?: Record<string, unknown>[] };
    const streams = Array.isArray(doc.streams) ? doc.streams : [];
    const video = streams.find((s) => s.codec_type === "video");
    const audio = streams.find((s) => s.codec_type === "audio");
    const dur = Number(doc.format?.duration);
    return {
      hasVideo: Boolean(video),
      hasAudio: Boolean(audio),
      width: video ? Number(video.width) || null : null,
      height: video ? Number(video.height) || null : null,
      durationSec: Number.isFinite(dur) ? dur : null,
      videoCodec: video ? ((video.codec_name as string) ?? null) : null,
      audioChannels: audio ? Number(audio.channels) || null : null,
    };
  } catch {
    return null;
  }
}

/** Veo-3.1: base 8s i2v, then chained extends (+7s) until >= target (<=30s). */
async function makeVeoExtend(prompt: string, imageUrl: string | null, target: number, dir: string): Promise<string> {
  let url = await falOnce(ENDPOINT_I2V["veo-3-1"], {
    prompt,
    duration: "8s",
    ...(imageUrl ? { image_url: imageUrl } : {}),
  });
  let total = 8;
  while (total < Math.min(target, 30)) {
    url = await falOnce(VEO_EXTEND_ENDPOINT, { video_url: url, prompt });
    total += 7;
  }
  const out = join(dir, "out.mp4");
  await download(url, out);
  return out;
}

/** Auto-stitch: N base clips, concatenated. Seamless chains each clip's last
    frame into the next clip's start image so there's no visible cut. A single
    segment (the common, timeout-prone case) is resume-tracked; multi-segment
    chains restart on retry. */
async function makeStitch(
  job: Job,
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
  if (count === 1) {
    const url = await genResumable(job, endpoint, {
      prompt,
      duration: model.startsWith("veo") ? `${target}s` : target,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    });
    const out = join(dir, "out.mp4");
    await download(url, out);
    return out;
  }
  const segPaths: string[] = [];
  let nextImage = imageUrl;
  for (let i = 0; i < count; i++) {
    const segSec = Math.min(segMax, target - i * segMax);
    const url = await falOnce(endpoint, {
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
  // VCE V1 — condition the clip prompt on the Visual Bible too (parity with stills).
  const bible = (video as { visual_bible?: Parameters<typeof buildVisualPrompt>[2] }).visual_bible ?? null;
  const prompt = buildVisualPrompt(beat.visualPrompt, style, bible);

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
        : await makeStitch(job, prompt, job.model, imageUrl, job.target_sec, job.method === "stitch-seamless", dir);

    // Source-media inspection (#7): probe the generated clip and REJECT a
    // malformed/truncated render (no video stream, zero-length, cut to under
    // half its target) BEFORE it reaches compile — throwing re-queues the beat
    // to re-roll, rather than compiling a broken cut. Skips when ffprobe is
    // absent (spec == null) so it never false-rejects.
    const spec = ffprobeSpec(file);
    if (spec) {
      const verdict = validateMediaSpec(spec, { kind: "clip", targetSec: job.target_sec });
      if (!verdict.ok) {
        throw new Error(
          `malformed clip (${verdict.issues.map((i) => i.code).join(", ")}): ${verdict.issues[0]?.note ?? ""}`,
        );
      }
    }

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
      meta: { isVideo: true, longClip: true, heroHold: job.hero_hold, method: job.method, model: job.model, durationSec: job.target_sec, ...(spec ? { sourceSpec: spec } : {}), ...(job.selection ? { selection: job.selection } : {}) },
      cost_usd: costUsd,
    });
    await db.from("cost_ledger").insert({
      project_id: job.project_id,
      video_id: job.video_id,
      provider: VIDEO_PROVIDER,
      description: `Long clip (${job.method}, ${job.model}) — section ${job.beat_idx + 1}`,
      usd: costUsd,
    });
    // Keep the video's running total in sync so the dashboard reflects true
    // spend (the app's recordCost can't see worker-side generations).
    await db
      .from("videos")
      .update({ total_cost_usd: Number(video.total_cost_usd ?? 0) + costUsd })
      .eq("id", job.video_id);
    await db.from("clip_jobs").update({ status: "done", result_path: path, cost_usd: costUsd, error: null }).eq("id", job.id);
    console.log(`✅ ${job.id}: ${job.method} ${job.target_sec}s → $${costUsd.toFixed(2)}`);
    await updateClipProgress(job.video_id);
    await maybeFinish(job.video_id);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Persist the video's clip-stage progress (C10 / #4): "N of M clips" with the
    checkpoint status, so a crashed render resumes at N and the Backlot board
    reads real, durable progress. Best-effort. */
async function updateClipProgress(videoId: string): Promise<void> {
  try {
    const { count: total } = await db
      .from("clip_jobs")
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId);
    const { count: done } = await db
      .from("clip_jobs")
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId)
      .eq("status", "done");
    const t = total ?? 0;
    const d = done ?? 0;
    await db
      .from("videos")
      .update({
        partial_progress: {
          stage: "asset_manifest",
          status: d >= t ? "completed" : "in_progress",
          done: d,
          total: t,
          label: "clips",
          updatedAt: new Date().toISOString(),
        },
      })
      .eq("id", videoId);
  } catch {
    /* progress is best-effort */
  }
}

/** Full Auto: once a video's last clip lands, advance it to render. The render
    farm then produces the cut and stops at Final review (no auto-approve). */
async function maybeFinish(videoId: string) {
  const { data: video } = await db
    .from("videos")
    .select("auto_finish, status, project_id, director_cut")
    .eq("id", videoId)
    .maybeSingle();
  if (!video?.auto_finish || video.status !== "ASSETS_READY") return;
  const { count } = await db
    .from("clip_jobs")
    .select("id", { count: "exact", head: true })
    .eq("video_id", videoId)
    .in("status", ["queued", "running"]);
  if ((count ?? 0) > 0) return; // more clips still pending

  // MVDA handoff (plan §6 conflict #2): on an agent-enabled channel the
  // finished assets go to a CUT SESSION, not straight to the render. The
  // video parks at ASSETS_READY with edit_session_requested; the agent
  // worker claims the flag, authors the cut, and the CUT gate (assist, or
  // copilot ≥ cut_copilot_floor) decides the advance.
  const { data: project } = await db
    .from("projects")
    .select("mvda_enabled")
    .eq("id", video.project_id)
    .maybeSingle();
  // Director tier (Phase E) is a per-video opt-in to the same handoff.
  if (project?.mvda_enabled || video.director_cut) {
    await db
      .from("videos")
      .update({ edit_session_requested: true, auto_finish: false })
      .eq("id", videoId);
    console.log(`✂️  ${videoId}: all clips done → agent cut session requested (MVDA)`);
    return;
  }

  await db.from("approvals").insert({
    video_id: videoId,
    gate: "ASSETS",
    decision: "approved",
    decided_by: "system",
    decided_at: new Date().toISOString(),
  });
  await db.from("videos").update({ status: "ASSEMBLING", auto_finish: false }).eq("id", videoId);
  console.log(`▶️  ${videoId}: all clips done → ASSEMBLING (render → Final review)`);
}

/** Send crashed 'running' rows back to 'queued' (bounded by attempts) — a
    worker killed mid-job used to strand the row at 'running' forever, which
    also blocked maybeFinish from ever advancing the video. */
async function reapStaleRunning() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: stale } = await db
    .from("clip_jobs")
    .select("id, attempts")
    .eq("status", "running")
    .lt("claimed_at", cutoff);
  for (const j of stale ?? []) {
    const dead = Number(j.attempts ?? 0) >= MAX_ATTEMPTS;
    await db
      .from("clip_jobs")
      .update(
        dead
          ? { status: "error", error: `stale after ${MAX_ATTEMPTS} attempts (worker died mid-job)` }
          : { status: "queued" },
      )
      .eq("id", j.id)
      .eq("status", "running");
    console.log(`🩹 ${j.id}: stale running → ${dead ? "error" : "requeued"}`);
  }
}

async function main() {
  await reapStaleRunning();
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
    const attempts = Number(job.attempts ?? 0) + 1;
    // Atomic claim: only the worker that flips queued→running owns the job.
    const { data: claimed } = await db
      .from("clip_jobs")
      .update({ status: "running", attempts, claimed_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    // Provider fallback chain (#11 / B1): on a RETRY (attempts ≥ 2), walk the
    // scored selection chain to the next-best model instead of hammering the
    // one that just failed. The substitution is logged as a fallback decision.
    let runJob = { ...(job as Job), attempts };
    if (attempts >= 2) {
      const chain = buildFallbackChain(job.selection as FallbackSelection | null);
      const step = fallbackForAttempt(chain, attempts);
      if (step && step.model && step.model !== job.model) {
        await db.from("clip_jobs").update({ model: step.model }).eq("id", job.id);
        await logFallbackDecision(job, job.model, step.model, attempts);
        console.log(`↪️  ${job.id}: fallback ${job.model} → ${step.model} (attempt ${attempts})`);
        runJob = { ...runJob, model: step.model };
      }
    }

    try {
      await processJob(runJob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempts < MAX_ATTEMPTS) {
        // Re-queue so the next pass walks to the next model in the chain.
        console.error(`❌ ${job.id}: ${msg} — re-queuing for fallback (attempt ${attempts}/${MAX_ATTEMPTS})`);
        await db.from("clip_jobs").update({ status: "queued", error: msg }).eq("id", job.id);
      } else {
        console.error(`❌ ${job.id}: ${msg} (gave up after ${MAX_ATTEMPTS} attempts)`);
        await db
          .from("clip_jobs")
          .update({ status: "error", error: `${msg} (gave up after ${MAX_ATTEMPTS} attempts)` })
          .eq("id", job.id);
        // A permanently-failed clip is terminal, not pending — the beat falls
        // back to its seed still at render. maybeFinish only ran on the success
        // path, so if THIS was the last outstanding job the video stranded at
        // ASSETS_READY forever. Re-check completion here too so the run advances
        // (to the MVDA cut session, or straight to render) on a dead clip.
        await maybeFinish(job.video_id);
      }
    }
  }
}

/** Log a model substitution to the decision audit trail (#9) from the worker. */
async function logFallbackDecision(
  job: Job,
  fromModel: string,
  toModel: string,
  attempt: number,
): Promise<void> {
  try {
    await db.from("decisions").insert({
      project_id: job.project_id,
      video_id: job.video_id,
      beat_idx: job.beat_idx,
      kind: "fallback",
      choice: toModel,
      alternatives: [{ id: fromModel, label: fromModel }],
      confidence: null,
      reasoning: `Primary model ${fromModel} failed — fell back to ${toModel} (attempt ${attempt}).`,
      params: { fromModel, toModel, attempt },
    });
  } catch {
    /* decision log is best-effort */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
