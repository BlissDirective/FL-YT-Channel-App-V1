import "server-only";

/**
 * Channel presets — a cast and its art styles as data (Character Studio §7,
 * Phase 4).
 *
 * The Mindful Minis A/B was set up as TWO projects because a single
 * instructions field cannot hold two art styles without them bleeding into
 * each other. The Character Studio removes that constraint: identity is
 * style-independent, so one project can hold one cast and two styles, and the
 * A/B becomes a per-video switch instead of a duplicated channel.
 *
 * This module is the migration. It is idempotent and matches on NAME, so
 * running it twice does nothing the second time, and running it against a
 * project that already has some of the cast fills in only what's missing.
 *
 * The character text is copied verbatim from
 * docs/channels/Mindful Minis Club/STYLE-LOCK-A.md, which remains the source
 * of truth — a preset that paraphrased its own spec would drift from the
 * document the operator actually reads.
 */
import {
  createCharacter,
  createStyle,
  linkCharacterToProject,
  listStyles,
  updateCharacter,
  type CharacterRole,
} from "@/lib/pipeline/character-studio";
import type { Db } from "@/lib/pipeline/engine";

export type PresetCharacter = {
  name: string;
  aliases?: string[];
  role?: CharacterRole;
  speciesOrType: string;
  description: string;
  identityAnchor: string;
  notes?: string;
};

export type PresetStyle = {
  name: string;
  styleString: string;
  palette: Record<string, string>;
  compositionRules: string;
  exclusions: string;
  isDefault?: boolean;
};

export type ChannelPreset = {
  id: string;
  label: string;
  blurb: string;
  styles: PresetStyle[];
  characters: PresetCharacter[];
};

const KIDS_COMPOSITION =
  "Characters centered or on thirds, full body or waist-up, facing camera or three-quarter. " +
  "Camera at child eye level, never looking down. One clear focal subject per frame; backgrounds " +
  "are shape and colour, not detail. No flashing, strobing, or rapid high-contrast patterns.";

const KIDS_EXCLUSIONS =
  "No text, letters, numbers, logos or watermarks. No extra characters. No scary, sad, or " +
  "distressed expressions. No peril or chase. No dark or muddy colours. No flashing or strobing. " +
  "No photorealism. No adult characters unless specified. No real children. No trademarked characters.";

export const MINDFUL_MINIS: ChannelPreset = {
  id: "mindful-minis",
  label: "Mindful Minis Club",
  blurb:
    "Six-character preschool sing-along cast plus both art-direction tracks (pastel vector and " +
    "paper-craft watercolour) as two styles in ONE project — the A/B becomes a per-video switch.",
  styles: [
    {
      name: "Style A — Soft Pastel Vector",
      isDefault: true,
      styleString:
        "Children's picture-book illustration in a soft pastel flat-vector style: clean rounded " +
        "vector shapes with gentle 3px warm-grey outlines, flat matte fills with subtle soft " +
        "shading, faintest paper grain, calm muted pastel palette, generous negative space, " +
        "simple uncluttered background shapes, warm even lighting, no harsh gradients, no photorealism.",
      palette: {
        cream: "#FDF6EC",
        sage: "#A8C3A0",
        sky: "#A9D3E8",
        peach: "#F6C8A8",
        coral: "#F2A099",
        butter: "#F7DE9B",
        "outline warm-grey": "#5C534A",
      },
      compositionRules: KIDS_COMPOSITION,
      exclusions: KIDS_EXCLUSIONS,
    },
    {
      name: "Style B — Paper-Craft Watercolour",
      styleString:
        "Children's picture-book illustration in a cut-paper collage and watercolour style: " +
        "characters built from torn textured paper with visible fiber edges and subtle drop " +
        "shadows, layered over soft watercolour washes with natural pigment granulation and " +
        "bloom, warm muted earth palette, hand-made artisanal feel, generous negative space, " +
        "soft diffuse light, no digital gloss, no photorealism.",
      palette: {
        paper: "#F4EDE0",
        moss: "#8FA97F",
        "dusty-blue": "#93B4C4",
        terracotta: "#D89A7A",
        blush: "#E7B7AC",
        ochre: "#E3C07B",
        ink: "#4A4239",
      },
      compositionRules: KIDS_COMPOSITION,
      exclusions: KIDS_EXCLUSIONS,
    },
  ],
  characters: [
    {
      name: "Bo",
      aliases: ["Bo the boy"],
      speciesOrType: "human child",
      description:
        "Bo, a cheerful 4-year-old boy with warm brown skin, short black curly hair, a round face " +
        "and big round dark eyes, wearing a mustard-yellow t-shirt with a small white star on the " +
        "chest, teal shorts and white sneakers, chunky toddler proportions with a large head and " +
        "short limbs.",
      identityAnchor: "mustard-yellow t-shirt with a small white star on the chest",
    },
    {
      name: "Poppy",
      speciesOrType: "human child",
      description:
        "Poppy, a thoughtful 5-year-old girl with light olive skin, dark brown hair in two round " +
        "pigtail puffs tied with coral bobbles, big round brown eyes, wearing dusty-rose dungarees " +
        "over a cream long-sleeve top and red canvas shoes, chunky toddler proportions with a " +
        "large head and short limbs.",
      identityAnchor: "two round pigtail puffs tied with coral bobbles",
    },
    {
      name: "Breeze",
      aliases: ["the bunny"],
      speciesOrType: "rabbit",
      description:
        "Breeze, a small gentle bunny with soft lilac-grey fur, long floppy ears with pale pink " +
        "inner ears, a tiny round tail, calm half-closed eyes, wearing a mint-green scarf, rounded " +
        "simple shapes, about knee-height to the children.",
      identityAnchor: "mint-green scarf",
      notes: "Owns BREATHING and calming down.",
    },
    {
      name: "Rumble",
      aliases: ["the bear"],
      speciesOrType: "bear",
      description:
        "Rumble, a big soft honey-brown bear with a round belly, small rounded ears, gentle sleepy " +
        "eyes and a tiny nose, wearing a rust-orange vest, rounded simple shapes, slightly taller " +
        "than the children.",
      identityAnchor: "rust-orange vest",
      notes: "Owns BIG FEELINGS (anger, frustration).",
    },
    {
      name: "Wobble",
      aliases: ["the turtle"],
      speciesOrType: "turtle",
      description:
        "Wobble, a slow smiling turtle with sage-green skin and a domed shell patterned with cream " +
        "hexagons and a soft butter-yellow rim, short legs, heavy-lidded calm eyes, rounded simple " +
        "shapes, about knee-height to the children.",
      identityAnchor: "domed shell with cream hexagons and a butter-yellow rim",
      notes: "Owns PAUSING, patience, and having a safe space.",
    },
    {
      name: "Pip",
      aliases: ["the bird"],
      speciesOrType: "bird",
      description:
        "Pip, a tiny round sky-blue bird with a butter-yellow chest and a single curled tuft " +
        "feather on the head, a small orange beak and bright alert eyes, often perched on a " +
        "shoulder, palm-sized.",
      identityAnchor: "single curled tuft feather on the head",
      notes: "Owns WORRY, brave first tries, and goodbyes.",
    },
  ],
};

export const CHANNEL_PRESETS: ChannelPreset[] = [MINDFUL_MINIS];

export function getChannelPreset(id: string): ChannelPreset | undefined {
  return CHANNEL_PRESETS.find((p) => p.id === id);
}

export type PresetApplyReport = {
  stylesCreated: string[];
  stylesExisting: string[];
  charactersCreated: string[];
  charactersLinked: string[];
  charactersExisting: string[];
};

/**
 * Apply a preset to a project. Idempotent and additive:
 *
 *  - a style whose NAME already exists in the project is left alone (its
 *    string may have been tuned by hand, and overwriting that would be a
 *    silent channel-wide restyle);
 *  - a character whose name already exists globally is LINKED, not duplicated
 *    — that is the whole point of a global cast;
 *  - an existing character with an empty description gets the preset's text,
 *    because an empty description is nothing to protect. A non-empty one is
 *    never touched.
 *
 * Spends nothing. Looks are generated afterwards from the Cast page, per
 * style, with the cost quoted first.
 */
export async function applyChannelPreset(
  db: Db,
  opts: { projectId: string; presetId: string },
): Promise<PresetApplyReport> {
  const preset = getChannelPreset(opts.presetId);
  if (!preset) throw new Error(`Unknown channel preset: ${opts.presetId}`);

  const report: PresetApplyReport = {
    stylesCreated: [],
    stylesExisting: [],
    charactersCreated: [],
    charactersLinked: [],
    charactersExisting: [],
  };

  const existingStyles = await listStyles(db, opts.projectId);
  for (const style of preset.styles) {
    if (existingStyles.some((s) => s.name.trim().toLowerCase() === style.name.toLowerCase())) {
      report.stylesExisting.push(style.name);
      continue;
    }
    await createStyle(db, {
      projectId: opts.projectId,
      name: style.name,
      styleString: style.styleString,
      palette: style.palette,
      compositionRules: style.compositionRules,
      exclusions: style.exclusions,
      // Only claim default when the project has none yet — never demote a
      // style the operator already chose.
      isDefault: style.isDefault && existingStyles.length === 0 && report.stylesCreated.length === 0,
    });
    report.stylesCreated.push(style.name);
  }

  const { data: allChars } = await db.from("characters").select("id, name, description");
  const global = ((allChars ?? []) as { id: string; name: string; description: string }[]) ?? [];
  const { data: links } = await db
    .from("project_characters")
    .select("character_id")
    .eq("project_id", opts.projectId);
  const linked = new Set(((links ?? []) as { character_id: string }[]).map((l) => l.character_id));

  for (const [i, c] of preset.characters.entries()) {
    const hit = global.find((g) => g.name.trim().toLowerCase() === c.name.toLowerCase());
    if (hit) {
      if (!linked.has(hit.id)) {
        await linkCharacterToProject(db, opts.projectId, hit.id, i);
        report.charactersLinked.push(c.name);
      } else {
        report.charactersExisting.push(c.name);
      }
      if (!hit.description?.trim()) {
        await updateCharacter(db, hit.id, {
          description: c.description,
          identityAnchor: c.identityAnchor,
          aliases: c.aliases ?? [],
          speciesOrType: c.speciesOrType,
          notes: c.notes ?? null,
        });
      }
      continue;
    }
    await createCharacter(db, {
      name: c.name,
      projectId: opts.projectId,
      role: c.role ?? "cast",
      description: c.description,
      identityAnchor: c.identityAnchor,
      aliases: c.aliases ?? [],
      speciesOrType: c.speciesOrType,
      notes: c.notes ?? null,
    });
    report.charactersCreated.push(c.name);
  }

  return report;
}
