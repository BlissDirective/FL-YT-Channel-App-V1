import "server-only";
import type { Perception } from "@/lib/db/types";

/**
 * Gemini video perception (Phase C, primary path). Gemini ingests a public
 * YouTube URL natively — Google fetches it server-side, so WE never download
 * (the minimal-gate path). Returns timestamped notes + transcript that fold
 * into the Claude blueprint. Analysis only; nothing is reused in output.
 *
 * Live when GEMINI_API_KEY is set; deterministic mock otherwise.
 */

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
// Rough blended $/1M tokens for the ledger (video tokenizes heavily; estimate).
const GEMINI_USD_PER_1M = 0.5;

export function isGeminiLive(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const PROMPT = `You are a YouTube content strategist studying ONE reference video to learn what makes it work — for original idea generation only.

Watch it and return STRICT JSON:
{
  "notes": [ { "t": <seconds:number>, "sceneDesc": <what's on screen>, "onScreenText": <any text/graphics, or "">, "shotType": <"talking-head"|"b-roll"|"graphic"|"archival"|"other">, "pacingNote": <cut/energy note, or ""> } ],
  "transcript": <the spoken transcript as one string>
}

Sample a note roughly every 5–10 seconds (denser in the first 30s). Be concrete. Do not copy long verbatim passages beyond the transcript field.`;

export type GeminiResult = {
  perception: Perception;
  costUsd: number;
  provider: "gemini" | "mock";
};

export async function analyzeYoutubeVideo(opts: { url: string }): Promise<GeminiResult> {
  if (!isGeminiLive()) {
    return {
      perception: {
        notes: [
          { t: 0, sceneDesc: "Cold-open hook (mock — no GEMINI_API_KEY)", onScreenText: "", shotType: "talking-head", pacingNote: "fast" },
          { t: 8, sceneDesc: "Context / setup", onScreenText: "", shotType: "b-roll", pacingNote: "" },
        ],
        transcript: "(mock perception — add GEMINI_API_KEY for live frame-by-frame analysis)",
      },
      costUsd: 0,
      provider: "mock",
    };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ fileData: { fileUri: opts.url } }, { text: PROMPT }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { totalTokenCount?: number };
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no analysis — the video may be private, too long, or unsupported.");
  }
  let perception: Perception;
  try {
    perception = JSON.parse(text) as Perception;
  } catch {
    throw new Error("Gemini returned malformed perception JSON.");
  }
  if (!Array.isArray(perception.notes)) perception.notes = [];
  if (typeof perception.transcript !== "string") perception.transcript = "";

  const tokens = data.usageMetadata?.totalTokenCount ?? 0;
  const costUsd = Math.round((tokens / 1e6) * GEMINI_USD_PER_1M * 100) / 100;
  return { perception, costUsd, provider: "gemini" };
}
