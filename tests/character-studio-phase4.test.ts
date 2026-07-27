/**
 * Character Studio Phase 4 — multi-style, group shots, drift, migration
 * (docs/Character-Studio-Build-Plan.md §7).
 *
 * The phase that makes the feature survive contact with a real channel:
 *
 *  1. A second style is one button, not six trips through the Studio — and it
 *     produces DRAFTS, quoted before it spends.
 *  2. A group shot carries relative scale, and rides along on multi-character
 *     scenes without crowding out the per-character references.
 *  3. Drift is detected, badged, and never blocks.
 *  4. The Mindful Minis A/B collapses from two projects to one, idempotently
 *     and without overwriting anything the operator has already tuned.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

const uploads: string[] = [];
vi.mock("@/lib/storage", () => ({
  uploadMedia: async (path: string) => {
    uploads.push(path);
  },
  getSignedMediaUrl: async (p: string) => (p.startsWith("mock/") ? null : `https://signed.example/${p}`),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("tests must pass an explicit db");
  },
}));

import {
  DRIFT_WARN_SCORE,
  checkCharacterDrift,
  driftSummary,
  isDriftCheckLive,
  type DriftVerdict,
} from "@/lib/adapters/character-drift";
import {
  createCharacter,
  createStyle,
  estimateLooksForStyle,
  generateCastGroupShot,
  generateLooksForStyle,
  getLook,
  linkCharacterToProject,
  listStyles,
  lockCharacterLook,
  setProjectPresenter,
  updateCharacter,
} from "@/lib/pipeline/character-studio";
import {
  CHANNEL_PRESETS,
  MINDFUL_MINIS,
  applyChannelPreset,
  getChannelPreset,
} from "@/lib/pipeline/channel-presets";
import { resolveSceneCast, resolvePresenterImagePath } from "@/lib/pipeline/cast-resolver";

function seeded() {
  return fakeDb({
    projects: [{ id: "p1", name: "Mindful Minis" } as never],
    characters: [],
    styles: [],
    character_looks: [],
    project_characters: [],
    character_design_messages: [],
    cost_ledger: [],
  });
}

let falCalls: { url: string; body: Record<string, unknown> }[] = [];
function stubFal() {
  falCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: string }) => {
      const u = String(url);
      if (u.startsWith("https://fal.run/")) {
        falCalls.push({ url: u, body: JSON.parse(init?.body ?? "{}") });
        return {
          ok: true,
          status: 200,
          json: async () => ({ images: [{ url: "https://fal.example/o.png" }] }),
          text: async () => "",
        } as never;
      }
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(16) } as never;
    }),
  );
}

/** A project with two styles and three characters, all locked in style A. */
async function twoStyleProject() {
  const db = seeded();
  const a = await createStyle(db as never, {
    projectId: "p1",
    name: "Style A",
    styleString: "Soft pastel flat-vector.",
  });
  const b = await createStyle(db as never, {
    projectId: "p1",
    name: "Style B",
    styleString: "Watercolour paper-craft.",
  });
  const ids: string[] = [];
  for (const [name, desc] of [
    ["Bo", "Bo, a cheerful boy in a mustard tee."],
    ["Poppy", "Poppy, a thoughtful girl with coral bobbles."],
    ["Breeze", "Breeze, a lilac-grey bunny in a mint scarf."],
  ] as const) {
    const id = await createCharacter(db as never, { name, projectId: "p1", description: desc });
    ids.push(id);
    const c = await generateLooksForStyle(db as never, { projectId: "p1", styleId: a });
    void c;
  }
  // Lock everyone in style A so the "B is empty" case is unambiguous.
  for (const id of ids) {
    const look = await getLook(db as never, id, a);
    if (look?.canonical_image_path) {
      await lockCharacterLook(db as never, {
        characterId: id,
        styleId: a,
        canonicalImagePath: look.canonical_image_path,
        generateSheet: false,
      });
    }
  }
  return { db, a, b, ids };
}

beforeEach(() => {
  uploads.length = 0;
  delete process.env.FAL_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => vi.unstubAllGlobals());

/* ────────────────────────────────────────────────────────────── */
/* 1. A second style is one button                                 */
/* ────────────────────────────────────────────────────────────── */

describe("batch looks for a style", () => {
  it("quotes the whole job before spending a cent", async () => {
    const { db, b } = await twoStyleProject();
    const quote = await estimateLooksForStyle(db as never, { projectId: "p1", styleId: b });
    expect(quote.count).toBe(3);
    expect(quote.usd).toBeCloseTo(0.45, 2); // 3 × $0.15
  });

  it("fills only the characters missing a look in THIS style", async () => {
    const { db, a, b } = await twoStyleProject();
    const before = await estimateLooksForStyle(db as never, { projectId: "p1", styleId: a });
    expect(before.count).toBe(0); // style A is already covered

    const res = await generateLooksForStyle(db as never, { projectId: "p1", styleId: b });
    expect(res.generated.map((g) => g.name).sort()).toEqual(["Bo", "Breeze", "Poppy"]);
    expect(res.skipped).toEqual([]);
    // Style A is untouched.
    expect(await estimateLooksForStyle(db as never, { projectId: "p1", styleId: a })).toMatchObject({
      count: 0,
    });
  });

  it("produces DRAFTS, never silent locks", async () => {
    const { db, b, ids } = await twoStyleProject();
    await generateLooksForStyle(db as never, { projectId: "p1", styleId: b });
    for (const id of ids) {
      const look = (await getLook(db as never, id, b))!;
      expect(look.canonical_image_path).toBeTruthy();
      expect(look.status).toBe("draft");
    }
  });

  it("does not condition a restyle on the OLD style's image", async () => {
    process.env.FAL_KEY = "k";
    const { db, b } = await twoStyleProject();
    stubFal();
    await generateLooksForStyle(db as never, { projectId: "p1", styleId: b });
    // Every call went to the plain endpoint — no image_urls carried over from A.
    expect(falCalls.length).toBeGreaterThan(0);
    for (const c of falCalls) {
      expect(c.body.image_urls).toBeUndefined();
      expect(c.url).not.toMatch(/\/edit$/);
    }
  });

  it("staleOnly repairs exactly the looks a style edit invalidated", async () => {
    const { db, a, ids } = await twoStyleProject();
    // Invalidate one look by hand (the shape a style edit produces).
    const look = (await getLook(db as never, ids[0], a))!;
    (db.tables.character_looks ?? []).find((l) => l.id === look.id)!.stale = true;

    const quote = await estimateLooksForStyle(db as never, {
      projectId: "p1",
      styleId: a,
      staleOnly: true,
    });
    expect(quote.count).toBe(1);
    const res = await generateLooksForStyle(db as never, {
      projectId: "p1",
      styleId: a,
      staleOnly: true,
    });
    expect(res.generated).toHaveLength(1);
    expect((await getLook(db as never, ids[0], a))!.stale).toBe(false);
  });

  it("reports a character it cannot render instead of failing the batch", async () => {
    const { db, b } = await twoStyleProject();
    const naked = await createCharacter(db as never, { name: "Ghost", projectId: "p1" });
    void naked;
    const res = await generateLooksForStyle(db as never, { projectId: "p1", styleId: b });
    expect(res.failed.map((f) => f.name)).toEqual(["Ghost"]);
    expect(res.generated).toHaveLength(3); // the others still went through
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 2. The cast group shot                                          */
/* ────────────────────────────────────────────────────────────── */

describe("cast group shot", () => {
  it("is conditioned on the locked looks and asks for correct relative heights", async () => {
    process.env.FAL_KEY = "k";
    const { db, a } = await twoStyleProject();
    // The fixture's looks were made in mock mode; a mock path has no signable
    // URL (correctly), so give them real paths to exercise the reference path.
    for (const l of db.tables.character_looks ?? []) {
      if (l.style_id === a) l.canonical_image_path = `characters/${l.character_id}/${a}/x.png`;
    }
    stubFal();
    const res = await generateCastGroupShot(db as never, { projectId: "p1", styleId: a });
    expect(res.names.sort()).toEqual(["Bo", "Breeze", "Poppy"]);
    const call = falCalls[0];
    expect(call.url).toMatch(/\/edit$/);
    expect((call.body.image_urls as string[]).length).toBe(3);
    expect(String(call.body.prompt)).toMatch(/correct relative heights/i);
    expect(db.row("styles", a)!.group_shot_path).toBe(res.path);
  });

  it("refuses when there is nobody to compare", async () => {
    const db = seeded();
    const s = await createStyle(db as never, { projectId: "p1", name: "A", styleString: "x" });
    await createCharacter(db as never, { name: "Solo", projectId: "p1", description: "one" });
    await expect(
      generateCastGroupShot(db as never, { projectId: "p1", styleId: s }),
    ).rejects.toThrow(/at least two/i);
  });

  it("rides along on multi-character scenes, LAST so it can't crowd out identities", async () => {
    const { db, a } = await twoStyleProject();
    (db.tables.styles ?? []).find((s) => s.id === a)!.group_shot_path = "styles/a/group.png";

    const two = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: a,
      text: "Bo waves at Breeze",
    });
    expect(two.characters).toHaveLength(2);
    expect(two.referencePaths).toHaveLength(3);
    expect(two.referencePaths[2]).toBe("styles/a/group.png");

    // A single-character scene has no scale problem, so no group reference.
    const one = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: a,
      text: "Bo waves",
    });
    expect(one.referencePaths).toEqual([one.referencePaths[0]]);
    expect(one.referencePaths).not.toContain("styles/a/group.png");
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 3. Drift detection                                              */
/* ────────────────────────────────────────────────────────────── */

describe("drift detection", () => {
  const verdict = (over: Partial<DriftVerdict> = {}): DriftVerdict => ({
    score: 9,
    anchorHeld: true,
    issues: [],
    costUsd: 0,
    ...over,
  });

  it("is off with no key, and 'no opinion' is never 'bad'", async () => {
    expect(isDriftCheckLive()).toBe(false);
    const r = await checkCharacterDrift({
      renderedUrl: "https://x/1.png",
      referenceUrl: "https://x/2.png",
      characterName: "Bo",
    });
    expect(r).toBeNull();
  });

  it("sends the reference FIRST and the render second, and states what may differ", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    let body: Record<string, unknown> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { body?: string }) => {
        body = JSON.parse(init?.body ?? "{}");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            content: [
              {
                type: "tool_use",
                name: "deliver_drift_verdict",
                input: { score: 4, anchor_held: false, issues: ["tee is orange, reference is mustard"] },
              },
            ],
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
        } as never;
      }),
    );
    const r = (await checkCharacterDrift({
      renderedUrl: "https://x/render.png",
      referenceUrl: "https://x/ref.png",
      characterName: "Bo",
      identityAnchor: "mustard-yellow tee",
    }))!;
    expect(r.score).toBe(4);
    expect(r.anchorHeld).toBe(false);

    const content = (body.messages as { content: { type: string; source?: { url: string } }[] }[])[0].content;
    const images = content.filter((c) => c.type === "image");
    expect(images[0].source!.url).toBe("https://x/ref.png");
    expect(images[1].source!.url).toBe("https://x/render.png");
    const text = String((content[0] as unknown as { text: string }).text);
    expect(text).toMatch(/mustard-yellow tee/);
    expect(text).toMatch(/Pose, expression, camera angle, crop and background are SUPPOSED to differ/);
  });

  it("clamps a nonsense score rather than trusting the model", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            { type: "tool_use", name: "deliver_drift_verdict", input: { score: 99, anchor_held: true, issues: [] } },
          ],
        }),
      }) as never),
    );
    const r = (await checkCharacterDrift({
      renderedUrl: "a",
      referenceUrl: "b",
      characterName: "Bo",
    }))!;
    expect(r.score).toBe(10);
  });

  it("summarises only what drifted, and says nothing is blocked", () => {
    const note = driftSummary([
      { beatIdx: 0, name: "Bo", verdict: verdict() },
      { beatIdx: 2, name: "Bo", verdict: verdict({ score: 4, issues: ["tee is orange"] }) },
      { beatIdx: 3, name: "Breeze", verdict: verdict({ anchorHeld: false }) },
    ])!;
    expect(note).toContain("2 of 3");
    expect(note).toContain("beat 3 — Bo");
    expect(note).toContain("beat 4 — Breeze");
    expect(note).not.toContain("beat 1");
    expect(note).toMatch(/Nothing is blocked/);
  });

  it("is silent when every frame is on-model", () => {
    expect(driftSummary([{ beatIdx: 0, name: "Bo", verdict: verdict() }])).toBeNull();
    expect(driftSummary([])).toBeNull();
  });

  it("treats a held anchor at the warn threshold as fine", () => {
    expect(driftSummary([{ beatIdx: 0, name: "Bo", verdict: verdict({ score: DRIFT_WARN_SCORE }) }])).toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 4. Presenter designation                                        */
/* ────────────────────────────────────────────────────────────── */

describe("presenter designation", () => {
  it("promotes one and demotes the incumbent in the same project", async () => {
    const { db, ids } = await twoStyleProject();
    await updateCharacter(db as never, ids[0], { role: "presenter" });
    const res = await setProjectPresenter(db as never, { projectId: "p1", characterId: ids[1] });
    expect(res.demoted).toEqual(["Bo"]);
    expect(db.row("characters", ids[0])!.role).toBe("cast");
    expect(db.row("characters", ids[1])!.role).toBe("presenter");
  });

  it("warns when the new presenter has no chest-up portrait", async () => {
    const { db, ids } = await twoStyleProject();
    const res = await setProjectPresenter(db as never, { projectId: "p1", characterId: ids[0] });
    expect(res.hasPortrait).toBe(false);
  });

  it("the avatar path then prefers that character's portrait over the legacy column", async () => {
    const { db, a, ids } = await twoStyleProject();
    await setProjectPresenter(db as never, { projectId: "p1", characterId: ids[0] });
    (db.tables.character_looks ?? []).push({
      id: "portrait-1",
      character_id: ids[0],
      style_id: a,
      look_type: "portrait",
      canonical_image_path: "characters/bo/portrait.png",
      stale: false,
      status: "locked",
      version: 1,
    } as never);

    const path = await resolvePresenterImagePath(
      db as never,
      { id: "p1", presenter_image_path: "legacy/presenter.png" },
      a,
    );
    expect(path).toBe("characters/bo/portrait.png");
  });

  it("refuses a character that isn't in the project", async () => {
    const { db } = await twoStyleProject();
    const outsider = await createCharacter(db as never, { name: "Outsider" });
    await expect(
      setProjectPresenter(db as never, { projectId: "p1", characterId: outsider }),
    ).rejects.toThrow(/isn't in this project/i);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 5. The Mindful Minis migration                                  */
/* ────────────────────────────────────────────────────────────── */

describe("channel preset — two projects become one", () => {
  it("carries the documented cast and both art tracks", () => {
    expect(CHANNEL_PRESETS.map((p) => p.id)).toContain("mindful-minis");
    expect(getChannelPreset("mindful-minis")).toBe(MINDFUL_MINIS);
    expect(MINDFUL_MINIS.characters.map((c) => c.name)).toEqual([
      "Bo",
      "Poppy",
      "Breeze",
      "Rumble",
      "Wobble",
      "Pip",
    ]);
    expect(MINDFUL_MINIS.styles).toHaveLength(2);
    // Every character carries the one detail that must survive a render.
    for (const c of MINDFUL_MINIS.characters) {
      expect(c.identityAnchor.trim().length).toBeGreaterThan(3);
      expect(c.description).toContain(c.name);
      // Style words belong on the style, never on an identity.
      expect(c.description).not.toMatch(/watercolou?r|flat-vector|pastel|collage/i);
    }
    // The styles differ in medium, which is what makes the A/B a real test.
    expect(MINDFUL_MINIS.styles[0].styleString).toMatch(/flat-vector/i);
    expect(MINDFUL_MINIS.styles[1].styleString).toMatch(/watercolour|cut-paper/i);
  });

  it("lands one cast and TWO styles in a single project", async () => {
    const db = seeded();
    const report = await applyChannelPreset(db as never, {
      projectId: "p1",
      presetId: "mindful-minis",
    });
    expect(report.charactersCreated).toHaveLength(6);
    expect(report.stylesCreated).toHaveLength(2);

    const styles = await listStyles(db as never, "p1");
    expect(styles).toHaveLength(2);
    expect(styles.filter((s) => s.is_default)).toHaveLength(1);
    expect(db.tables.project_characters).toHaveLength(6);
    // Spends nothing: looks are a separate, quoted step.
    expect(db.tables.cost_ledger).toHaveLength(0);
  });

  it("is idempotent — running it twice changes nothing", async () => {
    const db = seeded();
    await applyChannelPreset(db as never, { projectId: "p1", presetId: "mindful-minis" });
    const second = await applyChannelPreset(db as never, { projectId: "p1", presetId: "mindful-minis" });
    expect(second.charactersCreated).toEqual([]);
    expect(second.stylesCreated).toEqual([]);
    expect(second.charactersExisting).toHaveLength(6);
    expect(second.stylesExisting).toHaveLength(2);
    expect(db.tables.characters).toHaveLength(6);
    expect(db.tables.styles).toHaveLength(2);
  });

  it("LINKS an existing global character rather than duplicating it", async () => {
    const db = seeded();
    const existing = await createCharacter(db as never, {
      name: "Bo",
      description: "MY OWN Bo, hand-written.",
    });
    const report = await applyChannelPreset(db as never, {
      projectId: "p1",
      presetId: "mindful-minis",
    });
    expect(report.charactersLinked).toContain("Bo");
    expect(db.tables.characters.filter((c) => c.name === "Bo")).toHaveLength(1);
    // And it never overwrites text the operator already wrote.
    expect(db.row("characters", existing)!.description).toBe("MY OWN Bo, hand-written.");
  });

  it("fills in an empty description but leaves a tuned style string alone", async () => {
    const db = seeded();
    const blank = await createCharacter(db as never, { name: "Poppy" });
    await createStyle(db as never, {
      projectId: "p1",
      name: "Style A — Soft Pastel Vector",
      styleString: "MY tuned pastel string.",
    });

    const report = await applyChannelPreset(db as never, {
      projectId: "p1",
      presetId: "mindful-minis",
    });
    expect(report.stylesExisting).toContain("Style A — Soft Pastel Vector");
    expect(report.stylesCreated).toEqual(["Style B — Paper-Craft Watercolour"]);
    expect(
      (db.tables.styles ?? []).find((s) => s.name === "Style A — Soft Pastel Vector")!.style_string,
    ).toBe("MY tuned pastel string.");
    // An empty description is nothing to protect, so the preset fills it.
    expect(String(db.row("characters", blank)!.description)).toContain("thoughtful 5-year-old girl");
  });

  it("never demotes a default style the operator already chose", async () => {
    const db = seeded();
    const mine = await createStyle(db as never, {
      projectId: "p1",
      name: "My House Style",
      styleString: "mine",
    });
    await applyChannelPreset(db as never, { projectId: "p1", presetId: "mindful-minis" });
    expect(db.row("styles", mine)!.is_default).toBe(true);
    expect((db.tables.styles ?? []).filter((s) => s.is_default)).toHaveLength(1);
  });

  it("rejects an unknown preset instead of silently doing nothing", async () => {
    const db = seeded();
    await expect(
      applyChannelPreset(db as never, { projectId: "p1", presetId: "nope" }),
    ).rejects.toThrow(/Unknown channel preset/);
  });

  it("the imported cast actually matches the scripts it will be used with", async () => {
    const db = seeded();
    await applyChannelPreset(db as never, { projectId: "p1", presetId: "mindful-minis" });
    const styles = await listStyles(db as never, "p1");
    const resolved = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: styles.find((s) => s.is_default)!.id,
      text: "Bo and Breeze breathe together while Poppy claps.",
    });
    expect(resolved.characters.map((c) => c.name)).toEqual(["Bo", "Breeze", "Poppy"]);
    // No looks yet, so they inject as text — described, never dropped.
    expect(resolved.textOnlyNames.sort()).toEqual(["Bo", "Breeze", "Poppy"]);
    expect(resolved.draftNames.sort()).toEqual(["Bo", "Breeze", "Poppy"]);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 6. Multi-style rendering                                        */
/* ────────────────────────────────────────────────────────────── */

describe("one video, one style", () => {
  it("resolves the video's chosen style, not the project default", async () => {
    const { db, a, b } = await twoStyleProject();
    await generateLooksForStyle(db as never, { projectId: "p1", styleId: b });

    const inA = await resolveSceneCast(db as never, { projectId: "p1", styleId: a, text: "Bo waves" });
    const inB = await resolveSceneCast(db as never, { projectId: "p1", styleId: b, text: "Bo waves" });
    expect(inA.referencePaths[0]).toBeTruthy();
    expect(inB.referencePaths[0]).toBeTruthy();
    expect(inA.referencePaths[0]).not.toBe(inB.referencePaths[0]);
  });

  it("a character with a look in only one style still appears in the other, as text", async () => {
    const { db, b } = await twoStyleProject();
    const resolved = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: b,
      text: "Bo waves",
    });
    expect(resolved.characters.map((c) => c.name)).toEqual(["Bo"]);
    expect(resolved.referencePaths).toEqual([]);
    expect(resolved.textOnlyNames).toEqual(["Bo"]);
  });
});
