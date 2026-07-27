/**
 * Character Studio UI contracts (Phase 2c).
 *
 * The vitest harness can't render React Server Components, so this pins the
 * composition seams that carry the design decisions — the ones a future edit
 * could silently undo:
 *
 *  - cost is on the button, and the running per-character total sits next to it;
 *  - chat is the focal column, not a sidebar;
 *  - the wizard's style step is genuinely optional;
 *  - the project tab bar stays at four, so the mobile grid stays valid.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { globalNavV2, projectNavV2 } from "@/components/shell/nav-context";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const STUDIO = "src/app/(app)/characters/[cid]/studio-view.tsx";
const STUDIO_PAGE = "src/app/(app)/characters/[cid]/page.tsx";
const CAST = "src/app/(app)/projects/[id]/cast/cast-manager.tsx";
const WIZARD = "src/app/(app)/projects/new/wizard.tsx";
const PROJECTS_ACTION = "src/lib/actions/projects.ts";
const MOBILE_NAV = "src/components/shell/mobile-nav.tsx";

describe("the Studio split view", () => {
  const src = read(STUDIO);

  it("prints the USD estimate on the button that spends money", () => {
    expect(src).toMatch(/Generate · ~\$\$\{gridCost\.toFixed\(2\)\}/);
    expect(src).toMatch(/const gridCost = \(model\?\.unitUsd \?\? 0\) \* count/);
  });

  it("shows the running per-character spend against the soft budget, framed as advice", () => {
    expect(src).toMatch(/spent designing/);
    expect(src).toMatch(/never a block/i);
  });

  it("chat is the focal column and the subject panel is the sidebar", () => {
    // Mobile stacks subject-first (col-reverse), desktop puts chat on the left.
    expect(src).toMatch(/flex-col-reverse[^"]*lg:flex-row/);
    expect(src).toMatch(/lg:flex-1">\{chat\}/);
    expect(src).toMatch(/lg:w-80 lg:shrink-0">\{subject\}/);
  });

  it("keeps the description editable and surfaces agent rewrites as a proposal (Q8)", () => {
    expect(src).toMatch(/<textarea[\s\S]*?value=\{description\}/);
    expect(src).toMatch(/The agent proposes this instead/);
    expect(src).toMatch(/acceptProposalAction/);
    // A proposal is only ever recorded when the turn was NOT applied.
    expect(src).toMatch(/if \(r\.turn\.applied\) \{[\s\S]*?\} else \{[\s\S]*?setProposal\(/);
  });

  it("locking is one button whose consequence is stated in plain language", () => {
    expect(src).toMatch(/Lock this look/);
    expect(src).toMatch(/go(es)? into every scene/i);
  });

  it("says out loud when a look is stale rather than silently regenerating", () => {
    expect(src).toMatch(/illustration\?\.stale && \(/);
    expect(src).toMatch(/It still works — regenerate when you/);
  });

  it("explains rather than blanks out when the character has no style to render into", () => {
    expect(src).toMatch(/props\.styles\.length === 0 \?/);
    expect(src).toMatch(/a look belongs to a style/i);
  });
});

describe("the Studio page", () => {
  const src = read(STUDIO_PAGE);

  it("scopes styles to the projects the character is linked into", () => {
    expect(src).toMatch(/state\.projectIds/);
    expect(src).toMatch(/listStyles\(db, p\.id\)/);
  });

  it("falls back to the project's default style when none is in the URL", () => {
    expect(src).toMatch(/styles\.find\(\(s\) => s\.id === styleParam\)[\s\S]*?isDefault/);
  });
});

describe("the project Cast page", () => {
  const src = read(CAST);

  it("reports how many looks a style edit made stale, in numbers", () => {
    expect(src).toMatch(/r\.staleLooks/);
    expect(src).toMatch(/marked stale/);
  });

  it("removing a character from a project unlinks it — it never deletes the character", () => {
    expect(src).toMatch(/unlinkCharacterAction/);
    expect(src).toMatch(/the character itself is kept/i);
  });

  it("confirms before deleting a style, and never offers to delete the default", () => {
    expect(src).toMatch(/window\.confirm/);
    expect(src).toMatch(/\{!s\.isDefault && \(\s*<Button\s*\n?\s*variant="destructive"/);
  });
});

describe("the optional wizard step", () => {
  const wizard = read(WIZARD);
  const action = read(PROJECTS_ACTION);

  it("adds a Look step whose fields are all optional", () => {
    expect(wizard).toMatch(/key: "look"/);
    const step = wizard.slice(wizard.indexOf('step !== 4'), wizard.indexOf("{state.error"));
    expect(step).toMatch(/name="style_string"/);
    expect(step).not.toMatch(/required/);
    expect(step).toMatch(/Skip this and nothing/);
  });

  it("creates a style ONLY when the operator typed one", () => {
    expect(action).toMatch(/const styleString = String\(formData\.get\("style_string"\) \?\? ""\)\.trim\(\)/);
    expect(action).toMatch(/if \(styleString\) \{/);
  });

  it("never fails project creation over the optional style", () => {
    const block = action.slice(action.indexOf("const styleString"), action.indexOf('revalidatePath("/")'));
    expect(block).toMatch(/catch \(err\)/);
  });
});

/* ── Phase 3 surfaces ────────────────────────────────────────────── */

const WORKSPACE = "src/app/(app)/projects/[id]/videos/[vid]/workspace/workspace-view.tsx";
const CANVAS = "src/app/(app)/projects/[id]/videos/[vid]/page.tsx";
const ENGINE = "src/lib/pipeline/engine.ts";

describe("per-beat cast chips", () => {
  const src = read(WORKSPACE);

  it("shows who is in the frame on the beat card, before anything is rendered", () => {
    expect(src).toMatch(/function CastChips\(/);
    expect(src).toMatch(/In frame/);
    // Rendered from the matcher's prediction, not from a generated asset.
    expect(read(CANVAS)).toMatch(/matchCast\(`\$\{b\.text \?\? ""\} \$\{b\.visualPrompt \?\? ""\}`/);
  });

  it("commits corrections as a diff against the matcher, not as an absolute set", () => {
    expect(src).toMatch(/const commit = \(desired: string\[\]\) =>/);
    expect(src).toMatch(/desired\.filter\(\(id\) => !matched\.has\(id\)\)/);
    expect(src).toMatch(/cast\.matchedIds\.filter\(\(id\) => !want\.has\(id\)\)/);
  });

  it("names what the cap left out rather than dropping it silently", () => {
    expect(src).toMatch(/left out:/);
    expect(src).toMatch(/cast\.droppedNames\.length > 0/);
  });

  it("the canvas only builds cast props when the project actually has a cast", () => {
    expect(read(CANVAS)).toMatch(/projectCast\.length > 0\s*\?/);
  });
});

describe("the scene-model cost lever", () => {
  it("is offered per project, priced per cast beat", () => {
    const src = read(CAST);
    expect(src).toMatch(/Scene image model/);
    expect(src).toMatch(/per cast beat/);
    expect(src).toMatch(/setSceneImageModelAction/);
  });

  it("says plainly that beats with nobody in them are unaffected", () => {
    expect(read(CAST)).toMatch(/Beats with nobody\s*\n?\s*in them are unaffected/);
  });

  it("the engine only reaches for the premium model when references exist", () => {
    const src = read(ENGINE);
    expect(src).toMatch(/const useCast = castRefPaths\.length > 0;/);
    expect(src).toMatch(/const castStill = useCast\s*\n?\s*\? await generateCastStill/);
    // ...and the cache key only changes shape for those beats.
    expect(src).toMatch(/useCast \? `\$\{prompt\}\|\$\{castModelId\}\|\$\{castRefPaths\.join\(","\)\}` : `\$\{prompt\}\|\$\{quality\}`/);
  });
});

/* ── Phase 4 surfaces ────────────────────────────────────────────── */

describe("multi-style switcher", () => {
  const src = read(WORKSPACE);

  it("appears only when there is a real choice to make", () => {
    expect(src).toMatch(/\(props\.styles\?\.length \?\? 0\) > 1 && \(/);
  });

  it("says plainly that switching does not restyle what already exists", () => {
    expect(src).toMatch(/Existing visuals were made in the old style/);
  });
});

describe("batch look tools", () => {
  const src = read(CAST);

  it("quote first, generate second — the total is never a surprise", () => {
    expect(src).toMatch(/estimateStyleLooksAction/);
    expect(src).toMatch(/setQuote\(\{ count: r\.count!, usd: r\.usd!, staleOnly \}\)/);
    // The run path is only reachable from an accepted quote.
    expect(src).toMatch(/const run = \(\) => \{\s*\n\s*if \(!quote\) return;/);
  });

  it("says the batch produced drafts to review, not locks", () => {
    expect(src).toMatch(/generated as drafts/);
    expect(src).toMatch(/review and lock/);
  });

  it("offers the preset import only to a project that has no styles yet", () => {
    expect(src).toMatch(/\{presets\.length > 0 && styles\.length === 0 && \(/);
    expect(src).toMatch(/Nothing was generated yet/);
  });
});

describe("drift stays advisory", () => {
  it("never blocks — it badges and offers a re-roll", () => {
    const drift = read("src/lib/adapters/character-drift.ts");
    expect(drift).toMatch(/ADVISORY BY DESIGN/);
    expect(drift).toMatch(/Nothing is blocked/);
    // A failed check is "no opinion", never a bad verdict.
    expect(drift).toMatch(/treated as no opinion/);
  });

  it("the engine records it as a QC row and keeps going", () => {
    const src = read(ENGINE);
    expect(src).toMatch(/gate: "CHARACTER"/);
    expect(src).toMatch(/await detectCharacterDrift\(db, video, project\);/);
    // It runs before the status flip, and its failure can't stop it.
    expect(src).toMatch(/detectCharacterDrift[\s\S]{0,200}?setStatus\(db, video\.id, "ASSETS_READY"\)/);
    expect(src).toMatch(/drift detection failed \(non-blocking\)/);
  });
});

describe("migrations stay additive", () => {
  for (const file of [
    "supabase/migrations/0072_character_studio.sql",
    "supabase/migrations/0073_character_spend.sql",
    "supabase/migrations/0074_character_scene_model.sql",
    "supabase/migrations/0075_style_group_shot.sql",
  ]) {
    it(`${file} adds without destroying`, () => {
      const sql = read(file);
      // `drop policy if exists` immediately before a re-create is the repo's
      // idempotent-policy idiom; nothing else may drop.
      const drops = [...sql.matchAll(/^\s*drop\s+(\w+)/gim)].map((m) => m[1].toLowerCase());
      expect(drops.every((d) => d === "policy")).toBe(true);
      expect(sql).not.toMatch(/\bdelete\s+from\b|\btruncate\b|\bdrop\s+column\b/i);
      // Re-runnable: every create is guarded.
      const creates = [...sql.matchAll(/create\s+(table|index|unique index)\s+(?!if not exists)/gi)];
      expect(creates).toHaveLength(0);
    });
  }
});

describe("navigation stays uncluttered", () => {
  it("puts the global character library in the global tab set", () => {
    expect(globalNavV2().map((i) => i.label)).toEqual(["Home", "Characters", "Settings"]);
  });

  it("leaves the project tab bar at four so the mobile grid stays valid", () => {
    // Mobile prepends a Home tab, and the grid map tops out at five columns.
    const tabs = projectNavV2("11111111-1111-1111-1111-111111111111");
    expect(tabs).toHaveLength(4);
    expect(1 + tabs.length).toBeLessThanOrEqual(5);
    expect(read(MOBILE_NAV)).toMatch(/5: "grid-cols-5"/);
  });

  it("reaches a project's Cast from the Library header instead of a fifth tab", () => {
    expect(read("src/app/(app)/projects/[id]/library/page.tsx")).toMatch(
      /href=\{`\/projects\/\$\{project\.id\}\/cast`\}/,
    );
  });
});
