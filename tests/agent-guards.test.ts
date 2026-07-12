/**
 * MVDA agent guards (Phase C, plan §4 "hard hooks" + review pass 3 C2).
 *
 * Two layers under test:
 *  1. gateTool — the pure, prompt-independent gate every SDK tool call passes
 *     through (canUseTool): kill switch, budget, per-tool caps, and the
 *     mark_ready judge floor.
 *  2. makeTools — the real handlers over an in-memory DB: persist appends
 *     agent versions through the SAME allocator as human saves (requireParentHead),
 *     a new version invalidates the judge score, swap_visual refuses non-clip
 *     assets, and mark_ready activates the cut.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { compileEdd, type EditDocument } from "@studio/core";
import { assembleCompileInput } from "../packages/core/src/edd-db";
import { SESSION_CAPS, gateTool, type SessionState } from "../packages/agent/src/session-state";
import { ensureCompiled, makeTools, type SessionCtx } from "../packages/agent/src/tools";

// ── gateTool (pure) ────────────────────────────────────────────────────

function state(over: Partial<SessionState> = {}): SessionState {
  return {
    maxBudgetUsd: 0.8,
    spentUsd: 0,
    previews: 0,
    judges: 0,
    versions: 0,
    lessons: 0,
    judgeScore: null,
    floor: 7.0,
    killSwitch: false,
    ...over,
  };
}

describe("gateTool — mechanical session guards", () => {
  it("allows reads and edits in a fresh session", () => {
    for (const t of ["get_context", "get_edd", "retime_clip", "set_transition", "write_lesson"]) {
      expect(gateTool(t, state()).allow).toBe(true);
    }
  });

  it("kill switch blocks every mutating tool but leaves reads open", () => {
    const s = state({ killSwitch: true });
    for (const t of ["retime_clip", "swap_visual", "render_preview", "judge_preview", "mark_ready", "write_lesson"]) {
      const g = gateTool(t, s);
      expect(g.allow, t).toBe(false);
      if (!g.allow) expect(g.reason).toMatch(/kill switch/);
    }
    expect(gateTool("get_context", s).allow).toBe(true);
    expect(gateTool("get_edd", s).allow).toBe(true);
  });

  it("budget exhaustion blocks paid tools only — free edits continue", () => {
    const s = state({ spentUsd: 0.8 });
    expect(gateTool("render_preview", s).allow).toBe(false);
    expect(gateTool("judge_preview", s).allow).toBe(false);
    expect(gateTool("retime_clip", s).allow).toBe(true);
    expect(gateTool("set_motion", s).allow).toBe(true);
  });

  it("per-tool caps: previews, judges, lessons", () => {
    expect(gateTool("render_preview", state({ previews: SESSION_CAPS.previews })).allow).toBe(false);
    expect(gateTool("judge_preview", state({ judges: SESSION_CAPS.judges })).allow).toBe(false);
    expect(gateTool("write_lesson", state({ lessons: SESSION_CAPS.lessons })).allow).toBe(false);
    // One below the cap is still fine.
    expect(gateTool("render_preview", state({ previews: SESSION_CAPS.previews - 1 })).allow).toBe(true);
  });

  it("version cap stops further edits but never blocks mark_ready", () => {
    const s = state({ versions: SESSION_CAPS.versions, judgeScore: 8 });
    expect(gateTool("retime_clip", s).allow).toBe(false);
    expect(gateTool("swap_visual", s).allow).toBe(false);
    expect(gateTool("mark_ready", s).allow).toBe(true); // the exit stays open
  });

  it("mark_ready is denied until the CURRENT cut has been judged", () => {
    const g = gateTool("mark_ready", state({ judgeScore: null }));
    expect(g.allow).toBe(false);
    if (!g.allow) expect(g.reason).toMatch(/judge_preview/);
  });

  it("mark_ready enforces the cut floor (C2: floor 7.0, and per-project overrides)", () => {
    expect(gateTool("mark_ready", state({ judgeScore: 6.9 })).allow).toBe(false);
    expect(gateTool("mark_ready", state({ judgeScore: 7.0 })).allow).toBe(true);
    // A stricter per-project floor bites harder.
    expect(gateTool("mark_ready", state({ judgeScore: 7.5, floor: 8.5 })).allow).toBe(false);
    expect(gateTool("mark_ready", state({ judgeScore: 8.5, floor: 8.5 })).allow).toBe(true);
  });
});

// ── makeTools over an in-memory DB ─────────────────────────────────────

type Row = Record<string, unknown>;

/** Minimal chainable supabase-js stub covering exactly the calls the agent
    tool handlers make (EddDb select/insert + update().eq() chains). */
function fakeDb() {
  const tables: Record<string, Row[]> = { edit_documents: [], videos: [], memory_entries: [] };
  const matches = (row: Row, filters: [string, unknown][]) => filters.every(([c, v]) => row[c] === v);
  function from(table: string) {
    const rows = (tables[table] ??= []);
    return {
      select(_cols: string) {
        const filters: [string, unknown][] = [];
        const chain = {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return chain;
          },
          order(col: string, opts: { ascending: boolean }) {
            return {
              limit(n: number) {
                return {
                  maybeSingle() {
                    const hit = rows
                      .filter((r) => matches(r, filters))
                      .sort((a, b) =>
                        opts.ascending
                          ? Number(a[col]) - Number(b[col])
                          : Number(b[col]) - Number(a[col]),
                      )
                      .slice(0, n)[0];
                    return Promise.resolve({ data: hit ?? null });
                  },
                };
              },
            };
          },
        };
        return chain;
      },
      insert(row: Row) {
        if (
          table === "edit_documents" &&
          rows.some((r) => r.video_id === row.video_id && r.version === row.version)
        ) {
          return Promise.resolve({ error: { code: "23505", message: "duplicate key" } });
        }
        rows.push({ ...row });
        return Promise.resolve({ error: null });
      },
      update(patch: Row) {
        const filters: [string, unknown][] = [];
        const exec = () => {
          for (const r of rows) if (matches(r, filters)) Object.assign(r, patch);
          return Promise.resolve({ error: null });
        };
        const chain = {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return chain;
          },
          then: (res: (v: { error: null }) => unknown) => exec().then(res),
        };
        return chain;
      },
    };
  }
  return { from, tables };
}

const BEATS = [0, 1, 2].map((idx) => ({ idx, text: `Beat ${idx} narration.` }));
const ASSETS = [
  ...[0, 1, 2].map((i) => ({
    id: `vo-${i}`,
    kind: "vo",
    beat_index: i,
    provider: "mock",
    storage_path: null,
    meta: {
      durationSec: 6,
      words:
        i === 0
          ? [
              { w: "never", start: 0.2, end: 0.9 },
              { w: "$400", start: 0.9, end: 1.6 },
            ]
          : [
              { w: "alpha", start: 0.2, end: 0.9 },
              { w: "beta", start: 0.9, end: 1.6 },
            ],
    },
  })),
  ...[0, 1, 2].map((i) => ({
    id: `img-${i}`,
    kind: "clip",
    beat_index: i,
    provider: "mock",
    storage_path: null,
    meta: { url: `mock/clips/${i}.png` },
  })),
  {
    id: "sfx-1",
    kind: "sfx",
    beat_index: null,
    provider: "elevenlabs",
    storage_path: "videos/vid-1/sfx-1.mp3",
    meta: { prompt: "deep whoosh", durationSec: 1.2, generated: true },
  },
];

function seedDoc(): EditDocument {
  return compileEdd(
    assembleCompileInput({
      kind: "long",
      scriptBeats: BEATS,
      assets: ASSETS,
      curatedHighlights: [],
      captionsEnabled: true,
    }),
  );
}

function makeCtx() {
  const db = fakeDb();
  db.tables.videos.push({ id: "vid-1", edit_document_version: null });
  const judgeCalls: number[] = [];
  let readyNote: string | null = null;
  const ctx: SessionCtx = {
    db: db as unknown as SessionCtx["db"],
    state: state(),
    video: { id: "vid-1", kind: "long", title: "Test video", project_id: "proj-1" },
    scriptId: "script-1",
    beats: BEATS,
    assets: ASSETS,
    headVersion: 0,
    doc: {} as EditDocument,
    renderPreview: async () => ({ path: "stub://preview" }),
    judgeDoc: async () => {
      judgeCalls.push(1);
      return { score: 8.2, issues: ["stub"], costUsd: 0.03 };
    },
    onReady: async (note) => {
      readyNote = note;
    },
  };
  return { ctx, db, judgeCalls, ready: () => readyNote };
}

describe("agent tools over the shared allocator", () => {
  let h: ReturnType<typeof makeCtx>;
  beforeEach(async () => {
    h = makeCtx();
    await ensureCompiled(h.ctx);
  });

  it("ensureCompiled bootstraps a valid v1 (author compiler) and is idempotent", async () => {
    expect(h.ctx.headVersion).toBe(1);
    expect(h.db.tables.edit_documents).toHaveLength(1);
    expect(h.db.tables.edit_documents[0].author).toBe("compiler");
    expect(await ensureCompiled(h.ctx)).toBe("head is v1");
    expect(h.db.tables.edit_documents).toHaveLength(1);
  });

  it("an edit appends an agent version, bumps the head, and voids the judge score", async () => {
    const tools = makeTools(h.ctx);
    h.ctx.state.judgeScore = 8; // pretend an earlier cut was judged
    const clip = h.ctx.doc.tracks.video[0];
    const res = await tools.retime_clip.run({ clipId: clip.id, durationSec: clip.duration + 1, note: "" });
    expect(res).toMatch(/^ok — saved v2/);
    expect(h.ctx.headVersion).toBe(2);
    expect(h.ctx.state.versions).toBe(1);
    expect(h.ctx.state.judgeScore).toBeNull(); // a new cut must be re-judged
    expect(h.db.tables.edit_documents[1].author).toBe("agent");
    expect(h.db.tables.edit_documents[1].parent_version).toBe(1);
  });

  it("a stale head is rejected by the allocator (A9), not silently forked", async () => {
    const tools = makeTools(h.ctx);
    h.ctx.headVersion = 0; // simulate another writer having advanced the head
    const clip = h.ctx.doc.tracks.video[0];
    const res = await tools.retime_clip.run({ clipId: clip.id, durationSec: clip.duration + 1, note: "" });
    expect(res).toMatch(/^REJECTED: document changed under you/);
    expect(h.db.tables.edit_documents).toHaveLength(1);
  });

  it("an invalid mutation is rejected by validateEdd before any DB write", async () => {
    const tools = makeTools(h.ctx);
    // A caption style outside the registry fails validation (the numeric ops
    // self-clamp, so registry membership is the honest invalidity here).
    const res = await tools.set_caption_style.run({ pageIdx: 0, style: "not-a-registered-style" });
    expect(res).toMatch(/^REJECTED \(document invalid\)/);
    expect(h.db.tables.edit_documents).toHaveLength(1);
  });

  it("swap_visual refuses assets that are not live clips", async () => {
    const tools = makeTools(h.ctx);
    const clip = h.ctx.doc.tracks.video[0];
    const res = await tools.swap_visual.run({ clipId: clip.id, assetId: "vo-0", note: "" });
    expect(res).toMatch(/REJECTED: asset vo-0 is not a live clip asset/);
  });

  it("judge_preview stores the verdict on the head version and arms mark_ready", async () => {
    const tools = makeTools(h.ctx);
    expect(gateTool("mark_ready", h.ctx.state).allow).toBe(false);
    const out = JSON.parse(await tools.judge_preview.run({}));
    expect(out.score).toBe(8.2);
    expect(h.ctx.state.judges).toBe(1);
    expect(h.ctx.state.spentUsd).toBeCloseTo(0.03);
    expect(h.db.tables.edit_documents[0].judge).toMatchObject({ score: 8.2 });
    expect(gateTool("mark_ready", h.ctx.state).allow).toBe(true);
  });

  it("mark_ready activates the cut on the video row and fires onReady", async () => {
    const tools = makeTools(h.ctx);
    await tools.judge_preview.run({});
    const res = await tools.mark_ready.run({ note: "tightened the hook" });
    expect(res).toMatch(/^ready — v1/);
    expect(h.db.tables.videos[0].edit_document_version).toBe(1);
    expect(h.db.tables.edit_documents[0].status).toBe("previewed");
    expect(h.ready()).toBe("tightened the hook");
  });

  it("auto_emphasis persists a version when it finds hook tokens (Phase D)", async () => {
    const tools = makeTools(h.ctx);
    // Beat 0's VO carries "never" + "$400" — money wins with "scale".
    const res = await tools.auto_emphasis.run({ maxTotal: 10 });
    expect(res).toMatch(/^ok — saved v2/);
    const emphasized = h.ctx.doc.tracks.captions.flatMap((p) => p.tokens).filter((t) => t.emphasis !== "none");
    expect(emphasized.length).toBeGreaterThan(0);
  });

  it("add_sfx places generated cues (abs + word anchors) and rejects non-sfx assets", async () => {
    const tools = makeTools(h.ctx);
    expect(await tools.add_sfx.run({ assetId: "img-0", atSec: 1, gainDb: -6, note: "" })).toMatch(/^REJECTED/);
    expect(await tools.add_sfx.run({ assetId: "sfx-1", gainDb: -6, note: "" })).toMatch(/^REJECTED: provide/);
    const abs = await tools.add_sfx.run({ assetId: "sfx-1", atSec: 2, gainDb: -6, note: "" });
    expect(abs).toMatch(/^ok — saved v2/);
    const clip = h.ctx.doc.tracks.video.find((c) => c.beatIdx === 0)!;
    const word = await tools.add_sfx.run({
      assetId: "sfx-1",
      wordAnchor: { clipId: clip.id, captionToken: 0 },
      gainDb: -6,
      note: "",
    });
    expect(word).toMatch(/^ok — saved v3/);
    const cues = h.ctx.doc.tracks.audio.filter((c) => c.kind === "sfx");
    expect(cues).toHaveLength(2);
  });

  it("write_lesson lands a shadow memory entry in the editing namespace", async () => {
    const tools = makeTools(h.ctx);
    await tools.write_lesson.run({ text: "Hero holds on premium clips beat ken burns for retention." });
    expect(h.ctx.state.lessons).toBe(1);
    expect(h.db.tables.memory_entries[0]).toMatchObject({
      project_id: "proj-1",
      namespace: "editing",
      kind: "lesson",
      status: "shadow",
      tier: "channel",
    });
  });
});
