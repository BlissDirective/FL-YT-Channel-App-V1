import "server-only";
import type { Project } from "@/lib/db/types";
import { findNearDuplicate } from "@/lib/pipeline/dedup";

/**
 * Auto Pilot Operator guardrails (Phase C). Two Claude-backed detectors that
 * keep the channel ban-safe and high-quality:
 *
 *  • planNextTopic — picks a FRESH, non-duplicate idea that fills a coverage gap
 *    in the channel's topic taxonomy (YouTube's reused-content policy is the #1
 *    young-channel risk).
 *  • editorialGuard — a pre-publish review of the finished script + metadata for
 *    factual/statistical red flags, legal/copyright caution (company claims,
 *    financial-advice framing), and metadata spam.
 *
 * Live when ANTHROPIC_API_KEY is present; both degrade safely (planNextTopic →
 * null so the caller falls back to research; editorialGuard → 'pass') so the
 * pipeline never blocks on a missing key.
 *
 * Media copyright (music/footage) is enforced by construction: the operator's
 * tiers only ever use Pexels (licensed), generated stills (FLUX), and original
 * Remotion compositions — no third-party copyrighted media enters a video.
 */

const PLAN_MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const GUARD_MODEL = "claude-haiku-4-5"; // cheap, frequent
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const priceOf = (m: string) => PRICING[m] ?? { in: 3, out: 15 };

function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Default topic taxonomy for an AI-niche channel (The Silicon Layer). Broadens
    coverage well beyond economy angles. */
export const AI_TAXONOMY = [
  "emerging AI tech & breakthroughs",
  "advances in AI systems & models",
  "real-world AI use cases",
  "AI financial concepts & markets",
  "AI tools & products",
  "AI agentic systems",
  "making money leveraging AI",
  "AI research explained",
  "AI ethics, safety & policy",
  "AI for creators & productivity",
];

/** Resolve the taxonomy for a project: explicit operator override → AI default
    (when the niche reads as AI) → the project's own niche/angle as a single bucket. */
export function taxonomyFor(project: Project, override?: string[]): string[] {
  if (override && override.length) return override;
  const hay = `${project.niche} ${project.name} ${project.angle}`.toLowerCase();
  if (/\bai\b|artificial intelligence|silicon|machine learning|llm|agentic/.test(hay)) return AI_TAXONOMY;
  return [project.niche || project.angle || "general"].filter(Boolean);
}

async function callTool<T>(
  model: string,
  system: string,
  user: string,
  tool: { name: string; description: string; input_schema: object },
): Promise<{ input: T; costUsd: number } | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    content: { type: string; input?: unknown }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const input = data.content.find((c) => c.type === "tool_use")?.input as T | undefined;
  if (input === undefined) return null;
  const p = priceOf(model);
  const costUsd =
    Math.round(((data.usage.input_tokens / 1e6) * p.in + (data.usage.output_tokens / 1e6) * p.out) * 1000) / 1000;
  return { input, costUsd };
}

// ── Topic planner (dedup + coverage) ──────────────────────────────────

export type PlannedTopic = {
  title: string;
  angle: string;
  subtopic: string;
  costUsd: number;
};

const PLAN_TOOL = {
  name: "deliver_topic",
  description: "Deliver one fresh, non-duplicate video idea that fills a coverage gap.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A specific, non-clickbait YouTube title (≤70 chars)." },
      angle: { type: "string", description: "The unique angle/hook in one sentence." },
      subtopic: { type: "string", description: "Which taxonomy bucket this fills." },
    },
    required: ["title", "angle", "subtopic"],
  },
} as const;

/** Pick the next video idea: fresh, on-niche, NOT a near-duplicate of recent
    titles, and biased toward an under-covered taxonomy bucket. Returns null when
    the model is unavailable (caller falls back to its own research path). */
export async function planNextTopic(opts: {
  project: Project;
  recentTitles: string[];
  taxonomy: string[];
  kind: "short" | "long";
  /** Best-performing subtopics from real analytics — lean toward these (Phase D). */
  winners?: string[];
  /** Constrain the idea to this taxonomy bucket (the calendar slot's subtopic). */
  subtopic?: string;
  /** A pre-planned title to refine/replace (the calendar slot's title). */
  plannedTitle?: string;
}): Promise<PlannedTopic | null> {
  if (!isLive()) return null;
  const system =
    `You are the content planner for the YouTube channel "${opts.project.name}" (niche: ${opts.project.niche}; angle: ${opts.project.angle}). ` +
    `Propose ONE new ${opts.kind === "short" ? "Short (snappy, single-idea)" : "long-form (deeper)"} video idea. ` +
    `Hard rules: it must NOT duplicate or closely overlap any recent title; it must fit the niche; prefer a taxonomy bucket that is under-represented in the recent list; be specific and accurate (no hype, no clickbait).`;
  const winnersLine =
    opts.winners && opts.winners.length
      ? `BEST-PERFORMING THEMES so far (lean toward these when you can do so freshly):\n- ${opts.winners.join("\n- ")}\n\n`
      : "";
  const slotLine = opts.subtopic
    ? `THIS VIDEO'S PLANNED SUBTOPIC (stay within it): ${opts.subtopic}\n` +
      (opts.plannedTitle ? `Planned working title (refine or replace for freshness/quality): ${opts.plannedTitle}\n` : "") +
      `\n`
    : "";
  const user =
    `TAXONOMY (coverage buckets):\n- ${opts.taxonomy.join("\n- ")}\n\n` +
    slotLine +
    winnersLine +
    `RECENT TITLES (avoid overlap with these):\n${opts.recentTitles.length ? opts.recentTitles.map((t) => `- ${t}`).join("\n") : "- (none yet)"}\n\n` +
    `Call deliver_topic with a fresh idea.`;
  const out = await callTool<{ title: string; angle: string; subtopic: string }>(
    PLAN_MODEL,
    system,
    user,
    PLAN_TOOL,
  );
  if (!out) return null;
  const title = out.input.title?.trim();
  if (!title) return null;
  return {
    title: title.slice(0, 100),
    angle: (out.input.angle ?? "").trim().slice(0, 240),
    subtopic: (out.input.subtopic ?? "").trim().slice(0, 80),
    costUsd: out.costUsd,
  };
}

// ── Idea-score gate (Tier 1: grade an idea BEFORE it triggers a build) ─

export type IdeaGateResult = {
  /** false only when the model is unavailable (caller applies fail-closed). */
  live: boolean;
  /** true when the (possibly improved) idea clears the floor. */
  passed: boolean;
  /** Final 0–10 score (of the improved idea when an improvement round ran). */
  score: number;
  /** The idea to build with — improved fields when a round raised the score. */
  title: string;
  angle: string;
  subtopic: string;
  /** Whether an improvement round was applied. */
  improved: boolean;
  note: string;
  costUsd: number;
};

const IDEA_SCORE_TOOL = {
  name: "deliver_idea_score",
  description: "Grade a single video idea for a faceless YouTube channel.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description:
          "0–10. Judge topic appeal to the audience, angle originality (would it survive YouTube's inauthentic/reused-content bar?), title promise/CTR, and retention potential. 8+ = strong, 6–8 = solid, <6 = weak.",
      },
      reasons: { type: "array", items: { type: "string" }, description: "Concrete weaknesses, most important first (max 4)." },
      note: { type: "string", description: "One-sentence overall verdict." },
    },
    required: ["score", "reasons", "note"],
  },
} as const;

const IDEA_IMPROVE_TOOL = {
  name: "deliver_improved_idea",
  description: "Rewrite a weak idea into a stronger one within the same subtopic.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A sharper, specific, non-clickbait YouTube title (≤70 chars)." },
      angle: { type: "string", description: "The stronger unique angle/hook in one sentence." },
      subtopic: { type: "string", description: "Keep the same taxonomy bucket." },
    },
    required: ["title", "angle", "subtopic"],
  },
} as const;

/** Real-performance signal fed into idea scoring (Tier 4 #3). */
export type IdeaPerformance = {
  /** Best-performing subtopics, ranked (operator strategy / analytics). */
  topSubtopics?: string[];
  /** Recent channel retention % and CTR % (for context). */
  retentionPct?: number;
  ctr?: number;
};

async function scoreIdea(opts: {
  project: Project;
  title: string;
  angle: string;
  subtopic: string;
  kind: "short" | "long";
  performance?: IdeaPerformance;
}): Promise<{ score: number; reasons: string[]; note: string; costUsd: number } | null> {
  const perf = opts.performance;
  const hasPerf = Boolean(perf && ((perf.topSubtopics?.length ?? 0) > 0 || perf.retentionPct || perf.ctr));
  const perfLine = hasPerf
    ? `\n\nCHANNEL PERFORMANCE SIGNAL (real analytics — weight your score by this):\n` +
      ((perf!.topSubtopics?.length ?? 0) > 0
        ? `- Best-performing subtopics so far (reward ideas that fit or extend these): ${perf!.topSubtopics!.slice(0, 6).join(", ")}.\n`
        : "") +
      (perf!.retentionPct || perf!.ctr
        ? `- Recent retention ~${perf!.retentionPct ? Math.round(perf!.retentionPct) : "?"}%, CTR ~${perf!.ctr ? Math.round(perf!.ctr * 10) / 10 : "?"}. Reward ideas likely to beat these; be skeptical of off-trend themes unless exceptional.\n`
        : "")
    : "";
  const system =
    `You are a strict content critic for the YouTube channel "${opts.project.name}" ` +
    `(niche: ${opts.project.niche}; audience: ${opts.project.audience}; angle: ${opts.project.angle}). ` +
    `Grade ONE ${opts.kind === "short" ? "Short" : "long-form"} video idea. Be decisive and concrete.`;
  const user =
    `TITLE: ${opts.title}\nANGLE: ${opts.angle}\nSUBTOPIC: ${opts.subtopic || "(unspecified)"}${perfLine}\n\nCall deliver_idea_score.`;
  const out = await callTool<{ score: number; reasons: string[]; note: string }>(
    GUARD_MODEL,
    system,
    user,
    IDEA_SCORE_TOOL,
  );
  if (!out) return null;
  return {
    score: Math.max(0, Math.min(10, Number(out.input.score))),
    reasons: (out.input.reasons ?? []).slice(0, 4),
    note: (out.input.note ?? "").slice(0, 200),
    costUsd: out.costUsd,
  };
}

/**
 * Grade an idea before it triggers an (expensive) build. On a sub-floor miss, run
 * ONE improvement round that rewrites the idea in place (rather than discarding),
 * then re-score. The caller discards-and-tries-another-slot only if the improved
 * idea is still below the floor. A ~$0.002 haiku gate in front of a multi-dollar
 * build. Returns live:false when the model is unavailable (caller decides).
 */
export async function gateIdea(opts: {
  project: Project;
  title: string;
  angle: string;
  subtopic: string;
  kind: "short" | "long";
  floor: number;
  /** The channel's existing titles — a near-duplicate fails the gate and the
      improvement round is asked to differentiate (reused content = #1 risk). */
  catalogTitles?: string[];
  /** Real analytics signal — scoring rewards proven subtopics (Tier 4 #3). */
  performance?: IdeaPerformance;
}): Promise<IdeaGateResult> {
  const base: IdeaGateResult = {
    live: false,
    passed: true,
    score: 0,
    title: opts.title,
    angle: opts.angle,
    subtopic: opts.subtopic,
    improved: false,
    note: "",
    costUsd: 0,
  };
  if (!isLive()) return base;
  const catalog = opts.catalogTitles ?? [];

  const first = await scoreIdea(opts);
  if (!first) return base; // scoring unavailable → treat as not-live
  let costUsd = first.costUsd;
  const dup1 = findNearDuplicate(`${opts.title} ${opts.angle}`, catalog);
  if (first.score >= opts.floor && !dup1) {
    return { ...base, live: true, passed: true, score: first.score, note: first.note, costUsd };
  }

  // One improvement round: address the QC weaknesses AND/OR differentiate from
  // the near-duplicate, then re-score and re-check for duplication.
  const reasons = [...first.reasons];
  if (dup1) {
    reasons.unshift(`Too similar to an existing video ("${dup1.title}") — make the title and angle clearly distinct.`);
  }
  const system =
    `You are the content planner for "${opts.project.name}" (niche: ${opts.project.niche}; angle: ${opts.project.angle}). ` +
    `An idea needs work (low quality and/or too close to an existing video). Rewrite it into a stronger, clearly distinct ` +
    `version in the SAME subtopic: a sharper, specific, non-clickbait title and a more original angle. Keep it accurate and on-niche.`;
  const user =
    `ORIGINAL TITLE: ${opts.title}\nORIGINAL ANGLE: ${opts.angle}\nSUBTOPIC: ${opts.subtopic || "(unspecified)"}\n\n` +
    `WEAKNESSES TO FIX:\n${reasons.length ? reasons.map((r) => `- ${r}`).join("\n") : "- weak hook / low originality"}\n\n` +
    `Call deliver_improved_idea.`;
  const imp = await callTool<{ title: string; angle: string; subtopic: string }>(
    PLAN_MODEL,
    system,
    user,
    IDEA_IMPROVE_TOOL,
  );
  if (!imp || !imp.input.title?.trim()) {
    // Couldn't improve → report the original sub-floor / duplicate verdict.
    return {
      ...base,
      live: true,
      passed: false,
      score: first.score,
      note: dup1 ? `Near-duplicate of "${dup1.title}"` : first.note,
      costUsd,
    };
  }
  costUsd += imp.costUsd;
  const improved = {
    title: imp.input.title.trim().slice(0, 100),
    angle: (imp.input.angle ?? opts.angle).trim().slice(0, 240),
    subtopic: (imp.input.subtopic ?? opts.subtopic).trim().slice(0, 80),
  };

  const second = await scoreIdea({ ...opts, ...improved });
  if (second) costUsd += second.costUsd;
  const finalScore = second ? second.score : first.score;
  const dup2 = findNearDuplicate(`${improved.title} ${improved.angle}`, catalog);
  return {
    live: true,
    passed: finalScore >= opts.floor && !dup2,
    score: finalScore,
    title: improved.title,
    angle: improved.angle,
    subtopic: improved.subtopic,
    improved: true,
    note: dup2 ? `Still near-duplicate of "${dup2.title}"` : (second?.note ?? first.note),
    costUsd,
  };
}

// ── Editorial guard (fact / legal / metadata) ─────────────────────────

export type EditorialVerdict = {
  verdict: "pass" | "caution" | "fail";
  factIssues: string[];
  legalFlags: string[];
  metadataIssues: string[];
  note: string;
  costUsd: number;
};

const GUARD_TOOL = {
  name: "deliver_guard",
  description: "Deliver the pre-publish editorial guard verdict.",
  input_schema: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["pass", "caution", "fail"],
        description:
          "'pass' = clean. 'caution' = publishable but has flags a human should see. 'fail' = do NOT auto-publish (serious factual error, legal/defamation risk, or policy violation).",
      },
      factIssues: { type: "array", items: { type: "string" }, description: "Unsupported/likely-wrong stats or claims (max 4)." },
      legalFlags: { type: "array", items: { type: "string" }, description: "Legal/copyright/defamation risks — esp. claims about named companies or financial 'advice' framed as guaranteed (max 4)." },
      metadataIssues: { type: "array", items: { type: "string" }, description: "Title/tag spam, keyword stuffing, or misleading/clickbait metadata (max 3)." },
      note: { type: "string", description: "One-sentence overall note." },
    },
    required: ["verdict", "factIssues", "legalFlags", "metadataIssues", "note"],
  },
} as const;

/** Editorial review of the script + metadata. Never blocks on a missing key
    (returns 'pass').
     • mode 'full' (default) — fact + legal + metadata, reads the script body.
       Run this at the SCRIPT stage, BEFORE assets, so a hard fail costs one
       script draft rather than a full production.
     • mode 'metadata' — title/tags only (no script body). A lightweight
       pre-publish recheck once the full check already ran upstream. */
export async function editorialGuard(opts: {
  title: string;
  scriptBody: string;
  tags: string[];
  niche: string;
  mode?: "full" | "metadata";
}): Promise<EditorialVerdict> {
  const safe: EditorialVerdict = { verdict: "pass", factIssues: [], legalFlags: [], metadataIssues: [], note: "", costUsd: 0 };
  if (!isLive()) return safe;
  const metadataOnly = opts.mode === "metadata";
  const system = metadataOnly
    ? `You are a strict metadata reviewer for a faceless YouTube channel (niche: ${opts.niche}). ` +
      `Review ONLY the title and tags for keyword stuffing, misleading/clickbait framing, and policy-risky wording. ` +
      `Be decisive: 'fail' ONLY for serious violations that must not auto-publish.`
    : `You are a strict editorial + legal reviewer for a faceless YouTube channel (niche: ${opts.niche}). ` +
      `Review the script and metadata for: (1) factual/statistical accuracy — flag unsupported or likely-wrong claims; ` +
      `(2) legal/copyright caution — flag defamation risk, unverified claims about named companies, and financial guidance framed as a guarantee; ` +
      `(3) metadata spam — keyword stuffing or misleading/clickbait titles/tags. ` +
      `Be decisive: 'fail' ONLY for serious problems that must not auto-publish.`;
  const user = metadataOnly
    ? `TITLE: ${opts.title}\nTAGS: ${opts.tags.join(", ") || "(none)"}\n\nReview the metadata only. Call deliver_guard.`
    : `TITLE: ${opts.title}\nTAGS: ${opts.tags.join(", ") || "(none)"}\n\nSCRIPT:\n${opts.scriptBody.slice(0, 6000)}\n\nCall deliver_guard.`;
  const out = await callTool<Omit<EditorialVerdict, "costUsd">>(GUARD_MODEL, system, user, GUARD_TOOL);
  if (!out) return safe;
  const v = out.input.verdict;
  return {
    verdict: v === "fail" || v === "caution" ? v : "pass",
    factIssues: (out.input.factIssues ?? []).slice(0, 4),
    legalFlags: (out.input.legalFlags ?? []).slice(0, 4),
    metadataIssues: (out.input.metadataIssues ?? []).slice(0, 3),
    note: (out.input.note ?? "").slice(0, 200),
    costUsd: out.costUsd,
  };
}
