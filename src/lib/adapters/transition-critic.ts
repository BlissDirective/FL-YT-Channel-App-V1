import "server-only";
import { isGeminiLive } from "@/lib/adapters/gemini-video";
import { isTwelveLabsLive } from "@/lib/adapters/twelvelabs";
import type { Boundary, TemporalTransition, WatchIssue } from "@/lib/pipeline/watch-gate";

/**
 * Tier-2 temporal transition pass (Self-Watch #1, Fable5-Self-Watch-Loop-Plan.md
 * Phase 3, TwelveLabs added Phase 3+). Escalated from the cheap structural Tier-1
 * check only when enough shot boundaries warrant it. Two engines over OUR
 * rendered MP4:
 *
 *  - **Gemini native** (default): the short render is inlined as base64
 *    (`inlineData`) — Gemini's `fileData.fileUri` only accepts YouTube/Files-API
 *    URIs, not arbitrary signed URLs, so a signed URL would silently no-op. Bytes
 *    are size-capped; a large render degrades to the structural verdict.
 *    Synchronous — a single generateContent call.
 *  - **TwelveLabs Pegasus**: index the remote URL → poll → analyze. True temporal
 *    understanding, but indexing is async (minutes), so it's bounded by a short
 *    poll timeout and degrades to "not evaluated" if not ready. Latency-heavy —
 *    best as a supplement / for latency-tolerant setups; every request is
 *    AbortSignal-bounded so it cannot hang the cron.
 *
 * Engine chosen by `TRANSITION_ENGINE` (gemini | twelvelabs | auto). `auto`
 * prefers the synchronous Gemini engine. Analysis only, over our own asset;
 * degradable everywhere — no key / failure / timeout → not evaluated, and the
 * structural Tier-1 verdict stands.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_USD_PER_1M = 0.5;
const INLINE_MAX_BYTES = 18 * 1024 * 1024; // Gemini inlineData ceiling (~20MB request)

const TL_BASE = "https://api.twelvelabs.io/v1.3";
const TL_MODEL = process.env.TWELVELABS_MODEL?.trim() || "pegasus1.2";
const TL_INDEX_NAME = "faceless-self-watch";
const TL_POLL_MS = 6000;
const TL_POLL_TIMEOUT_MS = 45_000; // hard cap — must stay well below the cron's 300s
const TL_USD_PER_VIDEO = 0.05;

// Per-request wall-clock guards so a single hung request can't overrun the cron.
const REQ_TIMEOUT_MS = 25_000;
const MEDIA_FETCH_TIMEOUT_MS = 20_000;

export type TransitionEngine = "gemini" | "twelvelabs" | "auto";

export function isTemporalLive(): boolean {
  return isGeminiLive() || isTwelveLabsLive();
}

export type TransitionAssessment = TemporalTransition & { costUsd: number; provider: "gemini" | "twelvelabs" | null };

const NOT_EVALUATED: TransitionAssessment = { score: 0, evaluated: false, issues: [], costUsd: 0, provider: null };

function tlKey(): string | undefined {
  return process.env.TWELVELABS_API_KEY || process.env.TWELVE_LABS_API_KEY || process.env.TL_API_KEY || undefined;
}

function engineChoice(): TransitionEngine {
  const raw = (process.env.TRANSITION_ENGINE?.trim().toLowerCase() as TransitionEngine) || "auto";
  return raw === "gemini" || raw === "twelvelabs" ? raw : "auto";
}

function prompt(boundaries: Boundary[]): string {
  const ts = boundaries.slice(0, 20).map((b) => `${b.atSec.toFixed(1)}s`).join(", ");
  return `You are a video editor QC'ing the TRANSITIONS in a short faceless-YouTube video. Watch it and judge how smooth the cuts and motion are, paying special attention to these shot boundaries: ${ts || "(all cuts)"}.

Return STRICT JSON only:
{
  "score": <0-10 overall transition/motion smoothness>,
  "issues": [ { "t": <seconds:number>, "detail": <what's jarring: hard flash, color/subject jump, stutter, whip, mismatched motion> } ]
}
Only list genuine problems (max 5). A clean video has an empty issues array and a high score.`;
}

/** Parse the shared {score, issues} JSON both engines are asked to return. */
function parseVerdict(text: string, costUsd: number, provider: "gemini" | "twelvelabs"): TransitionAssessment {
  const match = text.match(/\{[\s\S]*\}/); // engines sometimes wrap JSON in prose/fences
  if (!match) return NOT_EVALUATED;
  let parsed: { score?: number; issues?: { t?: number; detail?: string }[] };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return NOT_EVALUATED;
  }
  const score = Math.max(0, Math.min(10, Number(parsed.score ?? 0)));
  const issues: WatchIssue[] = (parsed.issues ?? []).slice(0, 5).map((i) => ({
    criterion: "motion_continuity" as const,
    beatIdx: null,
    detail: `${typeof i.t === "number" ? `${i.t.toFixed(1)}s — ` : ""}${String(i.detail ?? "jarring transition").slice(0, 200)}`,
  }));
  return { score, evaluated: true, issues, costUsd, provider };
}

// ── Gemini native (inline the short render as base64) ─────────────────
async function assessGemini(opts: { videoUrl: string; boundaries: Boundary[] }): Promise<TransitionAssessment> {
  if (!isGeminiLive()) return NOT_EVALUATED;
  let b64: string;
  try {
    const media = await fetch(opts.videoUrl, { signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS) });
    if (!media.ok) return NOT_EVALUATED;
    const buf = Buffer.from(await media.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > INLINE_MAX_BYTES) return NOT_EVALUATED; // too large to inline → structural stands
    b64 = buf.toString("base64");
  } catch {
    return NOT_EVALUATED;
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(REQ_TIMEOUT_MS * 2),
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType: "video/mp4", data: b64 } }, { text: prompt(opts.boundaries) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 2048 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini transitions ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { totalTokenCount?: number };
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return NOT_EVALUATED;
  const tokens = data.usageMetadata?.totalTokenCount ?? 0;
  return parseVerdict(text, Math.round((tokens / 1e6) * GEMINI_USD_PER_1M * 100) / 100, "gemini");
}

// ── TwelveLabs Pegasus ────────────────────────────────────────────────
async function tlFetch(path: string, key: string, init?: RequestInit): Promise<Response> {
  return fetch(`${TL_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
    headers: { "x-api-key": key, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

/** Reuse the shared index by name, or create it. Returns the index id or null. */
async function tlIndexId(key: string): Promise<string | null> {
  const list = await tlFetch(`/indexes?index_name=${encodeURIComponent(TL_INDEX_NAME)}`, key);
  if (list.ok) {
    const data = (await list.json()) as { data?: { _id?: string }[] };
    const found = data.data?.[0]?._id;
    if (found) return found;
  }
  const created = await tlFetch(`/indexes`, key, {
    method: "POST",
    body: JSON.stringify({ index_name: TL_INDEX_NAME, models: [{ model_name: TL_MODEL, model_options: ["visual", "audio"] }] }),
  });
  if (!created.ok) return null;
  return ((await created.json()) as { _id?: string })._id ?? null;
}

async function assessTwelveLabs(opts: { videoUrl: string; boundaries: Boundary[] }): Promise<TransitionAssessment> {
  const key = tlKey();
  if (!key) return NOT_EVALUATED;
  const indexId = await tlIndexId(key);
  if (!indexId) return NOT_EVALUATED;

  const task = await tlFetch(`/tasks`, key, { method: "POST", body: JSON.stringify({ index_id: indexId, video_url: opts.videoUrl }) });
  if (!task.ok) return NOT_EVALUATED;
  const taskId = ((await task.json()) as { _id?: string })._id;
  if (!taskId) return NOT_EVALUATED;

  // Bounded poll — indexing is async (minutes). Each request is AbortSignal-
  // bounded and the whole loop is capped, so it degrades rather than hanging.
  const deadline = Date.now() + TL_POLL_TIMEOUT_MS;
  let videoId: string | null = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, TL_POLL_MS));
    try {
      const st = await tlFetch(`/tasks/${taskId}`, key);
      if (!st.ok) continue;
      const s = (await st.json()) as { status?: string; video_id?: string };
      if (s.status === "ready" && s.video_id) {
        videoId = s.video_id;
        break;
      }
      if (s.status === "failed") return NOT_EVALUATED;
    } catch {
      /* transient poll error — keep trying until the deadline */
    }
  }
  if (!videoId) return NOT_EVALUATED; // timed out — Gemini/structural stands

  const analyze = await tlFetch(`/analyze`, key, {
    method: "POST",
    body: JSON.stringify({ video_id: videoId, prompt: prompt(opts.boundaries), temperature: 0.3 }),
  });
  if (!analyze.ok) return NOT_EVALUATED;
  const out = (await analyze.json()) as { data?: string };
  if (!out.data) return NOT_EVALUATED;
  return parseVerdict(out.data, TL_USD_PER_VIDEO, "twelvelabs");
}

export async function assessTransitions(opts: { videoUrl: string; boundaries: Boundary[] }): Promise<TransitionAssessment> {
  if (!opts.videoUrl) return NOT_EVALUATED;
  const engine = engineChoice();
  try {
    if (engine === "twelvelabs") return await assessTwelveLabs(opts);
    if (engine === "gemini") return await assessGemini(opts);
    // auto: prefer the synchronous engine, fall back to the other.
    if (isGeminiLive()) return await assessGemini(opts);
    if (isTwelveLabsLive()) return await assessTwelveLabs(opts);
    return NOT_EVALUATED;
  } catch (err) {
    console.error("temporal transition pass failed (non-fatal):", err);
    return NOT_EVALUATED;
  }
}
