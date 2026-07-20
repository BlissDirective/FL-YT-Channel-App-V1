/**
 * Pure MVDA session guard logic (Phase C, plan §4 "hard hooks") — the
 * mechanical, prompt-independent gate every tool call passes through
 * (canUseTool). Unit-tested in tests/agent-guards.test.ts.
 */

export type SessionState = {
  maxBudgetUsd: number;
  spentUsd: number;
  previews: number;
  judges: number;
  versions: number;
  lessons: number;
  /** §C.1 visual-grounding renders (timeline_view) this session. */
  views: number;
  /** Latest judge_preview overall score for the CURRENT head (null = unjudged). */
  judgeScore: number | null;
  /** C2 — the cut gate's floor; mark_ready is denied below it. */
  floor: number;
  killSwitch: boolean;
};

// Raised alongside MAX_TURNS so the agent can run several genuine
// see→edit→re-see→judge cycles instead of one; still bounded to prevent spend
// runaway (the mechanical budget cap in gateTool remains the hard stop).
export const SESSION_CAPS = { previews: 4, judges: 4, versions: 20, lessons: 3, views: 6 } as const;

/** Tools that spend money (Anthropic vision / render minutes). */
const PAID = new Set(["render_preview", "judge_preview"]);
/** Tools that mutate the document/state (blocked under the kill switch). */
const MUTATING = new Set([
  "propose_edd", "retime_clip", "trim_clip", "set_transition", "set_motion",
  "set_emphasis", "set_caption_style", "set_silent", "swap_visual",
  "auto_emphasis", "add_sfx",
  "render_preview", "judge_preview", "mark_ready", "write_lesson",
]);

export type Gate = { allow: true } | { allow: false; reason: string };

export function gateTool(name: string, s: SessionState): Gate {
  if (s.killSwitch && MUTATING.has(name)) {
    return { allow: false, reason: "kill switch is ON — session is read-only" };
  }
  if (PAID.has(name) && s.spentUsd >= s.maxBudgetUsd) {
    return { allow: false, reason: `session budget exhausted ($${s.spentUsd.toFixed(2)} / $${s.maxBudgetUsd})` };
  }
  if (name === "render_preview" && s.previews >= SESSION_CAPS.previews) {
    return { allow: false, reason: `preview cap reached (${SESSION_CAPS.previews}/session)` };
  }
  if (name === "judge_preview" && s.judges >= SESSION_CAPS.judges) {
    return { allow: false, reason: `judge cap reached (${SESSION_CAPS.judges}/session)` };
  }
  if (name === "write_lesson" && s.lessons >= SESSION_CAPS.lessons) {
    return { allow: false, reason: `lesson cap reached (${SESSION_CAPS.lessons}/session)` };
  }
  if (name === "timeline_view" && s.views >= SESSION_CAPS.views) {
    return { allow: false, reason: `timeline_view cap reached (${SESSION_CAPS.views}/session)` };
  }
  if (MUTATING.has(name) && !PAID.has(name) && name !== "mark_ready" && s.versions >= SESSION_CAPS.versions) {
    return { allow: false, reason: `version cap reached (${SESSION_CAPS.versions}/session)` };
  }
  if (name === "mark_ready") {
    if (s.judgeScore == null) {
      return { allow: false, reason: "judge_preview must score the current cut before mark_ready" };
    }
    if (s.judgeScore < s.floor) {
      return { allow: false, reason: `judge score ${s.judgeScore.toFixed(1)} is below the cut floor ${s.floor} — keep editing` };
    }
  }
  return { allow: true };
}
