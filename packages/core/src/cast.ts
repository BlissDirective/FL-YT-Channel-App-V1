/**
 * Character Studio — the pure half (docs/Character-Studio-Build-Plan.md §5).
 *
 * Name-matching and prompt assembly with NO database and NO I/O, so both are
 * exhaustively unit-testable and behave identically in the engine, the clip
 * worker, and the (future) Studio UI.
 *
 * The rule the whole feature rests on:
 *
 *     STYLE + [characters present] + SCENE + EXCLUSIONS
 *
 * Today that assembly lives in an operator's head and a markdown file. Here it
 * is code.
 */

/** The identity fields the matcher and composer need (a DB-free subset). */
export type CastMember = {
  id: string;
  name: string;
  aliases?: string[];
  description: string;
  identityAnchor?: string | null;
  role?: "presenter" | "cast" | "prop" | "location";
  status?: "draft" | "locked";
};

/** A resolved reference image for one matched character. */
export type CastReference = {
  characterId: string;
  imagePath: string;
  /** The look was locked under an older style string — still usable. */
  stale?: boolean;
};

export type StyleSpec = {
  styleString: string;
  palette?: Record<string, string>;
  compositionRules?: string | null;
  exclusions?: string | null;
};

/**
 * Reference models hold quality best at or below ~6 images, and scene
 * coherence degrades past ~3 subjects in practice. 4 is the compromise:
 * enough for a two-kids-plus-two-animals frame, low enough to stay coherent.
 */
export const MAX_CHARACTERS_PER_SCENE = 4;

/** Escape a literal for safe use inside a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Where (if anywhere) a name first appears in the text, matched on word
 * boundaries and case-insensitively. Returns -1 when absent.
 *
 * Word boundaries stop a name from matching INSIDE another word — "bow tie"
 * must not summon Bo. They are applied conditionally: `\b` only asserts against
 * a word character, so a name ending in punctuation ("C.J.") would never match
 * with an unconditional trailing boundary.
 *
 * What boundaries CANNOT solve: a short name that is also an ordinary word
 * will legitimately match that word ("Bo" in "bo tie", "Pip" in "pip of an
 * orange"). That is why per-scene overrides exist — the matcher is a strong
 * default, not an oracle, and its decisions are always visible and removable.
 */
export function firstMentionIndex(text: string, term: string): number {
  const t = term.trim();
  if (!t) return -1;
  const lead = /^\w/.test(t) ? "\\b" : "";
  const tail = /\w$/.test(t) ? "\\b" : "";
  const re = new RegExp(`${lead}${escapeRe(t)}${tail}`, "i");
  const m = re.exec(text);
  return m ? m.index : -1;
}

export type CastMatch = {
  member: CastMember;
  /** Character offset of the first mention — drives ordering. */
  at: number;
  /** Which name form matched (the canonical name or an alias). */
  matchedOn: string;
};

export type MatchResult = {
  /** Matched characters, ordered by first mention, capped. */
  matched: CastMatch[];
  /** Characters that matched but were cut by the cap — surfaced, never silent. */
  dropped: CastMatch[];
};

/**
 * Find which cast members a scene mentions. Pure: give it the beat text and
 * visual prompt, get back who belongs in the frame.
 *
 * Ordering is by first mention so that when the cap bites, the characters the
 * scene is actually about survive and the incidental ones drop.
 */
export function matchCast(
  text: string,
  cast: CastMember[],
  opts: { max?: number } = {},
): MatchResult {
  const max = opts.max ?? MAX_CHARACTERS_PER_SCENE;
  const hits: CastMatch[] = [];

  for (const member of cast) {
    const terms = [member.name, ...(member.aliases ?? [])].filter(Boolean);
    let best = -1;
    let matchedOn = "";
    for (const term of terms) {
      const at = firstMentionIndex(text, term);
      if (at >= 0 && (best < 0 || at < best)) {
        best = at;
        matchedOn = term;
      }
    }
    if (best >= 0) hits.push({ member, at: best, matchedOn });
  }

  hits.sort((a, b) => a.at - b.at || a.member.name.localeCompare(b.member.name));
  return { matched: hits.slice(0, max), dropped: hits.slice(max) };
}

/**
 * Apply the operator's per-beat overrides to a match result (decision Q3:
 * auto-match, but always correctable). `add` wins over `remove` for the same
 * id — an explicit add is the more deliberate instruction.
 */
export function applyCastOverrides(
  matched: CastMember[],
  cast: CastMember[],
  overrides: { add?: string[]; remove?: string[] } = {},
  opts: { max?: number } = {},
): CastMember[] {
  const max = opts.max ?? MAX_CHARACTERS_PER_SCENE;
  const add = new Set(overrides.add ?? []);
  const remove = new Set((overrides.remove ?? []).filter((id) => !add.has(id)));

  const out = matched.filter((m) => !remove.has(m.id));
  for (const id of add) {
    if (out.some((m) => m.id === id)) continue;
    const member = cast.find((c) => c.id === id);
    if (member) out.push(member);
  }
  return out.slice(0, max);
}

/** One character's contribution to the prompt. */
export function characterBlock(member: CastMember): string {
  const desc = member.description.trim().replace(/\s+/g, " ");
  const anchor = member.identityAnchor?.trim();
  // The anchor is repeated deliberately: restating the single must-survive
  // detail measurably improves its odds of surviving the render.
  return anchor ? `${desc} Always keep: ${anchor}.` : desc;
}

export type ComposedPrompt = {
  prompt: string;
  /** Ids of the characters whose blocks were included, in prompt order. */
  characterIds: string[];
};

/**
 * Assemble the final image prompt.
 *
 * Contract that Phase 1 must not violate: with no style and no characters, the
 * output is exactly `fallbackPrompt` — byte for byte. Every existing project
 * keeps its current behavior until it opts in by creating a style or a cast.
 */
export function composeScenePrompt(opts: {
  scene: string;
  style?: StyleSpec | null;
  characters?: CastMember[];
  /** Used verbatim when there is no style — the pre-Character-Studio prompt. */
  fallbackPrompt: string;
}): ComposedPrompt {
  const characters = opts.characters ?? [];
  const style = opts.style ?? null;

  if (!style && characters.length === 0) {
    return { prompt: opts.fallbackPrompt, characterIds: [] };
  }

  const parts: string[] = [];
  if (style?.styleString?.trim()) parts.push(style.styleString.trim());

  const palette = style?.palette ?? {};
  const paletteEntries = Object.entries(palette);
  if (paletteEntries.length > 0) {
    parts.push(
      `Palette: ${paletteEntries.map(([name, hex]) => `${name} ${hex}`).join(", ")}.`,
    );
  }

  for (const member of characters) parts.push(characterBlock(member));

  parts.push(opts.scene.trim());

  if (style?.compositionRules?.trim()) parts.push(style.compositionRules.trim());
  if (style?.exclusions?.trim()) parts.push(style.exclusions.trim());

  return {
    prompt: parts.filter(Boolean).join(" "),
    characterIds: characters.map((c) => c.id),
  };
}

/** Version stamp for videos.character_versions — makes edits forward-only. */
export function characterVersionStamp(
  characters: { id: string; version?: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of characters) out[c.id] = c.version ?? 1;
  return out;
}
