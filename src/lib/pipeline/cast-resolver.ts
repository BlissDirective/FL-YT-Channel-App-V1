import "server-only";

/**
 * Character Studio — the I/O half (docs/Character-Studio-Build-Plan.md §5).
 *
 * Loads a project's cast and its active style, matches characters to a scene,
 * and resolves each match's reference image for THAT style. The pure matching
 * and prompt assembly live in @studio/core `cast.ts`; this module only fetches.
 *
 * Every function degrades to "no cast, no style" on any failure, because a
 * project that hasn't opted into the Character Studio must behave exactly as it
 * did before — that is Phase 1's acceptance criterion.
 */
import {
  applyCastOverrides,
  matchCast,
  type CastMember,
  type StyleSpec,
} from "@studio/core";
import type { Db } from "@/lib/pipeline/engine";

/** A cast member as resolved from the DB — identity plus the version that will
    be stamped onto the video (Q5: edits are forward-only). */
export type ResolvedMember = CastMember & { version?: number };

export type ResolvedCast = {
  /** Characters to inject, in prompt order (already capped and overridden). */
  characters: ResolvedMember[];
  /** Storage paths of their reference images for the active style. */
  referencePaths: string[];
  /** Matched but cut by the per-scene cap — narrated, never silent. */
  droppedNames: string[];
  /** Locked-under-an-older-style looks that were still used. */
  staleNames: string[];
  /** Characters injected as text only (no look for this style yet). */
  textOnlyNames: string[];
  /** Draft (unlocked) characters used — consistency isn't guaranteed yet. */
  draftNames: string[];
};

export const EMPTY_CAST: ResolvedCast = {
  characters: [],
  referencePaths: [],
  droppedNames: [],
  staleNames: [],
  textOnlyNames: [],
  draftNames: [],
};

/** The project's active style: the video's explicitly chosen one, else the
    project default. Null when the project has no styles at all. */
export async function resolveStyle(
  db: Db,
  projectId: string,
  styleId?: string | null,
): Promise<{ id: string; spec: StyleSpec } | null> {
  try {
    const { data } = await db
      .from("styles")
      .select("id, name, style_string, palette, composition_rules, exclusions, is_default")
      .eq("project_id", projectId);
    const rows = (data ?? []) as {
      id: string;
      style_string: string;
      palette: Record<string, string> | null;
      composition_rules: string | null;
      exclusions: string | null;
      is_default: boolean;
    }[];
    if (rows.length === 0) return null;
    const chosen =
      (styleId ? rows.find((r) => r.id === styleId) : undefined) ??
      rows.find((r) => r.is_default) ??
      rows[0];
    return {
      id: chosen.id,
      spec: {
        styleString: chosen.style_string ?? "",
        palette: chosen.palette ?? {},
        compositionRules: chosen.composition_rules,
        exclusions: chosen.exclusions,
      },
    };
  } catch (err) {
    console.error("style resolve failed (non-blocking):", err);
    return null;
  }
}

/** The project's linked characters (global records, project-scoped links). */
export async function loadProjectCast(
  db: Db,
  projectId: string,
): Promise<(ResolvedMember & { version: number })[]> {
  try {
    const { data: links } = await db
      .from("project_characters")
      .select("character_id, sort_order")
      .eq("project_id", projectId);
    const ids = ((links ?? []) as { character_id: string }[]).map((l) => l.character_id);
    if (ids.length === 0) return [];
    const { data } = await db
      .from("characters")
      .select("id, name, aliases, role, description, identity_anchor, status, version")
      .in("id", ids);
    return ((data ?? []) as {
      id: string;
      name: string;
      aliases: string[] | null;
      role: CastMember["role"];
      description: string;
      identity_anchor: string | null;
      status: CastMember["status"];
      version: number;
    }[]).map((c) => ({
      id: c.id,
      name: c.name,
      aliases: c.aliases ?? [],
      role: c.role,
      description: c.description ?? "",
      identityAnchor: c.identity_anchor,
      status: c.status,
      version: c.version ?? 1,
    }));
  } catch (err) {
    console.error("cast load failed (non-blocking):", err);
    return [];
  }
}

/**
 * Full per-scene resolution: who is in this frame, and which reference image
 * represents each of them in the active style.
 */
export async function resolveSceneCast(
  db: Db,
  opts: {
    projectId: string;
    styleId: string | null;
    /** Beat text + visual prompt — everything the matcher may scan. */
    text: string;
    overrides?: { add?: string[]; remove?: string[] };
    lookType?: "illustration" | "portrait";
  },
): Promise<ResolvedCast> {
  const cast = await loadProjectCast(db, opts.projectId);
  if (cast.length === 0) return EMPTY_CAST;

  const { matched, dropped } = matchCast(opts.text, cast);
  const characters = applyCastOverrides(
    matched.map((m) => m.member),
    cast,
    opts.overrides,
  );
  if (characters.length === 0) {
    return { ...EMPTY_CAST, droppedNames: dropped.map((d) => d.member.name) };
  }

  const referencePaths: string[] = [];
  const staleNames: string[] = [];
  const textOnlyNames: string[] = [];
  const draftNames = characters.filter((c) => c.status === "draft").map((c) => c.name);

  if (opts.styleId) {
    try {
      const { data } = await db
        .from("character_looks")
        .select("character_id, canonical_image_path, stale, look_type, status")
        .eq("style_id", opts.styleId)
        .in("character_id", characters.map((c) => c.id));
      const looks = (data ?? []) as {
        character_id: string;
        canonical_image_path: string | null;
        stale: boolean;
        look_type: string;
      }[];
      const wanted = opts.lookType ?? "illustration";
      for (const c of characters) {
        const look =
          looks.find((l) => l.character_id === c.id && l.look_type === wanted) ??
          looks.find((l) => l.character_id === c.id);
        if (look?.canonical_image_path) {
          referencePaths.push(look.canonical_image_path);
          if (look.stale) staleNames.push(c.name);
        } else {
          // No image for this style yet: the description still goes in. The
          // character is never dropped just because its look is missing.
          textOnlyNames.push(c.name);
        }
      }
    } catch (err) {
      console.error("look resolve failed (non-blocking):", err);
    }
  } else {
    textOnlyNames.push(...characters.map((c) => c.name));
  }

  return {
    characters,
    referencePaths,
    droppedNames: dropped.map((d) => d.member.name),
    staleNames,
    textOnlyNames,
    draftNames,
  };
}

/**
 * Back-compat shim for avatars (plan §8). Prefers the project's presenter
 * CHARACTER's portrait look; falls back to the legacy
 * `projects.presenter_image_path` so existing avatar projects keep working
 * untouched until they migrate.
 */
export async function resolvePresenterImagePath(
  db: Db,
  project: { id: string; presenter_image_path?: string | null },
  styleId?: string | null,
): Promise<string | null> {
  try {
    const cast = await loadProjectCast(db, project.id);
    const presenter = cast.find((c) => c.role === "presenter");
    if (presenter) {
      const style = styleId ? { id: styleId } : await resolveStyle(db, project.id);
      const sid = typeof style === "object" && style ? style.id : null;
      if (sid) {
        const { data } = await db
          .from("character_looks")
          .select("canonical_image_path, look_type")
          .eq("character_id", presenter.id)
          .eq("style_id", sid);
        const looks = (data ?? []) as { canonical_image_path: string | null; look_type: string }[];
        // Avatar models frame chest-up, so a portrait look beats an
        // illustration one when both exist.
        const portrait = looks.find((l) => l.look_type === "portrait" && l.canonical_image_path);
        const any = looks.find((l) => l.canonical_image_path);
        const path = (portrait ?? any)?.canonical_image_path;
        if (path) return path;
      }
    }
  } catch (err) {
    console.error("presenter resolve failed (falling back):", err);
  }
  return project.presenter_image_path ?? null;
}
