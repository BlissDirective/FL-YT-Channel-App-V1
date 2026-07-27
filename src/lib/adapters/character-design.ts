import "server-only";

/**
 * The Character Studio's design agent (docs/Character-Studio-Build-Plan.md §4).
 *
 * The Studio is chat-first: the operator types "a shy grey bunny in a mint
 * scarf" and the agent's job is to turn that into the two artifacts the
 * pipeline actually consumes —
 *
 *   1. a CANONICAL DESCRIPTION: one dense, render-stable paragraph that reads
 *      identically to an image model every time it is injected, and
 *   2. an IDENTITY ANCHOR: the single detail that must survive every frame.
 *
 * Two rules the agent must never break:
 *  - Decision Q8 — once the operator hand-edits a description, the agent may
 *    PROPOSE a rewrite but never silently apply one. Enforced at the call site
 *    (`proposeOnly`), stated here so the model's own output is phrased as a
 *    proposal.
 *  - Style lives on the STYLE, not the character. A description that says
 *    "watercolour" would fight the style string when the same cast is rendered
 *    in the flat-vector style, so medium/rendering words are excluded.
 *
 * Mock-first: no ANTHROPIC_API_KEY → a deterministic draft, so the Studio is
 * fully usable and testable with zero credentials.
 */
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

const DESIGN_MODEL = "claude-sonnet-4-6";

export type CharacterDraft = {
  name: string;
  description: string;
  identityAnchor: string;
  aliases: string[];
  speciesOrType: string;
  /** The scene prompt for the candidate grid — description + framing, no style. */
  imagePrompt: string;
  /** What the agent wants to say in the thread above the candidates. */
  reply: string;
  costUsd: number;
  provider: "anthropic" | "mock";
};

const DESIGN_SYSTEM = `You are a character designer for an animation studio. You turn loose operator notes into ONE canonical character description that an image model can render identically, take after take.

Write the description as a single dense paragraph, present tense, concrete nouns only:
- Species/type, age read, body proportions, height relative to a human adult.
- Face: skin/fur/scale colour by name, eye colour and shape, hair or ears — shape, colour, length, how it sits.
- Wardrobe: every garment, its exact colour, and one distinguishing detail.
- Posture and default expression.

Hard rules:
- NEVER mention art medium, rendering, lighting, camera, or style ("watercolour", "3D", "cinematic", "soft pastel"). The style is applied separately and your words would fight it.
- NEVER mention a background, a setting, or an action. This describes who they ARE, not what they are doing.
- Name colours literally ("mustard yellow", "lilac grey"), never poetically ("sun-kissed").
- No real people, no trademarked or brand-alike characters.
- The identity anchor is ONE short noun phrase — the detail that most makes them recognisable at a glance, and the one you would check first to see whether a render is on-model.

Keep the description under 90 words. Denser is better than longer: every clause must constrain the render.`;

const DELIVER_CHARACTER_TOOL = {
  name: "deliver_character",
  description: "Return the finished character design.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "The character's name, 1–3 words." },
      description: {
        type: "string",
        description: "The canonical description paragraph. Under 90 words. No style, no setting.",
      },
      identity_anchor: {
        type: "string",
        description:
          "The ONE detail that must survive every frame, as a short noun phrase (e.g. 'mustard-yellow tee with a white star').",
      },
      aliases: {
        type: "array",
        description:
          "Other name forms a script might use for this character ('Bo the boy', 'the bunny'). Empty is fine.",
        items: { type: "string" },
      },
      species_or_type: {
        type: "string",
        description: "Short type label: 'human child', 'rabbit', 'prop', 'location'.",
      },
      image_prompt: {
        type: "string",
        description:
          "The scene clause for a first reference render: full body, neutral friendly expression, plain background. Do NOT restate the description and do NOT mention style.",
      },
      reply: {
        type: "string",
        description:
          "One or two sentences to the operator explaining the choices you made and what to check in the candidates.",
      },
    },
    required: ["name", "description", "identity_anchor"],
  },
};

export function isDesignAgentLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Deterministic draft so the Studio works with no API key. */
export function mockCharacterDraft(notes: string, existingName?: string | null): CharacterDraft {
  const trimmed = notes.trim().replace(/\s+/g, " ");
  const name = existingName?.trim() || trimmed.split(/[,.]/)[0].split(/\s+/).slice(0, 2).join(" ") || "New character";
  return {
    name,
    description:
      `${name}, ${trimmed || "a friendly character"}. Medium build, upright relaxed posture, ` +
      `open friendly expression, looking directly ahead.`,
    identityAnchor: trimmed.split(/[,.]/)[1]?.trim() || "consistent wardrobe colour",
    aliases: [],
    speciesOrType: "character",
    imagePrompt: "Full body, standing, neutral friendly expression, plain background.",
    reply: `Drafted ${name} from your notes. Edit anything below — your wording always wins over mine.`,
    costUsd: 0,
    provider: "mock",
  };
}

/**
 * Turn operator notes (plus whatever the character already is) into a draft.
 *
 * `existing` is passed on every turn so the chat is genuinely iterative:
 * "make her hair shorter" refines the current description rather than
 * inventing a new character.
 */
export async function draftCharacter(opts: {
  notes: string;
  existing?: {
    name?: string | null;
    description?: string | null;
    identityAnchor?: string | null;
    aliases?: string[] | null;
  } | null;
  role?: "presenter" | "cast" | "prop" | "location";
  /** Channel context so the agent pitches the right age/tone. */
  channelContext?: string | null;
  /** Q8: the operator owns this description — phrase the result as a proposal. */
  proposeOnly?: boolean;
}): Promise<CharacterDraft> {
  if (!isDesignAgentLive()) return mockCharacterDraft(opts.notes, opts.existing?.name);

  const ex = opts.existing;
  const prompt =
    (ex?.description
      ? `Current character:\nName: ${ex.name ?? "(unnamed)"}\nDescription: ${ex.description}\n` +
        `Identity anchor: ${ex.identityAnchor ?? "(none)"}\n` +
        `Aliases: ${(ex.aliases ?? []).join(", ") || "(none)"}\n\nRevise it per this note:\n`
      : `Design a new character from these notes:\n`) +
    opts.notes.trim() +
    (opts.role && opts.role !== "cast" ? `\n\nThis is a ${opts.role}.` : "") +
    (opts.channelContext ? `\n\nChannel context: ${opts.channelContext}` : "") +
    (opts.proposeOnly
      ? `\n\nThe operator has hand-edited this description, so present your version as a PROPOSAL in the reply — say plainly that nothing changes unless they accept it.`
      : "");

  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DESIGN_MODEL,
        max_tokens: 1200,
        system: DESIGN_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        tools: [DELIVER_CHARACTER_TOOL],
        tool_choice: { type: "tool", name: "deliver_character" },
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const body = (await res.json()) as {
      content?: { type: string; name?: string; input?: Record<string, unknown> }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const tool = body.content?.find((c) => c.type === "tool_use" && c.name === "deliver_character");
    const input = tool?.input as
      | {
          name?: string;
          description?: string;
          identity_anchor?: string;
          aliases?: string[];
          species_or_type?: string;
          image_prompt?: string;
          reply?: string;
        }
      | undefined;
    if (!input?.description) throw new Error("no character returned");
    const fallback = mockCharacterDraft(opts.notes, opts.existing?.name);
    return {
      name: input.name?.trim() || fallback.name,
      description: input.description.trim(),
      identityAnchor: input.identity_anchor?.trim() || "",
      aliases: Array.isArray(input.aliases) ? input.aliases.filter(Boolean).slice(0, 6) : [],
      speciesOrType: input.species_or_type?.trim() || "character",
      imagePrompt: input.image_prompt?.trim() || fallback.imagePrompt,
      reply: input.reply?.trim() || fallback.reply,
      costUsd: anthropicCostUsd(
        DESIGN_MODEL,
        body.usage?.input_tokens ?? 0,
        body.usage?.output_tokens ?? 0,
      ),
      provider: "anthropic",
    };
  } catch (err) {
    console.error(`character design fell back to mock: ${String(err).slice(0, 140)}`);
    return mockCharacterDraft(opts.notes, opts.existing?.name);
  }
}
