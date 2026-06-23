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

/** Build the final prompt for an image/video model from a raw visual direction. */
export function buildVisualPrompt(visualPrompt: string, style: string): string {
  return `${scrubVisualPrompt(visualPrompt)}. ${style} style, cinematic 16:9, ${NO_TEXT_SUFFIX}`;
}
