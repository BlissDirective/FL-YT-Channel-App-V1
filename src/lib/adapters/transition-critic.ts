import "server-only";
import { isGeminiLive } from "@/lib/adapters/gemini-video";
import { isTwelveLabsLive } from "@/lib/adapters/twelvelabs";
import type { Boundary, TemporalTransition, WatchIssue } from "@/lib/pipeline/watch-gate";

/**
 * Tier-2 temporal transition pass (Self-Watch #1, Fable5-Self-Watch-Loop-Plan.md
 * Phase 3). Escalated from the cheap structural Tier-1 check only when enough
 * shot boundaries warrant it. Uses **Gemini native video** over OUR rendered
 * MP4's signed URL — Google fetches the URL server-side, so no local ffmpeg /
 * frame extraction is needed (it runs in the app runtime, unlike the render
 * farm). TwelveLabs Pegasus is the documented alternative (its upload→index flow
 * stays the next increment); when only a TwelveLabs key is present we skip
 * rather than pretend.
 *
 * Analysis only, over our own asset; degradable — no key / failure → not
 * evaluated, and the structural Tier-1 verdict stands.
 */

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_USD_PER_1M = 0.5;

export function isTemporalLive(): boolean {
  return isGeminiLive() || isTwelveLabsLive();
}

export type TransitionAssessment = TemporalTransition & { costUsd: number };

const NOT_EVALUATED: TransitionAssessment = { score: 0, evaluated: false, issues: [], costUsd: 0 };

function prompt(boundaries: Boundary[]): string {
  const ts = boundaries.slice(0, 20).map((b) => `${b.atSec.toFixed(1)}s`).join(", ");
  return `You are a video editor QC'ing the TRANSITIONS in a short faceless-YouTube video. Watch it and judge how smooth the cuts and motion are, paying special attention to these shot boundaries: ${ts || "(all cuts)"}.

Return STRICT JSON:
{
  "score": <0-10 overall transition/motion smoothness>,
  "issues": [ { "t": <seconds:number>, "detail": <what's jarring: hard flash, color/subject jump, stutter, whip, mismatched motion> } ]
}
Only list genuine problems (max 5). A clean video has an empty issues array and a high score.`;
}

export async function assessTransitions(opts: { videoUrl: string; boundaries: Boundary[] }): Promise<TransitionAssessment> {
  // Gemini native path (no download). TwelveLabs-only → skip for now.
  if (!isGeminiLive() || !opts.videoUrl) return NOT_EVALUATED;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ fileData: { fileUri: opts.videoUrl } }, { text: prompt(opts.boundaries) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 2048 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini transitions ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return NOT_EVALUATED;
    const parsed = JSON.parse(text) as { score?: number; issues?: { t?: number; detail?: string }[] };
    const score = Math.max(0, Math.min(10, Number(parsed.score ?? 0)));
    const issues: WatchIssue[] = (parsed.issues ?? []).slice(0, 5).map((i) => ({
      criterion: "motion_continuity" as const,
      beatIdx: null,
      detail: `${typeof i.t === "number" ? `${i.t.toFixed(1)}s — ` : ""}${String(i.detail ?? "jarring transition").slice(0, 200)}`,
    }));
    const tokens = data.usageMetadata?.totalTokenCount ?? 0;
    const costUsd = Math.round((tokens / 1e6) * GEMINI_USD_PER_1M * 100) / 100;
    return { score, evaluated: true, issues, costUsd };
  } catch (err) {
    console.error("temporal transition pass failed (non-fatal):", err);
    return NOT_EVALUATED;
  }
}
