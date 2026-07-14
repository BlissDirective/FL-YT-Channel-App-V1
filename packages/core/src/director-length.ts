/**
 * Director Mode length brackets (Fable-5-Director-Mode-Build-Spec.md §4.5).
 *
 * At idea time the operator picks a format (Short/Long) and an exact bracket.
 * The script agent targets [minSec, maxSec] by word budget; after voiceover
 * synthesis the actual duration is checked against the bracket and flagged
 * (advisory only — never a block) if it lands outside.
 *
 * These are a SUPERSET of the autonomous-mode `SHORT_LENGTHS` and never replace
 * them: autonomous videos keep their tier/target behavior untouched.
 */

export type DirectorFormat = "short" | "long";

export type LengthBracket = {
  /** Stable id, stored on videos.length_target.bracket. */
  id: string;
  format: DirectorFormat;
  label: string;
  minSec: number;
  maxSec: number;
};

export const DIRECTOR_LENGTH_BRACKETS: readonly LengthBracket[] = [
  { id: "15-30s", format: "short", label: "15–30 sec", minSec: 15, maxSec: 30 },
  { id: "30-60s", format: "short", label: "30–60 sec", minSec: 30, maxSec: 60 },
  { id: "60-90s", format: "short", label: "60–90 sec", minSec: 60, maxSec: 90 },
  { id: "90-180s", format: "short", label: "90–180 sec", minSec: 90, maxSec: 180 },
  { id: "1-2min", format: "long", label: "1–2 min", minSec: 60, maxSec: 120 },
  { id: "2-3min", format: "long", label: "2–3 min", minSec: 120, maxSec: 180 },
  { id: "3-4min", format: "long", label: "3–4 min", minSec: 180, maxSec: 240 },
  { id: "4-5min", format: "long", label: "4–5 min", minSec: 240, maxSec: 300 },
  { id: "5-6min", format: "long", label: "5–6 min", minSec: 300, maxSec: 360 },
  { id: "6-8min", format: "long", label: "6–8 min", minSec: 360, maxSec: 480 },
  { id: "8-10min", format: "long", label: "8–10 min", minSec: 480, maxSec: 600 },
  { id: "10-12min", format: "long", label: "10–12 min", minSec: 600, maxSec: 720 },
  { id: "12-15min", format: "long", label: "12–15 min", minSec: 720, maxSec: 900 },
] as const;

export function bracketById(id: string): LengthBracket | undefined {
  return DIRECTOR_LENGTH_BRACKETS.find((b) => b.id === id);
}

export function bracketsForFormat(format: DirectorFormat): LengthBracket[] {
  return DIRECTOR_LENGTH_BRACKETS.filter((b) => b.format === format);
}

/** Bracket midpoint (seconds) — the target the script word-budget aims for. */
export function bracketMidpointSec(b: Pick<LengthBracket, "minSec" | "maxSec">): number {
  return Math.round((b.minSec + b.maxSec) / 2);
}

/**
 * Classify an actual (post-VO) duration against a bracket. Pure — used by the
 * duration-check advisory flag and its unit tests.
 *  - "in": within [minSec, maxSec]
 *  - "under" / "over": outside, with the signed delta in seconds and percent.
 */
export function classifyDuration(
  actualSec: number,
  b: Pick<LengthBracket, "minSec" | "maxSec">,
): { verdict: "in" | "under" | "over"; deltaSec: number; deltaPct: number } {
  const mid = bracketMidpointSec(b);
  const deltaSec = Math.round(actualSec - mid);
  const deltaPct = mid > 0 ? Math.round(((actualSec - mid) / mid) * 100) : 0;
  if (actualSec < b.minSec) return { verdict: "under", deltaSec, deltaPct };
  if (actualSec > b.maxSec) return { verdict: "over", deltaSec, deltaPct };
  return { verdict: "in", deltaSec, deltaPct };
}

/** Format seconds as m:ss (e.g. 277 → "4:37"). */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type LengthAdvisory = {
  actualSec: number;
  actualLabel: string;
  targetLabel: string;
  verdict: "in" | "under" | "over";
  deltaSec: number;
  deltaPct: number;
  /** true when derived from a word-count estimate (no VO synthesized yet). */
  estimated: boolean;
  /** Human sentence for the advisory chip + the Revise-to-length note. */
  message: string;
};

/**
 * Build the length advisory for a Director video (spec §4.5 step 3). Pure so it
 * is unit-tested and reusable server- and client-side. `actualSec` is the summed
 * VO duration when available, else a word-count estimate (pass `estimated:true`).
 * Returns null when there's nothing meaningful to compare yet.
 */
export function buildLengthAdvisory(opts: {
  actualSec: number;
  bracketId: string;
  estimated: boolean;
}): LengthAdvisory | null {
  const b = bracketById(opts.bracketId);
  if (!b || opts.actualSec <= 0) return null;
  const c = classifyDuration(opts.actualSec, b);
  const actualLabel = formatDuration(opts.actualSec);
  const sign = c.deltaPct > 0 ? "+" : "";
  const base = `${opts.estimated ? "Estimated " : "Ran "}${actualLabel} against a ${b.label} target`;
  const message =
    c.verdict === "in"
      ? `${base} — on target.`
      : `${base} (${sign}${c.deltaPct}%). ${
          c.verdict === "over"
            ? "Tighten the script — cut filler and merge beats — to land in-window."
            : "Expand the script — add depth or an example — to land in-window."
        }`;
  return {
    actualSec: opts.actualSec,
    actualLabel,
    targetLabel: b.label,
    verdict: c.verdict,
    deltaSec: c.deltaSec,
    deltaPct: c.deltaPct,
    estimated: opts.estimated,
    message,
  };
}
