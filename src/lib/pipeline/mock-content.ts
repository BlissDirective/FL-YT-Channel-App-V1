import type { ScriptBeat } from "@/lib/db/types";

/**
 * Mock provider outputs for the Phase 3 pipeline. These double as test
 * fixtures and "demo mode" forever (standing rule 4) — Phases 4–6 swap in
 * live adapters behind the same shapes.
 */

const HOOKS = [
  "Most people get this completely backwards — and it costs them for decades.",
  "There's a number hiding in your bank statement that explains everything.",
  "Nobody teaches this in school, and it shows.",
  "The people who figured this out early are quietly years ahead.",
];

const SHOT_TYPES: ScriptBeat["shotType"][] = ["hero", "broll", "stock", "broll"];

export function mockScript(opts: {
  title: string;
  topic: string;
  tone: string;
  targetLengthSec: number;
  revisionNotes?: string;
}): { body: string; beats: ScriptBeat[]; runtimeSec: number; metadata: Record<string, unknown> } {
  const hook = HOOKS[Math.abs(hashCode(opts.title)) % HOOKS.length];
  const revised = opts.revisionNotes
    ? `\n\n[Revised per your notes: "${opts.revisionNotes}"]`
    : "";

  const beatTexts = [
    `${hook} Today we're unpacking ${opts.topic || opts.title.toLowerCase()} — and by the end, you'll see it differently.`,
    `First, the part everyone skips: the mechanics. Here's what actually happens behind the scenes, step by step, in plain language.`,
    `Now the twist — the data tells a different story than the advice you usually hear. Three numbers make this obvious.`,
    `So what do you do with this? Two small changes this week, one habit for the long run. Subscribe for the next deep dive.`,
  ];

  const beats: ScriptBeat[] = beatTexts.map((text, idx) => ({
    idx,
    text,
    visualPrompt:
      idx === 0
        ? `Cinematic hero shot: ${opts.topic || opts.title}, dramatic lighting, ${opts.tone} mood`
        : `Supporting visual for: ${text.slice(0, 60)}…`,
    shotType: SHOT_TYPES[idx],
  }));

  return {
    body: beatTexts.join("\n\n") + revised,
    beats,
    runtimeSec: opts.targetLengthSec,
    metadata: {
      titles: [
        opts.title,
        `${opts.title} (What Nobody Tells You)`,
        `The Truth About ${opts.topic || opts.title}`,
      ],
      description: `${hook}\n\nIn this video we break down ${opts.topic || opts.title.toLowerCase()} — what it is, why it matters, and what to do about it.\n\n⏱ Chapters below. New videos weekly.`,
      tags: (opts.topic || opts.title)
        .toLowerCase()
        .split(/\s+/)
        .slice(0, 8),
      chapters: [
        { at: 0, label: "The hook" },
        { at: 45, label: "How it actually works" },
        { at: Math.round(opts.targetLengthSec * 0.55), label: "What the data says" },
        { at: Math.round(opts.targetLengthSec * 0.85), label: "Your move" },
      ],
    },
  };
}

export const DEMO_TOPICS = [
  { title: "The Hidden Cost of 'Free' Banking", topic: "how banks make money from free accounts", format: "explainer" },
  { title: "Why Your Raise Disappeared", topic: "lifestyle inflation psychology", format: "story" },
  { title: "5 Bills You're Overpaying Right Now", topic: "recurring bill audit", format: "list" },
  { title: "The 30-Day Rule That Beats Budgeting", topic: "impulse purchase delay tactic", format: "explainer" },
  { title: "What $100 Invested Monthly Becomes", topic: "long-horizon index investing", format: "case_study" },
];

/** Mock provider price book (USD) — realistic Phase 4–6 unit costs so the
    cost ledger and budget caps behave like production. */
export const MOCK_COSTS = {
  scriptGeneration: { provider: "anthropic", usd: 0.14, description: "Script draft (Claude)" },
  metadataPackage: { provider: "anthropic", usd: 0.04, description: "Titles, description, tags" },
  voiceover: { provider: "elevenlabs", usd: 0.3, description: "Voiceover synthesis + timestamps" },
  clip: { provider: "fal.ai", usd: 0.35, description: "Generated clip" },
  stockClip: { provider: "pexels", usd: 0, description: "Licensed stock clip" },
  thumbnail: { provider: "fal.ai", usd: 0.08, description: "Thumbnail candidate" },
  render: { provider: "trigger.dev", usd: 0.12, description: "Remotion render compute" },
} as const;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
