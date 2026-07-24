/**
 * Script-craft knowledge base — the operator's Hook Laws (48 operating
 * principles, distilled from their retention data doc) as permanent prompt
 * blocks for the script agent. This file IS the knowledge base: version-
 * controlled, always injected, testable — every script generation carries it
 * (script.ts), unlike a database blob that can silently drift.
 *
 * Only the OPERATIVE writing laws are injected (hooks, retention mechanics,
 * pacing, authenticity, structure/outro). The strategy-level laws (format
 * ceilings, AVR economics, mindset) inform the system's design rather than
 * per-script prompts: point order + mid-roll placement are encoded below,
 * format choice lives with idea/format selection, and "the retention graph
 * is the test" is the outcome loop (exemplars.ts).
 */

/** Laws 1–8 — hook construction. */
export const HOOK_LAWS = `HOOK LAWS — the first 15 seconds is a trust check, not a topic introduction:
- Name the VIEWER'S SITUATION before you name your topic (viewers decide to stay before the topic is named).
- Build the hook as a SPECIFIC information gap — "the one mistake costing you 40% of your audience" beats any vague tease. Specific gaps outperform vague ones by ~27 points at 0:30.
- NEVER open with greetings or throat-clearing ("hey guys, welcome back" burns 8 seconds saying nothing and loses 40% of viewers).
- Stack TWO psychological mechanisms in the first 50 words: curiosity gap + expectation confirmation, or pattern interrupt + concrete data. One mechanism is baseline; two is elite.
- A pattern interrupt must be a GENUINE contradiction (numbers that don't reconcile: "I made $14,400 from 225 views"), never a manufactured tease ("you won't believe what happened next").
- The hook must contain at least one specific number, date, or named detail — concrete data forces cognitive work and sunk-cost makes leaving feel wasteful.
- Do NOT confirm the topic and open the curiosity gap in the SAME sentence — confirmation (relief) and gap (tension) must land as separate beats so they collide.
- The hook is a PROMISE the script must fulfil, never a summary. A hook whose payoff the script doesn't deliver is a betrayal that costs the viewer's lifetime value.`;

/** Laws 9–16 — retention mechanics across the body. */
export const RETENTION_LAWS = `RETENTION MECHANICS:
- Open a new curiosity gap every 30–45 seconds of script time; a gap must open at the moment the previous one closes.
- After every mini payoff, plant the NEXT setup within 10 seconds — the payoff void (a stretch with nothing unresolved) is where 40% of mid-video loss happens.
- POINT ORDER: second-best point FIRST, best point in the MIDDLE, third-best LAST. Never lead with your best point — everything after reads as decline.
- Foreshadow the grand payoff at least three times: in the hook, around the one-third mark, and around the two-thirds mark.
- NEVER use a rhetorical question as a section transition ("so what does this mean?" signals the script is reorganising). Transition with declarative statements.
- Every section needs at least one specific data point (a date, a number, a named example) — an all-abstract section reads as empty and bleeds 8–12% of the audience.
- The viewer must never be able to predict the next sentence — break every pattern you establish.
- END EVERY SECTION ON INCOMPLETION: an unresolved question, a new implication, or a hint that the next section reframes what they just absorbed. Completion kills retention.`;

/** Laws 17–22 — pacing. */
export const PACING_LAWS = `PACING:
- Cycle through three modes: COMPRESSION (dense, rapid, fact-heavy), EXPANSION (slower, story-driven, experiential), SHOCK (sudden pattern violation). Complete the cycle at least twice per 10 minutes.
- Never stay in one pacing mode longer than ~90 seconds — the brain calibrates to any sustained rhythm and attention drops.
- Place SHOCK moments immediately BEFORE major payoffs — the shock resets attention to maximum exactly when the script needs it.
- Sentence-length variation is mandatory: never three consecutive sentences of similar length. One short punch, then a longer explanation, then a medium transition.
- The FIRST sentence of each section sets that section's energy — open sections compressed, specific, and high-stakes.`;

/** Laws 23–28 + 39–40 — authenticity and the close. */
export const AUTHENTICITY_LAWS = `AUTHENTICITY (the transcript is what gets classified, and what viewers feel):
- Editorial direction comes BEFORE information: the narrator has a specific perspective and finds specific things fascinating — write from that stance, not from "write about topic".
- The "would a generic prompt produce this exact phrasing?" test: if yes, rewrite it.
- Specificity is the proof of human involvement: "a creator I audited had 42% retention at 0:30 and switched niche three times" beats "many creators struggle with this" — every time.
- The narrator expresses a GENUINE opinion at least once per major section ("this is the part that gets me", "the data here contradicts everything the gurus teach").
CLOSE (the last 20 seconds decide subscription and session time):
- The final beat delivers a powerful FINAL INSIGHT that makes the viewer feel "I need more of this person's perspective" — never a bare thanks-for-watching.
- The outro opens a curiosity gap toward the NEXT video (session time), then makes its single warm ask.`;

/**
 * Laws 41–42 (+37) — structural discipline injected with the block.
 * The remaining mindset/AVR laws shape the SYSTEM (outcome loop, formats),
 * not individual prompts.
 */
export const STRUCTURE_LAWS = `STRUCTURAL DISCIPLINE:
- Every sentence has a job: confirm the click, open a gap, close a gap, vary pacing, escalate stakes, deliver a payoff, or foreshadow the grand payoff. A sentence doing none of these is filler — cut it.
- The script is finished when there is nothing left to REMOVE. A compressed script that holds beats a longer script that doesn't earn its length.
- For longer videos, the strongest retention section must surround the first third of the runtime (where the first mid-roll lands) — never let the energy dip there.`;

/** The full craft block the script prompt injects (order: most load-bearing first). */
export const SCRIPT_CRAFT_LAWS = `\n\nSCRIPT CRAFT LAWS — non-negotiable operating principles (retention-data-backed; violations show in the retention graph):\n${HOOK_LAWS}\n\n${RETENTION_LAWS}\n\n${PACING_LAWS}\n\n${AUTHENTICITY_LAWS}\n\n${STRUCTURE_LAWS}`;

/**
 * Law 26 — the AI-tell vocabulary cluster. Merged into the writer's banned
 * list (script.ts VOICE_SYSTEM already bans several; these complete the set).
 */
export const AI_TELL_WORDS = [
  "delve",
  "realm",
  "foster",
  "furthermore",
  "tapestry",
  "shed light",
  "embark",
  "illuminate",
  "testament",
] as const;
