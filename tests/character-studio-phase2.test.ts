/**
 * Character Studio Phase 2 (docs/Character-Studio-Build-Plan.md §7).
 *
 * Phase 1 made the pipeline able to CONSUME characters. Phase 2 is where they
 * get made — and where the feature first spends money. What this pins:
 *
 *  1. The reference-image adapter switches to the multi-reference endpoint
 *     when references exist, caps them, and mocks with zero cost and zero
 *     network when there is no key.
 *  2. Editing a style never spends money — it marks looks stale.
 *  3. The lock ritual is atomic in effect: description frozen, canonical saved,
 *     version bumped, turnaround sheet generated — and a failed sheet never
 *     un-locks the character.
 *  4. The operator owns the description once they touch it: the agent proposes
 *     and never overwrites (Q8).
 *  5. Design spend is attributable per character and system-scoped, so it can
 *     never eat a project's production budget, and the soft budget warns
 *     without blocking (Q10).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

const uploads: { path: string; contentType: string }[] = [];
vi.mock("@/lib/storage", () => ({
  uploadMedia: async (path: string, _body: unknown, contentType: string) => {
    uploads.push({ path, contentType });
  },
  getSignedMediaUrl: async (p: string) =>
    p.startsWith("mock/") ? null : `https://signed.example/${p}`,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("tests must pass an explicit db");
  },
}));

import {
  DEFAULT_REF_IMAGE_MODEL_ID,
  REF_IMAGE_MODELS,
  characterSheetPrompt,
  estimateRefImageCost,
  generateReferenceImage,
  getRefImageModel,
  portraitLookPrompt,
} from "@/lib/adapters/reference-image";
import { mockCharacterDraft } from "@/lib/adapters/character-design";
import { estimateCost, modelCatalog } from "@/lib/models/catalog";
import { CHARACTER_SOFT_BUDGET_USD, characterSpend, monthSpend } from "@/lib/pipeline/ledger";
import {
  DEFAULT_CANDIDATE_COUNT,
  MAX_CANDIDATE_COUNT,
  acceptProposedDescription,
  createCharacter,
  createStyle,
  designChatTurn,
  generateCandidates,
  generatePortraitLook,
  getLook,
  linkCharacterToProject,
  listCharacters,
  loadProjectCastDetail,
  loadStudioState,
  lockCharacterLook,
  setDefaultStyle,
  updateCharacter,
  updateStyle,
  uploadCharacterReference,
} from "@/lib/pipeline/character-studio";

/* ────────────────────────────────────────────────────────────── */
/* Fixtures                                                        */
/* ────────────────────────────────────────────────────────────── */

const STYLE_STRING = "Soft pastel flat-vector picture-book illustration.";

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

async function withCast() {
  const db = seeded();
  const styleId = await createStyle(db as never, {
    projectId: "p1",
    name: "Style A",
    styleString: STYLE_STRING,
    palette: { cream: "#FDF6EC" },
    exclusions: "No text, no logos.",
  });
  const characterId = await createCharacter(db as never, {
    name: "Bo",
    projectId: "p1",
    description: "Bo, a cheerful 4-year-old boy with warm brown skin.",
    identityAnchor: "mustard-yellow tee with a white star",
  });
  return { db, styleId, characterId };
}

/** A fal response with `count` image URLs. */
function falImages(count: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ images: Array.from({ length: count }, (_, i) => ({ url: `https://fal.example/i${i}.png` })) }),
    text: async () => "",
    arrayBuffer: async () => new ArrayBuffer(8),
  };
}

let falCalls: { url: string; body: Record<string, unknown> }[] = [];

/** Live-mode fal: records the endpoint + input, then serves image downloads. */
function stubFal(imageCount = DEFAULT_CANDIDATE_COUNT) {
  falCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: string }) => {
      if (String(url).startsWith("https://fal.run/")) {
        falCalls.push({ url: String(url), body: JSON.parse(init?.body ?? "{}") });
        return falImages(imageCount) as never;
      }
      // image download
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(16) } as never;
    }),
  );
}

beforeEach(() => {
  uploads.length = 0;
  delete process.env.FAL_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ────────────────────────────────────────────────────────────── */
/* 1. The reference-image adapter (Phase 2a)                       */
/* ────────────────────────────────────────────────────────────── */

describe("reference-image adapter", () => {
  it("pins the premium multi-reference models and defaults to the character-work one", () => {
    expect(REF_IMAGE_MODELS.map((m) => m.id)).toEqual(["nano-banana-pro", "flux-2-pro"]);
    expect(DEFAULT_REF_IMAGE_MODEL_ID).toBe("nano-banana-pro");
    for (const m of REF_IMAGE_MODELS) {
      expect(m.endpoint).toMatch(/^fal-ai\//);
      // The reference route is a DIFFERENT endpoint — that switch is the whole
      // capability the Studio rests on.
      expect(m.refEndpoint).not.toBe(m.endpoint);
      expect(m.maxReferences).toBeGreaterThanOrEqual(4);
    }
    // The default holds the most references — it is chosen for consistency,
    // not for price.
    expect(getRefImageModel("nano-banana-pro")!.maxReferences).toBeGreaterThan(
      getRefImageModel("flux-2-pro")!.maxReferences,
    );
  });

  it("costs scale with the number of images", () => {
    const m = getRefImageModel("nano-banana-pro")!;
    expect(estimateRefImageCost(m, 4)).toBeCloseTo(m.usdPerImage * 4, 5);
    // A zero/negative count still prices one image rather than free.
    expect(estimateRefImageCost(m, 0)).toBeCloseTo(m.usdPerImage, 5);
  });

  it("degrades to a mock with no FAL_KEY: no network, no cost", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const res = await generateReferenceImage({
      model: getRefImageModel("nano-banana-pro")!,
      prompt: "a bunny",
      count: 4,
    });
    expect(res.provider).toBe("mock");
    expect(res.costUsd).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("uses the plain endpoint with no references and the ref endpoint with them", async () => {
    process.env.FAL_KEY = "k";
    const model = getRefImageModel("nano-banana-pro")!;

    stubFal(1);
    await generateReferenceImage({ model, prompt: "a bunny", count: 1 });
    expect(falCalls[0].url).toBe(`https://fal.run/${model.endpoint}`);
    expect(falCalls[0].body.image_urls).toBeUndefined();

    stubFal(1);
    await generateReferenceImage({
      model,
      prompt: "a bunny",
      count: 1,
      referenceUrls: ["https://signed.example/a.png"],
    });
    expect(falCalls[0].url).toBe(`https://fal.run/${model.refEndpoint}`);
    expect(falCalls[0].body.image_urls).toEqual(["https://signed.example/a.png"]);
  });

  it("caps references at the model's documented maximum", async () => {
    process.env.FAL_KEY = "k";
    stubFal(1);
    const model = getRefImageModel("flux-2-pro")!;
    await generateReferenceImage({
      model,
      prompt: "x",
      count: 1,
      referenceUrls: Array.from({ length: 30 }, (_, i) => `https://signed.example/${i}.png`),
    });
    expect((falCalls[0].body.image_urls as string[]).length).toBe(model.maxReferences);
  });

  it("prompt builders carry the identity anchor and forbid stray text/characters", () => {
    const sheet = characterSheetPrompt({
      styleString: STYLE_STRING,
      description: "Bo, a cheerful boy.",
      identityAnchor: "mustard-yellow tee",
    });
    expect(sheet).toContain(STYLE_STRING);
    expect(sheet).toContain("mustard-yellow tee");
    expect(sheet).toMatch(/front view.*three-quarter view.*side view/);
    expect(sheet).toMatch(/no extra characters/i);

    const portrait = portraitLookPrompt({
      styleString: STYLE_STRING,
      description: "Bo, a cheerful boy.",
    });
    expect(portrait).toMatch(/chest-up/);
    // No anchor supplied → no dangling "Always keep:".
    expect(portrait).not.toMatch(/Always keep/);
  });

  it("appears in the user-facing catalog with plain-language pros and agreeing estimates", () => {
    const entries = modelCatalog("reference-image");
    expect(entries.map((e) => e.id)).toEqual(REF_IMAGE_MODELS.map((m) => m.id));
    for (const e of entries) {
      expect(e.pros.length).toBeGreaterThan(0);
      expect(e.unit).toBe("image");
    }
    expect(estimateCost({ action: "reference-image", modelId: "nano-banana-pro", count: 4 })).toBe(
      estimateRefImageCost(getRefImageModel("nano-banana-pro")!, 4),
    );
    expect(estimateCost({ action: "reference-image", modelId: "nope", count: 4 })).toBe(0);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 2. Characters and styles                                        */
/* ────────────────────────────────────────────────────────────── */

describe("characters", () => {
  it("creates a global character and links it to the project in one step", async () => {
    const db = seeded();
    const id = await createCharacter(db as never, { name: "Bo", projectId: "p1", description: "a boy" });
    expect(db.row("characters", id)!.status).toBe("draft");
    expect(db.tables.project_characters).toHaveLength(1);
    // Linking twice does not duplicate the row.
    await linkCharacterToProject(db as never, "p1", id);
    expect(db.tables.project_characters).toHaveLength(1);
  });

  it("refuses an unnamed character", async () => {
    const db = seeded();
    await expect(createCharacter(db as never, { name: "   " })).rejects.toThrow(/name/i);
  });

  it("an operator edit takes permanent ownership of the description (Q8)", async () => {
    const db = seeded();
    const id = await createCharacter(db as never, { name: "Bo" });
    expect(db.row("characters", id)!.description_owned_by_operator).toBeUndefined();

    // An agent write does NOT claim ownership...
    await updateCharacter(db as never, id, { description: "agent text" });
    expect(db.row("characters", id)!.description_owned_by_operator).toBeUndefined();
    // ...an operator write does, permanently.
    await updateCharacter(db as never, id, { description: "my text" }, { byOperator: true });
    expect(db.row("characters", id)!.description_owned_by_operator).toBe(true);
    expect(db.row("characters", id)!.description).toBe("my text");
  });

  it("lists the global library sorted by name", async () => {
    const db = seeded();
    await createCharacter(db as never, { name: "Zed" });
    await createCharacter(db as never, { name: "Ada" });
    expect((await listCharacters(db as never)).map((c) => c.name)).toEqual(["Ada", "Zed"]);
  });
});

describe("styles", () => {
  it("the first style is the project default; later ones are not", async () => {
    const db = seeded();
    const a = await createStyle(db as never, { projectId: "p1", name: "A", styleString: "a" });
    const b = await createStyle(db as never, { projectId: "p1", name: "B", styleString: "b" });
    expect(db.row("styles", a)!.is_default).toBe(true);
    expect(db.row("styles", b)!.is_default).toBe(false);
  });

  it("promoting a style demotes the incumbent (one default per project)", async () => {
    const db = seeded();
    const a = await createStyle(db as never, { projectId: "p1", name: "A" });
    const b = await createStyle(db as never, { projectId: "p1", name: "B" });
    await setDefaultStyle(db as never, "p1", b);
    expect(db.row("styles", a)!.is_default).toBe(false);
    expect(db.row("styles", b)!.is_default).toBe(true);
  });

  it("editing the style STRING marks its looks stale — and spends nothing (Q4)", async () => {
    const { db, styleId, characterId } = await withCast();
    const cands = await generateCandidates(db as never, { characterId, styleId });
    await lockCharacterLook(db as never, {
      characterId,
      styleId,
      canonicalImagePath: cands.paths[0],
    });
    expect((await getLook(db as never, characterId, styleId))!.stale).toBe(false);

    const spendBefore = await characterSpend(db as never, characterId);
    const { staleLooks } = await updateStyle(db as never, styleId, {
      styleString: "Watercolour paper-craft.",
    });
    expect(staleLooks).toBe(1);
    expect((await getLook(db as never, characterId, styleId))!.stale).toBe(true);
    // Stale, not deleted: the reference still injects.
    expect((await getLook(db as never, characterId, styleId))!.canonical_image_path).toBe(
      cands.paths[0],
    );
    expect(await characterSpend(db as never, characterId)).toBe(spendBefore);
  });

  it("renaming a style does NOT invalidate its looks", async () => {
    const { db, styleId, characterId } = await withCast();
    const cands = await generateCandidates(db as never, { characterId, styleId });
    await lockCharacterLook(db as never, { characterId, styleId, canonicalImagePath: cands.paths[0] });
    const { staleLooks } = await updateStyle(db as never, styleId, { name: "Style A (v2)" });
    expect(staleLooks).toBe(0);
    expect((await getLook(db as never, characterId, styleId))!.stale).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 3. Candidate generation                                         */
/* ────────────────────────────────────────────────────────────── */

describe("candidate generation", () => {
  it("builds STYLE + CHARACTER + ANCHOR + SCENE + EXCLUSIONS into one prompt", async () => {
    const { db, styleId, characterId } = await withCast();
    const res = await generateCandidates(db as never, { characterId, styleId });
    expect(res.prompt).toContain(STYLE_STRING);
    expect(res.prompt).toContain("cheerful 4-year-old boy");
    expect(res.prompt).toContain("Always keep: mustard-yellow tee with a white star.");
    expect(res.prompt).toContain("plain cream background");
    expect(res.prompt).toContain("No text, no logos.");
    expect(res.prompt).toContain("cream #FDF6EC");
  });

  it("mocks with zero cost and no ledger row, but still returns a usable grid", async () => {
    const { db, styleId, characterId } = await withCast();
    const res = await generateCandidates(db as never, { characterId, styleId });
    expect(res.provider).toBe("mock");
    expect(res.paths).toHaveLength(DEFAULT_CANDIDATE_COUNT);
    expect(res.costUsd).toBe(0);
    // The estimate is still reported, so the UI can show what it WOULD cost.
    expect(res.estimateUsd).toBeGreaterThan(0);
    expect(db.tables.cost_ledger).toHaveLength(0);
  });

  it("clamps the grid size so a hand-edited request can't run up spend", async () => {
    const { db, styleId, characterId } = await withCast();
    expect((await generateCandidates(db as never, { characterId, styleId, count: 99 })).paths).toHaveLength(
      MAX_CANDIDATE_COUNT,
    );
    expect((await generateCandidates(db as never, { characterId, styleId, count: 0 })).paths).toHaveLength(1);
  });

  it("conditions on the character's own prior images so iteration converges", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();

    // First pass: nothing to reference yet.
    stubFal(1);
    await generateCandidates(db as never, { characterId, styleId, count: 1 });
    expect(falCalls[0].body.image_urls).toBeUndefined();
    const firstPath = uploads[0].path;

    await lockCharacterLook(db as never, {
      characterId,
      styleId,
      canonicalImagePath: firstPath,
      generateSheet: false,
    });
    await uploadCharacterReference(db as never, {
      characterId,
      styleId,
      bytes: Buffer.from("x"),
      ext: "png",
      contentType: "image/png",
    });

    // Second pass: the canonical AND the operator's upload are both fed back in.
    stubFal(1);
    await generateCandidates(db as never, { characterId, styleId, count: 1 });
    const refs = falCalls[0].body.image_urls as string[];
    expect(refs).toHaveLength(2);
    expect(refs[0]).toContain(firstPath);

    // ...unless the operator explicitly asks for a fresh start.
    stubFal(1);
    await generateCandidates(db as never, { characterId, styleId, count: 1, ignoreReferences: true });
    expect(falCalls[0].body.image_urls).toBeUndefined();
  });

  it("uploads every returned image and ledgers the spend against the character", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();
    stubFal(4);
    const res = await generateCandidates(db as never, { characterId, styleId, count: 4 });
    expect(res.provider).toBe("fal-ref-image");
    expect(res.paths).toHaveLength(4);
    expect(uploads).toHaveLength(4);
    expect(uploads[0].path).toContain(`characters/${characterId}/${styleId}/`);

    const ledger = db.tables.cost_ledger as Record<string, unknown>[];
    expect(ledger).toHaveLength(1);
    expect(ledger[0].character_id).toBe(characterId);
    expect(await characterSpend(db as never, characterId)).toBeCloseTo(res.costUsd, 5);
  });

  it("design spend is system-scoped: it can never eat a project's monthly cap", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();
    stubFal(4);
    await generateCandidates(db as never, { characterId, styleId, count: 4 });
    expect((db.tables.cost_ledger as Record<string, unknown>[])[0].project_id).toBeNull();
    expect(await monthSpend(db as never, "p1")).toBe(0);
  });

  it("warns past the soft budget but still returns the images (Q10)", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();
    (db.tables.cost_ledger as Record<string, unknown>[]).push({
      id: "l0",
      project_id: null,
      character_id: characterId,
      provider: "fal-ref-image",
      usd: CHARACTER_SOFT_BUDGET_USD,
      at: new Date().toISOString(),
    });
    stubFal(1);
    const res = await generateCandidates(db as never, { characterId, styleId, count: 1 });
    expect(res.warning).toMatch(/nothing is blocked/i);
    expect(res.paths).toHaveLength(1);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 4. The lock ritual                                              */
/* ────────────────────────────────────────────────────────────── */

describe("the lock ritual", () => {
  it("freezes the character, saves the canonical, and generates the turnaround sheet", async () => {
    const { db, styleId, characterId } = await withCast();
    const cands = await generateCandidates(db as never, { characterId, styleId });
    const res = await lockCharacterLook(db as never, {
      characterId,
      styleId,
      canonicalImagePath: cands.paths[1],
    });

    const character = db.row("characters", characterId)!;
    expect(character.status).toBe("locked");
    expect(character.locked_at).toBeTruthy();
    expect(res.version).toBe(1); // first lock does not bump

    const look = (await getLook(db as never, characterId, styleId))!;
    expect(look.canonical_image_path).toBe(cands.paths[1]);
    expect(look.status).toBe("locked");
    expect(look.stale).toBe(false);
    expect(res.sheetPath).toBeTruthy();
    expect(look.sheet_image_path).toBe(res.sheetPath);
  });

  it("the sheet is generated FROM the canonical image, not from the text alone", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();
    stubFal(1);
    const cands = await generateCandidates(db as never, { characterId, styleId, count: 1 });
    stubFal(1);
    await lockCharacterLook(db as never, { characterId, styleId, canonicalImagePath: cands.paths[0] });
    const sheetCall = falCalls[0];
    expect(sheetCall.body.image_urls).toEqual([`https://signed.example/${cands.paths[0]}`]);
    expect(String(sheetCall.body.prompt)).toMatch(/reference sheet/i);
  });

  it("a re-lock bumps the version so already-generated videos keep the old look (Q5)", async () => {
    const { db, styleId, characterId } = await withCast();
    const cands = await generateCandidates(db as never, { characterId, styleId });
    await lockCharacterLook(db as never, { characterId, styleId, canonicalImagePath: cands.paths[0], generateSheet: false });
    const second = await lockCharacterLook(db as never, {
      characterId,
      styleId,
      canonicalImagePath: cands.paths[1],
      generateSheet: false,
    });
    expect(second.version).toBe(2);
    expect(db.row("characters", characterId)!.version).toBe(2);
  });

  it("refuses to lock a character with no description — the text is what carries identity", async () => {
    const db = seeded();
    const styleId = await createStyle(db as never, { projectId: "p1", name: "A", styleString: "a" });
    const characterId = await createCharacter(db as never, { name: "Nameless", projectId: "p1" });
    await expect(
      lockCharacterLook(db as never, { characterId, styleId, canonicalImagePath: "x.png" }),
    ).rejects.toThrow(/description/i);
    expect(db.row("characters", characterId)!.status).toBe("draft");
  });

  it("a failed sheet never un-locks the character", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }) as never),
    );
    const res = await lockCharacterLook(db as never, {
      characterId,
      styleId,
      canonicalImagePath: "characters/x.png",
    });
    expect(res.sheetPath).toBeNull();
    expect(db.row("characters", characterId)!.status).toBe("locked");
    expect((await getLook(db as never, characterId, styleId))!.canonical_image_path).toBe(
      "characters/x.png",
    );
  });

  it("locking clears the stale flag left by a style edit", async () => {
    const { db, styleId, characterId } = await withCast();
    const cands = await generateCandidates(db as never, { characterId, styleId });
    await lockCharacterLook(db as never, { characterId, styleId, canonicalImagePath: cands.paths[0], generateSheet: false });
    await updateStyle(db as never, styleId, { styleString: "Watercolour." });
    expect((await getLook(db as never, characterId, styleId))!.stale).toBe(true);

    const fresh = await generateCandidates(db as never, { characterId, styleId });
    await lockCharacterLook(db as never, { characterId, styleId, canonicalImagePath: fresh.paths[0], generateSheet: false });
    expect((await getLook(db as never, characterId, styleId))!.stale).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 5. The portrait look (avatars)                                  */
/* ────────────────────────────────────────────────────────────── */

describe("portrait look", () => {
  it("is a separate look conditioned on the locked illustration — same character, new framing", async () => {
    process.env.FAL_KEY = "k";
    const { db, styleId, characterId } = await withCast();
    stubFal(1);
    const cands = await generateCandidates(db as never, { characterId, styleId, count: 1 });
    await lockCharacterLook(db as never, {
      characterId,
      styleId,
      canonicalImagePath: cands.paths[0],
      generateSheet: false,
    });

    stubFal(1);
    const portrait = await generatePortraitLook(db as never, { characterId, styleId });
    expect(falCalls[0].body.image_urls).toEqual([`https://signed.example/${cands.paths[0]}`]);
    expect(String(falCalls[0].body.prompt)).toMatch(/chest-up/);
    expect(portrait.path).toBeTruthy();

    const look = (await getLook(db as never, characterId, styleId, "portrait"))!;
    expect(look.canonical_image_path).toBe(portrait.path);
    // The illustration look is untouched.
    expect((await getLook(db as never, characterId, styleId))!.canonical_image_path).toBe(cands.paths[0]);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 6. The design chat                                              */
/* ────────────────────────────────────────────────────────────── */

describe("the design chat", () => {
  it("writes the draft onto the character and records both sides of the thread", async () => {
    const { db, characterId } = await withCast();
    const turn = await designChatTurn(db as never, {
      characterId,
      text: "a shy grey bunny in a mint scarf",
    });
    expect(turn.applied).toBe(true);
    expect(db.row("characters", characterId)!.description).toBe(turn.draft.description);
    const msgs = db.tables.character_design_messages as Record<string, unknown>[];
    expect(msgs.map((m) => m.role)).toEqual(["user", "agent"]);
  });

  it("never renames a character that already has a name", async () => {
    const { db, characterId } = await withCast();
    await designChatTurn(db as never, { characterId, text: "make him taller" });
    expect(db.row("characters", characterId)!.name).toBe("Bo");
  });

  it("PROPOSES instead of overwriting once the operator owns the description (Q8)", async () => {
    const { db, characterId } = await withCast();
    await updateCharacter(db as never, characterId, { description: "MY words." }, { byOperator: true });

    const turn = await designChatTurn(db as never, { characterId, text: "give him a red hat" });
    expect(turn.applied).toBe(false);
    expect(db.row("characters", characterId)!.description).toBe("MY words.");
    expect(turn.reply).toMatch(/untouched until you accept/i);

    // ...and accepting is one explicit call.
    await acceptProposedDescription(db as never, {
      characterId,
      description: turn.draft.description,
    });
    expect(db.row("characters", characterId)!.description).toBe(turn.draft.description);
    expect(db.row("characters", characterId)!.description_owned_by_operator).toBe(true);
  });

  it("chatting is free — only pressing generate spends", async () => {
    const { db, characterId } = await withCast();
    await designChatTurn(db as never, { characterId, text: "a bunny" });
    expect(db.tables.cost_ledger).toHaveLength(0);
  });

  it("the mock draft is deterministic and never invents style words", () => {
    const draft = mockCharacterDraft("a shy grey bunny in a mint scarf");
    expect(draft.provider).toBe("mock");
    expect(draft.costUsd).toBe(0);
    expect(draft).toEqual(mockCharacterDraft("a shy grey bunny in a mint scarf"));
    expect(draft.description).not.toMatch(/watercolou?r|3D|cinematic/i);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 7. Reads for the UI                                             */
/* ────────────────────────────────────────────────────────────── */

describe("studio reads", () => {
  it("loadStudioState returns the character, its looks, the thread, and the meter", async () => {
    const { db, styleId, characterId } = await withCast();
    await generateCandidates(db as never, { characterId, styleId });
    await designChatTurn(db as never, { characterId, text: "taller" });

    const state = (await loadStudioState(db as never, characterId))!;
    expect(state.character.name).toBe("Bo");
    expect(state.looks).toHaveLength(1);
    expect(state.messages).toHaveLength(2);
    expect(state.projectIds).toEqual(["p1"]);
    expect(state.softBudgetUsd).toBe(CHARACTER_SOFT_BUDGET_USD);
    expect(state.spendUsd).toBe(0);
  });

  it("loadStudioState is null for an unknown character rather than throwing", async () => {
    const db = seeded();
    expect(await loadStudioState(db as never, "nope")).toBeNull();
  });

  it("the Cast tab gets every linked character plus the project's styles", async () => {
    const { db, styleId, characterId } = await withCast();
    await createStyle(db as never, { projectId: "p1", name: "Style B", styleString: "watercolour" });
    await generateCandidates(db as never, { characterId, styleId });

    const detail = await loadProjectCastDetail(db as never, "p1");
    expect(detail.characters.map((c) => c.name)).toEqual(["Bo"]);
    expect(detail.styles).toHaveLength(2);
    // One look exists (Style A); the UI can therefore badge "no look in Style B".
    expect(detail.looks).toHaveLength(1);
    expect(detail.looks[0].style_id).toBe(styleId);
  });

  it("a project with no cast reads empty rather than failing", async () => {
    const db = seeded();
    const detail = await loadProjectCastDetail(db as never, "p1");
    expect(detail).toEqual({ characters: [], looks: [], styles: [] });
  });
});
