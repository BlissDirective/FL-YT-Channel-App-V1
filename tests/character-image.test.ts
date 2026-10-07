import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { characterImageErrors, characterImagePath, makeCharacterImage } from "@/lib/pipeline/character-image";
import { estimateRefImageCost, getRefImageModel } from "@/lib/adapters/reference-image";

const base = { projectId: "p1", name: "Hero front", prompt: "full body, front view" };

describe("make_character_image", () => {
  it("accepts storage-path references and rejects URLs, traversal and too many refs", () => {
    expect(characterImageErrors({ ...base, references: ["refs/p1/char-master-abc.png"] })).toEqual([]);
    expect(characterImageErrors({ ...base, references: ["https://x.test/a.png"] })).toHaveLength(1);
    expect(characterImageErrors({ ...base, references: ["../a.png"] })).toHaveLength(1);
    expect(characterImageErrors({ ...base, references: Array(7).fill("refs/p1/a.png") })).toHaveLength(1);
    expect(characterImageErrors({ ...base, model: "dall-e" })).toHaveLength(1);
    expect(characterImageErrors({ ...base, prompt: " " })).toHaveLength(1);
  });

  it("stores each distinct request at its own deterministic path", () => {
    const a = characterImagePath(base);
    expect(a).toMatch(/^refs\/p1\/char-hero-front-[0-9a-f]{10}$/);
    expect(characterImagePath(base)).toBe(a); // a retry finds the paid image
    expect(characterImagePath({ ...base, references: ["refs/p1/m.png"] })).not.toBe(a);
    expect(characterImagePath({ ...base, resolution: "4K" })).not.toBe(a);
  });

  it("bills Nano Banana Pro 4K at twice the base rate", () => {
    const nb = getRefImageModel("nano-banana-pro")!;
    expect(estimateRefImageCost(nb, 1, "2K")).toBe(0.15);
    expect(estimateRefImageCost(nb, 1, "4K")).toBe(0.3);
    expect(estimateRefImageCost(getRefImageModel("flux-2-pro")!, 2, "4K")).toBe(0.06);
  });
});

const stored = new Map<string, Buffer>();
vi.mock("@/lib/storage", () => ({
  getSignedMediaUrl: async (p: string) => (stored.has(p) || p.startsWith("refs/p1/master") ? `https://signed.test/${p}` : null),
  uploadMedia: async (p: string, b: Buffer) => void stored.set(p, b),
}));

/** Just enough of the Supabase client for the lease and the ledger. */
function fakeDb() {
  const settings = new Map<string, unknown>();
  const ledger: { usd: number }[] = [];
  const db = {
    from: (table: string) => ({
      select: () => ({
        eq: (_c: string, k: string) => ({ maybeSingle: async () => ({ data: settings.has(k) ? { value: settings.get(k) } : null }) }),
      }),
      upsert: async (row: { key: string; value: unknown }) => void settings.set(row.key, row.value),
      delete: () => ({
        eq: (_c: string, k: string) => {
          const had = settings.delete(k);
          return Object.assign(Promise.resolve({ data: null }), { select: async () => ({ data: had ? [{ key: k }] : [] }) });
        },
      }),
      insert: async (row: { usd: number }) => void (table === "cost_ledger" && ledger.push(row)),
    }),
  };
  return { db: db as never, settings, ledger };
}

/** fal queue: `status` is what the status URL reports right now. */
function stubQueue() {
  const fal = { status: "IN_PROGRESS", submits: 0, result: 200 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.startsWith("https://queue.fal.run/fal-ai/")) {
        fal.submits++;
        return { ok: true, status: 200, json: async () => ({ status_url: "https://q.test/status", response_url: "https://q.test/result" }) };
      }
      if (u === "https://q.test/status") return { ok: true, status: 200, json: async () => ({ status: fal.status }) };
      if (u === "https://q.test/result") {
        return { ok: fal.result === 200, status: fal.result, text: async () => "rejected", json: async () => ({ images: [{ url: "https://img.test/1.png" }] }) };
      }
      return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer };
    }),
  );
  return fal;
}

describe("make_character_image survives a slow model", () => {
  beforeEach(() => {
    process.env.FAL_KEY = "k";
    stored.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FAL_KEY;
  });
  const opts = { ...base, references: ["refs/p1/master.png"] };

  it("keeps the queued job across calls and collects it without paying twice", async () => {
    const fal = stubQueue();
    const { db, settings, ledger } = fakeDb();

    const first = await makeCharacterImage(db, opts, 0);
    expect(first).toMatchObject({ ok: false, error: expect.stringMatching(/still generating/) });
    expect(fal.submits).toBe(1);
    expect([...settings.values()][0]).toMatchObject({ job: { statusUrl: "https://q.test/status" } });

    const second = await makeCharacterImage(db, opts, 0);
    expect(second.ok).toBe(false);
    expect(fal.submits).toBe(1); // still the same job, not a new one

    fal.status = "COMPLETED";
    const done = await makeCharacterImage(db, opts, 0);
    expect(done).toMatchObject({ ok: true, path: `${characterImagePath(opts)}.png`, costUsd: 0.15 });
    expect(fal.submits).toBe(1);
    expect(ledger).toHaveLength(1);
    expect(settings.size).toBe(0);

    const again = await makeCharacterImage(db, opts, 0);
    expect(again).toMatchObject({ ok: true, reused: true, costUsd: 0 });
    expect(ledger).toHaveLength(1);
  });

  it("clears a job fal rejected so the next call starts fresh", async () => {
    const fal = stubQueue();
    const { db, settings, ledger } = fakeDb();
    fal.status = "COMPLETED";
    fal.result = 422;
    const r = await makeCharacterImage(db, opts, 0);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/422/) });
    expect(settings.size).toBe(0);
    expect(ledger).toHaveLength(0);
  });

  it("keeps the job through a transient error so the image isn't lost", async () => {
    const fal = stubQueue();
    const { db, settings } = fakeDb();
    fal.status = "COMPLETED";
    fal.result = 503;
    expect((await makeCharacterImage(db, opts, 0)).ok).toBe(false);
    expect(settings.size).toBe(1);
    fal.result = 200;
    expect(await makeCharacterImage(db, opts, 0)).toMatchObject({ ok: true });
    expect(fal.submits).toBe(1);
  });
});
