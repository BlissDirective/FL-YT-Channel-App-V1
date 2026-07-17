/**
 * Reviewer protocols + structured blocker escalation (OpenMontage Remixed
 * list2 #23/#25/#26/#27; B5/B7/B8; list1 #23/#25).
 *
 * Codifies HOW the studio's reviewers behave, as data the judges/autofix loop
 * read:
 *  - a REVIEW_FOCUS per stage — each gate's reviewer gets a stage-specific lens
 *    (script → hook+payoff, assets → consistency+distinctness, cut → pacing+
 *    captions) instead of a generic pass (#27 / B8).
 *  - 3-TIER findings (critical / suggestion / nitpick) — only critical blocks
 *    (#26).
 *  - a MAX-2-ROUNDS cap on the QC↔revision loop, then pass-with-warnings /
 *    escalate — so a video can't burn budget ping-ponging (#25 / B7).
 *  - a STRUCTURED BLOCKER object ({ blocker, tried[], needs, options[] }) that
 *    renders as an actionable "your turn" card instead of a vague pause reason
 *    (#23 / B5).
 *
 * Pure — the app/worker read these; the logic is deterministic + unit-tested.
 */

// ── Review focus per stage (#27 / B8) ─────────────────────────────────────
export type ReviewStage = "idea" | "script" | "assets" | "cut" | "final";

export const REVIEW_FOCUS: Record<ReviewStage, { focus: string; checks: string[] }> = {
  idea: { focus: "hook + payoff", checks: ["Is the hook specific?", "Is there a clear payoff promise?"] },
  script: { focus: "hook + payoff", checks: ["Does the open earn attention?", "Does every beat advance the payoff?", "Any dead air?"] },
  assets: { focus: "consistency + distinctness", checks: ["Consistent look across shots?", "Could this be any other channel's footage?", "Relevance to the beat?"] },
  cut: { focus: "pacing + captions", checks: ["Pacing holds retention?", "Captions ≤2 lines, in sync?", "No more than 3 crossfades in a row?"] },
  final: { focus: "technical + policy", checks: ["Broken frames / audio?", "Loudness in band?", "Policy risk?"] },
};

export function reviewFocusFor(stage: ReviewStage): { focus: string; checks: string[] } {
  return REVIEW_FOCUS[stage];
}

// ── 3-tier findings (#26) ──────────────────────────────────────────────────
export type FindingSeverity = "critical" | "suggestion" | "nitpick";
export type Finding = { severity: FindingSeverity; message: string; where?: string };

export type TieredFindings = {
  critical: Finding[];
  suggestion: Finding[];
  nitpick: Finding[];
  /** Only a critical finding blocks a gate. */
  blocks: boolean;
};

export function tierFindings(findings: Finding[]): TieredFindings {
  const critical = findings.filter((f) => f.severity === "critical");
  const suggestion = findings.filter((f) => f.severity === "suggestion");
  const nitpick = findings.filter((f) => f.severity === "nitpick");
  return { critical, suggestion, nitpick, blocks: critical.length > 0 };
}

// ── Max-2-rounds reviewer cap (#25 / B7) ───────────────────────────────────
export const MAX_REVIEW_ROUNDS = 2;

export type ReviewLoopDecision = {
  /** Run another revision round. */
  revise: boolean;
  /** Ship despite non-critical findings (cap reached, no critical). */
  passWithWarnings: boolean;
  /** Hand to the operator (cap reached WITH critical findings). */
  escalate: boolean;
  reason: string;
};

/**
 * Decide what to do after a review round. Passes clean immediately; otherwise
 * revises until the cap, then ships-with-warnings (no critical) or escalates
 * (critical remains). Prevents infinite polish spend. Pure.
 */
export function reviewLoopDecision(
  roundsCompleted: number,
  findings: TieredFindings,
  maxRounds = MAX_REVIEW_ROUNDS,
): ReviewLoopDecision {
  if (!findings.blocks && findings.suggestion.length === 0) {
    return { revise: false, passWithWarnings: false, escalate: false, reason: "Clean — passes." };
  }
  if (roundsCompleted < maxRounds && findings.blocks) {
    return { revise: true, passWithWarnings: false, escalate: false, reason: `Revising (round ${roundsCompleted + 1} of ${maxRounds}).` };
  }
  if (findings.blocks) {
    return { revise: false, passWithWarnings: false, escalate: true, reason: `${maxRounds} rounds reached with critical findings — over to you.` };
  }
  return { revise: false, passWithWarnings: true, escalate: false, reason: "Passing with warnings (no critical findings)." };
}

// ── Structured blocker escalation (#23 / B5) ───────────────────────────────
export type BlockerOption = { id: string; label: string; action?: string };

export type StructuredBlocker = {
  /** One-line what's blocked. */
  blocker: string;
  category: "provider" | "budget" | "content" | "config" | "quality" | "unknown";
  /** What was attempted before giving up. */
  tried: string[];
  /** What's needed to proceed. */
  needs: string;
  /** Actionable choices the operator can take (raise cap / swap provider / …). */
  options: BlockerOption[];
  /** The agent's recommended option id. */
  recommendation?: string;
};

/** Build a structured blocker; guarantees the shape so the UI card is stable. */
export function buildBlocker(input: Partial<StructuredBlocker> & { blocker: string }): StructuredBlocker {
  return {
    blocker: input.blocker,
    category: input.category ?? "unknown",
    tried: input.tried ?? [],
    needs: input.needs ?? "Operator decision",
    options: input.options ?? [],
    recommendation: input.recommendation,
  };
}

/** Render a structured blocker to a compact prose line (back-compat with the
    plain `paused_reason` string field). Pure. */
export function blockerToReason(b: StructuredBlocker): string {
  return `${b.blocker} — needs: ${b.needs}.`;
}

/**
 * Upgrade a legacy plain `paused_reason` string into a structured blocker with
 * actionable options (B5), by category. Lets the "your turn" card render for
 * existing holds without re-plumbing every pause site. Pure.
 */
export function categorizeBlocker(reason: string): StructuredBlocker {
  const r = reason.toLowerCase();
  if (/budget|cap|\$|exceed/.test(r)) {
    return buildBlocker({
      blocker: reason,
      category: "budget",
      needs: "a higher budget cap or a cheaper plan",
      options: [
        { id: "raise_cap", label: "Raise the budget cap", action: "open_settings" },
        { id: "cheaper", label: "Switch to a cheaper tier", action: "open_settings" },
      ],
      recommendation: "raise_cap",
    });
  }
  if (/render|upload|youtube|oauth|provider|fal|down|failed/.test(r)) {
    return buildBlocker({
      blocker: reason,
      category: "provider",
      needs: "a working provider or a manual step",
      options: [
        { id: "retry", label: "Retry", action: "retry" },
        { id: "swap", label: "Swap provider", action: "open_settings" },
        { id: "manual", label: "Do it manually", action: "open_publish" },
      ],
      recommendation: "retry",
    });
  }
  if (/qc|score|quality|defect|black|silence|frames|audio/.test(r)) {
    return buildBlocker({
      blocker: reason,
      category: "quality",
      needs: "a fix or an override",
      options: [
        { id: "rerender", label: "Re-render", action: "rerender" },
        { id: "approve", label: "Approve anyway", action: "approve" },
      ],
      recommendation: "rerender",
    });
  }
  return buildBlocker({ blocker: reason, category: "content", needs: "your review", options: [{ id: "review", label: "Review", action: "open" }] });
}
