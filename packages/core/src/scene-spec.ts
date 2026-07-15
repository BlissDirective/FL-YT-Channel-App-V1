/**
 * Visual Craft Engine V5 — the Remotion scene vocabulary + overlay authoring.
 *
 * Remotion is a deterministic code renderer, not a diffusion model — it renders
 * authored SPECS, not prompts. This module is the MVDA's vocabulary: typed
 * scene archetypes it can emit from a beat (rendered near-free on the farm),
 * plus the overlay track it composites over generative clips. All pure — the
 * authoring + ticker math are unit-tested; the React compositions in
 * packages/render consume these specs.
 */

export type ScenePalette = string[];

export type SceneSpec =
  | { kind: "quote_card"; quote: string; attribution?: string; palette: ScenePalette }
  | { kind: "stat_callout"; value: string; label: string; palette: ScenePalette }
  | { kind: "number_ticker"; from: number; to: number; prefix?: string; suffix?: string; label?: string; palette: ScenePalette }
  | { kind: "comparison"; left: { label: string; value: string }; right: { label: string; value: string }; palette: ScenePalette }
  | { kind: "process_flow"; steps: string[]; palette: ScenePalette };

export type SceneKind = SceneSpec["kind"];

export type OverlayCaption = { text: string; startMs: number; endMs: number };
export type OverlayCallout = { text: string; atMs: number; kind: "stat" | "label" };
export type OverlaySpec = { captions: OverlayCaption[]; callouts: OverlayCallout[] };

const DEFAULT_PALETTE = ["#0E7C86", "#1B1F24", "#E8E6DF"];

// ── Extraction helpers (pure) ───────────────────────────────────────────

/** Pull a quoted span, else the first sentence, from text. */
export function extractQuote(text: string): string {
  const q = text.match(/["“”']([^"“”']{6,140})["“”']/);
  if (q) return q[1].trim();
  const first = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? text.trim();
  return first.slice(0, 140);
}

/** Pull the most prominent number (with optional %/$/unit) and a label. */
export function extractStat(text: string): { value: string; label: string } | null {
  const m = text.match(/(\$?\d[\d,]*\.?\d*\s?(?:%|percent|billion|million|thousand|x|×)?)/i);
  if (!m) return null;
  const value = m[1].replace(/\s+/g, " ").trim();
  // Label = a few words around the number.
  const idx = text.indexOf(m[0]);
  const after = text.slice(idx + m[0].length).replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).slice(0, 4).join(" ");
  const before = text.slice(0, idx).replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).slice(-3).join(" ");
  return { value, label: (after || before || "").trim() };
}

/** Parse a numeric ticker target from a stat value (e.g. "$45" → 45). */
export function statToNumber(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Split a process/comparison beat into steps (pure). */
export function extractSteps(text: string): string[] {
  return text
    .split(/(?:\band then\b|→|;|\.|\bnext\b|\bstep \d\b)/i)
    .map((s) => s.replace(/[^A-Za-z0-9 %$-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 3)
    .slice(0, 4);
}

// ── Authoring (pure) ────────────────────────────────────────────────────

/**
 * Author a Remotion scene from a beat's intent (pure). Returns null when the
 * beat isn't a good fit for a programmatic scene (→ generate/ground instead).
 */
export function authorScene(
  intent: string,
  beat: { text: string },
  palette: ScenePalette = DEFAULT_PALETTE,
): SceneSpec | null {
  const pal = palette.length > 0 ? palette : DEFAULT_PALETTE;
  if (intent === "quote") {
    return { kind: "quote_card", quote: extractQuote(beat.text), palette: pal };
  }
  if (intent === "data") {
    const stat = extractStat(beat.text);
    if (!stat) return null;
    const n = statToNumber(stat.value);
    // A round-ish integer reads well as a ticker; otherwise a static callout.
    if (n >= 2 && Number.isInteger(n)) {
      const prefix = stat.value.trim().startsWith("$") ? "$" : "";
      const suffix = /%/.test(stat.value) ? "%" : "";
      return { kind: "number_ticker", from: 0, to: n, prefix, suffix, label: stat.label, palette: pal };
    }
    return { kind: "stat_callout", value: stat.value, label: stat.label, palette: pal };
  }
  if (intent === "concept") {
    if (/\b(vs\.?|versus|compared to)\b/i.test(beat.text)) {
      const parts = beat.text.split(/\bvs\.?\b|\bversus\b|\bcompared to\b/i);
      return {
        kind: "comparison",
        left: { label: (parts[0] ?? "").trim().slice(0, 40) || "A", value: "" },
        right: { label: (parts[1] ?? "").trim().slice(0, 40) || "B", value: "" },
        palette: pal,
      };
    }
    const steps = extractSteps(beat.text);
    if (steps.length >= 2) return { kind: "process_flow", steps, palette: pal };
    return null;
  }
  return null;
}

/**
 * Validate a scene spec has everything its composition needs (pure). Returns the
 * list of problems ([] = valid) so the render worker can reject a malformed spec.
 */
export function validateSceneSpec(spec: SceneSpec): string[] {
  const problems: string[] = [];
  if (!spec.palette || spec.palette.length === 0) problems.push("empty palette");
  switch (spec.kind) {
    case "quote_card":
      if (!spec.quote?.trim()) problems.push("quote_card missing quote");
      break;
    case "stat_callout":
      if (!spec.value?.trim()) problems.push("stat_callout missing value");
      break;
    case "number_ticker":
      if (!(spec.to > spec.from)) problems.push("number_ticker needs to > from");
      break;
    case "comparison":
      if (!spec.left?.label || !spec.right?.label) problems.push("comparison needs both labels");
      break;
    case "process_flow":
      if (!spec.steps || spec.steps.length < 2) problems.push("process_flow needs ≥2 steps");
      break;
  }
  return problems;
}

/** Eased ticker value at a frame (pure) — used by the NumberTicker composition. */
export function tickerValueAt(from: number, to: number, frame: number, durFrames: number): number {
  if (durFrames <= 0) return to;
  const t = Math.max(0, Math.min(1, frame / durFrames));
  const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
  return Math.round((from + (to - from) * eased) * 100) / 100;
}

// ── Overlay authoring (pure) ────────────────────────────────────────────

/**
 * Author the overlay track for a generative clip (pure): kinetic captions from
 * the VO word timings (grouped into short readable windows) + a stat callout
 * when the beat names a number. Composited over the base clip at render.
 */
export function authorOverlay(
  beat: { text: string },
  words: { w: string; start: number; end: number }[],
  opts: { maxWordsPerCaption?: number } = {},
): OverlaySpec {
  const per = opts.maxWordsPerCaption ?? 4;
  const captions: OverlayCaption[] = [];
  for (let i = 0; i < words.length; i += per) {
    const group = words.slice(i, i + per);
    if (group.length === 0) continue;
    captions.push({
      text: group.map((g) => g.w).join(" "),
      startMs: Math.round(group[0].start * 1000),
      endMs: Math.round(group[group.length - 1].end * 1000),
    });
  }
  const callouts: OverlayCallout[] = [];
  const stat = extractStat(beat.text);
  if (stat) {
    const at = captions.length > 0 ? captions[Math.floor(captions.length / 2)].startMs : 0;
    callouts.push({ text: `${stat.value} ${stat.label}`.trim(), atMs: at, kind: "stat" });
  }
  return { captions, callouts };
}
