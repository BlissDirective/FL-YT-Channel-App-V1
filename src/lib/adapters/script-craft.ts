/**
 * Script-craft knowledge base — the direct-response marketing laws as
 * permanent prompt blocks for the GTM script agent. This file IS the knowledge
 * base: version-controlled, always injected, testable — every script
 * generation carries it (script.ts), unlike a database blob that can silently
 * drift.
 *
 * The export names keep the engine's original shape (HOOK/RETENTION/PACING/
 * AUTHENTICITY/STRUCTURE) so the prompt wiring and tests stay stable; the
 * content is the GTM studio's ad craft: scroll-stopping hooks, persuasion
 * mechanics, feed-native pacing, UGC authenticity + claim compliance, and the
 * single-CTA close.
 */

/** Hook laws — the first 3 seconds decide whether the ad exists at all. */
export const HOOK_LAWS = `HOOK LAWS — the first 3 seconds is a scroll check, not a brand introduction:
- Name the BUYER'S PAIN before you name the product (viewers decide to stay before they know what's being sold).
- Build the hook as a SPECIFIC pattern interrupt — a cost they didn't know they were paying, a "you're doing X wrong", a number that doesn't reconcile. Specific beats vague every time.
- NEVER open with the product name, "Introducing", a logo sting, or any greeting — those read as an ad and get swiped instantly.
- The hook must contain at least one specific number, scenario, or named detail the target buyer recognizes from their own week.
- For a UGC ad, the first line must sound like a person mid-discovery ("okay, I have to show you this") — never like a brand speaking.
- Do NOT reveal the product and open the curiosity in the SAME line — pain/pattern-interrupt first, the reveal lands as the payoff.
- The hook is a PROMISE the ad must pay off: if the CTA's offer doesn't deliver what the hook implied, it's bait — fix one of them.
- Write hooks to be SWAPPED: each alternate hook takes a genuinely different angle (pain, outcome, contrarian, social proof) so variants actually test something.`;

/** Persuasion mechanics across the body. */
export const RETENTION_LAWS = `PERSUASION MECHANICS:
- Follow the spine: PAIN → STAKES → MECHANISM → PROOF → CTA. Every beat sits on the spine; anything else is filler.
- Make the cost of the status quo CONCRETE within 10 seconds of naming the pain — hours lost, dollars burned, pipeline missed. Abstract pain doesn't convert.
- MECHANISM before features: show the ONE thing this product does differently, tied to something visible on screen. A feature list is where attention dies.
- One PROOF point, made concrete: a number, a before/after, a named outcome. One believable proof beats three vague ones.
- Answer the buyer's loudest objection head-on in one line ("yes, it works with your stack", "no, you don't migrate anything") — the unspoken objection kills the click.
- Never use a rhetorical question as a transition ("so what does this mean for you?" reads as ad-speak). Transition with declarative statements.
- The viewer must never be able to predict the next sentence — break every pattern you establish, especially mid-ad where swipe-away peaks.`;

/** Pacing laws — feed-native rhythm. */
export const PACING_LAWS = `PACING:
- Cycle three modes: PUNCH (short, bold, claim or number), SHOW (the product doing the job, narrated), TALK (human, first-person, conversational). Complete the cycle at least once per 30 seconds.
- Never stay in one mode longer than ~20 seconds in a UGC ad or ~45 seconds in a demo — feed attention recalibrates fast.
- Sentence-length variation is mandatory: never three consecutive sentences of similar length. One short punch, then a longer explanation, then a medium bridge.
- Place the product reveal immediately AFTER the stakes peak — the reveal is the release of the tension the hook built.
- The first sentence of each beat re-earns attention — open beats concrete, high-stakes, and mid-thought.`;

/** Authenticity + compliance laws — the UGC voice, and the claims bar. */
export const AUTHENTICITY_LAWS = `AUTHENTICITY & COMPLIANCE (the transcript is what ad reviewers read — and what buyers feel):
- UGC means a PERSON, not a brand: first person, contractions, the occasional imperfect aside. The "would a brand's social team write this exact line?" test: if yes, rewrite it.
- No ad-speak, ever: "revolutionary", "seamless", "game-changing", "supercharge", "unleash" are instant tells. Specifics are the proof of honesty.
- CLAIM COMPLIANCE IS NON-NEGOTIABLE: every stated result must be typical-case honest and substantiable. No invented testimonials, no fabricated metrics, no "guaranteed" outcomes, no fake urgency ("only 3 left").
- Comparative claims name what's actually compared; "faster" means faster than something specific and true.
- The narrator has a GENUINE opinion at least once ("honestly, this part sold me") — opinion is what separates a creator from a script.
CLOSE (the last 5 seconds decide whether the view becomes a click):
- The final beat is ONE clear call-to-action tied to the offer — start free, book a demo, grab the template — stated as the action plus its immediate payoff.
- One CTA only: never stack "follow for more" onto the offer CTA — a split ask halves both.`;

/** Structural discipline for ad + demo scripts. */
export const STRUCTURE_LAWS = `STRUCTURAL DISCIPLINE:
- Every sentence has a job: stop the scroll, make the pain concrete, raise the stakes, show the mechanism, land the proof, kill an objection, or drive the CTA. A sentence doing none of these is filler — cut it.
- The ad is finished when there is nothing left to REMOVE. A 25-second ad that holds beats a 40-second ad that doesn't earn its length.
- In a demo, every claim in the narration must have a visible on-screen counterpart — say it while showing it, never before or instead.
- Deliver alternate hooks as true VARIANTS (different angle, same offer) so the A/B test measures the angle, not the phrasing.`;

/** The full craft block the script prompt injects (order: most load-bearing first). */
export const SCRIPT_CRAFT_LAWS = `\n\nAD CRAFT LAWS — non-negotiable operating principles (performance-data-backed; violations show in hook rate and CTR):\n${HOOK_LAWS}\n\n${RETENTION_LAWS}\n\n${PACING_LAWS}\n\n${AUTHENTICITY_LAWS}\n\n${STRUCTURE_LAWS}`;

/**
 * The AI-tell vocabulary cluster. Merged into the writer's banned list
 * (script.ts VOICE_SYSTEM already bans several; these complete the set).
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
