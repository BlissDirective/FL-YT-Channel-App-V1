import { describe, expect, it } from "vitest";
import { compareTraction, normalizeSourceUrl, parseFormat, platformOfUrl, sectionPlan } from "@studio/core";

const tiktok = "https://www.tiktok.com/@kicks/video/7412345678901234567?is_from_webapp=1&sender_device=pc";

describe("format links", () => {
  it("collapses tracking variants of the same video to one key", () => {
    expect(normalizeSourceUrl(tiktok)).toBe("tiktok.com/@kicks/video/7412345678901234567");
    expect(normalizeSourceUrl("https://m.tiktok.com/@kicks/video/7412345678901234567/")).toBe("tiktok.com/@kicks/video/7412345678901234567");
    expect(normalizeSourceUrl("https://www.instagram.com/reel/C9xYz/?igsh=abc")).toBe("instagram.com/reel/C9xYz");
    expect(normalizeSourceUrl("https://www.youtube.com/watch?v=abc123&t=30s")).toBe("youtube.com/watch?v=abc123");
    expect(normalizeSourceUrl("ftp://x.test/a")).toBeNull();
    expect(normalizeSourceUrl("not a url")).toBeNull();
  });

  it("infers the platform from the link", () => {
    expect(platformOfUrl(tiktok)).toBe("tiktok");
    expect(platformOfUrl("https://instagram.com/reel/x")).toBe("instagram");
    expect(platformOfUrl("https://youtu.be/abc")).toBe("youtube");
    expect(platformOfUrl("https://x.com/a/status/1")).toBe("x");
    expect(platformOfUrl("https://example.com/v")).toBe("other");
  });
});

describe("parseFormat", () => {
  it("accepts a capture-only candidate and normalizes it", () => {
    const r = parseFormat({ sourceUrl: tiktok, stats: { views: 1200000.4, shares: 9000 }, tags: ["Kicks", "kicks", " gym "], niche: "Martial Arts" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toEqual(
      expect.objectContaining({ platform: "tiktok", source: "manual", status: "candidate", stats: { views: 1200000, shares: 9000 }, tags: ["kicks", "gym"] }),
    );
  });

  it("sorts the beat map and rejects bad beats", () => {
    const ok = parseFormat({ sourceUrl: tiktok, durationSec: 20, beatMap: [{ at: 6, beat: "reveal" }, { at: 0, beat: "hook", onScreen: "WAIT" }] });
    expect(ok.ok && ok.format.beatMap.map((b) => b.beat)).toEqual(["hook", "reveal"]);
    const bad = parseFormat({ sourceUrl: tiktok, durationSec: 10, beatMap: [{ at: -1, beat: "x" }, { at: 12, beat: "late" }, { at: 2 }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors).toHaveLength(3);
  });

  it("needs the persuasion record to approve", () => {
    const r = parseFormat({ sourceUrl: tiktok, status: "approved", hook: "Nobody tells you this about kicks" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual(["an approved format needs a beat map", "an approved format needs whyItWorks"]);
    const full = parseFormat({ sourceUrl: tiktok, status: "approved", hook: "h", beatMap: [{ at: 0, beat: "b" }], whyItWorks: "w" });
    expect(full.ok).toBe(true);
  });

  it("rejects a missing link and unknown enum values", () => {
    const r = parseFormat({ platform: "myspace", source: "spider", status: "maybe" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("ranking and section plan", () => {
  it("ranks plays, then shares, then comments", () => {
    const rows = [
      { views: 100, shares: 1, comments: 50 },
      { views: 100, shares: 5, comments: 0 },
      { views: 900 },
    ];
    expect(rows.sort(compareTraction)).toEqual([{ views: 900 }, { views: 100, shares: 5, comments: 0 }, { views: 100, shares: 1, comments: 50 }]);
  });

  it("splits beats into sections of at most N seconds at beat boundaries", () => {
    const beats = [0, 3, 8, 12, 17, 24].map((at) => ({ at, beat: `b${at}` }));
    const plan = sectionPlan({ beatMap: beats, durationSec: 28 }, 15);
    expect(plan.map((p) => [p.startSec, p.sec, p.beats.map((b) => b.at)])).toEqual([
      [0, 12, [0, 3, 8]],
      [12, 12, [12, 17]],
      [24, 4, [24]],
    ]);
    expect(plan.every((p) => p.sec <= 15)).toBe(true);
    expect(sectionPlan({ beatMap: [] })).toEqual([]);
  });
});

describe("format store", async () => {
  const { recordFormat, listFormats, updateFormat } = await import("@/lib/pipeline/formats");
  const { fakeDb } = await import("./helpers/fake-db");

  it("dedupes by link and merges only the fields given", async () => {
    const db = fakeDb({ formats: [] });
    const a = await recordFormat(db as never, { sourceUrl: tiktok, niche: "martial arts", stats: { views: 10 }, tags: ["kicks"], hook: "Wait for it" });
    expect(a).toEqual({ ok: true, id: expect.any(String), created: true });
    const again = await recordFormat(db as never, { sourceUrl: tiktok.replace("www.", "m."), stats: { shares: 4 }, tags: ["gym"] });
    expect(again).toEqual({ ok: true, id: (a as { id: string }).id, created: false });
    const row = db.row("formats", (a as { id: string }).id)!;
    expect(row.stats).toEqual({ views: 10, shares: 4 });
    expect(row.tags).toEqual(["kicks", "gym"]);
    expect(row.hook).toBe("Wait for it");
    expect(row.niche).toBe("martial arts");
  });

  it("approves against the merged entry", async () => {
    const db = fakeDb({ formats: [] });
    const a = (await recordFormat(db as never, { sourceUrl: tiktok, hook: "h", beatMap: [{ at: 0, beat: "b" }] })) as { id: string };
    expect(await updateFormat(db as never, a.id, { status: "approved" })).toEqual({ ok: false, errors: ["an approved format needs whyItWorks"] });
    expect(await updateFormat(db as never, a.id, { status: "approved", whyItWorks: "pattern interrupt at 0.5s" })).toEqual({ ok: true, id: a.id });
    expect(db.row("formats", a.id)?.status).toBe("approved");
  });

  it("lists by traction and hides retired formats", async () => {
    const db = fakeDb({
      formats: [
        { id: "f1", niche: "Luxury", status: "candidate", stats: { views: 5 }, tags: [], created_at: "1" },
        { id: "f2", niche: "luxury reviews", status: "approved", stats: { views: 50 }, tags: ["watch"], created_at: "2" },
        { id: "f3", niche: "luxury", status: "retired", stats: { views: 500 }, tags: [], created_at: "3" },
      ],
    });
    expect((await listFormats(db as never, { niche: "luxury" })).map((f) => f.id)).toEqual(["f2", "f1"]);
    expect((await listFormats(db as never, { tag: "WATCH" })).map((f) => f.id)).toEqual(["f2"]);
    expect((await listFormats(db as never, { status: "retired" })).map((f) => f.id)).toEqual(["f3"]);
  });
});
