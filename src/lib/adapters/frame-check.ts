import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

/**
 * Full-frame gate for directed keyframes (vision), run BEFORE any clip spend.
 *
 * Batch 01 lesson Q15: SOUL sometimes renders a still as a smaller picture
 * inside blurred letterbox bands ("repost" framing), sometimes with a fake
 * signature. Seedance animates exactly that frame, so a bad still becomes
 * $8–$18 of unusable clip. Pixel statistics can't tell those bands apart from
 * genuine tilt-shift defocus, so this asks a cheap vision model one question.
 *
 * Resilient: null on any failure (no key, API error), so it never blocks the
 * pipeline on its own absence.
 */

const MODEL = process.env.FRAME_CHECK_MODEL?.trim() || "claude-haiku-4-5";

export function isFrameCheckLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type FrameVerdict = { fullFrame: boolean; reason: string; costUsd: number };

const TOOL = {
  name: "deliver_frame_check",
  description: "Report whether the picture fills the whole frame.",
  input_schema: {
    type: "object",
    properties: {
      fullFrame: {
        type: "boolean",
        description:
          "false if the scene is shown as a smaller picture inside the frame: blurred or solid bands above/below " +
          "(or left/right) with a straight edge, a frame-within-frame, picture-in-picture, a phone/screen border, " +
          "or a visible signature/watermark. Natural lens defocus that fades gradually into the scene is fine (true).",
      },
      reason: { type: "string", description: "One short line: what you saw." },
    },
    required: ["fullFrame", "reason"],
  },
} as const;

/** Downscale to a small JPEG so the request stays tiny and cheap. */
async function toJpeg(bytes: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(bytes, { failOn: "none" }).resize({ width: 512, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return out.toString("base64");
  } catch {
    return null;
  }
}

/** Stills generated per keyframe before the video is held for review. */
export const FRAME_ATTEMPTS = 3;

/**
 * Generate until a still passes the full-frame check (up to `attempts`).
 * `onAttempt` sees every generation so its cost is recorded even when the
 * still is rejected. An unavailable check (null) accepts the still.
 */
export async function firstFullFrame<T extends { image: Buffer }>(
  generate: () => Promise<T>,
  check: (image: Buffer) => Promise<FrameVerdict | null>,
  onAttempt: (out: T, verdict: FrameVerdict | null) => Promise<void>,
  attempts = FRAME_ATTEMPTS,
): Promise<{ ok: true; out: T } | { ok: false; reasons: string[] }> {
  const reasons: string[] = [];
  for (let i = 0; i < attempts; i++) {
    const out = await generate();
    const verdict = await check(out.image);
    await onAttempt(out, verdict);
    if (!verdict || verdict.fullFrame) return { ok: true, out };
    reasons.push(verdict.reason);
  }
  return { ok: false, reasons };
}

export async function checkFullFrame(image: Buffer): Promise<FrameVerdict | null> {
  if (!isFrameCheckLive()) return null;
  const data = await toJpeg(image);
  if (!data) return null;
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_frame_check" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "This is the first frame of a video shot. Does the scene fill the entire frame edge to edge? " +
                  "Look for a straight horizontal edge where a sharp picture meets a blurred copy of itself above or below it " +
                  "(blurred letterbox bands), borders, a frame-within-frame, or a signature/watermark. Then call deliver_frame_check.",
              },
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = body.content.find((c) => c.type === "tool_use")?.input as { fullFrame?: boolean; reason?: string } | undefined;
    if (!input || typeof input.fullFrame !== "boolean") return null;
    return {
      fullFrame: input.fullFrame,
      reason: String(input.reason ?? "").slice(0, 200),
      costUsd: anthropicCostUsd(MODEL, body.usage.input_tokens, body.usage.output_tokens),
    };
  } catch (err) {
    console.error("checkFullFrame failed:", err);
    return null;
  }
}
