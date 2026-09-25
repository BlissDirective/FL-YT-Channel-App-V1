/**
 * Claude spend profile (operator decision, Sep 2026).
 *
 * `lean` (DEFAULT): Claude runs only where it is critical to autonomous
 * production. That means scripting, research/fact-check, editing/assembly,
 * quality gates (QC, auto-fix), and director decisions (visual bible, shot
 * planner, art director, MVDA cut agent). Background self-improvement and
 * analytics jobs are PAUSED:
 *   • intelligence   — daily niche scouting (+ operator-signal mining)
 *   • optimizer      — weekly performance optimizer
 *   • editing-research — weekly editing-craft research
 *   • librarian      — nightly lesson synthesis / promotion
 *   • video-intel    — competitor video vision analysis queue
 *   • competitive-judge — Self-Watch competitive-fit LLM judge
 *
 * `full`: everything runs (the pre-Sep-2026 behaviour).
 * Re-enable a single job while staying lean: AI_ENABLE_JOBS=optimizer,librarian
 *
 * Client-safe; the GitHub Actions workers read the same env names.
 */

export type AiSpendProfile = "lean" | "full";

export type NonCriticalAiJob =
  | "intelligence"
  | "optimizer"
  | "editing-research"
  | "librarian"
  | "video-intel"
  | "competitive-judge";

type Env = Record<string, string | undefined>;

export function aiSpendProfile(env: Env = process.env): AiSpendProfile {
  return (env.AI_SPEND_PROFILE ?? "").toLowerCase() === "full" ? "full" : "lean";
}

/** Whether a non-critical Claude job may run under the current profile. */
export function nonCriticalAiAllowed(job: NonCriticalAiJob, env: Env = process.env): boolean {
  if (aiSpendProfile(env) === "full") return true;
  const enabled = (env.AI_ENABLE_JOBS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return enabled.includes(job);
}

/** Standard skip payload for a cron route paused by the lean profile. */
export function leanSkip(job: NonCriticalAiJob) {
  return {
    ok: true,
    skipped: "lean-ai-profile",
    job,
    note: `Paused by AI_SPEND_PROFILE=lean. Set AI_SPEND_PROFILE=full or AI_ENABLE_JOBS=${job} to run it.`,
  };
}
