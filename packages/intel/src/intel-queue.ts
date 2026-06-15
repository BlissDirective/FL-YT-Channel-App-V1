/**
 * Video Intelligence deep-perception worker (GitHub Actions, cron + dispatch).
 *
 * Claims `video_intel` rows at status='queued' (the operator-vouched PRECISE
 * frame lane), downloads the source with yt-dlp, samples keyframes with ffmpeg,
 * runs them through Claude vision for timestamped notes, then writes a Claude
 * blueprint and flips the row to 'done'. Analysis only — frames are notes, never
 * reused in any render.
 *
 * Bounded by design: ≤720p, low-fps sampling, a hard frame cap, and timeouts.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const MODEL = process.env.INTEL_VISION_MODEL?.trim() || "claude-sonnet-4-6";
const FRAME_INTERVAL_SEC = 6; // one sampled frame every N seconds
const MAX_FRAMES = 20; // hard cap → bounded vision cost (first ~2 min)
const PRICE = { in: 3, out: 15 }; // $/1M tokens (sonnet) — ledger estimate

type Json = Record<string, unknown>;

async function claudeTool(
  system: string,
  content: unknown,
  tool: Json,
): Promise<{ input: Json; costUsd: number }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    content: { type: string; input?: Json }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const use = data.content.find((c) => c.type === "tool_use");
  if (!use?.input) throw new Error("Claude returned no tool payload");
  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;
  return { input: use.input, costUsd: Math.round(costUsd * 100) / 100 };
}

const FRAME_NOTES_TOOL = {
  name: "deliver_frame_notes",
  description: "Timestamped notes for the sampled frames.",
  input_schema: {
    type: "object",
    properties: {
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            t: { type: "number", description: "Timestamp in seconds (given per image)." },
            sceneDesc: { type: "string" },
            onScreenText: { type: "string" },
            shotType: { type: "string" },
            pacingNote: { type: "string" },
          },
          required: ["t", "sceneDesc"],
        },
      },
    },
    required: ["notes"],
  },
} as const;

const BLUEPRINT_TOOL = {
  name: "deliver_blueprint",
  description: "Deliver the market-intelligence blueprint.",
  input_schema: {
    type: "object",
    properties: {
      works: { type: "array", items: { type: "string" } },
      doesnt: { type: "array", items: { type: "string" } },
      hooks: {
        type: "array",
        items: {
          type: "object",
          properties: { pattern: { type: "string" }, example: { type: "string" }, why: { type: "string" } },
          required: ["pattern", "example", "why"],
        },
      },
      structure: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, targetSec: { type: "number" }, note: { type: "string" } },
          required: ["label", "targetSec", "note"],
        },
      },
      pacing: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
      titlePatterns: { type: "array", items: { type: "string" } },
      thumbnailPatterns: { type: "array", items: { type: "string" } },
      angle: { type: "string" },
    },
    required: ["works", "doesnt", "hooks", "structure", "pacing", "gaps", "titlePatterns", "thumbnailPatterns", "angle"],
  },
} as const;

function run(cmd: string, args: string[], cwd?: string) {
  execFileSync(cmd, args, { cwd, stdio: "pipe", timeout: 180_000 });
}

/** Download + sample frames. Returns [{ t, b64 }]. */
function sampleFrames(url: string, dir: string): { t: number; b64: string }[] {
  const input = join(dir, "input.mp4");
  run("yt-dlp", [
    "-q",
    "--no-playlist",
    "--max-filesize", "300M",
    "-f", "best[height<=720][ext=mp4]/best[height<=720]/best",
    "-o", input,
    url,
  ]);
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-i", input,
    "-vf", `fps=1/${FRAME_INTERVAL_SEC},scale=512:-1`,
    "-frames:v", String(MAX_FRAMES),
    join(dir, "f%04d.jpg"),
  ]);
  return readdirSync(dir)
    .filter((f) => f.startsWith("f") && f.endsWith(".jpg"))
    .sort()
    .map((f, i) => ({ t: i * FRAME_INTERVAL_SEC, b64: readFileSync(join(dir, f)).toString("base64") }));
}

async function processRow(row: {
  id: string;
  project_id: string | null;
  topic: string;
  source_url: string | null;
  competitors: unknown;
}) {
  if (!row.source_url) throw new Error("No source_url on queued row");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set in worker");

  const { data: project } = row.project_id
    ? await db.from("projects").select("niche,audience,angle").eq("id", row.project_id).maybeSingle()
    : { data: null };

  const dir = mkdtempSync(join(tmpdir(), "intel-"));
  let totalCost = 0;
  try {
    const frames = sampleFrames(row.source_url, dir);
    if (frames.length === 0) throw new Error("ffmpeg produced no frames");

    // Claude vision → timestamped notes.
    const content: unknown[] = [
      { type: "text", text: `Analyze these ${frames.length} frames sampled every ${FRAME_INTERVAL_SEC}s from a reference YouTube video (for research / original idea generation only). Each image is labelled with its timestamp. Return timestamped notes via deliver_frame_notes.` },
    ];
    for (const f of frames) {
      content.push({ type: "text", text: `t=${f.t}s` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.b64 } });
    }
    const vision = await claudeTool(
      "You are a video analyst. Describe exactly what is on screen, on-screen text, shot type, and pacing. Concrete, terse.",
      content,
      FRAME_NOTES_TOOL,
    );
    totalCost += vision.costUsd;
    const notes = (vision.input.notes as unknown[]) ?? [];

    // Claude → blueprint from perception + competitors.
    const comps = Array.isArray(row.competitors) ? (row.competitors as { title: string; views: number }[]) : [];
    const compLines = comps.map((c) => `- "${c.title}" — ${c.views?.toLocaleString?.() ?? c.views} views`).join("\n");
    const perceptionText = (notes as { t: number; sceneDesc: string; onScreenText?: string; pacingNote?: string }[])
      .map((n) => `[${n.t}s] ${n.sceneDesc}${n.onScreenText ? ` | text: ${n.onScreenText}` : ""}${n.pacingNote ? ` | ${n.pacingNote}` : ""}`)
      .join("\n");
    const bp = await claudeTool(
      "You write original YouTube strategy. Extract patterns; never copy wording or footage.",
      `Topic: "${row.topic}" on a ${project?.niche ?? ""} channel (audience: ${project?.audience ?? ""}; angle: ${project?.angle ?? ""}).

Top similar videos:
${compLines || "(none)"}

Frame-by-frame perception of a reference video:
${perceptionText}

Design a blueprint for OUR ORIGINAL video. Call deliver_blueprint.`,
      BLUEPRINT_TOOL,
    );
    totalCost += bp.costUsd;

    await db
      .from("video_intel")
      .update({
        status: "done",
        blueprint: bp.input,
        perception: { notes, transcript: "" },
        cost_usd: Math.round(totalCost * 100) / 100,
        error: null,
      })
      .eq("id", row.id);
    if (totalCost > 0) {
      await db.from("cost_ledger").insert({
        project_id: row.project_id,
        provider: "anthropic",
        description: "Video intel · deep frame perception (worker)",
        usd: Math.round(totalCost * 100) / 100,
      });
    }
    console.log(`✅ ${row.id}: ${frames.length} frames, $${totalCost.toFixed(2)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  // Claim queued jobs one at a time (single-worker concurrency in the workflow).
  for (let i = 0; i < 5; i++) {
    const { data: row } = await db
      .from("video_intel")
      .select("id,project_id,topic,source_url,competitors")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!row) {
      if (i === 0) console.log("No queued intel jobs.");
      return;
    }
    await db.from("video_intel").update({ status: "running" }).eq("id", row.id);
    try {
      await processRow(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${row.id}: ${msg}`);
      await db.from("video_intel").update({ status: "error", error: msg }).eq("id", row.id);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
