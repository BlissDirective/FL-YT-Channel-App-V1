/**
 * Taste profile, style playbooks & quality-rules-as-constraints
 * (OpenMontage Remixed list2 #13/#14/#24, A6, C9; list1 #16).
 *
 * A per-project TASTE PROFILE (design read, visual variance, motion intensity,
 * information density, plus an editable anti-patterns list) is carried from the
 * proposal through every stage and conditions the Visual Bible, compositor, and
 * critics — the big consistency lever (#13, A6). Reusable STYLE PLAYBOOKS are
 * named per-niche looks (#16). And the playbook/taste QUALITY_RULES compile into
 * machine-checkable constraints the linter/critics ENFORCE, not prose the agent
 * may ignore (#24, C9). A DISTINCTNESS check rejects generic output (#14).
 *
 * Pure — no I/O — so rule enforcement + distinctness scoring are deterministic
 * and unit-tested; the app persists the profile and runs the checks.
 */

// ── Taste profile (#13 / A6) ──────────────────────────────────────────────
export type TasteDial = 0 | 1 | 2 | 3 | 4; // low → high

export type TasteProfile = {
  /** How designed/polished vs. raw (0 = raw, 4 = highly art-directed). */
  designRead: TasteDial;
  /** How much shot-to-shot visual variety (0 = uniform, 4 = eclectic). */
  visualVariance: TasteDial;
  /** Motion energy (0 = still/slow, 4 = kinetic). */
  motionIntensity: TasteDial;
  /** On-screen information density (0 = sparse, 4 = packed). */
  informationDensity: TasteDial;
  /** Editable "never do this" list the critics treat as hard constraints. */
  antiPatterns: string[];
  /** Machine-checkable rules (see QualityRule). */
  qualityRules: QualityRule[];
};

export const DEFAULT_TASTE_PROFILE: TasteProfile = {
  designRead: 3,
  visualVariance: 2,
  motionIntensity: 2,
  informationDensity: 2,
  antiPatterns: [
    "No zoom-bounce on every still",
    "No more than 3 crossfades in a row",
    "No more than 2 caption lines on screen",
  ],
  qualityRules: [
    { id: "caption_max_wps", metric: "captionWordsPerSec", op: "lte", value: 3 },
    { id: "min_shot_len", metric: "shotLenSec", op: "gte", value: 1.2 },
    { id: "max_consecutive_crossfades", metric: "consecutiveCrossfades", op: "lte", value: 3 },
    { id: "palette_limit", metric: "paletteCount", op: "lte", value: 5 },
  ],
};

// ── Quality rules as machine-checkable constraints (#24 / C9) ──────────────
export type RuleOp = "lte" | "gte" | "eq";
export type QualityRule = {
  id: string;
  /** The measured metric name the linter/critic supplies. */
  metric: string;
  op: RuleOp;
  value: number;
  /** critical rules block; suggestion/nitpick only warn (ties into #26 tiers). */
  severity?: "critical" | "suggestion" | "nitpick";
};

export type RuleViolation = {
  rule: QualityRule;
  measured: number;
  severity: "critical" | "suggestion" | "nitpick";
  note: string;
};

function passes(op: RuleOp, measured: number, value: number): boolean {
  if (op === "lte") return measured <= value;
  if (op === "gte") return measured >= value;
  return measured === value;
}

const OP_WORD: Record<RuleOp, string> = { lte: "≤", gte: "≥", eq: "=" };

/**
 * Enforce quality rules against measured metrics. Returns the violations
 * (empty = compliant). A metric the caller didn't measure is skipped (can't
 * enforce what wasn't checked). Pure.
 */
export function checkQualityRules(
  rules: QualityRule[],
  measured: Record<string, number>,
): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const rule of rules) {
    const m = measured[rule.metric];
    if (m == null || !Number.isFinite(m)) continue;
    if (!passes(rule.op, m, rule.value)) {
      out.push({
        rule,
        measured: m,
        severity: rule.severity ?? "critical",
        note: `${rule.metric} = ${m} violates ${rule.metric} ${OP_WORD[rule.op]} ${rule.value}`,
      });
    }
  }
  return out;
}

/** Any critical violation blocks (mirrors the 3-tier findings rule, #26). */
export function hasCriticalViolation(violations: RuleViolation[]): boolean {
  return violations.some((v) => v.severity === "critical");
}

// ── Style playbooks (#16) ──────────────────────────────────────────────────
export type StylePlaybook = {
  id: string;
  label: string;
  niche: string;
  description: string;
  /** Dial overrides applied on top of the project taste profile. */
  taste: Partial<Pick<TasteProfile, "designRead" | "visualVariance" | "motionIntensity" | "informationDensity">>;
  palette: string[];
  qualityRules: QualityRule[];
};

export const STYLE_PLAYBOOKS: StylePlaybook[] = [
  {
    id: "explainer-clean",
    label: "Clean Explainer",
    niche: "education / how-to",
    description: "Calm, high design-read, motion-graphics-forward. Legible over flashy.",
    taste: { designRead: 4, motionIntensity: 1, informationDensity: 3, visualVariance: 1 },
    palette: ["#0b1220", "#f5b829", "#7dd3fc", "#f4f1ea"],
    qualityRules: [
      { id: "caption_max_wps", metric: "captionWordsPerSec", op: "lte", value: 2.5 },
      { id: "min_shot_len", metric: "shotLenSec", op: "gte", value: 1.5 },
    ],
  },
  {
    id: "cinematic-doc",
    label: "Cinematic Documentary",
    niche: "history / deep-dive",
    description: "Filmic, restrained motion, generous shot lengths, muted palette.",
    taste: { designRead: 3, motionIntensity: 2, informationDensity: 1, visualVariance: 3 },
    palette: ["#14110c", "#c98a00", "#8a8578", "#f4f1ea"],
    qualityRules: [
      { id: "min_shot_len", metric: "shotLenSec", op: "gte", value: 2 },
      { id: "max_consecutive_crossfades", metric: "consecutiveCrossfades", op: "lte", value: 2 },
    ],
  },
  {
    id: "kinetic-short",
    label: "Kinetic Short",
    niche: "shorts / hooks",
    description: "High energy, dense captions, rapid cuts — built for retention.",
    taste: { designRead: 3, motionIntensity: 4, informationDensity: 4, visualVariance: 3 },
    palette: ["#08070d", "#f5b829", "#f0876c", "#a78bfa"],
    qualityRules: [
      { id: "caption_max_wps", metric: "captionWordsPerSec", op: "lte", value: 3.5 },
      { id: "min_shot_len", metric: "shotLenSec", op: "gte", value: 0.8 },
    ],
  },
];

export function getStylePlaybook(id: string): StylePlaybook | undefined {
  return STYLE_PLAYBOOKS.find((p) => p.id === id);
}

/** Merge a playbook onto a base taste profile (playbook rules take priority). */
export function applyPlaybook(base: TasteProfile, playbook: StylePlaybook): TasteProfile {
  const ruleById = new Map<string, QualityRule>();
  for (const r of base.qualityRules) ruleById.set(r.id, r);
  for (const r of playbook.qualityRules) ruleById.set(r.id, r);
  return { ...base, ...playbook.taste, qualityRules: [...ruleById.values()] };
}

// ── Distinctness (#14) ─────────────────────────────────────────────────────
export type DistinctnessInput = {
  /** Generic-hook phrases present in the hook/title (caller extracts). */
  genericPhrases: number;
  /** Distinct visual mediums used across beats (variety = distinct). */
  mediumVariety: number;
  /** Whether a signature/branded element (playbook palette, motif) is present. */
  hasSignatureElement: boolean;
  /** Named entities / specific claims (specificity ≈ distinctness). */
  specificClaims: number;
};

export type DistinctnessVerdict = {
  score: number; // 0..1
  pass: boolean;
  reasons: string[];
};

/**
 * "Could this be any other product's video?" — a structural distinctness score.
 * Generic hooks + no signature element + low specificity drag it down; medium
 * variety + specific claims + a signature element lift it. A cheap pre-gate
 * before escalating to an LLM distinctness judge. Pure.
 */
export function scoreDistinctness(input: DistinctnessInput, floor = 0.55): DistinctnessVerdict {
  const reasons: string[] = [];
  let score = 0.5;
  if (input.genericPhrases > 0) {
    score -= Math.min(0.3, input.genericPhrases * 0.12);
    reasons.push(`${input.genericPhrases} generic hook phrase(s)`);
  }
  if (input.hasSignatureElement) score += 0.15;
  else reasons.push("no signature/branded element");
  score += Math.min(0.2, input.mediumVariety * 0.05);
  score += Math.min(0.2, input.specificClaims * 0.04);
  if (input.specificClaims === 0) reasons.push("no specific claims/entities");
  score = Math.max(0, Math.min(1, score));
  return { score: Math.round(score * 100) / 100, pass: score >= floor, reasons };
}
