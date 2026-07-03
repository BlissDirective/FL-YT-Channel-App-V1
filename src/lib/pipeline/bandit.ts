/**
 * Format-level Thompson sampling (Harness C5, Fable5-Agentic-Harness-Plan.md).
 *
 * A single-operator channel doesn't have the traffic for per-video A/B tests,
 * so the bandit runs at the FORMAT level: arms are (format × length-band ×
 * tier), each published video is one pull, and the reward is Bernoulli —
 * did the video beat the channel's rolling baseline outcome? Thompson sampling
 * over Beta posteriors balances explore/exploit and is robust to the delayed,
 * noisy rewards YouTube analytics give.
 *
 * The posterior draw uses the Normal approximation to Beta (mean ± z·sd) — a
 * standard, dependency-free Thompson variant; the cold-start regime (few
 * trials) is handled explicitly by the exploration floor rather than by the
 * approximation. The RNG is injected so the core is pure and unit-testable.
 */

export type ArmStats = { successes: number; trials: number };

/** Below this many observations an arm is exploration-only (optimistic). */
export const MIN_TRIALS = 5;

/** Box–Muller standard normal from two uniforms in (0,1]. */
export function standardNormal(u1: number, u2: number): number {
  const a = Math.max(1e-12, u1);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u2);
}

/**
 * One Thompson draw for an arm: Normal approximation to Beta(α, β) with
 * α = successes + 1, β = failures + 1 (Laplace prior). Returns a value in
 * [0, 1]. `z` is a standard-normal draw supplied by the caller.
 */
export function thompsonDraw(stats: ArmStats, z: number): number {
  const alpha = stats.successes + 1;
  const beta = stats.trials - stats.successes + 1;
  const n = alpha + beta;
  const mean = alpha / n;
  const variance = (alpha * beta) / (n * n * (n + 1));
  const sample = mean + z * Math.sqrt(variance);
  return Math.min(1, Math.max(0, sample));
}

export type ArmDraw = { key: string; score: number; stats: ArmStats; exploring: boolean };

/**
 * Sample every arm and return them best-first. Arms below MIN_TRIALS get an
 * optimistic score so under-explored options keep getting tried (the cold
 * start is deliberate exploration, not exploitation of a lucky early win).
 * `gauss()` returns independent standard-normal draws.
 */
export function sampleArms(
  arms: Map<string, ArmStats>,
  gauss: () => number,
  minTrials = MIN_TRIALS,
): ArmDraw[] {
  const draws: ArmDraw[] = [];
  for (const [key, stats] of arms) {
    const exploring = stats.trials < minTrials;
    // Optimistic bump for under-explored arms: nudge the draw toward 1 so the
    // bandit doesn't abandon an arm on a couple of unlucky early pulls.
    const base = thompsonDraw(stats, gauss());
    const score = exploring ? base + (1 - base) * (1 - stats.trials / minTrials) * 0.5 : base;
    draws.push({ key, score, stats, exploring });
  }
  return draws.sort((a, b) => b.score - a.score);
}

/** Bernoulli reward: 1 when the video's outcome beat the channel baseline. */
export function rewardFromOutcome(outcome: number, baseline: number): 0 | 1 {
  return outcome >= baseline && baseline > 0 ? 1 : outcome > baseline ? 1 : 0;
}

/** Median of a numeric list (the rolling channel baseline). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── Arm keys ──────────────────────────────────────────────────────────

/** Coarse length bands so arms don't fragment into single-video buckets. */
export function lengthBand(seconds: number): string {
  if (seconds <= 75) return "s"; // short
  if (seconds <= 240) return "m"; // 1–4 min
  if (seconds <= 600) return "l"; // 4–10 min
  return "xl"; // 10 min+
}

export function armKey(format: "short" | "long", seconds: number, tier: string): string {
  return `${format}:${lengthBand(seconds)}:${tier}`;
}

export function formatOfArm(key: string): "short" | "long" {
  return key.startsWith("short:") ? "short" : "long";
}
