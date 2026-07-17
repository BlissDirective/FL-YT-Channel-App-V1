/**
 * Decision audit trail (#9) — the recordDecision / recordDecisions writers.
 * They map a choice into the `decisions` row shape and are best-effort (a
 * logging failure must never break generation).
 */
import { describe, expect, it, vi } from "vitest";
import { recordDecision, recordDecisions } from "@/lib/pipeline/decisions";

function fakeDb() {
  const inserts: { table: string; rows: unknown }[] = [];
  return {
    inserts,
    from(table: string) {
      return {
        insert: async (rows: unknown) => {
          inserts.push({ table, rows });
          return { data: null, error: null };
        },
      };
    },
  };
}

describe("recordDecision", () => {
  it("maps a scored model choice into a decisions row", async () => {
    const db = fakeDb();
    await recordDecision(db, {
      projectId: "p1",
      videoId: "v1",
      beatIdx: 2,
      kind: "model",
      choice: "seedance-2",
      alternatives: [{ id: "kling-2-5-turbo", label: "Kling", score: 0.71, costUsd: 0.56 }],
      confidence: 0.83,
      reasoning: "Best fit for the hero beat.",
      costUsd: 0.56,
      params: { model: "seedance-2", targetSec: 8 },
    });
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].table).toBe("decisions");
    const row = db.inserts[0].rows as Record<string, unknown>;
    expect(row.project_id).toBe("p1");
    expect(row.video_id).toBe("v1");
    expect(row.beat_idx).toBe(2);
    expect(row.kind).toBe("model");
    expect(row.choice).toBe("seedance-2");
    expect(row.confidence).toBe(0.83);
    expect(Array.isArray(row.alternatives)).toBe(true);
  });

  it("defaults optional fields (alternatives=[], params={}, nulls)", async () => {
    const db = fakeDb();
    await recordDecision(db, { videoId: "v1", kind: "style", choice: "noir" });
    const row = db.inserts[0].rows as Record<string, unknown>;
    expect(row.alternatives).toEqual([]);
    expect(row.params).toEqual({});
    expect(row.confidence).toBeNull();
    expect(row.reasoning).toBeNull();
    expect(row.project_id).toBeNull();
  });

  it("never throws when the insert fails (best-effort)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const badDb = {
      from() {
        return {
          insert: async () => {
            throw new Error("db down");
          },
        };
      },
    };
    await expect(
      recordDecision(badDb, { videoId: "v1", kind: "voice", choice: "Rachel" }),
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("recordDecisions (batch)", () => {
  it("writes one insert with all rows", async () => {
    const db = fakeDb();
    await recordDecisions(db, [
      { videoId: "v1", beatIdx: 0, kind: "model", choice: "seedance-2-fast" },
      { videoId: "v1", beatIdx: 1, kind: "model", choice: "kling-2-5-turbo" },
    ]);
    expect(db.inserts).toHaveLength(1);
    const rows = db.inserts[0].rows as unknown[];
    expect(rows).toHaveLength(2);
  });

  it("no-ops on an empty list (no write)", async () => {
    const db = fakeDb();
    await recordDecisions(db, []);
    expect(db.inserts).toHaveLength(0);
  });
});
