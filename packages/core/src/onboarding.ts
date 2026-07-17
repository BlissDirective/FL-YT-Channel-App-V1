/**
 * First-run onboarding (OpenMontage Remixed list2 #28) — "curious → making a
 * video in <60s". A vague first message triggers discovery and tailored starter
 * prompts so an empty state becomes a running project fast. Pure.
 */

export type StarterPrompt = { id: string; label: string; prompt: string; niche: string };

const STARTERS: StarterPrompt[] = [
  { id: "history", label: "Explain a historical event", prompt: "A 60-second explainer on why the Bronze Age collapsed", niche: "history" },
  { id: "science", label: "Break down a science idea", prompt: "How black holes bend time, in plain language", niche: "science" },
  { id: "finance", label: "Demystify a money concept", prompt: "Why inflation quietly shrinks your savings", niche: "finance" },
  { id: "tech", label: "Explain a technology", prompt: "How large language models actually predict the next word", niche: "technology" },
  { id: "wellness", label: "A calm wellness short", prompt: "Three breathing techniques to fall asleep faster", niche: "wellness" },
  { id: "story", label: "Tell a true story", prompt: "The heist that almost emptied a national bank", niche: "story" },
];

/** Map a vague first message to tailored starter prompts (keyword discovery),
    always returning a usable set even for an empty/unknown message. Pure. */
export function starterPromptsFor(firstMessage = "", limit = 3): StarterPrompt[] {
  const words = new Set(firstMessage.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const scored = STARTERS.map((s) => {
    let score = 0;
    if (words.has(s.niche)) score += 3; // whole-word niche match (no "hi-story")
    for (const w of s.label.toLowerCase().split(/\s+/)) if (w.length > 3 && words.has(w)) score += 1;
    return { s, score };
  }).sort((a, b) => b.score - a.score);
  const top = scored.filter((x) => x.score > 0).map((x) => x.s);
  // Fill from the default set so the user always sees `limit` options.
  const filled = [...top];
  for (const s of STARTERS) {
    if (filled.length >= limit) break;
    if (!filled.includes(s)) filled.push(s);
  }
  return filled.slice(0, limit);
}

/** The onboarding steps from empty state to a running first video. Pure data. */
export const ONBOARDING_STEPS = [
  { id: "topic", label: "Pick a topic", detail: "Tap a starter or type your own idea." },
  { id: "gate", label: "Approve the idea", detail: "One tap at the idea gate." },
  { id: "watch", label: "Watch it build", detail: "Script → voice → visuals → cut, live on the Backlot board." },
] as const;
