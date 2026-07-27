import "server-only";

/**
 * Composer intent router (ClickMax transition §3.1, Phase 2).
 *
 * Chat is the main driver: every message resolves to a registered workspace
 * action (or a graceful reply — never an error, never a silent no-op). Two
 * tiers:
 *
 *  1. Heuristic pass — fast, free, fully offline (mock mode works). Covers
 *     the high-frequency verbs: continue, regenerate beat N (visual/VO),
 *     rewrite script, request revision, full auto, spend/QC questions.
 *  2. LLM pass — when ANTHROPIC_API_KEY is live and the heuristics are
 *     unsure, a small tool-use call picks an action from the registry
 *     serialized as tools. The model can only NAME a registered action —
 *     params are validated by the registry before anything executes.
 *
 * Ambiguity degrades gracefully (§3.1): unresolved input becomes a clarifying
 * reply, or a steering note on the focused card when one is provided.
 */
import { listWorkspaceActions } from "@/lib/workspace/registry";
import { anthropicFetch } from "@/lib/adapters/anthropic";

export type ComposerMode = "idea" | "script" | "image" | "video" | "voice";

export type RoutedIntent =
  | {
      kind: "action";
      action: string;
      params: Record<string, unknown>;
      /** Short confirmation-style label ("Regenerating beat 4's visual"). */
      label: string;
    }
  | { kind: "reply"; text: string };

export type RouteContext = {
  videoId: string;
  projectId?: string;
  status: string;
  atGate: boolean;
  mode: ComposerMode;
  /** Card the composer is focused on, if any. */
  focused?: { kind: string; beatIdx?: number; assetId?: string } | null;
  modelId?: string;
  durationSec?: number;
  targetLengthSec?: number;
};

const BEAT_RE = /\b(?:beat|scene)\s*#?\s*(\d+)/i;

/** 1-based user speech ("scene 4") → 0-based beat index. */
function beatIdxFrom(text: string, ctx: RouteContext): number | undefined {
  const m = BEAT_RE.exec(text);
  if (m) return Math.max(0, Number(m[1]) - 1);
  if (ctx.focused?.beatIdx != null) return ctx.focused.beatIdx;
  return undefined;
}

export function routeHeuristic(text: string, ctx: RouteContext): RoutedIntent | null {
  const t = text.trim();
  const lower = t.toLowerCase();

  // Continue / advance — the one ceremony.
  if (/^(continue|next( stage)?|advance|approve( it)?|keep going|proceed|go ahead|render it)\.?!?$/.test(lower)) {
    return {
      kind: "action",
      action: "continue",
      params: { videoId: ctx.videoId, atGate: ctx.atGate, status: ctx.status, targetLengthSec: ctx.targetLengthSec },
      label: ctx.atGate ? "Approving this stage and continuing" : "Running the next stage",
    };
  }

  // Auto-fix (QC-flagged repair pass).
  if (/\b(auto-?fix|fix (it|that|the (issues?|flags?|problems?))|repair)\b/.test(lower)) {
    return {
      kind: "action",
      action: "auto_fix",
      params: { videoId: ctx.videoId, projectId: ctx.projectId },
      label: "Running an auto-fix pass",
    };
  }

  // Full auto.
  if (/\b(full ?auto|autopilot (this|it)|finish (it|the video) automatically)\b/.test(lower)) {
    return {
      kind: "action",
      action: "full_auto",
      params: { videoId: ctx.videoId },
      label: "Autopiloting this video to render",
    };
  }

  // Re-sing: swap the voice, keep the exact lyrics + scenes. Must precede the
  // write_song matcher below so "sing it again with minimax" doesn't trigger a
  // full lyric rewrite.
  {
    const resing =
      /\b(re-?sing|sing (it|this|the song) (again|over|with)|swap the (voice|singer)|different (voice|singer)|keep the (same )?lyrics)\b/.test(
        lower,
      );
    if (resing) {
      const modelId = /lyria/.test(lower)
        ? "lyria-3-pro"
        : /eleven ?labs/.test(lower)
          ? "elevenlabs-song"
          : /mini ?max/.test(lower)
            ? "minimax-music-v2"
            : undefined;
      return {
        kind: "action",
        action: "resing_song",
        params: { videoId: ctx.videoId, modelId },
        label: `Re-singing with ${modelId ?? "the default model"}`,
      };
    }
  }

  // Song videos (children's-channel build): "write a song about sharing",
  // "make a song about counting to five", "sing a song about colours".
  {
    const songMatch = /\b(write|make|create|generate|sing)\b[^.]*\bsong\b/.test(lower);
    if (songMatch) {
      const about = /\babout\s+(.+)$/i.exec(t.replace(/[.!?]+$/, ""));
      const modelId = /lyria/.test(lower)
        ? "lyria-3-pro"
        : /eleven ?labs/.test(lower)
          ? "elevenlabs-song"
          : undefined;
      return {
        kind: "action",
        action: "write_song",
        params: {
          videoId: ctx.videoId,
          topic: about?.[1]?.trim() || undefined,
          modelId,
        },
        label: about?.[1] ? `Writing a song about ${about[1].trim()}` : "Writing the song",
      };
    }
  }

  // Avatar shots (avatar build): "make beat 3 an avatar", "avatar for beat 2",
  // "redo beat 3's avatar". Re-sync routes separately (the cheap edit path).
  {
    const beatForAvatar = beatIdxFrom(t, ctx);
    if (/\bre-?sync\b/.test(lower) && /\bavatar|lip-?sync\b/.test(lower) && beatForAvatar != null) {
      return {
        kind: "action",
        action: "resync_beat_avatar",
        params: { videoId: ctx.videoId, beatIdx: beatForAvatar },
        label: `Re-syncing beat ${beatForAvatar + 1}'s avatar to the latest VO`,
      };
    }
    if (/\bavatar|presenter|talking head\b/.test(lower) && beatForAvatar != null) {
      const modelId = /omnihuman/.test(lower)
        ? "omnihuman-1-5"
        : /infinitalk/.test(lower)
          ? "infinitalk"
          : /veed|fabric/.test(lower)
            ? /720/.test(lower)
              ? "veed-fabric-720"
              : "veed-fabric-480"
            : undefined;
      return {
        kind: "action",
        action: "generate_beat_avatar",
        params: { videoId: ctx.videoId, beatIdx: beatForAvatar, modelId },
        label: `Rendering beat ${beatForAvatar + 1} as an avatar shot${modelId ? ` (${modelId})` : ""}`,
      };
    }
  }

  // Cast corrections (Character Studio Phase 3): "add Breeze to beat 3",
  // "put Bo in beat 2", "remove Poppy from beat 4", "take Bo out of beat 1".
  // Must precede the beat-visual re-roll rule, which would otherwise swallow
  // phrasings like "put Bo in the shot for beat 3".
  {
    const castBeat = beatIdxFrom(t, ctx);
    if (castBeat != null) {
      const addMatch = /\b(?:add|put|include|bring)\s+(.+?)\s+(?:in|into|to|back into)\b/i.exec(t);
      const removeMatch =
        /\b(?:remove|drop|exclude|take)\s+(.+?)\s+(?:out of|from|off)\b/i.exec(t);
      const names = (raw: string) =>
        raw
          .split(/\s*(?:,|\band\b)\s*/i)
          .map((s) => s.replace(/^(the|a|an)\s+/i, "").trim())
          .filter((s) => s.length > 0 && !/^beat\b/i.test(s))
          .join(",");
      const add = addMatch ? names(addMatch[1]) : "";
      const remove = removeMatch ? names(removeMatch[1]) : "";
      if (add || remove) {
        const what = [add ? `adding ${add}` : null, remove ? `removing ${remove}` : null]
          .filter(Boolean)
          .join(" and ");
        return {
          kind: "action",
          action: "set_beat_cast",
          params: {
            videoId: ctx.videoId,
            beatIdx: castBeat,
            ...(add ? { add } : {}),
            ...(remove ? { remove } : {}),
          },
          label: `Beat ${castBeat + 1} cast: ${what}`,
        };
      }
    }
  }

  // Exemplar mining (agent-training Step 2).
  if (/\b(mine|study|learn from|analyze)\b.*\b(exemplars?|winners?|top videos?|the competition|best performers?)\b/.test(lower)) {
    return {
      kind: "action",
      action: "mine_exemplars",
      params: { projectId: ctx.projectId },
      label: "Mining winner exemplars from the niche",
    };
  }

  // Performance / outcome questions (agent-training Step 4).
  if (/\b(performing|performance|views|doing)\b/.test(lower) && /\?|how|are|what/.test(lower)) {
    return {
      kind: "action",
      action: "get_performance",
      params: { projectId: ctx.projectId },
      label: "Checking channel performance",
    };
  }

  // Questions → read-only actions.
  if (/\b(spent|spend|cost|how much)\b/.test(lower) && /\?|how|what/.test(lower)) {
    return { kind: "action", action: "get_spend", params: { videoId: ctx.videoId }, label: "Checking spend" };
  }
  if (/\bqc|quality|flag(ged)?|issues?\b/.test(lower) && /\?|what|why|did/.test(lower)) {
    return { kind: "action", action: "get_qc_summary", params: { videoId: ctx.videoId }, label: "Checking QC" };
  }

  const wantsRegen = /\b(re-?gen(erate)?|re-?do|re-?roll|re-?make|another (take|version|shot)|try again|new take)\b/.test(lower);
  const beatIdx = beatIdxFrom(t, ctx);

  // VO take. In voice mode a bare "new take for beat N" is a VO ask; in other
  // modes a voice keyword is required so visual re-rolls don't get captured.
  const voWord = /\b(vo|voice(over)?|narration|audio|read)\b/.test(lower);
  if ((wantsRegen && voWord) || (ctx.mode === "voice" && (wantsRegen || voWord))) {
    if (beatIdx != null) {
      return {
        kind: "action",
        action: "regenerate_beat_vo",
        params: { videoId: ctx.videoId, beatIdx },
        label: `New VO take for beat ${beatIdx + 1}`,
      };
    }
    return { kind: "reply", text: "Which beat's voiceover should I re-take? (e.g. “beat 3”, or select its card)" };
  }

  // Beat visual re-roll (optionally steered by the rest of the message).
  if (beatIdx != null && (wantsRegen || /\b(visual|image|clip|shot|frame|b-?roll)\b/.test(lower))) {
    const note = t.replace(BEAT_RE, "").replace(/\b(re-?gen(erate)?|re-?do|re-?roll|re-?make|try again)\b/gi, "").trim();
    return {
      kind: "action",
      action: "regenerate_beat_visual",
      params: { videoId: ctx.videoId, beatIdx, note: note || undefined },
      label: `Re-rolling beat ${beatIdx + 1}'s visual`,
    };
  }

  // Whole-script rewrite.
  if (wantsRegen && /\b(script|the whole thing|all beats)\b/.test(lower)) {
    return {
      kind: "action",
      action: "regenerate_script",
      params: { videoId: ctx.videoId },
      label: "Rewriting the script as a new version",
    };
  }

  // Generate an AI clip for a beat (video mode carries model/duration from the toolbar).
  if (ctx.mode === "video" && beatIdx != null && ctx.modelId) {
    return {
      kind: "action",
      action: "generate_beat_clip",
      params: {
        videoId: ctx.videoId,
        beatIdx,
        modelId: ctx.modelId,
        durationSec: ctx.durationSec ?? 5,
      },
      label: `Generating a clip for beat ${beatIdx + 1}`,
    };
  }

  // Focused-card fallback: any other instruction while focused on a visual
  // card steers a re-roll of that card.
  if (ctx.focused?.beatIdx != null && ctx.focused.kind === "clip" && t.length > 0) {
    return {
      kind: "action",
      action: "regenerate_beat_visual",
      params: { videoId: ctx.videoId, beatIdx: ctx.focused.beatIdx, note: t },
      label: `Re-rolling beat ${ctx.focused.beatIdx + 1}'s visual with your note`,
    };
  }

  // Revision with notes at a gate ("change the hook", "make it faster paced").
  if (ctx.atGate && /\b(change|rework|instead|make (it|the)|punchier|shorter|longer|faster|slower|fix)\b/.test(lower)) {
    return {
      kind: "action",
      action: "request_revision",
      params: { videoId: ctx.videoId, notes: t },
      label: "Sending this stage back with your notes",
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* LLM escalation                                                      */
/* ------------------------------------------------------------------ */

const ROUTER_MODEL = "claude-haiku-4-5";

function isAnthropicLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Registry serialized as Anthropic tools — the model can only pick from it. */
function registryAsTools() {
  return listWorkspaceActions().map((a) => ({
    name: a.name,
    description: a.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(a.params).map(([k, spec]) => [k, { type: spec.type, description: spec.description }]),
      ),
      required: Object.entries(a.params)
        .filter(([, spec]) => spec.required)
        .map(([k]) => k),
    },
  }));
}

async function routeLlm(text: string, ctx: RouteContext): Promise<RoutedIntent | null> {
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        max_tokens: 300,
        system:
          `You route a creator's message to ONE workspace action for their video (id ${ctx.videoId}, ` +
          `status ${ctx.status}${ctx.atGate ? ", holding at an approval gate" : ""}, composer mode ${ctx.mode}). ` +
          `Beat numbers in speech are 1-based; beatIdx params are 0-based. ` +
          `Always include videoId. If no action fits, reply with one short clarifying question instead of forcing a tool.`,
        messages: [{ role: "user", content: text }],
        tools: registryAsTools(),
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      content?: { type: string; name?: string; input?: Record<string, unknown>; text?: string }[];
    };
    const tool = body.content?.find((c) => c.type === "tool_use");
    if (tool?.name) {
      return {
        kind: "action",
        action: tool.name,
        params: { videoId: ctx.videoId, ...(tool.input ?? {}) },
        label: `Running ${tool.name.replace(/_/g, " ")}`,
      };
    }
    const reply = body.content?.find((c) => c.type === "text")?.text?.trim();
    return reply ? { kind: "reply", text: reply } : null;
  } catch (err) {
    console.error("intent router LLM pass failed:", err);
    return null;
  }
}

/** Mode-aware graceful fallback when nothing routed (§3.1: never an error). */
function fallbackReply(ctx: RouteContext): RoutedIntent {
  const hints: Record<ComposerMode, string> = {
    idea: "Tell me a topic or title to research, or say “continue” to approve the current idea.",
    script: "I can rewrite the script (“regenerate the script”), revise it with notes at the gate, or “continue” to assets.",
    image: "Describe the thumbnail or scene to generate, or name a beat (“redo beat 3, warmer light”).",
    video: "Pick a model and name a beat (“generate beat 4, 8 seconds”), or “continue” when assets look good.",
    voice: "Name the beat to re-take (“new take for beat 2”).",
  };
  return { kind: "reply", text: `I wasn't sure what to run. ${hints[ctx.mode]}` };
}

/** The router: heuristics → LLM (when live) → graceful fallback. */
export async function routeIntent(text: string, ctx: RouteContext): Promise<RoutedIntent> {
  const heuristic = routeHeuristic(text, ctx);
  if (heuristic) return heuristic;
  if (isAnthropicLive()) {
    const llm = await routeLlm(text, ctx);
    if (llm) return llm;
  }
  return fallbackReply(ctx);
}
