import "server-only";

/**
 * Character Studio — Phase 2 operations (docs/Character-Studio-Build-Plan.md §7).
 *
 * Everything the Studio does to the database and to fal lives here, taking an
 * explicit `db` so it is drivable from tests, the server actions, and (later)
 * the workspace action registry without a second implementation. The server
 * actions in src/lib/actions/characters.ts are a thin HTTP edge over this.
 *
 * The four behaviours worth stating up front, because they are decisions and
 * not incidental:
 *
 *  - LOCK IS A RITUAL, not a flag. It freezes the description, saves the chosen
 *    image as canonical, bumps the version, and generates the turnaround sheet
 *    — the single highest-leverage consistency artifact — in one step.
 *  - EDITING A STYLE NEVER SPENDS MONEY. It marks that style's looks stale and
 *    offers one-click regeneration (Q4). A stale look still injects: it was
 *    correct under the old string, and a slightly-off reference beats none.
 *  - THE OPERATOR OWNS THE DESCRIPTION once they touch it (Q8). After that the
 *    agent proposes; it never applies.
 *  - THE BUDGET WARNS, NEVER BLOCKS (Q10). Design spend is system-scoped so it
 *    can't eat a project's production cap, and the meter is advice.
 */
import { characterBlock, composeScenePrompt, type CastMember, type StyleSpec } from "@studio/core";
import {
  DEFAULT_REF_IMAGE_MODEL_ID,
  characterSheetPrompt,
  estimateRefImageCost,
  generateReferenceImage,
  getRefImageModel,
  portraitLookPrompt,
} from "@/lib/adapters/reference-image";
import { draftCharacter, type CharacterDraft } from "@/lib/adapters/character-design";
import { CHARACTER_SOFT_BUDGET_USD, characterSpend, recordCharacterCost } from "@/lib/pipeline/ledger";
import { getSignedMediaUrl, uploadMedia } from "@/lib/storage";
import type { Db } from "@/lib/pipeline/engine";

export type LookType = "illustration" | "portrait";
export type CharacterRole = "presenter" | "cast" | "prop" | "location";

/** A 2×2 grid. Premium candidates cost real money ($0.15 each on the default
    model), so four is the default and eight the ceiling — the operator asks
    for more, they don't get billed for more by accident. */
export const DEFAULT_CANDIDATE_COUNT = 4;
export const MAX_CANDIDATE_COUNT = 8;

/** The neutral framing a first reference render wants. */
export const DEFAULT_SCENE_CLAUSE =
  "Full body, standing, facing camera, neutral friendly expression, plain cream background.";

export type CharacterRow = {
  id: string;
  name: string;
  aliases: string[] | null;
  role: CharacterRole;
  description: string;
  description_owned_by_operator: boolean;
  identity_anchor: string | null;
  species_or_type: string | null;
  notes: string | null;
  status: "draft" | "locked";
  version: number;
  locked_at: string | null;
};

export type LookRow = {
  id: string;
  character_id: string;
  style_id: string;
  look_type: LookType;
  canonical_image_path: string | null;
  sheet_image_path: string | null;
  extra_ref_paths: string[] | null;
  stale: boolean;
  status: "draft" | "locked";
  version: number;
};

export type StyleRow = {
  id: string;
  project_id: string;
  name: string;
  style_string: string;
  palette: Record<string, string> | null;
  composition_rules: string | null;
  exclusions: string | null;
  is_default: boolean;
  /** One frame with the whole cast in it — carries relative scale (Phase 4). */
  group_shot_path?: string | null;
};

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

export async function createCharacter(
  db: Db,
  opts: {
    name: string;
    projectId?: string | null;
    role?: CharacterRole;
    description?: string;
    aliases?: string[];
    identityAnchor?: string | null;
    speciesOrType?: string | null;
    notes?: string | null;
  },
): Promise<string> {
  const name = opts.name.trim();
  if (!name) throw new Error("A character needs a name.");
  const id = crypto.randomUUID();
  await db.from("characters").insert({
    id,
    name,
    aliases: opts.aliases?.map((a) => a.trim()).filter(Boolean) ?? [],
    role: opts.role ?? "cast",
    description: opts.description?.trim() ?? "",
    identity_anchor: opts.identityAnchor ?? null,
    species_or_type: opts.speciesOrType ?? null,
    notes: opts.notes ?? null,
    status: "draft",
    version: 1,
  });
  if (opts.projectId) await linkCharacterToProject(db, opts.projectId, id);
  return id;
}

export async function getCharacter(db: Db, characterId: string): Promise<CharacterRow | null> {
  const { data } = await db.from("characters").select("*").eq("id", characterId).maybeSingle();
  return (data as CharacterRow | null) ?? null;
}

/**
 * Patch a character. `byOperator` is the Q8 switch: a hand-edit takes ownership
 * of the description permanently, after which the agent may only propose.
 */
export async function updateCharacter(
  db: Db,
  characterId: string,
  patch: {
    name?: string;
    aliases?: string[];
    role?: CharacterRole;
    description?: string;
    identityAnchor?: string | null;
    speciesOrType?: string | null;
    notes?: string | null;
  },
  opts: { byOperator?: boolean } = {},
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name.trim();
  if (patch.aliases !== undefined) {
    values.aliases = patch.aliases.map((a) => a.trim()).filter(Boolean);
  }
  if (patch.role !== undefined) values.role = patch.role;
  if (patch.description !== undefined) {
    values.description = patch.description.trim();
    if (opts.byOperator) values.description_owned_by_operator = true;
  }
  if (patch.identityAnchor !== undefined) values.identity_anchor = patch.identityAnchor;
  if (patch.speciesOrType !== undefined) values.species_or_type = patch.speciesOrType;
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (Object.keys(values).length === 0) return;
  await db.from("characters").update(values).eq("id", characterId);
}

export async function deleteCharacter(db: Db, characterId: string): Promise<void> {
  await db.from("characters").delete().eq("id", characterId);
}

export async function linkCharacterToProject(
  db: Db,
  projectId: string,
  characterId: string,
  sortOrder = 0,
): Promise<void> {
  const { data } = await db
    .from("project_characters")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("character_id", characterId)
    .maybeSingle();
  if (data) return;
  await db
    .from("project_characters")
    .insert({ project_id: projectId, character_id: characterId, sort_order: sortOrder });
}

export async function unlinkCharacterFromProject(
  db: Db,
  projectId: string,
  characterId: string,
): Promise<void> {
  await db
    .from("project_characters")
    .delete()
    .eq("project_id", projectId)
    .eq("character_id", characterId);
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

export async function createStyle(
  db: Db,
  opts: {
    projectId: string;
    name: string;
    styleString?: string;
    palette?: Record<string, string>;
    compositionRules?: string | null;
    exclusions?: string | null;
    isDefault?: boolean;
  },
): Promise<string> {
  const name = opts.name.trim();
  if (!name) throw new Error("A style needs a name.");
  const { data: existing } = await db
    .from("styles")
    .select("id")
    .eq("project_id", opts.projectId);
  const isFirst = ((existing ?? []) as { id: string }[]).length === 0;
  const id = crypto.randomUUID();
  const wantDefault = opts.isDefault ?? isFirst;
  // The partial unique index allows exactly one default per project, so clear
  // the incumbent before claiming it.
  if (wantDefault && !isFirst) await clearDefaultStyle(db, opts.projectId);
  await db.from("styles").insert({
    id,
    project_id: opts.projectId,
    name,
    style_string: opts.styleString?.trim() ?? "",
    palette: opts.palette ?? {},
    composition_rules: opts.compositionRules ?? null,
    exclusions: opts.exclusions ?? null,
    is_default: wantDefault,
  });
  return id;
}

async function clearDefaultStyle(db: Db, projectId: string): Promise<void> {
  await db.from("styles").update({ is_default: false }).eq("project_id", projectId);
}

export async function listStyles(db: Db, projectId: string): Promise<StyleRow[]> {
  const { data } = await db.from("styles").select("*").eq("project_id", projectId);
  return (data ?? []) as StyleRow[];
}

/**
 * Edit a style. When the style STRING changes, every look locked under the old
 * string becomes stale — surfaced with a one-click regenerate, never
 * regenerated automatically (Q4: that would spend money without asking).
 */
export async function updateStyle(
  db: Db,
  styleId: string,
  patch: {
    name?: string;
    styleString?: string;
    palette?: Record<string, string>;
    compositionRules?: string | null;
    exclusions?: string | null;
  },
): Promise<{ staleLooks: number }> {
  const { data: before } = await db.from("styles").select("*").eq("id", styleId).maybeSingle();
  // Snapshot the value, not the row: the comparison below happens after the
  // write, and a row object must never be trusted to still hold its old state.
  const previousStyleString = ((before as StyleRow | null)?.style_string ?? "").trim();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name.trim();
  if (patch.styleString !== undefined) values.style_string = patch.styleString.trim();
  if (patch.palette !== undefined) values.palette = patch.palette;
  if (patch.compositionRules !== undefined) values.composition_rules = patch.compositionRules;
  if (patch.exclusions !== undefined) values.exclusions = patch.exclusions;
  if (Object.keys(values).length === 0) return { staleLooks: 0 };
  await db.from("styles").update(values).eq("id", styleId);

  const restyled =
    patch.styleString !== undefined && patch.styleString.trim() !== previousStyleString;
  if (!restyled) return { staleLooks: 0 };
  const { data: looks } = await db
    .from("character_looks")
    .select("id, canonical_image_path")
    .eq("style_id", styleId);
  const affected = ((looks ?? []) as { canonical_image_path: string | null }[]).filter(
    (l) => l.canonical_image_path,
  ).length;
  await db.from("character_looks").update({ stale: true }).eq("style_id", styleId);
  return { staleLooks: affected };
}

export async function setDefaultStyle(db: Db, projectId: string, styleId: string): Promise<void> {
  await clearDefaultStyle(db, projectId);
  await db.from("styles").update({ is_default: true }).eq("id", styleId);
}

export async function deleteStyle(db: Db, styleId: string): Promise<void> {
  await db.from("styles").delete().eq("id", styleId);
}

function styleSpec(row: StyleRow | null): StyleSpec | null {
  if (!row) return null;
  return {
    styleString: row.style_string ?? "",
    palette: row.palette ?? {},
    compositionRules: row.composition_rules,
    exclusions: row.exclusions,
  };
}

/* ------------------------------------------------------------------ */
/* Looks                                                               */
/* ------------------------------------------------------------------ */

export async function getLook(
  db: Db,
  characterId: string,
  styleId: string,
  lookType: LookType = "illustration",
): Promise<LookRow | null> {
  const { data } = await db
    .from("character_looks")
    .select("*")
    .eq("character_id", characterId)
    .eq("style_id", styleId)
    .eq("look_type", lookType)
    .maybeSingle();
  return (data as LookRow | null) ?? null;
}

export async function getOrCreateLook(
  db: Db,
  characterId: string,
  styleId: string,
  lookType: LookType = "illustration",
): Promise<LookRow> {
  const existing = await getLook(db, characterId, styleId, lookType);
  if (existing) return existing;
  const row: LookRow = {
    id: crypto.randomUUID(),
    character_id: characterId,
    style_id: styleId,
    look_type: lookType,
    canonical_image_path: null,
    sheet_image_path: null,
    extra_ref_paths: [],
    stale: false,
    status: "draft",
    version: 1,
  };
  await db.from("character_looks").insert(row);
  return row;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

function castMemberOf(c: CharacterRow): CastMember {
  return {
    id: c.id,
    name: c.name,
    aliases: c.aliases ?? [],
    description: c.description ?? "",
    identityAnchor: c.identity_anchor,
    role: c.role,
    status: c.status,
  };
}

/** Signed, publicly-fetchable URLs for the references fal should condition on.
    Mock paths have no URL and are simply skipped. */
async function signedRefs(paths: string[], max: number): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths.slice(0, max)) {
    const url = await getSignedMediaUrl(p, 3600);
    if (url) out.push(url);
  }
  return out;
}

export type CandidateResult = {
  paths: string[];
  prompt: string;
  /** What the ledger was actually charged (0 in mock mode). */
  costUsd: number;
  /** What the button promised before the call — shown when mocked. */
  estimateUsd: number;
  provider: string;
  modelId: string;
  /** Soft-budget notice (Q10) — advice, never a refusal. */
  warning?: string;
};

/**
 * Generate a candidate grid for one character in one style.
 *
 * References are the character's OWN prior images in THIS style (the canonical
 * plus any uploads). That is what makes iteration converge instead of
 * re-rolling a new character every time.
 */
export async function generateCandidates(
  db: Db,
  opts: {
    characterId: string;
    styleId: string;
    lookType?: LookType;
    /** Scene clause — what they're doing/how they're framed, not who they are. */
    sceneClause?: string;
    count?: number;
    modelId?: string;
    /** Skip reference conditioning (a deliberate fresh start). */
    ignoreReferences?: boolean;
  },
): Promise<CandidateResult> {
  const character = await getCharacter(db, opts.characterId);
  if (!character) throw new Error("Character not found.");
  const model = getRefImageModel(opts.modelId ?? DEFAULT_REF_IMAGE_MODEL_ID);
  if (!model) throw new Error(`Unknown image model: ${opts.modelId}`);
  const count = Math.min(Math.max(opts.count ?? DEFAULT_CANDIDATE_COUNT, 1), MAX_CANDIDATE_COUNT);
  const lookType = opts.lookType ?? "illustration";

  const { data: styleRow } = await db.from("styles").select("*").eq("id", opts.styleId).maybeSingle();
  const style = styleSpec((styleRow as StyleRow | null) ?? null);
  const look = await getOrCreateLook(db, opts.characterId, opts.styleId, lookType);

  const scene =
    opts.sceneClause?.trim() ||
    (lookType === "portrait"
      ? "Portrait framing: chest-up, facing camera directly, centered, neutral friendly expression, plain background."
      : DEFAULT_SCENE_CLAUSE);
  const { prompt } = composeScenePrompt({
    scene,
    style,
    characters: [castMemberOf(character)],
    // Never reached (a character is always present), but the contract is that
    // a bare description is the floor.
    fallbackPrompt: characterBlock(castMemberOf(character)),
  });

  const refPaths = opts.ignoreReferences
    ? []
    : [look.canonical_image_path, ...(look.extra_ref_paths ?? [])].filter(
        (p): p is string => Boolean(p),
      );
  const referenceUrls = await signedRefs(refPaths, model.maxReferences);

  const spentBefore = await characterSpend(db, opts.characterId);
  const estimate = estimateRefImageCost(model, count);

  const res = await generateReferenceImage({
    model,
    prompt,
    referenceUrls,
    count,
    aspectRatio: lookType === "portrait" ? "1:1" : "16:9",
  });

  const stamp = Date.now().toString(36);
  const paths: string[] = [];
  if (res.provider === "mock") {
    for (let i = 0; i < count; i++) {
      paths.push(`mock/characters/${opts.characterId}/${opts.styleId}/${lookType}-${stamp}-${i}.png`);
    }
  } else {
    for (const [i, buf] of res.images.entries()) {
      const path = `characters/${opts.characterId}/${opts.styleId}/${lookType}-${stamp}-${i}.png`;
      await uploadMedia(path, buf, "image/png");
      paths.push(path);
    }
  }

  const costUsd = res.provider === "mock" ? 0 : res.costUsd;
  if (costUsd > 0) {
    await recordCharacterCost(db, opts.characterId, {
      provider: "fal-ref-image",
      usd: costUsd,
      description: `Character Studio — ${character.name} ${lookType} candidates ×${paths.length}`,
    });
  }

  const total = spentBefore + costUsd;
  const warning =
    total >= CHARACTER_SOFT_BUDGET_USD
      ? `${character.name} has cost $${total.toFixed(2)} to design (soft budget $${CHARACTER_SOFT_BUDGET_USD.toFixed(2)}). Keep going if it's worth it — nothing is blocked.`
      : undefined;

  return {
    paths,
    prompt,
    costUsd,
    estimateUsd: estimate,
    provider: res.provider,
    modelId: model.id,
    ...(warning ? { warning } : {}),
  };
}

/** Store an operator-supplied reference image against a look. */
export async function uploadCharacterReference(
  db: Db,
  opts: {
    characterId: string;
    styleId: string;
    lookType?: LookType;
    bytes: Buffer;
    ext: string;
    contentType: string;
  },
): Promise<string> {
  const lookType = opts.lookType ?? "illustration";
  const look = await getOrCreateLook(db, opts.characterId, opts.styleId, lookType);
  const path = `characters/${opts.characterId}/${opts.styleId}/upload-${Date.now().toString(36)}.${opts.ext}`;
  await uploadMedia(path, opts.bytes, opts.contentType);
  const next = [...(look.extra_ref_paths ?? []), path].slice(-6);
  await db.from("character_looks").update({ extra_ref_paths: next }).eq("id", look.id);
  return path;
}

export type LockResult = {
  version: number;
  sheetPath: string | null;
  costUsd: number;
  warning?: string;
};

/**
 * The lock ritual. Freezes the description, saves the chosen image as the
 * canonical reference for this style, bumps the version so any video already
 * generated keeps the old one (Q5), and generates the 3-view turnaround sheet.
 *
 * The sheet is generated from the canonical image as a reference, which is why
 * it has to happen AFTER the canonical is chosen and not before.
 */
export async function lockCharacterLook(
  db: Db,
  opts: {
    characterId: string;
    styleId: string;
    lookType?: LookType;
    canonicalImagePath: string;
    /** Off for a quick lock; on (default) for the full ritual. */
    generateSheet?: boolean;
    modelId?: string;
  },
): Promise<LockResult> {
  const character = await getCharacter(db, opts.characterId);
  if (!character) throw new Error("Character not found.");
  if (!character.description.trim()) {
    throw new Error("Write a description before locking — the description is what carries identity.");
  }
  const lookType = opts.lookType ?? "illustration";
  const look = await getOrCreateLook(db, opts.characterId, opts.styleId, lookType);
  const now = new Date().toISOString();

  // A RE-lock bumps the version; the first lock stays at 1 so nothing that
  // referenced the draft is spuriously invalidated.
  const nextVersion = character.status === "locked" ? character.version + 1 : character.version;
  await db
    .from("characters")
    .update({ status: "locked", locked_at: now, version: nextVersion })
    .eq("id", opts.characterId);
  await db
    .from("character_looks")
    .update({
      canonical_image_path: opts.canonicalImagePath,
      status: "locked",
      locked_at: now,
      stale: false,
      version: (look.version ?? 1) + (look.canonical_image_path ? 1 : 0),
    })
    .eq("id", look.id);

  let sheetPath: string | null = look.sheet_image_path;
  let costUsd = 0;
  if (opts.generateSheet !== false) {
    try {
      const sheet = await generateCharacterSheet(db, {
        characterId: opts.characterId,
        styleId: opts.styleId,
        lookType,
        modelId: opts.modelId,
      });
      sheetPath = sheet.path;
      costUsd = sheet.costUsd;
    } catch (err) {
      // A failed sheet must never un-lock a character — the canonical image is
      // already saved and is the artifact that matters.
      console.error("character sheet generation failed (non-blocking):", err);
    }
  }

  const total = await characterSpend(db, opts.characterId);
  return {
    version: nextVersion,
    sheetPath,
    costUsd,
    ...(total >= CHARACTER_SOFT_BUDGET_USD
      ? { warning: `${character.name} has cost $${total.toFixed(2)} to design so far.` }
      : {}),
  };
}

/** The 3-view turnaround, conditioned on the canonical image. */
export async function generateCharacterSheet(
  db: Db,
  opts: { characterId: string; styleId: string; lookType?: LookType; modelId?: string },
): Promise<{ path: string | null; costUsd: number }> {
  const character = await getCharacter(db, opts.characterId);
  if (!character) throw new Error("Character not found.");
  const model = getRefImageModel(opts.modelId ?? DEFAULT_REF_IMAGE_MODEL_ID);
  if (!model) throw new Error("Unknown image model.");
  const lookType = opts.lookType ?? "illustration";
  const look = await getOrCreateLook(db, opts.characterId, opts.styleId, lookType);
  const { data: styleRow } = await db.from("styles").select("*").eq("id", opts.styleId).maybeSingle();
  const style = styleSpec((styleRow as StyleRow | null) ?? null);

  const prompt = characterSheetPrompt({
    styleString: style?.styleString ?? "",
    description: characterBlock(castMemberOf(character)),
    identityAnchor: character.identity_anchor,
  });
  const referenceUrls = await signedRefs(
    [look.canonical_image_path].filter((p): p is string => Boolean(p)),
    model.maxReferences,
  );
  const res = await generateReferenceImage({ model, prompt, referenceUrls, count: 1, aspectRatio: "16:9" });

  const stamp = Date.now().toString(36);
  let path: string;
  if (res.provider === "mock") {
    path = `mock/characters/${opts.characterId}/${opts.styleId}/sheet-${stamp}.png`;
  } else {
    path = `characters/${opts.characterId}/${opts.styleId}/sheet-${stamp}.png`;
    await uploadMedia(path, res.images[0], "image/png");
  }
  const costUsd = res.provider === "mock" ? 0 : res.costUsd;
  if (costUsd > 0) {
    await recordCharacterCost(db, opts.characterId, {
      provider: "fal-ref-image",
      usd: costUsd,
      description: `Character Studio — ${character.name} turnaround sheet`,
    });
  }
  await db.from("character_looks").update({ sheet_image_path: path }).eq("id", look.id);
  return { path, costUsd };
}

/**
 * The chest-up portrait look avatar models want (Q2). Offered, never required
 * — a character with no portrait still works everywhere else.
 */
export async function generatePortraitLook(
  db: Db,
  opts: { characterId: string; styleId: string; modelId?: string },
): Promise<{ path: string | null; costUsd: number }> {
  const character = await getCharacter(db, opts.characterId);
  if (!character) throw new Error("Character not found.");
  const model = getRefImageModel(opts.modelId ?? DEFAULT_REF_IMAGE_MODEL_ID);
  if (!model) throw new Error("Unknown image model.");
  const illustration = await getLook(db, opts.characterId, opts.styleId, "illustration");
  const portrait = await getOrCreateLook(db, opts.characterId, opts.styleId, "portrait");
  const { data: styleRow } = await db.from("styles").select("*").eq("id", opts.styleId).maybeSingle();
  const style = styleSpec((styleRow as StyleRow | null) ?? null);

  const prompt = portraitLookPrompt({
    styleString: style?.styleString ?? "",
    description: characterBlock(castMemberOf(character)),
    identityAnchor: character.identity_anchor,
  });
  // Condition on the locked illustration so the portrait is the SAME character,
  // not a second design that happens to share a description.
  const referenceUrls = await signedRefs(
    [illustration?.canonical_image_path].filter((p): p is string => Boolean(p)),
    model.maxReferences,
  );
  const res = await generateReferenceImage({ model, prompt, referenceUrls, count: 1, aspectRatio: "1:1" });

  const stamp = Date.now().toString(36);
  let path: string;
  if (res.provider === "mock") {
    path = `mock/characters/${opts.characterId}/${opts.styleId}/portrait-${stamp}.png`;
  } else {
    path = `characters/${opts.characterId}/${opts.styleId}/portrait-${stamp}.png`;
    await uploadMedia(path, res.images[0], "image/png");
  }
  const costUsd = res.provider === "mock" ? 0 : res.costUsd;
  if (costUsd > 0) {
    await recordCharacterCost(db, opts.characterId, {
      provider: "fal-ref-image",
      usd: costUsd,
      description: `Character Studio — ${character.name} portrait look`,
    });
  }
  await db
    .from("character_looks")
    .update({ canonical_image_path: path, status: "locked", stale: false })
    .eq("id", portrait.id);
  return { path, costUsd };
}

/* ------------------------------------------------------------------ */
/* Phase 4 — multi-style batch work and the cast group shot            */
/* ------------------------------------------------------------------ */

/**
 * Designate the character whose portrait drives this project's avatar shots
 * (plan §8). `role` lives on the character, so designating one demotes any
 * other presenter LINKED TO THIS PROJECT — two presenters in one channel would
 * make which face talks a matter of row order.
 */
export async function setProjectPresenter(
  db: Db,
  opts: { projectId: string; characterId: string },
): Promise<{ demoted: string[]; hasPortrait: boolean }> {
  const { characters } = await loadProjectCastDetail(db, opts.projectId);
  const target = characters.find((c) => c.id === opts.characterId);
  if (!target) throw new Error("That character isn't in this project.");

  const demoted: string[] = [];
  for (const c of characters) {
    if (c.id !== opts.characterId && c.role === "presenter") {
      await db.from("characters").update({ role: "cast" }).eq("id", c.id);
      demoted.push(c.name);
    }
  }
  await db.from("characters").update({ role: "presenter" }).eq("id", opts.characterId);

  // Avatar models frame chest-up, so a presenter without a portrait look will
  // fall back to a full-body illustration and crop badly. Report it; the caller
  // says so rather than silently producing a worse shot.
  const styles = await listStyles(db, opts.projectId);
  const styleId = styles.find((s) => s.is_default)?.id ?? styles[0]?.id ?? null;
  const portrait = styleId ? await getLook(db, opts.characterId, styleId, "portrait") : null;
  return { demoted, hasPortrait: Boolean(portrait?.canonical_image_path) };
}

export type BatchLookResult = {
  /** {characterName: storage path} for looks that were produced. */
  generated: { characterId: string; name: string; path: string }[];
  /** Characters skipped because they already have a usable look here. */
  skipped: string[];
  failed: { name: string; error: string }[];
  costUsd: number;
  estimateUsd: number;
};

/**
 * "Give every character a look in this style" — the button that makes a SECOND
 * style practical (plan §7 Phase 4). Adding a style to an existing channel
 * otherwise means walking the whole cast through the Studio one at a time.
 *
 * Generated looks land as DRAFTS, never auto-locked: a batch run is a starting
 * point to review, and silently locking six characters the operator has not
 * looked at would be exactly the "trust me" behaviour this whole feature
 * exists to remove.
 */
export async function generateLooksForStyle(
  db: Db,
  opts: {
    projectId: string;
    styleId: string;
    modelId?: string;
    lookType?: LookType;
    /** Include characters that already have a look (a deliberate restyle). */
    includeExisting?: boolean;
    /** Only characters whose look is stale — the "style changed" repair path. */
    staleOnly?: boolean;
  },
): Promise<BatchLookResult> {
  const { characters } = await loadProjectCastDetail(db, opts.projectId);
  const lookType = opts.lookType ?? "illustration";
  const model = getRefImageModel(opts.modelId ?? DEFAULT_REF_IMAGE_MODEL_ID);
  if (!model) throw new Error("Unknown image model.");

  const out: BatchLookResult = {
    generated: [],
    skipped: [],
    failed: [],
    costUsd: 0,
    estimateUsd: 0,
  };

  for (const character of characters) {
    const look = await getLook(db, character.id, opts.styleId, lookType);
    const hasImage = Boolean(look?.canonical_image_path);
    if (opts.staleOnly && !(hasImage && look?.stale)) {
      out.skipped.push(character.name);
      continue;
    }
    if (!opts.staleOnly && hasImage && !opts.includeExisting) {
      out.skipped.push(character.name);
      continue;
    }
    if (!character.description.trim()) {
      out.failed.push({ name: character.name, error: "No description yet." });
      continue;
    }
    try {
      const res = await generateCandidates(db, {
        characterId: character.id,
        styleId: opts.styleId,
        lookType,
        count: 1,
        modelId: model.id,
        // A restyle must not be conditioned on the OLD style's image, or the
        // new style never takes.
        ignoreReferences: true,
      });
      const path = res.paths[0];
      if (!path) {
        out.failed.push({ name: character.name, error: "No image returned." });
        continue;
      }
      const row = await getOrCreateLook(db, character.id, opts.styleId, lookType);
      await db
        .from("character_looks")
        .update({ canonical_image_path: path, status: "draft", stale: false })
        .eq("id", row.id);
      out.generated.push({ characterId: character.id, name: character.name, path });
      out.costUsd += res.costUsd;
      out.estimateUsd += res.estimateUsd;
    } catch (err) {
      out.failed.push({
        name: character.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return out;
}

/** What a batch run will cost before the operator presses it. */
export async function estimateLooksForStyle(
  db: Db,
  opts: { projectId: string; styleId: string; modelId?: string; staleOnly?: boolean; includeExisting?: boolean },
): Promise<{ count: number; usd: number }> {
  const { characters } = await loadProjectCastDetail(db, opts.projectId);
  const model = getRefImageModel(opts.modelId ?? DEFAULT_REF_IMAGE_MODEL_ID);
  if (!model) return { count: 0, usd: 0 };
  let count = 0;
  for (const c of characters) {
    const look = await getLook(db, c.id, opts.styleId, "illustration");
    const hasImage = Boolean(look?.canonical_image_path);
    if (opts.staleOnly) {
      if (hasImage && look?.stale) count++;
    } else if (!hasImage || opts.includeExisting) {
      count++;
    }
  }
  return { count, usd: estimateRefImageCost(model, count) };
}

/**
 * One frame with the whole cast in it.
 *
 * Per-character references fix each identity but say nothing about how they
 * relate — "knee-height to the children" is prose, and a model will cheerfully
 * render a bunny the size of a bear. The group shot carries relative scale by
 * construction, and it is conditioned on the locked looks so it agrees with
 * them rather than inventing a seventh version of everyone.
 */
export async function generateCastGroupShot(
  db: Db,
  opts: { projectId: string; styleId: string; modelId?: string; characterIds?: string[] },
): Promise<{ path: string | null; costUsd: number; names: string[] }> {
  const model = getRefImageModel(opts.modelId ?? DEFAULT_REF_IMAGE_MODEL_ID);
  if (!model) throw new Error("Unknown image model.");
  const { characters } = await loadProjectCastDetail(db, opts.projectId);
  const wanted = opts.characterIds
    ? characters.filter((c) => opts.characterIds!.includes(c.id))
    : characters;
  const cast = wanted.filter((c) => c.role !== "location" && c.description.trim()).slice(0, 6);
  if (cast.length < 2) {
    throw new Error("A group shot needs at least two described characters.");
  }

  const { data: styleRow } = await db.from("styles").select("*").eq("id", opts.styleId).maybeSingle();
  const style = styleSpec((styleRow as StyleRow | null) ?? null);

  const refPaths: string[] = [];
  for (const c of cast) {
    const look = await getLook(db, c.id, opts.styleId, "illustration");
    if (look?.canonical_image_path) refPaths.push(look.canonical_image_path);
  }
  const referenceUrls = await signedRefs(refPaths, model.maxReferences);

  const blocks = cast.map((c) => characterBlock(castMemberOf(c))).join(" ");
  const prompt =
    `${style?.styleString ?? ""} ${blocks} ` +
    `Group shot: all ${cast.length} characters standing together in a single line facing camera on a plain ` +
    `background, full body, correct relative heights and proportions between them, even spacing, ` +
    `neutral friendly expressions. No text, no letters, no numbers, no logos, no watermarks, ` +
    `no extra characters.` +
    (style?.exclusions ? ` ${style.exclusions}` : "");

  const res = await generateReferenceImage({
    model,
    prompt: prompt.replace(/\s+/g, " ").trim(),
    referenceUrls,
    count: 1,
    aspectRatio: "16:9",
  });

  const stamp = Date.now().toString(36);
  let path: string;
  if (res.provider === "mock") {
    path = `mock/styles/${opts.styleId}/group-${stamp}.png`;
  } else {
    path = `styles/${opts.styleId}/group-${stamp}.png`;
    await uploadMedia(path, res.images[0], "image/png");
  }
  const costUsd = res.provider === "mock" ? 0 : res.costUsd;
  if (costUsd > 0) {
    // Attributed to the first character so it lands in a per-character meter
    // rather than nowhere; it is a cast-wide artifact either way.
    await recordCharacterCost(db, cast[0].id, {
      provider: "fal-ref-image",
      usd: costUsd,
      description: `Character Studio — cast group shot (${cast.map((c) => c.name).join(", ")})`,
    });
  }
  await db.from("styles").update({ group_shot_path: path }).eq("id", opts.styleId);
  return { path, costUsd, names: cast.map((c) => c.name) };
}

/* ------------------------------------------------------------------ */
/* The design chat                                                     */
/* ------------------------------------------------------------------ */

export async function postDesignMessage(
  db: Db,
  row: {
    characterId: string;
    role: "user" | "agent" | "system";
    content: string;
    intent?: unknown;
    candidatePaths?: string[];
  },
): Promise<void> {
  try {
    await db.from("character_design_messages").insert({
      id: crypto.randomUUID(),
      character_id: row.characterId,
      role: row.role,
      content: row.content,
      intent: row.intent ?? null,
      candidate_asset_paths: row.candidatePaths ?? [],
    });
  } catch (err) {
    console.error("design message save failed (non-blocking):", err);
  }
}

export type DesignTurn = {
  reply: string;
  draft: CharacterDraft;
  /** True when the draft was written straight onto the character. */
  applied: boolean;
  candidates?: CandidateResult;
};

/**
 * One turn of the design chat: the operator's note in, a revised character
 * (or a proposal) plus optionally a fresh candidate grid out.
 *
 * `autoGenerate` is off by default because a chat turn is free and a grid is
 * not — the operator presses the button that spends the money.
 */
export async function designChatTurn(
  db: Db,
  opts: {
    characterId: string;
    text: string;
    styleId?: string | null;
    channelContext?: string | null;
    autoGenerate?: boolean;
    modelId?: string;
  },
): Promise<DesignTurn> {
  const character = await getCharacter(db, opts.characterId);
  if (!character) throw new Error("Character not found.");
  await postDesignMessage(db, { characterId: opts.characterId, role: "user", content: opts.text });

  const proposeOnly = Boolean(character.description_owned_by_operator);
  const draft = await draftCharacter({
    notes: opts.text,
    existing: {
      name: character.name,
      description: character.description,
      identityAnchor: character.identity_anchor,
      aliases: character.aliases,
    },
    role: character.role,
    channelContext: opts.channelContext,
    proposeOnly,
  });
  if (draft.costUsd > 0) {
    await recordCharacterCost(db, opts.characterId, {
      provider: "anthropic",
      usd: draft.costUsd,
      description: `Character Studio — ${character.name} design chat`,
    });
  }

  if (!proposeOnly) {
    await updateCharacter(db, opts.characterId, {
      description: draft.description,
      identityAnchor: draft.identityAnchor || character.identity_anchor,
      aliases: draft.aliases.length > 0 ? draft.aliases : (character.aliases ?? []),
      speciesOrType: draft.speciesOrType,
      // The name is only auto-set while the character is still unnamed — a
      // rename mid-design would break every script that already says it.
      ...(character.name.trim() ? {} : { name: draft.name }),
    });
  }

  let candidates: CandidateResult | undefined;
  if (opts.autoGenerate && opts.styleId) {
    candidates = await generateCandidates(db, {
      characterId: opts.characterId,
      styleId: opts.styleId,
      sceneClause: draft.imagePrompt,
      modelId: opts.modelId,
    });
  }

  const reply = proposeOnly
    ? `${draft.reply}\n\nProposed description (yours is untouched until you accept it):\n${draft.description}`
    : draft.reply;
  await postDesignMessage(db, {
    characterId: opts.characterId,
    role: "agent",
    content: reply,
    intent: { proposeOnly, description: draft.description, identityAnchor: draft.identityAnchor },
    candidatePaths: candidates?.paths ?? [],
  });

  return { reply, draft, applied: !proposeOnly, ...(candidates ? { candidates } : {}) };
}

/** Accept a proposal the agent made against an operator-owned description. */
export async function acceptProposedDescription(
  db: Db,
  opts: { characterId: string; description: string; identityAnchor?: string | null },
): Promise<void> {
  await updateCharacter(
    db,
    opts.characterId,
    { description: opts.description, ...(opts.identityAnchor !== undefined ? { identityAnchor: opts.identityAnchor } : {}) },
    { byOperator: true },
  );
}

/* ------------------------------------------------------------------ */
/* Reads for the UI                                                    */
/* ------------------------------------------------------------------ */

export type StudioState = {
  character: CharacterRow;
  looks: LookRow[];
  messages: {
    id: string;
    role: string;
    content: string;
    intent: unknown;
    candidate_asset_paths: string[];
    created_at: string;
  }[];
  spendUsd: number;
  softBudgetUsd: number;
  /** Projects this character is linked into. */
  projectIds: string[];
};

export async function loadStudioState(db: Db, characterId: string): Promise<StudioState | null> {
  const character = await getCharacter(db, characterId);
  if (!character) return null;
  const [{ data: looks }, { data: messages }, { data: links }] = await Promise.all([
    db.from("character_looks").select("*").eq("character_id", characterId),
    db
      .from("character_design_messages")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true }),
    db.from("project_characters").select("project_id").eq("character_id", characterId),
  ]);
  return {
    character,
    looks: (looks ?? []) as LookRow[],
    messages: (messages ?? []) as StudioState["messages"],
    spendUsd: await characterSpend(db, characterId),
    softBudgetUsd: CHARACTER_SOFT_BUDGET_USD,
    projectIds: ((links ?? []) as { project_id: string }[]).map((l) => l.project_id),
  };
}

/** The Cast tab: every character linked to a project, with its looks for the
    project's styles so the UI can badge "no look in Style B yet". */
export async function loadProjectCastDetail(
  db: Db,
  projectId: string,
): Promise<{ characters: CharacterRow[]; looks: LookRow[]; styles: StyleRow[] }> {
  const styles = await listStyles(db, projectId);
  const { data: links } = await db
    .from("project_characters")
    .select("character_id, sort_order")
    .eq("project_id", projectId);
  const ids = ((links ?? []) as { character_id: string }[]).map((l) => l.character_id);
  if (ids.length === 0) return { characters: [], looks: [], styles };
  const { data: chars } = await db.from("characters").select("*").in("id", ids);
  const { data: looks } = await db.from("character_looks").select("*").in("character_id", ids);
  return {
    characters: (chars ?? []) as CharacterRow[],
    looks: (looks ?? []) as LookRow[],
    styles,
  };
}

/** Every character in the account (the global library picker). */
export async function listCharacters(db: Db): Promise<CharacterRow[]> {
  const { data } = await db.from("characters").select("*");
  return ((data ?? []) as CharacterRow[]).sort((a, b) => a.name.localeCompare(b.name));
}
