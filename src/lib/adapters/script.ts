import "server-only";
import type { ScriptBeat } from "@/lib/db/types";
import { mockScript } from "@/lib/pipeline/mock-content";

/**
 * Script provider adapter (Anthropic Claude). Live when ANTHROPIC_API_KEY
 * is present; otherwise falls back to the deterministic mock so the
 * pipeline always works (standing rule 4).
 *
 * Model is env-switchable via SCRIPT_MODEL (default Sonnet 4.6). Set it to
 * "claude-opus-4-8" for the flagship-quality writer — ~5x the token cost
 * (~$0.25–0.30/script vs ~$0.05); pricing below tracks whichever is set.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
// USD per million tokens (input, output) per model — for the cost ledger.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

// Spoken narration rate (words/min) and the fixed intro+outro overhead the
// render adds on top of the beats — both used to turn a target runtime into a
// word budget and to enforce the length cap. Keep INTRO/OUTRO in sync with
// packages/render/src/types.ts (INTRO_SEC + OUTRO_SEC).
const WORDS_PER_MIN = 150;
const INTRO_OUTRO_SEC = 6.5;

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Word budget for a target runtime: content words (minus intro/outro), a
    soft floor, the hard ceiling, and a rough beat count (~130 words/beat). */
export function scriptWordBudget(targetLengthSec: number) {
  // 5% headroom so real VO (which can read slower than 150 wpm) still lands
  // under the target rather than spilling over the hard cap.
  const contentSec = Math.max(30, (targetLengthSec - INTRO_OUTRO_SEC) * 0.95);
  const target = Math.round((contentSec / 60) * WORDS_PER_MIN);
  return {
    target,
    min: Math.round(target * 0.82),
    max: target, // hard ceiling — keeping content ≤ this keeps runtime ≤ target
    beats: Math.max(4, Math.round(target / 130)),
  };
}

/** Estimated spoken runtime (sec) for a set of beats, incl. intro/outro. */
function estimateRuntimeSec(beats: ScriptBeat[]): number {
  const words = beats.reduce((n, b) => n + wordCount(b.text), 0);
  return Math.round((words / WORDS_PER_MIN) * 60 + INTRO_OUTRO_SEC);
}

/** Hard length cap: drop trailing content beats (always keeping the hook and
    the fixed outro) until total narration fits the target runtime. */
export function capScriptToBudget(beats: ScriptBeat[], targetLengthSec: number): ScriptBeat[] {
  if (beats.length <= 2) return beats;
  const { max } = scriptWordBudget(targetLengthSec);
  const outro = beats[beats.length - 1];
  const content = beats.slice(0, -1);
  const kept: ScriptBeat[] = [];
  let words = 0;
  for (const b of content) {
    const w = wordCount(b.text);
    if (kept.length >= 1 && words + w > max) break; // keep at least the hook
    kept.push(b);
    words += w;
  }
  if (kept.length === content.length) return beats; // nothing trimmed
  return [...kept, outro].map((b, idx) => ({ ...b, idx }));
}

/**
 * Voice DNA — a system prompt that fights the "AI essay" register: writes
 * like a real creator with a point of view, varies rhythm, and bans the
 * tells that make scripts sound machine-written. Tone (per project) decides
 * how edgy/hype vs. sharp/measured the delivery is.
 */
const VOICE_SYSTEM = `You write YouTube scripts that sound like a sharp human creator talking to one viewer — never like an AI essay or a press release.

Hard rules:
- BANNED phrases (never use, in any form): "delve", "dive in/into", "in today's video", "buckle up", "without further ado", "let's get started", "that's right, folks", "in conclusion", "the world of", "when it comes to", "it's important to note", "needless to say", "look no further", "game-changer", "at the end of the day", "rest assured", "embark", "tapestry", "navigate the", "unlock the secrets".
- Vary rhythm hard: mix 3-word punches with longer lines. Never three same-length sentences in a row. Use sentence fragments for impact.
- Real voice: contractions, second person ("you"), a clear opinion, the occasional aside. Confidence over hedging — cut "might", "perhaps", "in many ways".
- Open cold and mid-thought with a real stake or a bold claim. No throat-clearing, no "welcome back".
- Specifics beat vibes: concrete names, numbers, moments. Show, don't summarize.
- Match the channel tone: if it's energetic/hype, go punchy, bold, a little provocative (but never clickbait lies); if authoritative, go sharp and certain; if curious, go conspiratorial and intriguing.
- It must read like someone SAID it, not wrote it. Read it back in your head — if a sentence sounds like a corporate blog, rewrite it.`;

export type ScriptDraft = {
  body: string;
  beats: ScriptBeat[];
  runtimeSec: number;
  metadata: {
    titles: string[];
    description: string;
    tags: string[];
    chapters: { at: number; label: string }[];
    /** Brand-safe kinetic phrase rendered big over the thumbnail. */
    thumbPhrase?: string;
  };
  costUsd: number;
  provider: "anthropic" | "mock";
};

export function isScriptLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DELIVER_SCRIPT_TOOL = {
  name: "deliver_script",
  description: "Deliver the finished YouTube script package.",
  input_schema: {
    type: "object",
    properties: {
      beats: {
        type: "array",
        description:
          "Script beats in order. Beat 1 is the hook. Each beat is 60–90 seconds of narration.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Narration text, spoken-word style." },
            visualPrompt: {
              type: "string",
              description:
                "One-line visual direction for this beat — a purely visual, cinematic scene for an AI image/video model. HARD RULES: never name any company, brand, product, logo, or real person, and never request on-screen text, words, letters, numbers, signage, labels, charts/graphs with text, or screens/UI with readable writing — image models render those as garbled gibberish and named brands are a legal risk. Describe symbolic, atmospheric, concrete imagery instead (e.g. 'a glowing custom processor on a dark server board, dramatic rim light', NOT 'a Google TPU' or 'a chart of revenue').",
            },
            shotType: {
              type: "string",
              enum: ["hero", "broll", "stock"],
              description:
                "hero = premium generated shot, broll = standard generated, stock = real-world factual footage",
            },
          },
          required: ["text", "visualPrompt", "shotType"],
        },
      },
      titles: {
        type: "array",
        items: { type: "string" },
        description: "3 title options, strongest first.",
      },
      description: { type: "string", description: "YouTube description with CTA." },
      tags: { type: "array", items: { type: "string" }, description: "8–12 tags." },
      chapters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            at: { type: "number", description: "Chapter start in seconds." },
            label: { type: "string" },
          },
          required: ["at", "label"],
        },
      },
      runtimeSec: { type: "number", description: "Estimated spoken runtime in seconds." },
      thumbPhrase: {
        type: "string",
        description:
          "A 2–5 word, punchy, curiosity-driving thumbnail phrase for this video — the kind that stops a scroll (it renders big over the thumbnail image). Make it bold and emotional. NEVER include brand, company, product, or person names (e.g. no Amazon/Nvidia/Anthropic) — sell the IDEA, not the names, to avoid copyright/trademark risk.",
      },
    },
    required: ["beats", "titles", "description", "tags", "chapters", "runtimeSec", "thumbPhrase"],
  },
} as const;

export async function generateScript(opts: {
  title: string;
  topic: string;
  niche: string;
  audience: string;
  angle: string;
  tone: string;
  format: string;
  targetLengthSec: number;
  template: string;
  revisionNotes?: string;
  /** Distilled recurring QC failures on this project's prior scripts. */
  qcLessons?: string[];
}): Promise<ScriptDraft> {
  if (!isScriptLive()) {
    const draft = mockScript({
      title: opts.title,
      topic: opts.topic,
      tone: opts.tone,
      targetLengthSec: opts.targetLengthSec,
      revisionNotes: opts.revisionNotes,
    });
    return {
      body: draft.body,
      beats: draft.beats,
      runtimeSec: draft.runtimeSec,
      metadata: draft.metadata as ScriptDraft["metadata"],
      costUsd: 0.18,
      provider: "mock",
    };
  }

  const budget = scriptWordBudget(opts.targetLengthSec);
  const prompt = fillTemplate(opts.template, {
    title: opts.title,
    topic: opts.topic,
    niche: opts.niche,
    audience: opts.audience,
    angle: opts.angle,
    tone: opts.tone,
    format: opts.format,
    target_minutes: String(Math.round(opts.targetLengthSec / 60)),
    target_words: String(budget.target),
    min_words: String(budget.min),
    max_words: String(budget.max),
    beat_count: String(budget.beats),
    revision_notes: opts.revisionNotes
      ? `\n\nIMPORTANT — the previous draft was rejected with these reviewer notes; address them directly:\n"${opts.revisionNotes}"`
      : "",
  });

  // Hard structural guardrails (the QC reviewer rejects these) + a feedback
  // loop: the project's recurring QC failures, fed back so the writer learns.
  const hardRules =
    `\n\nHARD STRUCTURE RULES — a QC reviewer will reject the script if any is violated:\n` +
    `- Write the COMPLETE script: produce all ${budget.beats} beats, each fully written, totaling about ${budget.target} words. NEVER stop after the hook or hand back a skeleton.\n` +
    `- Deliver every chapter, section, and timestamp your metadata promises — never reference content you didn't actually write.\n` +
    `- Each beat must advance the argument; do not restate the same point across multiple beats.`;
  const lessons =
    opts.qcLessons && opts.qcLessons.length > 0
      ? `\n\nAVOID these specific problems QC flagged on earlier scripts for this channel:\n${opts.qcLessons
          .map((l) => `- ${l}`)
          .join("\n")}`
      : "";
  const fullPrompt = `${prompt}${hardRules}${lessons}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      // Higher temperature for less robotic, more human phrasing.
      temperature: 0.9,
      system: VOICE_SYSTEM,
      tools: [DELIVER_SCRIPT_TOOL],
      tool_choice: { type: "tool", name: "deliver_script" },
      messages: [{ role: "user", content: fullPrompt }],
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
  if (!toolUse?.input) throw new Error("Claude returned no script payload");

  const input = toolUse.input as {
    beats: { text: string; visualPrompt: string; shotType: ScriptBeat["shotType"] }[];
    titles: string[];
    description: string;
    tags: string[];
    chapters: { at: number; label: string }[];
    runtimeSec: number;
    thumbPhrase?: string;
  };
  const rawBeats: ScriptBeat[] = input.beats.map((b, idx) => ({ idx, ...b }));
  // Hard cap: even with the word-budget prompt the model can run long, so trim
  // trailing content beats (keeping the hook and the fixed outro) until the
  // narration fits the target runtime. This is what guarantees the length cap.
  const beats = capScriptToBudget(rawBeats, opts.targetLengthSec);
  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in +
    (data.usage.output_tokens / 1e6) * PRICE.out;

  return {
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtimeSec: estimateRuntimeSec(beats),
    metadata: {
      titles: input.titles,
      description: input.description,
      tags: input.tags,
      chapters: input.chapters,
      thumbPhrase: input.thumbPhrase,
    },
    costUsd: Math.round(costUsd * 100) / 100,
    provider: "anthropic",
  };
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

// ── Script Remix — operator-directed, settings-driven rewrites ─────────

/** Remix controls surfaced on the script page. creativity 0..1 maps to model
    temperature; the rest are directive labels resolved below. */
export type RemixSettings = {
  creativity: number;
  toneOverride?: string;
  verbiage?: string;
  length?: string;
};

const VERBIAGE_DIRECTIVE: Record<string, string> = {
  simple: "plain, everyday words; short sentences a 12-year-old follows easily",
  conversational: "relaxed, spoken, like talking to a friend",
  sophisticated: "richer vocabulary and sharper phrasing, still spoken-word",
  technical: "precise, domain-accurate terminology for an expert audience",
};
const LENGTH_DIRECTIVE: Record<string, string> = {
  tighten: "cut hard — make it noticeably shorter and punchier without losing substance",
  expand: "develop it further with more detail, examples, and texture (longer)",
  punchier: "keep the length but quicken the pacing — shorter beats, more momentum",
  detailed: "keep the length but add concrete specifics, names, and numbers",
};

function remixTemp(creativity: number): number {
  const c = Math.min(1, Math.max(0, creativity));
  return Math.round((0.4 + c * 0.6) * 100) / 100; // 0.40 → 1.00
}

function settingsBlock(s: RemixSettings): string {
  const lines: string[] = [];
  if (s.toneOverride)
    lines.push(`- Tone: rewrite in a ${s.toneOverride} tone (override the channel default for this remix).`);
  if (s.verbiage && s.verbiage !== "keep")
    lines.push(`- Verbiage / reading level: ${VERBIAGE_DIRECTIVE[s.verbiage] ?? s.verbiage}.`);
  if (s.length && s.length !== "keep")
    lines.push(`- Length & pacing: ${LENGTH_DIRECTIVE[s.length] ?? s.length}.`);
  return lines.length ? `\n\nApply these remix settings:\n${lines.join("\n")}` : "";
}

async function callClaude(
  body: Record<string, unknown>,
): Promise<{
  input: Record<string, unknown>;
  costUsd: number;
}> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const toolUse = data.content.find((c) => c.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude returned no remix payload");
  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in +
    (data.usage.output_tokens / 1e6) * PRICE.out;
  return { input: toolUse.input, costUsd: Math.round(costUsd * 100) / 100 };
}

const DELIVER_REMIX_TOOL = {
  ...DELIVER_SCRIPT_TOOL,
  name: "deliver_remix",
  description: "Deliver the remixed YouTube script package.",
  input_schema: {
    ...DELIVER_SCRIPT_TOOL.input_schema,
    properties: {
      ...DELIVER_SCRIPT_TOOL.input_schema.properties,
      changeSummary: {
        type: "string",
        description:
          "One or two sentences, addressed to the operator, summarizing what you changed and why.",
      },
    },
    required: [...DELIVER_SCRIPT_TOOL.input_schema.required, "changeSummary"],
  },
} as const;

export type ScriptRemix = ScriptDraft & { changeSummary: string };

/** Remix the entire script against operator notes + settings. Returns a
    proposed draft (caller decides whether to persist). */
export async function remixScript(opts: {
  title: string;
  niche: string;
  audience: string;
  angle: string;
  tone: string;
  beats: ScriptBeat[];
  metadata: ScriptDraft["metadata"];
  runtimeSec: number;
  notes: string;
  settings: RemixSettings;
}): Promise<ScriptRemix> {
  if (!isScriptLive()) {
    const draft = mockScript({
      title: opts.title,
      topic: opts.title,
      tone: opts.settings.toneOverride || opts.tone,
      targetLengthSec: opts.runtimeSec || 480,
      revisionNotes: opts.notes,
    });
    return {
      body: draft.body,
      beats: draft.beats,
      runtimeSec: draft.runtimeSec,
      metadata: draft.metadata as ScriptDraft["metadata"],
      costUsd: 0,
      provider: "mock",
      changeSummary:
        "Mock remix (no ANTHROPIC_API_KEY): regenerated the script reflecting your notes.",
    };
  }

  const scriptText = opts.beats
    .map((b, i) => `[Section ${i + 1}]\n${b.text}`)
    .join("\n\n");
  const prompt = `You are remixing an existing script for "${opts.title}" on a ${opts.niche} channel (audience: ${opts.audience}; channel angle: ${opts.angle}).

CURRENT SCRIPT:
${scriptText}

CURRENT TITLES: ${(opts.metadata.titles ?? []).join(" | ")}

The operator's notes for this remix:
"${opts.notes}"${settingsBlock(opts.settings)}

Rewrite the FULL script package to address the notes. Keep the same core topic and roughly ${Math.round((opts.runtimeSec || 480) / 60)} minutes unless the notes/settings say otherwise. Then call deliver_remix with the revised beats, refreshed titles/description/tags/chapters, runtimeSec, and a short changeSummary written to the operator.`;

  const { input, costUsd } = await callClaude({
    model: MODEL,
    max_tokens: 4096,
    temperature: remixTemp(opts.settings.creativity),
    system: VOICE_SYSTEM,
    tools: [DELIVER_REMIX_TOOL],
    tool_choice: { type: "tool", name: "deliver_remix" },
    messages: [{ role: "user", content: prompt }],
  });

  const payload = input as {
    beats: { text: string; visualPrompt: string; shotType: ScriptBeat["shotType"] }[];
    titles: string[];
    description: string;
    tags: string[];
    chapters: { at: number; label: string }[];
    runtimeSec: number;
    thumbPhrase?: string;
    changeSummary: string;
  };
  const beats: ScriptBeat[] = payload.beats.map((b, idx) => ({ idx, ...b }));
  return {
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtimeSec: payload.runtimeSec || opts.runtimeSec,
    metadata: {
      titles: payload.titles,
      description: payload.description,
      tags: payload.tags,
      chapters: payload.chapters,
      thumbPhrase: payload.thumbPhrase,
    },
    costUsd,
    provider: "anthropic",
    changeSummary: payload.changeSummary,
  };
}

const DELIVER_BEAT_TOOL = {
  name: "deliver_beat",
  description: "Deliver one remixed script section.",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Revised narration for this section, spoken-word style." },
      visualPrompt: { type: "string", description: "One-line visual direction for this section." },
      shotType: { type: "string", enum: ["hero", "broll", "stock"] },
      changeSummary: {
        type: "string",
        description: "One sentence to the operator on what you changed in this section.",
      },
    },
    required: ["text", "visualPrompt", "shotType", "changeSummary"],
  },
} as const;

export type BeatRemix = {
  beat: ScriptBeat;
  changeSummary: string;
  costUsd: number;
  provider: "anthropic" | "mock";
};

/** Remix a single section, with the rest of the script as context. */
export async function remixBeat(opts: {
  title: string;
  niche: string;
  tone: string;
  beats: ScriptBeat[];
  targetIdx: number;
  notes: string;
  settings: RemixSettings;
}): Promise<BeatRemix> {
  const target = opts.beats.find((b) => b.idx === opts.targetIdx);
  if (!target) throw new Error("Target section not found");

  if (!isScriptLive()) {
    return {
      beat: { ...target },
      changeSummary:
        "Mock remix (no ANTHROPIC_API_KEY): section left as-is; add a key to enable live rewrites.",
      costUsd: 0,
      provider: "mock",
    };
  }

  const context = opts.beats
    .map((b, i) => `[Section ${i + 1}${b.idx === opts.targetIdx ? " — REMIX THIS ONE" : ""}]\n${b.text}`)
    .join("\n\n");
  const prompt = `Script for "${opts.title}" (${opts.niche} channel). Remix ONLY the marked section so it still flows with the sections around it.

${context}

Operator's notes for this section:
"${opts.notes}"${settingsBlock(opts.settings)}

Call deliver_beat with the revised section text, an updated visualPrompt + shotType, and a one-sentence changeSummary.`;

  const { input, costUsd } = await callClaude({
    model: MODEL,
    max_tokens: 1500,
    temperature: remixTemp(opts.settings.creativity),
    system: VOICE_SYSTEM,
    tools: [DELIVER_BEAT_TOOL],
    tool_choice: { type: "tool", name: "deliver_beat" },
    messages: [{ role: "user", content: prompt }],
  });
  const p = input as {
    text: string;
    visualPrompt: string;
    shotType: ScriptBeat["shotType"];
    changeSummary: string;
  };
  return {
    beat: { idx: opts.targetIdx, text: p.text, visualPrompt: p.visualPrompt, shotType: p.shotType },
    changeSummary: p.changeSummary,
    costUsd,
    provider: "anthropic",
  };
}

// ── Shot-type classification (hero / broll / stock) ───────────────────

const CLASSIFY_TOOL = {
  name: "classify_shots",
  description: "Assign the best visual type to every beat.",
  input_schema: {
    type: "object",
    properties: {
      shots: {
        type: "array",
        items: {
          type: "object",
          properties: {
            idx: { type: "number" },
            shotType: { type: "string", enum: ["hero", "broll", "stock"] },
          },
          required: ["idx", "shotType"],
        },
      },
    },
    required: ["shots"],
  },
} as const;

function heuristicShot(b: { idx: number; text: string; visualPrompt: string }): ScriptBeat["shotType"] {
  if (b.idx === 0) return "hero";
  const s = `${b.text} ${b.visualPrompt}`.toLowerCase();
  if (/\b(real|footage|city|street|people|crowd|factory|lab|archival|historical|map|data|chart|graph|news|interview|protest|building)\b/.test(s))
    return "stock";
  return "broll";
}

/** Classify each beat as hero / broll / stock — the best visual approach for
    that moment given the script. Live via Claude; heuristic fallback. */
export async function classifyShotTypes(opts: {
  niche: string;
  beats: { idx: number; text: string; visualPrompt: string }[];
}): Promise<{ classifications: { idx: number; shotType: ScriptBeat["shotType"] }[]; costUsd: number }> {
  if (!isScriptLive()) {
    return { classifications: opts.beats.map((b) => ({ idx: b.idx, shotType: heuristicShot(b) })), costUsd: 0 };
  }
  const list = opts.beats
    .map((b) => `[${b.idx}] ${b.text.slice(0, 220)} || visual: ${b.visualPrompt}`)
    .join("\n");
  const prompt = `For a ${opts.niche} YouTube video, pick the best visual type for each beat:
- "hero" = a premium signature generated shot (the hook, big reveals, emotional/visual peaks).
- "broll" = standard generated supporting visuals.
- "stock" = real-world licensed footage fits best (actual places, people, factual/archival, real objects/events).
Beats:
${list}
Call classify_shots for EVERY beat idx.`;
  const { input, costUsd } = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.2,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_shots" },
    messages: [{ role: "user", content: prompt }],
  });
  const shots = ((input as { shots?: { idx: number; shotType: ScriptBeat["shotType"] }[] }).shots) ?? [];
  const map = new Map(shots.map((s) => [s.idx, s.shotType]));
  return {
    classifications: opts.beats.map((b) => ({ idx: b.idx, shotType: map.get(b.idx) ?? heuristicShot(b) })),
    costUsd,
  };
}
