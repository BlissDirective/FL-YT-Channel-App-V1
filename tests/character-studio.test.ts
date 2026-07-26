/**
 * Character Studio Phase 1 (docs/Character-Studio-Build-Plan.md §7).
 *
 * The phase's contract, in priority order:
 *  1. BYTE-IDENTICAL behavior for projects with no style and no cast.
 *  2. The name-matcher is precise (word boundaries, aliases, ordering, cap).
 *  3. Prompt assembly is STYLE + CHARACTERS + SCENE + EXCLUSIONS.
 *  4. Per-scene overrides always win over auto-matching.
 *  5. Looks resolve per style + look type; missing/stale/draft degrade, never block.
 *  6. Avatars prefer the presenter character's portrait, falling back to the
 *     legacy column.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("tests must pass an explicit db");
  },
}));

import {
  applyCastOverrides,
  characterVersionStamp,
  composeScenePrompt,
  firstMentionIndex,
  matchCast,
  MAX_CHARACTERS_PER_SCENE,
  type CastMember,
} from "@studio/core";
import {
  loadProjectCast,
  resolvePresenterImagePath,
  resolveSceneCast,
  resolveStyle,
} from "@/lib/pipeline/cast-resolver";

const BO: CastMember = {
  id: "c-bo",
  name: "Bo",
  aliases: ["Bo the boy"],
  description: "Bo, a cheerful 4-year-old boy with warm brown skin.",
  identityAnchor: "mustard-yellow tee with a white star",
  role: "cast",
  status: "locked",
};
const POPPY: CastMember = {
  id: "c-poppy",
  name: "Poppy",
  description: "Poppy, a thoughtful 5-year-old girl with coral hair bobbles.",
  role: "cast",
  status: "locked",
};
const BREEZE: CastMember = {
  id: "c-breeze",
  name: "Breeze",
  description: "Breeze, a small lilac-grey bunny in a mint-green scarf.",
  role: "cast",
  status: "locked",
};
const CAST = [BO, POPPY, BREEZE];

/* ────────────────────────────────────────────────────────────── */
/* 1. The acceptance criterion                                     */
/* ────────────────────────────────────────────────────────────── */

describe("Phase 1 acceptance: no style + no cast changes nothing", () => {
  it("returns the fallback prompt byte-for-byte", () => {
    const fallback =
      "A sunny meadow. bold, high-contrast style, cinematic 16:9, professional cinematography, no text";
    const out = composeScenePrompt({ scene: "A sunny meadow", fallbackPrompt: fallback });
    expect(out.prompt).toBe(fallback);
    expect(out.characterIds).toEqual([]);
  });

  it("an empty project resolves to an empty cast and a null style", async () => {
    const db = fakeDb({ projects: [], project_characters: [], characters: [], styles: [] });
    expect(await resolveStyle(db as never, "p1")).toBeNull();
    expect(await loadProjectCast(db as never, "p1")).toEqual([]);
    const resolved = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: null,
      text: "Bo waves at Breeze",
    });
    expect(resolved.characters).toEqual([]);
    expect(resolved.referencePaths).toEqual([]);
  });

  it("missing tables degrade to no-cast rather than throwing", async () => {
    const db = fakeDb({}); // nothing seeded at all
    await expect(loadProjectCast(db as never, "p1")).resolves.toEqual([]);
    await expect(resolveStyle(db as never, "p1")).resolves.toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 2. The matcher                                                  */
/* ────────────────────────────────────────────────────────────── */

describe("name matching", () => {
  it("matches on word boundaries, case-insensitively", () => {
    expect(firstMentionIndex("Bo waves hello", "Bo")).toBe(0);
    expect(firstMentionIndex("and then bo waves", "Bo")).toBe(9);
    expect(firstMentionIndex("Bobby waves", "Bo")).toBe(-1);
  });

  it("does NOT match a name inside another word ('bow tie' must not summon Bo)", () => {
    expect(matchCast("a smart bow tie and a bobbin", CAST).matched).toEqual([]);
    expect(matchCast("Poppyseed bread", CAST).matched).toEqual([]);
  });

  it("DOES match a short name used as an ordinary word — which is what overrides are for", () => {
    // Documented limitation: word boundaries can't distinguish the character
    // "Bo" from the standalone word "bo". The per-scene override is the remedy,
    // and the matcher's decision is always visible on the beat card.
    const { matched } = matchCast("a smart bo tie", CAST);
    expect(matched.map((m) => m.member.name)).toEqual(["Bo"]);
    expect(applyCastOverrides(matched.map((m) => m.member), CAST, { remove: ["c-bo"] })).toEqual([]);
  });

  it("matches aliases as well as the canonical name", () => {
    const { matched } = matchCast("Bo the boy sits down", CAST);
    expect(matched).toHaveLength(1);
    expect(matched[0].member.id).toBe("c-bo");
  });

  it("orders by first mention so the scene's real subjects survive the cap", () => {
    const { matched } = matchCast("Breeze hops while Poppy claps and Bo laughs", CAST);
    expect(matched.map((m) => m.member.name)).toEqual(["Breeze", "Poppy", "Bo"]);
  });

  it("caps the frame and reports what was dropped", () => {
    const many: CastMember[] = [
      ...CAST,
      { id: "c-4", name: "Rumble", description: "bear" },
      { id: "c-5", name: "Wobble", description: "turtle" },
    ];
    const { matched, dropped } = matchCast(
      "Bo, Poppy, Breeze, Rumble and Wobble all sing",
      many,
    );
    expect(matched).toHaveLength(MAX_CHARACTERS_PER_SCENE);
    expect(dropped.map((d) => d.member.name)).toEqual(["Wobble"]);
  });

  it("escapes regex metacharacters in names", () => {
    const odd: CastMember[] = [{ id: "c-x", name: "C.J.", description: "x" }];
    expect(matchCast("C.J. waves", odd).matched).toHaveLength(1);
    expect(matchCast("CXJY waves", odd).matched).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 3. Overrides                                                    */
/* ────────────────────────────────────────────────────────────── */

describe("per-scene overrides (auto-match is always correctable)", () => {
  it("removes a false positive", () => {
    const out = applyCastOverrides([BO, POPPY], CAST, { remove: ["c-poppy"] });
    expect(out.map((c) => c.id)).toEqual(["c-bo"]);
  });

  it("adds a character the text implies but doesn't name", () => {
    const out = applyCastOverrides([BO], CAST, { add: ["c-breeze"] });
    expect(out.map((c) => c.id)).toEqual(["c-bo", "c-breeze"]);
  });

  it("an explicit add beats a remove for the same character", () => {
    const out = applyCastOverrides([BO], CAST, { add: ["c-bo"], remove: ["c-bo"] });
    expect(out.map((c) => c.id)).toEqual(["c-bo"]);
  });

  it("never exceeds the per-scene cap even via adds", () => {
    const many: CastMember[] = [
      ...CAST,
      { id: "c-4", name: "Rumble", description: "bear" },
      { id: "c-5", name: "Wobble", description: "turtle" },
    ];
    const out = applyCastOverrides([BO], many, { add: ["c-poppy", "c-breeze", "c-4", "c-5"] });
    expect(out).toHaveLength(MAX_CHARACTERS_PER_SCENE);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 4. Prompt assembly                                              */
/* ────────────────────────────────────────────────────────────── */

describe("prompt assembly", () => {
  const style = {
    styleString: "Soft pastel flat-vector picture-book illustration.",
    palette: { cream: "#FDF6EC", sage: "#A8C3A0" },
    compositionRules: "Camera at child eye level.",
    exclusions: "No text, no logos.",
  };

  it("assembles STYLE + PALETTE + CHARACTERS + SCENE + COMPOSITION + EXCLUSIONS in order", () => {
    const { prompt } = composeScenePrompt({
      scene: "Bo and Breeze breathe together in a meadow",
      style,
      characters: [BO, BREEZE],
      fallbackPrompt: "unused",
    });
    const order = [
      "Soft pastel flat-vector",
      "cream #FDF6EC",
      "Bo, a cheerful 4-year-old",
      "Breeze, a small lilac-grey bunny",
      "Bo and Breeze breathe together",
      "Camera at child eye level",
      "No text, no logos",
    ].map((needle) => prompt.indexOf(needle));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("repeats the identity anchor so the must-survive detail survives", () => {
    const { prompt } = composeScenePrompt({
      scene: "Bo waves",
      style,
      characters: [BO],
      fallbackPrompt: "unused",
    });
    expect(prompt).toContain("Always keep: mustard-yellow tee with a white star.");
  });

  it("works with a style and no characters, and characters and no style", () => {
    const styleOnly = composeScenePrompt({ scene: "A meadow", style, fallbackPrompt: "fb" });
    expect(styleOnly.prompt).toContain("Soft pastel");
    expect(styleOnly.prompt).not.toBe("fb");

    const castOnly = composeScenePrompt({
      scene: "Bo waves",
      characters: [BO],
      fallbackPrompt: "fb",
    });
    expect(castOnly.prompt).toContain("Bo, a cheerful");
    expect(castOnly.characterIds).toEqual(["c-bo"]);
  });

  it("stamps character versions for forward-only edits", () => {
    expect(characterVersionStamp([{ id: "c-bo", version: 3 }, { id: "c-poppy" }])).toEqual({
      "c-bo": 3,
      "c-poppy": 1,
    });
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 5. Look resolution against the DB                               */
/* ────────────────────────────────────────────────────────────── */

function seeded(over: { looks?: Record<string, unknown>[]; characters?: Record<string, unknown>[] } = {}) {
  return fakeDb({
    projects: [{ id: "p1", name: "Kids", presenter_image_path: "legacy/presenter.png" } as never],
    styles: [
      {
        id: "s-a",
        project_id: "p1",
        name: "Pastel Vector",
        style_string: "Soft pastel flat-vector.",
        palette: { cream: "#FDF6EC" },
        composition_rules: "Eye level.",
        exclusions: "No text.",
        is_default: true,
      } as never,
      {
        id: "s-b",
        project_id: "p1",
        name: "Watercolor",
        style_string: "Cut-paper watercolor.",
        palette: {},
        composition_rules: null,
        exclusions: null,
        is_default: false,
      } as never,
    ],
    characters: (over.characters ?? [
      {
        id: "c-bo",
        name: "Bo",
        aliases: ["Bo the boy"],
        role: "cast",
        description: "Bo, a cheerful boy.",
        identity_anchor: "star tee",
        status: "locked",
        version: 2,
      },
      {
        id: "c-breeze",
        name: "Breeze",
        aliases: [],
        role: "cast",
        description: "Breeze, a bunny.",
        identity_anchor: null,
        status: "draft",
        version: 1,
      },
    ]) as never[],
    project_characters: [
      { project_id: "p1", character_id: "c-bo", sort_order: 0 },
      { project_id: "p1", character_id: "c-breeze", sort_order: 1 },
    ] as never[],
    character_looks: (over.looks ?? [
      {
        id: "l-1",
        character_id: "c-bo",
        style_id: "s-a",
        look_type: "illustration",
        canonical_image_path: "looks/bo-a.png",
        stale: false,
        status: "locked",
      },
    ]) as never[],
  });
}

describe("look resolution", () => {
  it("resolves the reference image for the ACTIVE style only", async () => {
    const db = seeded();
    const inA = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: "s-a",
      text: "Bo waves",
    });
    expect(inA.referencePaths).toEqual(["looks/bo-a.png"]);

    // Same character, other style: no look yet → text-only, never dropped.
    const inB = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: "s-b",
      text: "Bo waves",
    });
    expect(inB.characters.map((c) => c.name)).toEqual(["Bo"]);
    expect(inB.referencePaths).toEqual([]);
    expect(inB.textOnlyNames).toEqual(["Bo"]);
  });

  it("flags a stale look but still uses it", async () => {
    const db = seeded({
      looks: [
        {
          id: "l-1",
          character_id: "c-bo",
          style_id: "s-a",
          look_type: "illustration",
          canonical_image_path: "looks/bo-a.png",
          stale: true,
          status: "locked",
        },
      ],
    });
    const out = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: "s-a",
      text: "Bo waves",
    });
    expect(out.referencePaths).toEqual(["looks/bo-a.png"]);
    expect(out.staleNames).toEqual(["Bo"]);
  });

  it("reports draft characters so the UI can badge them", async () => {
    const db = seeded();
    const out = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: "s-a",
      text: "Breeze hops",
    });
    expect(out.draftNames).toEqual(["Breeze"]);
  });

  it("picks the project's default style when none is specified", async () => {
    const db = seeded();
    const style = await resolveStyle(db as never, "p1");
    expect(style?.id).toBe("s-a");
    expect((await resolveStyle(db as never, "p1", "s-b"))?.id).toBe("s-b");
  });

  it("only matches characters LINKED to the project (global library doesn't leak)", async () => {
    const db = seeded();
    // A global character that exists but isn't linked to p1.
    db.tables.characters.push({
      id: "c-alien",
      name: "Observer",
      aliases: [],
      role: "presenter",
      description: "An alien.",
      identity_anchor: null,
      status: "locked",
      version: 1,
    } as never);
    const out = await resolveSceneCast(db as never, {
      projectId: "p1",
      styleId: "s-a",
      text: "Observer files a report while Bo waves",
    });
    expect(out.characters.map((c) => c.name)).toEqual(["Bo"]);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 6. Avatar back-compat                                           */
/* ────────────────────────────────────────────────────────────── */

describe("presenter resolution (avatar back-compat)", () => {
  it("falls back to the legacy column when there is no presenter character", async () => {
    const db = seeded();
    const path = await resolvePresenterImagePath(db as never, {
      id: "p1",
      presenter_image_path: "legacy/presenter.png",
    });
    expect(path).toBe("legacy/presenter.png");
  });

  it("prefers the presenter character's PORTRAIT look over its illustration look", async () => {
    const db = seeded({
      characters: [
        {
          id: "c-host",
          name: "Host",
          aliases: [],
          role: "presenter",
          description: "The host.",
          identity_anchor: null,
          status: "locked",
          version: 1,
        },
      ],
      looks: [
        {
          id: "l-i",
          character_id: "c-host",
          style_id: "s-a",
          look_type: "illustration",
          canonical_image_path: "looks/host-full.png",
          stale: false,
          status: "locked",
        },
        {
          id: "l-p",
          character_id: "c-host",
          style_id: "s-a",
          look_type: "portrait",
          canonical_image_path: "looks/host-portrait.png",
          stale: false,
          status: "locked",
        },
      ],
    });
    db.tables.project_characters = [
      { project_id: "p1", character_id: "c-host", sort_order: 0 },
    ] as never[];
    const path = await resolvePresenterImagePath(db as never, {
      id: "p1",
      presenter_image_path: "legacy/presenter.png",
    });
    expect(path).toBe("looks/host-portrait.png");
  });
});
