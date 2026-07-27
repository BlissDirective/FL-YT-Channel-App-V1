"use server";

/**
 * Character Studio server actions (docs/Character-Studio-Build-Plan.md §7,
 * Phase 2b). The thin HTTP edge over src/lib/pipeline/character-studio.ts:
 * auth-scoped db, revalidation, and error shaping. No business logic lives
 * here — it lives in the module, which tests drive directly.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRefImageModel } from "@/lib/adapters/reference-image";
import {
  acceptProposedDescription,
  createCharacter,
  createStyle,
  deleteCharacter,
  deleteStyle,
  designChatTurn,
  generateCandidates,
  generateCharacterSheet,
  generatePortraitLook,
  linkCharacterToProject,
  lockCharacterLook,
  setDefaultStyle,
  unlinkCharacterFromProject,
  updateCharacter,
  updateStyle,
  uploadCharacterReference,
  type CandidateResult,
  type CharacterRole,
  type DesignTurn,
  type LookType,
} from "@/lib/pipeline/character-studio";

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : String(err) };
}

function refreshCharacter(characterId: string, projectId?: string | null) {
  revalidatePath(`/characters/${characterId}`);
  revalidatePath("/characters");
  if (projectId) {
    revalidatePath(`/projects/${projectId}/cast`);
    revalidatePath(`/projects/${projectId}/settings`);
  }
}

/* ── Characters ──────────────────────────────────────────────────── */

export async function createCharacterAction(opts: {
  name: string;
  projectId?: string | null;
  role?: CharacterRole;
  description?: string;
  identityAnchor?: string | null;
}): Promise<{ ok: boolean; error?: string; characterId?: string }> {
  try {
    const db = await createClient();
    const characterId = await createCharacter(db, opts);
    refreshCharacter(characterId, opts.projectId);
    return { ok: true, characterId };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCharacterAction(opts: {
  characterId: string;
  projectId?: string | null;
  patch: {
    name?: string;
    aliases?: string[];
    role?: CharacterRole;
    description?: string;
    identityAnchor?: string | null;
    speciesOrType?: string | null;
    notes?: string | null;
  };
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    // Every edit through this action is the operator's own hand (Q8): after it,
    // the agent proposes and never overwrites.
    await updateCharacter(db, opts.characterId, opts.patch, { byOperator: true });
    refreshCharacter(opts.characterId, opts.projectId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCharacterAction(opts: {
  characterId: string;
  projectId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    await deleteCharacter(db, opts.characterId);
    refreshCharacter(opts.characterId, opts.projectId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function linkCharacterAction(opts: {
  projectId: string;
  characterId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    await linkCharacterToProject(db, opts.projectId, opts.characterId);
    refreshCharacter(opts.characterId, opts.projectId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function unlinkCharacterAction(opts: {
  projectId: string;
  characterId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    await unlinkCharacterFromProject(db, opts.projectId, opts.characterId);
    refreshCharacter(opts.characterId, opts.projectId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ── Styles ──────────────────────────────────────────────────────── */

export async function createStyleAction(opts: {
  projectId: string;
  name: string;
  styleString?: string;
  palette?: Record<string, string>;
  compositionRules?: string | null;
  exclusions?: string | null;
  isDefault?: boolean;
}): Promise<{ ok: boolean; error?: string; styleId?: string }> {
  try {
    const db = await createClient();
    const styleId = await createStyle(db, opts);
    revalidatePath(`/projects/${opts.projectId}/cast`);
    return { ok: true, styleId };
  } catch (err) {
    return fail(err);
  }
}

export async function updateStyleAction(opts: {
  styleId: string;
  projectId: string;
  patch: {
    name?: string;
    styleString?: string;
    palette?: Record<string, string>;
    compositionRules?: string | null;
    exclusions?: string | null;
  };
}): Promise<{ ok: boolean; error?: string; staleLooks?: number }> {
  try {
    const db = await createClient();
    const { staleLooks } = await updateStyle(db, opts.styleId, opts.patch);
    revalidatePath(`/projects/${opts.projectId}/cast`);
    return { ok: true, staleLooks };
  } catch (err) {
    return fail(err);
  }
}

export async function setDefaultStyleAction(opts: {
  projectId: string;
  styleId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    await setDefaultStyle(db, opts.projectId, opts.styleId);
    revalidatePath(`/projects/${opts.projectId}/cast`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteStyleAction(opts: {
  styleId: string;
  projectId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    await deleteStyle(db, opts.styleId);
    revalidatePath(`/projects/${opts.projectId}/cast`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Which reference-capable model renders beats that have a locked cast member
 * (Phase 3). This is the project's cost lever: Nano Banana Pro holds several
 * characters in one frame at $0.15, FLUX.2 Pro does a single character for
 * $0.03. Beats with no cast are unaffected either way.
 */
export async function setSceneImageModelAction(opts: {
  projectId: string;
  modelId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    if (opts.modelId && !getRefImageModel(opts.modelId)) {
      return { ok: false, error: `Unknown image model: ${opts.modelId}` };
    }
    const db = await createClient();
    const { error } = await db
      .from("projects")
      .update({ character_image_model: opts.modelId })
      .eq("id", opts.projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${opts.projectId}/cast`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ── Generation ──────────────────────────────────────────────────── */

export async function generateCandidatesAction(opts: {
  characterId: string;
  styleId: string;
  lookType?: LookType;
  sceneClause?: string;
  count?: number;
  modelId?: string;
  ignoreReferences?: boolean;
  projectId?: string | null;
}): Promise<{ ok: boolean; error?: string; result?: CandidateResult }> {
  try {
    const db = await createClient();
    const result = await generateCandidates(db, opts);
    refreshCharacter(opts.characterId, opts.projectId);
    return { ok: true, result };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadCharacterReferenceAction(
  characterId: string,
  styleId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; path?: string }> {
  try {
    const file = formData.get("reference");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Image too large (max 10 MB)." };
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return { ok: false, error: "Use a PNG, JPG, or WEBP image." };
    }
    const lookTypeRaw = String(formData.get("look_type") ?? "illustration");
    const lookType: LookType = lookTypeRaw === "portrait" ? "portrait" : "illustration";
    const db = await createClient();
    const path = await uploadCharacterReference(db, {
      characterId,
      styleId,
      lookType,
      bytes: Buffer.from(await file.arrayBuffer()),
      ext,
      contentType: file.type || "image/png",
    });
    refreshCharacter(characterId);
    return { ok: true, path };
  } catch (err) {
    return fail(err);
  }
}

export async function lockCharacterAction(opts: {
  characterId: string;
  styleId: string;
  lookType?: LookType;
  canonicalImagePath: string;
  generateSheet?: boolean;
  modelId?: string;
  projectId?: string | null;
}): Promise<{
  ok: boolean;
  error?: string;
  version?: number;
  sheetPath?: string | null;
  warning?: string;
}> {
  try {
    const db = await createClient();
    const res = await lockCharacterLook(db, opts);
    refreshCharacter(opts.characterId, opts.projectId);
    return { ok: true, version: res.version, sheetPath: res.sheetPath, warning: res.warning };
  } catch (err) {
    return fail(err);
  }
}

export async function generateSheetAction(opts: {
  characterId: string;
  styleId: string;
  lookType?: LookType;
  modelId?: string;
}): Promise<{ ok: boolean; error?: string; path?: string | null }> {
  try {
    const db = await createClient();
    const res = await generateCharacterSheet(db, opts);
    refreshCharacter(opts.characterId);
    return { ok: true, path: res.path };
  } catch (err) {
    return fail(err);
  }
}

export async function generatePortraitLookAction(opts: {
  characterId: string;
  styleId: string;
  modelId?: string;
}): Promise<{ ok: boolean; error?: string; path?: string | null }> {
  try {
    const db = await createClient();
    const res = await generatePortraitLook(db, opts);
    refreshCharacter(opts.characterId);
    return { ok: true, path: res.path };
  } catch (err) {
    return fail(err);
  }
}

/* ── The design chat ─────────────────────────────────────────────── */

export async function sendDesignMessageAction(opts: {
  characterId: string;
  text: string;
  styleId?: string | null;
  channelContext?: string | null;
  autoGenerate?: boolean;
  modelId?: string;
}): Promise<{ ok: boolean; error?: string; turn?: DesignTurn }> {
  try {
    if (!opts.text.trim()) return { ok: false, error: "Say something first." };
    const db = await createClient();
    const turn = await designChatTurn(db, opts);
    refreshCharacter(opts.characterId);
    return { ok: true, turn };
  } catch (err) {
    return fail(err);
  }
}

export async function acceptProposalAction(opts: {
  characterId: string;
  description: string;
  identityAnchor?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    await acceptProposedDescription(db, opts);
    refreshCharacter(opts.characterId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
