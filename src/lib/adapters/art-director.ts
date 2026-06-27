import "server-only";
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

export async function directShots(opts: {
  title: string;
  niche: string;
  topic: string;
  tone: string;
  format: string;
  beats: ScriptBeat[];
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
    `BEATS:\n${beatLines}\n\nCall deliver_shot_plan with exactly ${usable.length} shots, one per beat.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
