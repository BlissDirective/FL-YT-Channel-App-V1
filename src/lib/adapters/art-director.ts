import "server-only";
import { anthropicFetch } from "./anthropic";
import type { ScriptBeat, BeatMotion } from "@/lib/db/types";
import { BEAT_MOTIONS } from "@/lib/db/types";

/**
 * Art-director pass (operator concept #2/#3). After the script is written and
 * before any asset is generated, Claude reviews ALL beats together and returns a
 * coherent shot plan: a refined cinematic visual prompt, the shot type, and a
 * per-beat CAMERA MOTION treatment (Ken-Burns direction / pan / static). This
 * raises first-render quality and beat-match (fewer re-rolls) and — on the cheap
 * base/economy tiers — makes static stills feel alive via motion, the cheapest
 * possible quality lift.
 *
 * Live when ANTHROPIC_API_KEY is present; otherwise a deterministic heuristic
 * rotates motion treatments for variety (and leaves the prompts untouched).
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export function isArtDirectorLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ── Single-prompt pre-check (Tier 1: validate before paying for FLUX) ──

/** Words an image model renders as garbled gibberish (on-screen text) or that
    carry brand/legal risk. A prompt asking for these is likely to waste a render. */
const RISKY_PROMPT_WORDS = [
  "text", "logo", "sign", "signage", "caption", "subtitle", "word", "words",
  "letter", "letters", "watermark", "label", "chart", "graph", "screen",
  "interface", "menu", "headline", "newspaper", "ui",
];
const RISKY_RE = new RegExp(`\\b(${RISKY_PROMPT_WORDS.join("|")})\\b`, "i");

/** Cheap, LOCAL check (no LLM): is this visual prompt likely to render well?
    Flags empty/too-vague prompts and ones requesting on-screen text/brands. */
export function assessVisualPrompt(prompt: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const p = (prompt ?? "").trim();
  const words = p.split(/\s+/).filter(Boolean);
  if (p.length < 12 || words.length < 3) reasons.push("too short/vague");
  const m = p.match(RISKY_RE);
  if (m) reasons.push(`asks for on-screen text/brand ("${m[1].toLowerCase()}")`);
  return { ok: reasons.length === 0, reasons };
}

const REL_STOP = new Set(
  "the a an and or of to in for on with how why what your you is are be this that these those it as at from about into over under scene shot view image visual close wide angle background foreground camera cinematic photo".split(
    " ",
  ),
);
function contentWords(s: string): Set<string> {
  return new Set(
    (s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !REL_STOP.has(w)),
  );
}

/**
 * Relevance-to-narration check (Plan B3): a visual prompt that shares no
 * content words with what the narrator is saying is likely generic
 * "wallpaper" — a repeatedly-cited failure mode of dead faceless channels.
 * Pure and cheap; skipped (ok) when the narration is too short to judge.
 * Overlap is share of narration content words the visual prompt also names.
 */
export function assessPromptRelevance(
  prompt: string,
  narration: string,
  minOverlap = 0.12,
): { ok: boolean; overlap: number; reason?: string } {
  const nWords = contentWords(narration);
  if (nWords.size < 4) return { ok: true, overlap: 1 }; // nothing solid to match
  const pWords = contentWords(prompt);
  if (pWords.size === 0) return { ok: false, overlap: 0, reason: "empty visual prompt" };
  let inter = 0;
  for (const w of nWords) if (pWords.has(w)) inter++;
  const overlap = inter / nWords.size;
  return overlap >= minOverlap
    ? { ok: true, overlap }
    : { ok: false, overlap, reason: `visual doesn't reflect the narration (overlap ${(overlap * 100).toFixed(0)}%)` };
}

const REFINE_MODEL = "claude-haiku-4-5"; // cheap one-shot fix
const REFINE_TOOL = {
  name: "deliver_prompt",
  description: "Deliver one improved, purely-visual scene prompt.",
  input_schema: {
    type: "object",
    properties: {
      visualPrompt: {
        type: "string",
        description:
          "A vivid, concrete, purely-visual scene for an image model. HARD RULES: never name any company, brand, product, logo, or real person; never request on-screen text, words, letters, numbers, signage, labels, charts/graphs with text, or screens/UI with readable writing. Describe symbolic, atmospheric, concrete imagery instead.",
      },
    },
    required: ["visualPrompt"],
  },
} as const;

/** One cheap (Haiku) re-prompt for a single weak beat visual, right before we'd
    pay to render it. Returns null when unavailable (caller decides). */
export async function refineOneShot(opts: {
  prompt: string;
  niche: string;
  title: string;
  /** The beat's narration — the refined visual must actually depict it (B3). */
  narration?: string;
  /** Learned art-direction anti-patterns to steer away from (autofix_memory). */
  antiPatterns?: string[];
}): Promise<{ prompt: string; costUsd: number } | null> {
  if (!isArtDirectorLive()) return null;
  const avoid = (opts.antiPatterns ?? []).slice(0, 6);
  const system =
    `You are an art director for a ${opts.niche} YouTube video. Rewrite ONE draft visual prompt into a stronger, ` +
    `concrete, purely-visual scene that an image model will render cleanly` +
    (opts.narration ? `, and that VISUALLY REFLECTS what the narrator is saying (no generic wallpaper).` : `.`) +
    (avoid.length ? ` AVOID these patterns that hurt past videos: ${avoid.join("; ")}.` : "");
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: REFINE_MODEL,
        max_tokens: 400,
        tools: [REFINE_TOOL],
        tool_choice: { type: "tool", name: "deliver_prompt" },
        messages: [
          { role: "user", content: `${system}\n\nVIDEO: ${opts.title}\n${opts.narration ? `NARRATION FOR THIS SHOT: ${opts.narration}\n` : ""}DRAFT VISUAL PROMPT: ${opts.prompt}\n\nCall deliver_prompt.` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const refined = (data.content.find((c) => c.type === "tool_use")?.input as { visualPrompt?: string } | undefined)?.visualPrompt?.trim();
    if (!refined) return null;
    const price = PRICING[REFINE_MODEL] ?? { in: 1, out: 5 };
    const costUsd =
      Math.round(((data.usage.input_tokens / 1e6) * price.in + (data.usage.output_tokens / 1e6) * price.out) * 1000) / 1000;
    return { prompt: refined.slice(0, 600), costUsd };
  } catch {
    return null;
  }
}

export type ShotPlan = {
  visualPrompt: string;
  shotType: ScriptBeat["shotType"];
  motion: BeatMotion;
};

export type ArtDirection = {
  shots: Map<number, ShotPlan>;
  costUsd: number;
  provider: "anthropic" | "heuristic";
};

const SHOT_TYPES = ["hero", "broll", "stock"] as const;

const DELIVER_TOOL = {
  name: "deliver_shot_plan",
  description: "Deliver the per-beat shot plan for the whole video.",
  input_schema: {
    type: "object",
    properties: {
      shots: {
        type: "array",
        description: "Exactly one entry per beat, in order, keyed by beatIdx.",
        items: {
          type: "object",
          properties: {
            beatIdx: { type: "number", description: "The script beat this shot illustrates." },
            visualPrompt: {
              type: "string",
              description:
                "A refined, cinematic, purely-visual scene direction for this beat's image/clip. Improve clarity, specificity and quality vs the draft. HARD RULES: never name any company, brand, product, logo, or real person; never request on-screen text, words, letters, numbers, signage, labels, charts/graphs with text, or screens/UI with readable writing (image models render those as garbled gibberish and named brands are a legal risk). Describe symbolic, atmospheric, concrete imagery instead.",
            },
            shotType: { type: "string", enum: SHOT_TYPES as unknown as string[], description: "hero = premium generated, broll = standard generated, stock = real-world factual footage." },
            motion: {
              type: "string",
              enum: BEAT_MOTIONS as unknown as string[],
              description:
                "Camera motion for this beat. VARY it across beats for visual rhythm: slow zoom-in for tension/reveal, zoom-out for scale/context, pan-left/right to traverse a scene, pan-up for grandeur, static (very subtle) for a talking-head-like or busy shot.",
            },
          },
          required: ["beatIdx", "visualPrompt", "shotType", "motion"],
        },
      },
    },
    required: ["shots"],
  },
} as const;

/** Fold the channel's learned wins/anti-patterns into a prompt section so the
    FIRST render avoids mistakes the auto-fix loop already paid to discover. */
function memoryBlock(playbook?: string[], antiPatterns?: string[]): string {
  const wins = (playbook ?? []).slice(0, 6);
  const avoid = (antiPatterns ?? []).slice(0, 6);
  if (!wins.length && !avoid.length) return "";
  let s = "LEARNED ART-DIRECTION from past videos on this channel:\n";
  if (wins.length) s += `DO (these improved quality):\n- ${wins.join("\n- ")}\n`;
  if (avoid.length) s += `AVOID (these regressed quality — do not repeat):\n- ${avoid.join("\n- ")}\n`;
  return s + "\n";
}

export async function directShots(opts: {
  title: string;
  niche: string;
  topic: string;
  tone: string;
  format: string;
  beats: ScriptBeat[];
  /** Learned art-direction wins (autofix_memory.playbook). */
  playbook?: string[];
  /** Learned art-direction anti-patterns (autofix_memory.antiPatterns). */
  antiPatterns?: string[];
}): Promise<ArtDirection> {
  const usable = opts.beats.filter((b) => b.text?.trim());
  if (usable.length === 0 || !isArtDirectorLive()) {
    return { shots: heuristicPlan(opts.beats), costUsd: 0, provider: "heuristic" };
  }

  const beatLines = usable
    .map((b) => `[Beat ${b.idx}] (${b.shotType}) "${b.text.slice(0, 220)}"\n  current visual: ${b.visualPrompt}`)
    .join("\n\n");
  const prompt =
    `You are the ART DIRECTOR for a ${opts.niche} YouTube video titled "${opts.title}" (${opts.format}; tone: ${opts.tone}). ` +
    `Plan the visuals for the WHOLE video at once so the shots feel coherent and varied, each one tightly matching its beat's narration. ` +
    `For each beat: refine the visual prompt for maximum quality and beat-match, keep/adjust the shot type, and assign a camera MOTION (vary it for rhythm). ` +
    `Aim for the highest quality possible so the first render is great and needs no re-roll.\n\n` +
    memoryBlock(opts.playbook, opts.antiPatterns) +
    `BEATS:\n${beatLines}\n\nCall deliver_shot_plan with exactly ${usable.length} shots, one per beat.`;

  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.5,
        tools: [DELIVER_TOOL],
        tool_choice: { type: "tool", name: "deliver_shot_plan" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { shots: heuristicPlan(opts.beats), costUsd: 0, provider: "heuristic" };
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const raw = (data.content.find((c) => c.type === "tool_use")?.input as { shots?: RawShot[] } | undefined)?.shots ?? [];
    const byIdx = new Map<number, RawShot>();
    for (const s of raw) if (typeof s?.beatIdx === "number") byIdx.set(s.beatIdx, s);

    const shots = new Map<number, ShotPlan>();
    opts.beats.forEach((b, i) => {
      const r = byIdx.get(b.idx);
      shots.set(b.idx, {
        visualPrompt: r?.visualPrompt?.trim() ? r.visualPrompt.trim().slice(0, 600) : b.visualPrompt,
        shotType: (SHOT_TYPES as readonly string[]).includes(r?.shotType ?? "") ? (r!.shotType as ScriptBeat["shotType"]) : b.shotType,
        motion: (BEAT_MOTIONS as readonly string[]).includes(r?.motion ?? "") ? (r!.motion as BeatMotion) : rotateMotion(i),
      });
    });
    const costUsd =
      (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;
    return { shots, costUsd: Math.round(costUsd * 1000) / 1000, provider: "anthropic" };
  } catch {
    return { shots: heuristicPlan(opts.beats), costUsd: 0, provider: "heuristic" };
  }
}

type RawShot = { beatIdx?: number; visualPrompt?: string; shotType?: string; motion?: string };

/** No-key fallback: keep prompts, rotate motion treatments for visual variety. */
function heuristicPlan(beats: ScriptBeat[]): Map<number, ShotPlan> {
  const m = new Map<number, ShotPlan>();
  beats.forEach((b, i) => m.set(b.idx, { visualPrompt: b.visualPrompt, shotType: b.shotType, motion: rotateMotion(i) }));
  return m;
}

// A pleasant rotation: most beats get a gentle push/pull, with occasional pans.
const ROTATION: BeatMotion[] = ["zoom-in", "pan-right", "zoom-out", "pan-left", "zoom-in", "pan-up"];
function rotateMotion(i: number): BeatMotion {
  return ROTATION[i % ROTATION.length];
}
