/**
 * Decision Communication Contract + ask-before-major-changes (OpenMontage
 * Remixed list2 #20/#21) and first-run onboarding (#28).
 *
 * #20 — before ANY paid call the agent announces what it's about to do:
 * tool / provider / model / reason / sample-or-batch. Huge for director-mode
 * trust. #21 — an explicit set of mid-run changes that RE-TRIGGER approval
 * (switch provider/model/treatment/engine, drop narration/music, sample→batch).
 * #28 — a vague first message maps to tailored starter prompts so a curious
 * user is "making a video in <60s".
 *
 * Pure — deterministic + unit-tested.
 */

// ── Pre-spend announcement (#20) ──────────────────────────────────────────
export type SpendAnnouncement = {
  tool: string;
  provider: string;
  model?: string;
  reason: string;
  mode: "sample" | "batch";
  estCostUsd: number;
};

/** One-line "about to spend" announcement shown before a paid call. Pure. */
export function announceSpend(a: SpendAnnouncement): string {
  const model = a.model ? ` · ${a.model}` : "";
  return `▶ ${a.tool} via ${a.provider}${model} — ${a.reason} (${a.mode}, ~$${a.estCostUsd.toFixed(2)})`;
}

// ── Ask-before-major-changes (#21) ────────────────────────────────────────
export type RunChangeKind =
  | "switch_provider"
  | "switch_model"
  | "switch_treatment"
  | "switch_engine"
  | "drop_narration"
  | "drop_music"
  | "sample_to_batch"
  | "raise_budget"
  | "aspect_change";

/** The mid-run changes that re-open a gate (require operator re-approval). */
export const RE_GATE_CHANGES: RunChangeKind[] = [
  "switch_provider",
  "switch_model",
  "switch_treatment",
  "switch_engine",
  "drop_narration",
  "drop_music",
  "sample_to_batch",
  "raise_budget",
];

export function requiresReapproval(change: RunChangeKind): boolean {
  return RE_GATE_CHANGES.includes(change);
}

/** A human explanation of why a change re-opens a gate. Pure. */
export function reapprovalReason(change: RunChangeKind): string {
  const map: Record<RunChangeKind, string> = {
    switch_provider: "Switching provider changes cost + reliability — needs your OK.",
    switch_model: "Switching model changes quality + cost — needs your OK.",
    switch_treatment: "Changing the visual treatment changes the look — needs your OK.",
    switch_engine: "Changing the render engine changes the output — needs your OK.",
    drop_narration: "Dropping narration changes the whole video — needs your OK.",
    drop_music: "Dropping music changes the feel — needs your OK.",
    sample_to_batch: "Going from a sample to a full batch spends real money — needs your OK.",
    raise_budget: "Raising the budget cap spends more — needs your OK.",
    aspect_change: "Aspect change re-frames the cut.",
  };
  return map[change];
}
