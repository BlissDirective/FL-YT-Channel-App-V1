import "server-only";
import { anthropicFetch } from "./anthropic";
import type { ScriptBeat } from "@/lib/db/types";
import {
  STICK_ACTIONS,
  STICK_FX,
  STICK_MOODS,
  STICK_PROPS,
  STICK_SETTINGS,
  type PropKey,
  type Setting,
  type StickAction,
  type StickFx,
  type StickScene,
} from "@/lib/stick-types";

/**
 * Stick Studio choreographer (Anthropic Claude). Turns a finished script into a
 * `StickScene` per beat — the programmatic stick-figure visual for that beat
 * (setting, shot, action(s), optional bubbles, mood, fx). One LLM call per
 * video; the result is stored on each beat's clip asset and rendered by
 * <StickStage>. Near-zero marginal cost — this call (cents) replaces the
 * FLUX/Seedance clip spend entirely.
 *
 * Live when ANTHROPIC_API_KEY is present; otherwise a deterministic keyword
 * heuristic keeps the pipeline working (standing rule 4) and serves as the
 * "smart off" path.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export type StickChoreography = {
  /** One scene per input beat, in beat order. */
  scenes: StickScene[];
  costUsd: number;
  provider: "anthropic" | "heuristic";
};

export function isChoreographerLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DELIVER_SCENES_TOOL = {
  name: "deliver_scenes",
  description: "Deliver one stick-figure scene per script beat, in beat order.",
  input_schema: {
    type: "object",
    properties: {
      scenes: {
        type: "array",
        description: "Exactly one scene per beat, in order.",
        items: {
          type: "object",
          properties: {
            beatIdx: { type: "number", description: "The script beat this scene illustrates." },
            setting: { type: "string", enum: STICK_SETTINGS as unknown as string[] },
            shot: { type: "string", enum: ["wide", "medium", "close"] },
            mood: { type: "string", enum: STICK_MOODS as unknown as string[], description: "Optional emotional tint; omit for neutral." },
            fx: {
              type: "array",
              items: { type: "string", enum: STICK_FX as unknown as string[] },
              description: "Optional emphasis effects (impact on a hit, speedlines on a chase). Use sparingly.",
            },
            action: { type: "string", enum: STICK_ACTIONS as unknown as string[], description: "What the protagonist does." },
            prop: { type: "string", enum: STICK_PROPS as unknown as string[], description: "Optional object in the protagonist's hand (mic for a host, sword for a fight, sign, book…). Omit/none for most beats." },
            facing: { type: "string", enum: ["l", "r"] },
            say: { type: "string", description: "Optional speech bubble (≤6 words) — only with dialogue." },
            think: { type: "string", description: "Optional thought bubble (≤6 words) — only for inner thought." },
            action2: { type: "string", enum: STICK_ACTIONS as unknown as string[], description: "Optional second character's action (only when the beat clearly has two characters)." },
            say2: { type: "string", description: "Optional second character's speech (≤6 words)." },
          },
          required: ["beatIdx", "setting", "shot", "action", "facing"],
        },
      },
    },
    required: ["scenes"],
  },
} as const;

export async function choreographStickScenes(opts: {
  title: string;
  niche: string;
  topic: string;
  tone: string;
  format: string;
  beats: ScriptBeat[];
  /** Score-banded fixer model (auto-fix remediation); defaults to SCRIPT_MODEL. */
  model?: string;
  /** QC work-order notes to steer the fix toward the judge's specific feedback. */
  steer?: string;
}): Promise<StickChoreography> {
  const all = opts.beats;
  const prompted = all.filter((b) => b.text?.trim());
  if (prompted.length === 0 || !isChoreographerLive()) {
    return { scenes: all.map((b, i) => heuristicScene(b, i)), costUsd: 0, provider: "heuristic" };
  }

  const script = prompted.map((b) => `[Beat ${b.idx}] ${b.text}`).join("\n\n");
  const prompt = `You are the choreographer for a ${opts.niche} stick-figure YouTube video titled "${opts.title}" (${opts.format}; tone: ${opts.tone}). The art is simple black stick figures acting out a narrated story.

For EACH beat, design one scene that visually acts out the narration:
- pick a SETTING that matches the moment, a SHOT (close for emotion/detail, wide for movement/scale), and a protagonist ACTION from the allowed list that best mimes what's happening.
- keep ONE protagonist throughout for consistency; only add a second character (action2) when the beat clearly involves another person.
- add a short say/think bubble ONLY when there's actual dialogue or a pointed inner thought (≤6 words).
- use mood and fx SPARINGLY, for genuine emphasis (impact on a hit, speedlines on a chase, danger/night for tension).
- vary settings and actions across beats so the video doesn't feel static.

SCRIPT:
${script}
${opts.steer ? `\nFIX GUIDANCE (address these QC notes where they apply):\n${opts.steer}\n` : ""}
Call deliver_scenes with exactly ${prompted.length} scenes, one per beat, in order.`;

  const res = await anthropicFetch({
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model?.trim() || MODEL,
      max_tokens: 3000,
      temperature: 0.6,
      tools: [DELIVER_SCENES_TOOL],
      tool_choice: { type: "tool", name: "deliver_scenes" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const toolUse = data.content.find((c) => c.type === "tool_use");
  const raw = (toolUse?.input as { scenes?: RawScene[] } | undefined)?.scenes ?? [];

  // Map the model's scenes back onto beats by beatIdx; any beat the model
  // skipped falls back to the heuristic so every beat always has a scene.
  const byIdx = new Map<number, RawScene>();
  for (const s of raw) if (typeof s?.beatIdx === "number") byIdx.set(s.beatIdx, s);
  const scenes = all.map((b, i) => {
    const r = byIdx.get(b.idx);
    return r ? normalizeScene(r) : heuristicScene(b, i);
  });

  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;
  return { scenes, costUsd: Math.round(costUsd * 100) / 100, provider: "anthropic" };
}

type RawScene = {
  beatIdx?: number;
  setting?: string;
  shot?: string;
  mood?: string;
  fx?: string[];
  action?: string;
  prop?: string;
  facing?: string;
  say?: string;
  think?: string;
  action2?: string;
  say2?: string;
};

const PROP_SET = new Set<string>(STICK_PROPS);

const ACTION_SET = new Set<string>(STICK_ACTIONS);
const SETTING_SET = new Set<string>(STICK_SETTINGS);
const MOOD_SET = new Set<string>(STICK_MOODS);
const FX_SET = new Set<string>(STICK_FX);

function coerceAction(a: string | undefined, fallback: StickAction = "idle"): StickAction {
  return a && ACTION_SET.has(a) ? (a as StickAction) : fallback;
}
function clip(s: string | undefined, max: number): string | undefined {
  const t = s?.replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Validate/clamp a model scene into a guaranteed-renderable StickScene. */
function normalizeScene(r: RawScene): StickScene {
  const setting = (r.setting && SETTING_SET.has(r.setting) ? r.setting : "void") as Setting;
  const shot = r.shot === "close" || r.shot === "medium" || r.shot === "wide" ? r.shot : "wide";
  const facing = r.facing === "l" ? "l" : "r";
  const fx = (r.fx ?? []).filter((f) => FX_SET.has(f)) as StickFx[];
  const hasTwo = Boolean(r.action2);
  const scene: StickScene = {
    setting,
    shot,
    actors: [
      {
        id: "a",
        action: coerceAction(r.action),
        facing,
        x: hasTwo ? 0.36 : 0.5,
        prop: r.prop && PROP_SET.has(r.prop) ? (r.prop as PropKey) : undefined,
        say: clip(r.say, 36),
        think: clip(r.think, 36),
      },
    ],
  };
  if (r.mood && MOOD_SET.has(r.mood)) scene.mood = r.mood as StickScene["mood"];
  if (fx.length) scene.fx = fx;
  if (hasTwo) {
    scene.actors.push({
      id: "b",
      action: coerceAction(r.action2),
      facing: "l",
      x: 0.64,
      say: clip(r.say2, 36),
    });
  }
  return scene;
}

// ── Heuristic fallback (no key) ───────────────────────────────────────
// Keyword → protagonist action, with settings rotated for visual variety.

const KEYWORDS: [RegExp, StickAction][] = [
  [/\b(ran|run|running|chase|chased|flee|fled|sprint|escap)/i, "run"],
  [/\b(sneak|crept|tiptoe|quietly|crept)/i, "sneak"],
  [/\b(fell|fall|falling|tripped|plummet|dropped)/i, "fall"],
  [/\b(climb|climbed|scaled)/i, "climb"],
  [/\b(swim|swam|underwater|dove|dived)/i, "swim"],
  [/\b(jump|jumped|leap|leapt)/i, "jump"],
  [/\b(punch|hit|fight|fought|struck|attack)/i, "fight"],
  [/\b(dodge|ducked|swerved|avoided)/i, "dodge"],
  [/\b(think|thought|wonder|realiz|figured|idea)/i, "think"],
  [/\b(point|pointed|showed|there)/i, "point"],
  [/\b(wave|waved|hello|hi |greet)/i, "wave"],
  [/\b(celebrat|cheer|won|victory|success|finally)/i, "celebrate"],
  [/\b(panic|scream|terrified|horror|afraid|scared)/i, "panic"],
  [/\b(shrug|whatever|dunno|unsure)/i, "shrug"],
  [/\b(sit|sat|rest|waited)/i, "sit"],
  [/\b(typ|comput|keyboard|coded|wrote)/i, "type"],
  [/\b(push|shoved|forced)/i, "push"],
  [/\b(carry|carried|held|lifted)/i, "carry"],
  [/\b(search|look|scan|spotted|saw|watch)/i, "lookAround"],
  [/\b(walk|walked|strolled|approached|went)/i, "walk"],
  [/\b(died|dead|killed|collapsed)/i, "dead"],
];

const SETTING_ROTATION: Setting[] = ["street", "room", "forest", "office", "cave", "rooftop", "void", "desert"];

function heuristicScene(beat: ScriptBeat, i: number): StickScene {
  const text = beat.text ?? "";
  const action = KEYWORDS.find(([re]) => re.test(text))?.[1] ?? (i === 0 ? "lookAround" : "idle");
  const setting = SETTING_ROTATION[i % SETTING_ROTATION.length];
  const fx: StickFx[] = action === "run" ? ["speedlines"] : action === "fight" ? ["impact"] : [];
  const mood: StickScene["mood"] =
    action === "panic" || action === "dead" ? "danger" : action === "think" ? "calm" : undefined;
  const scene: StickScene = {
    setting,
    shot: action === "think" ? "close" : "wide",
    actors: [{ id: "a", action, facing: "r", x: 0.5 }],
  };
  if (fx.length) scene.fx = fx;
  if (mood) scene.mood = mood;
  return scene;
}
