/**
 * Visual-prompt hygiene for generated images & video.
 *
 * Diffusion/video models render readable text badly — they turn a brand name
 * into garbled gibberish ("Nogle" for Google) and any named company/product is
 * also a trademark/legal risk. So we (a) strip brand/company/product names from
 * every visual prompt and (b) append a strong "no text of any kind" clause.
 * Narration is NEVER touched — only the prompt sent to the visual model.
 */

/** Names diffusion models try (and fail) to render as on-screen text/logos. */
const BRAND_BLOCKLIST = [
  "google", "alphabet", "amazon", "aws", "nvidia", "anthropic", "openai",
  "chatgpt", "claude", "gemini", "copilot", "apple", "microsoft", "azure",
  "meta", "facebook", "instagram", "whatsapp", "tiktok", "twitter",
  "tsmc", "intel", "amd", "arm", "qualcomm", "broadcom", "asml", "micron",
  "samsung", "sk hynix", "hynix", "tesla", "spacex", "youtube", "netflix",
  "oracle", "ibm", "dell", "hp", "cisco", "supermicro", "palantir",
  "cerebras", "groq", "huawei", "sony", "toyota", "ford", "boeing",
];

/**
 * Remove brand/company/product names (and their possessives) from a visual
 * prompt so the model can't try to spell them. Case-insensitive, word-boundary.
 */
export function scrubVisualPrompt(prompt: string): string {
  let p = prompt;
  for (const name of BRAND_BLOCKLIST) {
    p = p.replace(new RegExp(`\\b${name}(?:['’]s)?\\b`, "gi"), "");
  }
  // Tidy whitespace and dangling punctuation left by removals.
  return p
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/^[\s,;:.-]+/, "")
    .trim();
}

/**
 * Strong negative clause appended to every image/video prompt — no readable
 * text or logos of any kind (models render them sloppily; brand text is a legal
 * risk). Use together with scrubVisualPrompt.
 */
export const NO_TEXT_SUFFIX =
  "absolutely no text, no words, no letters, no numbers, no captions, no logos, no brand names, no signage, no labels, no UI, no watermark, no readable writing of any kind";

// ── Visual Bible (VCE V1) ───────────────────────────────────────────────
// A per-video continuity bible the MVDA derives once from the whole script and
// conditions every beat's prompt on. See Fable-5-Visual-Craft-Engine-Build-Spec.md.

export type VisualBibleSubject = {
  /** Stable slug used to match the subject against a beat's raw direction. */
  id: string;
  /** Human label (e.g. "AlphaFold protein model"). */
  label: string;
  /** Photoreal descriptor injected into prompts that reference this subject. */
  descriptor: string;
};

export type VisualBible = {
  subjects: VisualBibleSubject[];
  setting?: string;
  palette?: string[];
  /** One-line style contract applied to every prompt for consistency. */
  styleContract?: string;
  motifs?: string[];
  /** Clichés/artifacts to steer away from (merged into the negative clause). */
  avoid?: string[];
  version?: number;
  model?: string;
  createdAt?: string;
};

/**
 * Condition a raw visual direction on the video's Visual Bible (pure). Appends
 * the descriptors of any subjects this beat references (local relevance) plus
 * the setting + style contract + palette (global consistency). A null/undefined
 * bible returns the direction unchanged — so with the bible off, prompts build
 * byte-identically to before V1.
 */
export function applyBible(visualPrompt: string, bible?: VisualBible | null): string {
  if (!bible) return visualPrompt;
  const base = visualPrompt.trim();
  const low = base.toLowerCase();
  const relevant = (bible.subjects ?? []).filter(
    (s) =>
      (s.label && low.includes(s.label.toLowerCase())) ||
      (s.id && low.includes(s.id.toLowerCase().replace(/[-_]/g, " "))),
  );
  const parts = [base];
  if (relevant.length > 0) {
    parts.push(`Depict specifically: ${relevant.map((s) => s.descriptor).join("; ")}.`);
  }
  if (bible.setting) parts.push(`Setting: ${bible.setting}.`);
  if (bible.styleContract) parts.push(`Style: ${bible.styleContract}.`);
  if (bible.palette && bible.palette.length > 0) parts.push(`Palette: ${bible.palette.join(", ")}.`);
  return parts.join(" ").trim();
}

/** The bible's avoid-list as a negative clause fragment (pure). "" when empty. */
export function bibleNegatives(bible?: VisualBible | null): string {
  const avoid = (bible?.avoid ?? []).map((s) => s.trim()).filter(Boolean);
  if (avoid.length === 0) return "";
  // Dedupe case-insensitively, preserve order.
  const seen = new Set<string>();
  const uniq = avoid.filter((a) => {
    const k = a.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return `avoid: ${uniq.join(", ")}`;
}

/** Build the final prompt for an image/video model from a raw visual direction.
    Optionally conditioned on the Visual Bible (VCE V1) — omitted → unchanged. */
export function buildVisualPrompt(visualPrompt: string, style: string, bible?: VisualBible | null): string {
  const directed = applyBible(visualPrompt, bible);
  const neg = bibleNegatives(bible);
  return `${scrubVisualPrompt(directed)}. ${style} style, cinematic 16:9, ${NO_TEXT_SUFFIX}${neg ? `, ${neg}` : ""}`;
}
