/**
 * Script-craft knowledge base — the instructional-design laws as permanent
 * prompt blocks for the lesson-script agent. This file IS the knowledge base:
 * version-controlled, always injected, testable — every lesson generation
 * carries it (script.ts), unlike a database blob that can silently drift.
 *
 * The export names keep the engine's original shape (HOOK/RETENTION/PACING/
 * AUTHENTICITY/STRUCTURE) so the prompt wiring and tests stay stable; the
 * content is the course studio's teaching craft: objective-first openings,
 * cognitive-load management, worked examples, engagement, and the recap close.
 */

/** Objective-hook laws — the first 20 seconds decide whether the learner leans in. */
export const HOOK_LAWS = `OBJECTIVE HOOK LAWS — the open is a motivation check, not a table of contents:
- Name the LEARNER'S SITUATION and the concrete capability they'll gain before you name the topic ("by the end you'll be able to X" in plain words).
- NEVER open with greetings, "in this lesson we will", or a dictionary definition — those burn the open saying nothing.
- Make the payoff specific and near-term: what they can DO differently today, with a specific number, scenario, or named detail where honest.
- Tie the objective to a real cost or stake the learner already feels (the bug they keep shipping, the report that takes 3 hours, the deal that stalls).
- State the objective and open the curiosity in separate beats of the sentence flow — motivation first, then the promise of the mechanism.
- The hook is a PROMISE the lesson must fulfil: if the recap can't honestly say "you can now do this", the hook overpromised — fix one of them.`;

/** Cognitive-load laws — how the teaching body stays learnable. */
export const RETENTION_LAWS = `COGNITIVE LOAD MECHANICS:
- ONE idea per beat. If a beat teaches two things, split it — overload is the #1 reason learners rewind or quit.
- Sequence steps in the order a learner NEEDS them, not the order an expert thinks of them. Prerequisite before dependent, always.
- Activate prior knowledge before each new idea: one honest bridge from what they already know ("you've seen X; this is X with one twist").
- Define every term the FIRST time it appears, in one plain-language line. Never let jargon ride undefined.
- Signpost relentlessly: "first", "the key move here", "watch out for", "this is where most people slip". The learner should always know where they are.
- Every abstract claim gets a concrete anchor within 10 seconds — an example, a number, a named scenario. Abstraction without an anchor doesn't transfer.
- END EACH TEACHING BEAT ON A HANDLE, not a cliffhanger: a one-line restatement the learner could repeat. Completion aids learning even though it kills suspense — this is teaching, not a thriller.`;

/** Pacing laws for spoken teaching. */
export const PACING_LAWS = `PACING:
- Cycle three modes: EXPLAIN (new idea, slower, defined terms), SHOW (worked example, concrete, visible), CHECK (question or try-this, brisk). Complete the cycle for every major idea.
- Never stay in EXPLAIN longer than ~60 seconds without switching to SHOW — sustained abstraction is where attention dies.
- Sentence-length variation is mandatory: short declaratives for the hard parts, longer sentences for context. Never three same-length sentences in a row.
- Slow DOWN at the exact moment of new load (a formula, a rule, a definition) and speed up through familiar ground.
- The first sentence of each section states what the section does for the learner — open sections concrete and purposeful.`;

/** Teaching-authenticity laws — accuracy and the instructor's voice, plus the close. */
export const AUTHENTICITY_LAWS = `TEACHING AUTHENTICITY (the transcript is what learners quote back — and what reviewers audit):
- ACCURACY IS NON-NEGOTIABLE: every claim must be correct and defensible. If something is a simplification, SAY it's a simplification. No invented statistics, sources, or "studies show".
- Make the invisible thinking visible in worked examples: "here's what I'm checking for, and why" — the expert's internal monologue is the product.
- The "would a generic prompt produce this exact explanation?" test: if yes, rewrite with a sharper example or a more honest caveat.
- The instructor has a GENUINE point of view: which mistakes matter most, which shortcut is worth it, what the docs get wrong. Teach from experience, not from a syllabus.
- Anticipate the learner's likely objection or confusion at least once per major idea and answer it head-on ("you might be thinking X — here's why that breaks").
CLOSE (the last 20 seconds consolidate or evaporate the lesson):
- The RECAP restates what the learner can NOW DO, tied word-for-word to the objective hook — never a bare "thanks for watching".
- Then the BRIDGE: one line on how the next lesson builds on exactly this skill, so momentum carries forward.`;

/** Structural discipline for lesson scripts. */
export const STRUCTURE_LAWS = `STRUCTURAL DISCIPLINE:
- Every sentence has a job: motivate the objective, bridge prior knowledge, teach one step, anchor with an example, check understanding, or consolidate. A sentence doing none of these is filler — cut it.
- The lesson is finished when nothing can be REMOVED without losing the objective. Shorter lessons with one clean objective beat longer lessons with two muddy ones.
- Place the worked example at the center of the lesson's runtime — it is the load-bearing beat; everything before prepares it, everything after consolidates it.
- Include exactly ONE check-for-understanding moment (a question the learner answers in their head, then you confirm) — it seeds the quiz card.`;

/** The full craft block the script prompt injects (order: most load-bearing first). */
export const SCRIPT_CRAFT_LAWS = `\n\nLESSON CRAFT LAWS — non-negotiable operating principles (learning-science-backed; violations show in completion and quiz scores):\n${HOOK_LAWS}\n\n${RETENTION_LAWS}\n\n${PACING_LAWS}\n\n${AUTHENTICITY_LAWS}\n\n${STRUCTURE_LAWS}`;

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
