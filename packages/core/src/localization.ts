/**
 * Localization & dub pipeline (OpenMontage Remixed list1 #10).
 *
 * A repurpose path over a finished EDD: to ship a video in another language you
 * swap the VO track and the caption pages per language — the visuals, timeline,
 * and cut stay identical. A real monetization multiplier on content you already
 * made. Pure planning here; the adapters translate + synthesize.
 */

export type Language = { code: string; label: string; rtl?: boolean };

export const LANGUAGES: Language[] = [
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "ar", label: "Arabic", rtl: true },
  { code: "id", label: "Indonesian" },
];

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export type DubMode = "subtitle" | "dub" | "both";

export type DubPlan = {
  targetLang: string;
  mode: DubMode;
  /** Voice to synthesize the translated narration with (dub modes). */
  voiceId?: string | null;
  /** Number of VO segments to re-synthesize (dub) and caption pages to
      translate (subtitle) — the work estimate. */
  voSegments: number;
  captionPages: number;
  /** Which tracks the repurpose swaps. */
  swaps: ("vo" | "captions")[];
};

/** Plan the repurpose for one target language from the source counts. Pure. */
export function planDub(input: {
  targetLang: string;
  mode: DubMode;
  voiceId?: string | null;
  voSegments: number;
  captionPages: number;
}): DubPlan {
  const swaps: DubPlan["swaps"] = [];
  if (input.mode === "dub" || input.mode === "both") swaps.push("vo");
  if (input.mode === "subtitle" || input.mode === "both") swaps.push("captions");
  return {
    targetLang: input.targetLang,
    mode: input.mode,
    voiceId: input.voiceId ?? null,
    voSegments: swaps.includes("vo") ? input.voSegments : 0,
    captionPages: swaps.includes("captions") ? input.captionPages : 0,
    swaps,
  };
}

/** Rough cost of a dub (VO re-synth + translation), for the pre-run estimate.
    Pure — actual spend is enforced at generation time. */
export function estimateDubCostUsd(plan: DubPlan): number {
  const vo = plan.voSegments * 0.03; // ~narration re-synth per segment
  const tx = (plan.captionPages + plan.voSegments) * 0.002; // translation
  return Math.round((vo + tx) * 100) / 100;
}

/** Apply translated caption text back onto the timed pages (timings unchanged,
    the cut is identical). Pure — `translations` is parallel to `pages`. */
export function localizeCaptions<T extends { text: string }>(pages: T[], translations: string[]): T[] {
  return pages.map((p, i) => ({ ...p, text: translations[i] ?? p.text }));
}
