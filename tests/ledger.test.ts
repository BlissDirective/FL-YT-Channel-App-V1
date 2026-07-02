/**
 * ledger.ts — the one spend module (Phase 2). checkBudget is the gate every
 * paid path consults; recordCost is the only ledger writer. Tested against a
 * minimal fake of the Supabase query-builder chains these functions use.
 */
import { describe, expect, it } from "vitest";
import { checkBudget, monthSpend, recordCost } from "@/lib/pipeline/ledger";

type Row = Record<string, unknown>;

/** Fake db covering: from(t).insert(row) / .update(v).eq() / .select().eq().gte() */
function fakeDb(ledgerRows: { usd: number }[] = []) {
  const inserts: { table: string; row: Row }[] = [];
  const updates: { table: string; values: Row }[] = [];
  const db = {
    inserts,
    updates,
    from(table: string) {
      return {
        insert: async (row: Row) => {
          inserts.push({ table, row });
          return { error: null };
        },
        update(values: Row) {
          updates.push({ table, values });
          return { eq: async () => ({ error: null }) };
        },
        select() {
          return {
            eq() {
              return {
                gte: async () => ({ data: ledgerRows }),
              };
            },
          };
        },
      };
    },
  };
  return db;
}

const project = (perVideoUsd?: number, monthlyUsd?: number) =>
  ({ id: "p1", budget: { perVideoUsd, monthlyUsd } }) as never;

describe("checkBudget", () => {
  it("passes under both caps", async () => {
    const db = fakeDb([{ usd: 1 }]);
    const res = await checkBudget(db as never, project(5, 100), { total_cost_usd: 1 });
    expect(res.ok).toBe(true);
  });

  it("fails when the running total exceeds the per-video cap", async () => {
    const db = fakeDb();
    const res = await checkBudget(db as never, project(5, 100), { total_cost_usd: 6 });
    expect(res).toEqual({ ok: false, reason: "Per-video budget reached ($5)" });
  });

  it("reserves aboutToSpendUsd — an upcoming call can trip the cap", async () => {
    const db = fakeDb();
    const under = await checkBudget(db as never, project(5, 100), { total_cost_usd: 4 }, 0.5);
    expect(under.ok).toBe(true);
    const over = await checkBudget(db as never, project(5, 100), { total_cost_usd: 4 }, 1.5);
    expect(over.ok).toBe(false);
  });

  it("fails when month-to-date ledger spend exceeds the monthly cap", async () => {
    const db = fakeDb([{ usd: 60 }, { usd: 41 }]);
    const res = await checkBudget(db as never, project(500, 100), { total_cost_usd: 0 });
    expect(res).toEqual({ ok: false, reason: "Monthly budget reached ($100)" });
  });

  it("treats missing budget fields as unlimited", async () => {
    const db = fakeDb([{ usd: 10_000 }]);
    const res = await checkBudget(db as never, { id: "p1", budget: {} } as never, {
      total_cost_usd: 10_000,
    });
    expect(res.ok).toBe(true);
  });
});

describe("recordCost", () => {
  it("skips zero and negative amounts entirely", async () => {
    const db = fakeDb();
    const video = { id: "v1", project_id: "p1", total_cost_usd: 1 };
    await recordCost(db as never, video, { provider: "mock", usd: 0, description: "free" });
    await recordCost(db as never, video, { provider: "mock", usd: -1, description: "weird" });
    expect(db.inserts).toHaveLength(0);
    expect(video.total_cost_usd).toBe(1);
  });

  it("inserts a ledger row and bumps the in-memory running total", async () => {
    const db = fakeDb();
    const video = { id: "v1", project_id: "p1", total_cost_usd: 1 };
    await recordCost(db as never, video, { provider: "fal.ai", usd: 0.5, description: "clip" }, "beat 2");
    expect(db.inserts).toEqual([
      {
        table: "cost_ledger",
        row: { project_id: "p1", video_id: "v1", provider: "fal.ai", description: "clip — beat 2", usd: 0.5 },
      },
    ]);
    expect(video.total_cost_usd).toBe(1.5);
    expect(db.updates[0]).toEqual({ table: "videos", values: { total_cost_usd: 1.5 } });
  });
});

describe("monthSpend", () => {
  it("sums ledger rows (null-safe)", async () => {
    const db = fakeDb([{ usd: 1.5 }, { usd: 2 }, { usd: null as unknown as number }]);
    expect(await monthSpend(db as never, "p1")).toBe(3.5);
  });
});
