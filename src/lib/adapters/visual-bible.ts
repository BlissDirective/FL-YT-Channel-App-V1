import "server-only";
import { anthropicFetch } from "./anthropic";
import type { VisualBible } from "@studio/core";

/**
 * Visual Craft Engine V1 — the Visual Bible builder.
 *
 * Reads the WHOLE script once and derives a per-video continuity bible: the
 * concrete subjects (with photoreal descriptors), setting, palette, style
 * contract, motifs, and an AVOID list of clichés. Every beat's prompt is later
 * conditioned on it (applyBible / bibleNegatives in @studio/core) so visuals are
 * specific + consistent instead of generic stock cliché.
 *
 * Mock-first: with no ANTHROPIC_API_KEY, returns a deterministic heuristic bible
 * (zero spend) so the whole pipeline runs end-to-end with no credentials.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

export function isVisualBibleLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type BuildBibleOpts = {
  title: string;
  niche: string;
  angle: string;
  tone: string;
  /** The full script text (joined beats) — the bible is derived from all of it. */
  scriptText: string;
  /** Brand palette to seed the visual palette when the model doesn't override. */
  brandPalette?: string[];
};

export type BibleResult = { bible: VisualBible; costUsd: number };

const BIBLE_TOOL = {
  name: "deliver_visual_bible",
  description:
    "Derive a video's visual continuity bible from its full script: the concrete subjects to depict, the setting, palette, a one-line style contract, recurring motifs, and clichés to AVOID.",
  input_schema: {
    type: "object",
    properties: {
      subjects: {
        type: "array",
        description: "The 2–6 concrete things this specific video is about (people, objects, systems, places). NOT generic categories.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "short slug, e.g. 'alphafold'" },
            label: { type: "string", description: "human label, e.g. 'AlphaFold protein model'" },
            descriptor: { type: "string", description: "a photoreal visual descriptor to inject into image prompts, e.g. 'ribbon-diagram 3-D protein structure, teal on graphite'" },
          },
          required: ["id", "label", "descriptor"],
        },
      },
      setting: { type: "string", description: "the dominant setting/environment" },
      palette: { type: "array", items: { type: "string" }, description: "3–5 hex colors" },
      styleContract: { type: "string", description: "one-line visual style contract applied to every shot" },
      motifs: { type: "array", items: { type: "string" }, description: "recurring visual motifs" },
      avoid: { type: "array", items: { type: "string" }, description: "generic clichés / artifacts to steer away from for THIS topic" },
    },
    required: ["subjects", "styleContract", "avoid"],
  },
} as const;

/** Deterministic heuristic bible for mock mode / model outages — no spend. */
export function mockVisualBible(opts: BuildBibleOpts): VisualBible {
  const words = `${opts.title} ${opts.angle}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const seen = new Set<string>();
  const subjects = words
    .filter((w) => (seen.has(w) ? false : (seen.add(w), true)))
    .slice(0, 3)
    .map((w) => ({
      id: w,
      label: w,
      descriptor: `clear, specific depiction of ${w} in the ${opts.niche} domain`,
    }));
  return {
    subjects: subjects.length > 0 ? subjects : [{ id: "topic", label: opts.title, descriptor: `a specific, non-cliché depiction of "${opts.title}"` }],
    setting: `${opts.niche} context`,
    palette: opts.brandPalette && opts.brandPalette.length > 0 ? opts.brandPalette.slice(0, 5) : ["#0E7C86", "#1B1F24", "#E8E6DF"],
    styleContract: `${opts.tone} ${opts.niche} realism; specific over generic; clean composition`,
    motifs: [],
    avoid: ["generic stock cliché", "unrelated filler imagery", "garbled text", "warped hands or faces"],
    version: 1,
    model: "mock",
    createdAt: new Date().toISOString(),
  };
}

/** Build the visual bible for a video. Live when ANTHROPIC_API_KEY is set,
    else a deterministic mock. Never throws — falls back to the mock on error. */
export async function buildVisualBible(opts: BuildBibleOpts): Promise<BibleResult> {
  if (!isVisualBibleLive()) return { bible: mockVisualBible(opts), costUsd: 0 };
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
        max_tokens: 900,
        tools: [BIBLE_TOOL],
        tool_choice: { type: "tool", name: "deliver_visual_bible" },
        messages: [
          {
            role: "user",
            content:
              `Channel niche: ${opts.niche}. Angle: ${opts.angle}. Tone: ${opts.tone}.\n` +
              `Video title: "${opts.title}".\n\n` +
              `Derive the visual bible for THIS video from its full script below. Be specific to the actual subjects — avoid generic category imagery. The 'avoid' list should name the clichés a lazy generator would reach for on this exact topic.\n\n` +
              `SCRIPT:\n${opts.scriptText.slice(0, 6000)}`,
          },
        ],
      }),
    });
    const json = (await res.json()) as {
      content?: { type: string; input?: Record<string, unknown> }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const tool = json.content?.find((c) => c.type === "tool_use");
    const input = (tool?.input ?? {}) as Partial<VisualBible>;
    if (!input.subjects || input.subjects.length === 0) return { bible: mockVisualBible(opts), costUsd: 0 };
    const price = PRICING[MODEL] ?? PRICING["claude-sonnet-4-6"];
    const usage = json.usage ?? {};
    const costUsd =
      ((usage.input_tokens ?? 0) / 1e6) * price.in + ((usage.output_tokens ?? 0) / 1e6) * price.out;
    return {
      bible: {
        subjects: input.subjects,
        setting: input.setting,
        palette: input.palette && input.palette.length > 0 ? input.palette : opts.brandPalette,
        styleContract: input.styleContract,
        motifs: input.motifs ?? [],
        avoid: input.avoid ?? [],
        version: 1,
        model: MODEL,
        createdAt: new Date().toISOString(),
      },
      costUsd,
    };
  } catch {
    return { bible: mockVisualBible(opts), costUsd: 0 };
  }
}
