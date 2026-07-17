/**
 * Web-research-first cited brief (OpenMontage Remixed list1 #22).
 *
 * Before scripting, the studio assembles a STRUCTURED, CITED research brief —
 * key findings tied to sources across YouTube / Reddit / HN / news / academic —
 * so the script is grounded in verifiable facts, not the model's memory. This
 * is the canonical `brief` stage artifact that feeds runScripting.
 *
 * Pure — the adapter fetches sources; this shapes + validates the brief and
 * renders the script-ready context.
 */

export type SourceKind = "youtube" | "reddit" | "hn" | "news" | "academic" | "web";

export type ResearchSource = {
  kind: SourceKind;
  title: string;
  url: string;
  /** A short supporting snippet. */
  snippet?: string;
  /** 0..1 credibility prior (academic/news high, forum lower). */
  credibility?: number;
};

export type ResearchFinding = {
  claim: string;
  /** Indices into the brief's `sources` supporting this claim. */
  sourceIdx: number[];
  /** 0..1 confidence from the number + credibility of citations. */
  confidence: number;
};

export type ResearchBrief = {
  topic: string;
  angle: string;
  audience: string;
  findings: ResearchFinding[];
  openQuestions: string[];
  sources: ResearchSource[];
};

const CREDIBILITY_DEFAULT: Record<SourceKind, number> = {
  academic: 0.9, news: 0.75, youtube: 0.6, web: 0.55, hn: 0.55, reddit: 0.45,
};

/** Confidence for a finding from the credibility of its cited sources. Pure. */
export function findingConfidence(sources: ResearchSource[], sourceIdx: number[]): number {
  if (sourceIdx.length === 0) return 0;
  const creds = sourceIdx
    .map((i) => sources[i])
    .filter(Boolean)
    .map((s) => s.credibility ?? CREDIBILITY_DEFAULT[s.kind] ?? 0.5);
  if (creds.length === 0) return 0;
  const avg = creds.reduce((a, b) => a + b, 0) / creds.length;
  // More independent citations raise confidence, with diminishing returns.
  const breadth = Math.min(1, sourceIdx.length / 3);
  return Math.round(Math.min(1, avg * (0.7 + 0.3 * breadth)) * 100) / 100;
}

/** Assemble + validate a brief, computing each finding's confidence. Pure. */
export function assembleBrief(input: {
  topic: string;
  angle: string;
  audience: string;
  sources: ResearchSource[];
  findings: { claim: string; sourceIdx: number[] }[];
  openQuestions?: string[];
}): ResearchBrief {
  return {
    topic: input.topic,
    angle: input.angle,
    audience: input.audience,
    sources: input.sources,
    openQuestions: input.openQuestions ?? [],
    findings: input.findings.map((f) => ({
      claim: f.claim,
      sourceIdx: f.sourceIdx,
      confidence: findingConfidence(input.sources, f.sourceIdx),
    })),
  };
}

/** Only findings backed by ≥1 citation and above a confidence floor are
    trusted enough to feed scripting. Pure. */
export function citedFindings(brief: ResearchBrief, floor = 0.5): ResearchFinding[] {
  return brief.findings.filter((f) => f.sourceIdx.length > 0 && f.confidence >= floor);
}

/** Render the brief into a compact, citation-annotated context block for the
    scripting prompt. Pure. */
export function briefToScriptContext(brief: ResearchBrief): string {
  const lines: string[] = [
    `TOPIC: ${brief.topic}`,
    `ANGLE: ${brief.angle}`,
    `AUDIENCE: ${brief.audience}`,
    "",
    "GROUNDED FINDINGS (cite these, don't invent):",
  ];
  for (const f of citedFindings(brief)) {
    const cites = f.sourceIdx.map((i) => `[${i + 1}]`).join("");
    lines.push(`- ${f.claim} ${cites} (conf ${f.confidence.toFixed(2)})`);
  }
  if (brief.openQuestions.length) {
    lines.push("", "OPEN QUESTIONS:");
    for (const q of brief.openQuestions) lines.push(`- ${q}`);
  }
  lines.push("", "SOURCES:");
  brief.sources.forEach((s, i) => lines.push(`[${i + 1}] (${s.kind}) ${s.title} — ${s.url}`));
  return lines.join("\n");
}
