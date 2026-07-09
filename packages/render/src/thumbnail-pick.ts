// Tier 6 — vision-driven thumbnail selection. Runs in the render farm (Node).
// Given the video's candidate beat STILLS (signed image URLs), Claude picks in a
// SINGLE call: the most thumbnail-worthy frame, a text-placement zone that avoids
// the subject, and (fallback only) the best-matching kinetic headline. Live when
// ANTHROPIC_API_KEY is set; returns null otherwise so the caller keeps its
// deterministic behaviour. Sibling of footage/frame-critic.ts (same Claude
// vision pattern); uses URL image sources since beat stills are signed URLs.

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export const THUMB_PLACEMENTS = ["top-left", "top-right", "center", "bottom-left", "bottom-right"] as const;
export type ThumbPlacement = (typeof THUMB_PLACEMENTS)[number];

export type ThumbCandidate = { beatIdx: number; imageUrl: string; text: string };

export type ThumbnailPick = {
  beatIdx: number;
  placement: ThumbPlacement;
  /** Index into the provided headline options, or -1. */
  highlightIdx: number;
  costUsd: number;
};

export function thumbnailVisionLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DELIVER_TOOL = {
  name: "deliver_thumbnail_pick",
  description: "Pick the best thumbnail frame, the headline placement zone, and the headline.",
  input_schema: {
    type: "object",
    properties: {
      bestBeatIdx: {
        type: "number",
        description: "beatIdx of the single most thumbnail-worthy frame: striking, a clear focal subject, strong contrast — not muddy, cluttered, or near-blank.",
      },
      placement: {
        type: "string",
        enum: THUMB_PLACEMENTS as unknown as string[],
        description: "Where a big bold headline should sit so it does NOT cover the main subject of the chosen frame — pick the emptiest region.",
      },
      bestHighlightIdx: {
        type: "number",
        description: "Index into the provided HEADLINE OPTIONS that best fits the chosen frame, or -1 if the list is empty / none fit.",
      },
    },
    required: ["bestBeatIdx", "placement", "bestHighlightIdx"],
  },
} as const;

export async function pickThumbnail(opts: {
  title: string;
  candidates: ThumbCandidate[];
  highlights: string[];
}): Promise<ThumbnailPick | null> {
  if (!thumbnailVisionLive() || opts.candidates.length === 0) return null;
  const cands = opts.candidates.slice(0, 6);

  const intro =
    `You are designing the YouTube thumbnail for "${opts.title}". Below are candidate still frames from the video, each labeled with its beatIdx. Choose:\n` +
    `1) bestBeatIdx — the single most thumbnail-worthy frame (striking, clear focal subject, strong contrast; avoid muddy/cluttered/near-blank).\n` +
    `2) placement — where a big bold headline should sit so it does NOT cover the main subject (pick the emptiest region).\n` +
    `3) bestHighlightIdx — from the HEADLINE OPTIONS, the one that best fits the chosen frame (or -1 if empty / none fit).\n` +
    `Then call deliver_thumbnail_pick.`;

  const content: unknown[] = [{ type: "text", text: intro }];
  for (const c of cands) {
    content.push({ type: "text", text: `beatIdx ${c.beatIdx}: "${c.text.slice(0, 120)}"` });
    content.push({ type: "image", source: { type: "url", url: c.imageUrl } });
  }
  content.push({
    type: "text",
    text: opts.highlights.length
      ? `HEADLINE OPTIONS:\n${opts.highlights.map((h, i) => `[${i}] ${h}`).join("\n")}`
      : "HEADLINE OPTIONS: (none) — return bestHighlightIdx -1.",
  });

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        tools: [DELIVER_TOOL],
        tool_choice: { type: "tool", name: "deliver_thumbnail_pick" },
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const inp = data.content.find((c) => c.type === "tool_use")?.input as
    | { bestBeatIdx?: number; placement?: string; bestHighlightIdx?: number }
    | undefined;
  if (!inp || typeof inp.bestBeatIdx !== "number") return null;

  const valid = new Set(cands.map((c) => c.beatIdx));
  const beatIdx = valid.has(inp.bestBeatIdx) ? inp.bestBeatIdx : cands[0].beatIdx;
  const placement = (THUMB_PLACEMENTS as readonly string[]).includes(inp.placement ?? "")
    ? (inp.placement as ThumbPlacement)
    : "bottom-left";
  const rawHi = Number.isInteger(inp.bestHighlightIdx) ? Number(inp.bestHighlightIdx) : -1;
  const highlightIdx = rawHi >= 0 && rawHi < opts.highlights.length ? rawHi : -1;
  const costUsd = (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;

  return { beatIdx, placement, highlightIdx, costUsd: Math.round(costUsd * 1000) / 1000 };
}
