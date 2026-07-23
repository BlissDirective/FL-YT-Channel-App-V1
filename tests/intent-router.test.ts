/**
 * ClickMax-transition Phase 2 (§3.1): the composer intent router's heuristic
 * tier — the offline path every message hits first. Pins the contract: the
 * high-frequency verbs resolve to registered actions with correct params
 * (1-based speech → 0-based beatIdx), ambiguity degrades to a reply (never an
 * error), and focused cards steer otherwise-unroutable notes.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adapters/anthropic", () => ({
  anthropicFetch: async () => {
    throw new Error("heuristic tests must not reach the LLM");
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("router tests must not reach a real client");
  },
}));
vi.mock("@/lib/push", () => ({ isPushConfigured: () => false, sendPushToAll: async () => {} }));
vi.mock("@/lib/storage", () => ({ uploadMedia: async () => {}, getSignedMediaUrl: async () => null }));
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));

import { routeHeuristic, routeIntent, type RouteContext } from "@/lib/workspace/router";
import { getWorkspaceAction } from "@/lib/workspace/registry";

const ctx = (over: Partial<RouteContext> = {}): RouteContext => ({
  videoId: "v1",
  status: "SCRIPT_READY",
  atGate: true,
  mode: "script",
  focused: null,
  targetLengthSec: 300,
  ...over,
});

describe("intent router heuristics", () => {
  it("routes continue/advance/approve to the continue action", () => {
    for (const phrase of ["continue", "Next stage", "approve", "keep going", "render it"]) {
      const r = routeHeuristic(phrase, ctx());
      expect(r).toMatchObject({ kind: "action", action: "continue" });
    }
  });

  it("maps 1-based beat speech to 0-based beatIdx for VO takes", () => {
    const r = routeHeuristic("new take for beat 3", ctx({ mode: "voice" }));
    expect(r).toMatchObject({
      kind: "action",
      action: "regenerate_beat_vo",
      params: { videoId: "v1", beatIdx: 2 },
    });
  });

  it("steers a beat visual re-roll with the remaining text as the note", () => {
    const r = routeHeuristic("redo scene 4 with warmer light", ctx());
    expect(r).toMatchObject({ kind: "action", action: "regenerate_beat_visual" });
    const params = (r as { params: Record<string, unknown> }).params;
    expect(params.beatIdx).toBe(3);
    expect(String(params.note)).toContain("warmer light");
  });

  it("routes spend and QC questions to the read-only actions", () => {
    expect(routeHeuristic("how much has this cost?", ctx())).toMatchObject({
      action: "get_spend",
    });
    expect(routeHeuristic("what did QC flag?", ctx())).toMatchObject({
      action: "get_qc_summary",
    });
  });

  it("uses the focused card to resolve an otherwise-ambiguous note", () => {
    const r = routeHeuristic("make it feel more cinematic", ctx({ atGate: false, focused: { kind: "clip", beatIdx: 1 } }));
    expect(r).toMatchObject({
      kind: "action",
      action: "regenerate_beat_visual",
      params: { beatIdx: 1, note: "make it feel more cinematic" },
    });
  });

  it("treats gate-side change requests as revisions carrying the notes", () => {
    const r = routeHeuristic("make the hook punchier and cut the third section", ctx());
    expect(r).toMatchObject({ kind: "action", action: "request_revision" });
    expect((r as { params: { notes: string } }).params.notes).toContain("punchier");
  });

  it("video mode + toolbar model generates a clip for the named beat", () => {
    const r = routeHeuristic(
      "generate beat 2",
      ctx({ mode: "video", modelId: "seedance-2-fast", durationSec: 8, atGate: false }),
    );
    expect(r).toMatchObject({
      kind: "action",
      action: "generate_beat_clip",
      params: { beatIdx: 1, modelId: "seedance-2-fast", durationSec: 8 },
    });
  });

  it("every heuristic action name exists in the registry (no drift)", () => {
    const samples: [string, RouteContext][] = [
      ["continue", ctx()],
      ["full auto", ctx()],
      ["how much has this cost?", ctx()],
      ["what did qc flag?", ctx()],
      ["new take for beat 1", ctx({ mode: "voice" })],
      ["redo beat 1", ctx()],
      ["regenerate the script", ctx()],
      ["generate beat 1", ctx({ mode: "video", modelId: "ltx-2" })],
    ];
    for (const [text, c] of samples) {
      const r = routeHeuristic(text, c);
      expect(r?.kind).toBe("action");
      if (r?.kind === "action") {
        expect(getWorkspaceAction(r.action), `unregistered action ${r.action}`).toBeDefined();
      }
    }
  });

  it("falls back to a mode-aware reply, never an error (offline path)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await routeIntent("hmm", ctx({ mode: "image", atGate: false }));
    expect(r.kind).toBe("reply");
    expect((r as { text: string }).text.length).toBeGreaterThan(10);
  });
});
