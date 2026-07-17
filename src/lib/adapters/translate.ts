import "server-only";
import { getLanguage } from "@studio/core";

/**
 * Translation adapter (list1 #10) — mock-first. With a translation key it calls
 * a real API; otherwise it returns a clearly-tagged mock so the localization/dub
 * pipeline wires end-to-end with zero credentials. Batched to one round-trip.
 */

export function isTranslateLive(): boolean {
  return Boolean(process.env.TRANSLATE_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/** Translate a batch of strings into the target language. Never throws — mocks
    on any failure so a dub can always be planned/previewed. */
export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  const lang = getLanguage(targetLang);
  if (!lang) return texts;
  if (!isTranslateLive() || !process.env.ANTHROPIC_API_KEY) {
    return texts.map((t) => `[${lang.code}] ${t}`);
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content:
              `Translate each line into ${lang.label}. Return ONLY a JSON array of strings, same order, same length:\n` +
              JSON.stringify(texts),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`translate ${res.status}`);
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const txt = json.content?.find((c) => c.type === "text")?.text ?? "[]";
    const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1)) as string[];
    return Array.isArray(arr) && arr.length === texts.length ? arr : texts.map((t) => `[${lang.code}] ${t}`);
  } catch (err) {
    console.error(`translate fell back to mock: ${String(err).slice(0, 120)}`);
    return texts.map((t) => `[${lang.code}] ${t}`);
  }
}
