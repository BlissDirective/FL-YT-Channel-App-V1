import type { ScriptBeat } from "@/lib/db/types";

/**
 * Course structure (Course Video Studio) — pure helpers (no I/O).
 *
 * The production unit of a course is the LESSON (one video, one objective),
 * organized module → lesson. This module turns a loose outline (from doc
 * ingestion, the operator, or the user) into a normalized course tree the
 * pipeline can seed videos from, and extracts QUIZ CARDS from a lesson
 * script's check-for-understanding beat (the craft laws require exactly one
 * per lesson — see script-craft.ts STRUCTURE_LAWS).
 *
 * Wiring seam: `flattenLessons` yields the production order the operator
 * seeds pipeline videos in (one video per lesson, title = lesson title,
 * topic = objective, format = lesson format); quiz cards ride the video's
 * metadata into the publish kit / future LMS export.
 */

export type LessonFormat = "concept" | "walkthrough" | "recap";

export type LessonSpec = {
  title: string;
  /** The one demonstrable objective ("you can now …"). */
  objective: string;
  format: LessonFormat;
};

export type ModuleSpec = { title: string; lessons: LessonSpec[] };

export type CourseTree = { title: string; modules: ModuleSpec[] };

/** Spend-safety caps: a tree seeds real pipeline videos downstream. */
export const MAX_MODULES = 12;
export const MAX_LESSONS_PER_MODULE = 20;

const FORMATS: readonly LessonFormat[] = ["concept", "walkthrough", "recap"];

/** Loose outline shape accepted from doc ingestion / user input. */
export type CourseOutlineInput = {
  title?: string;
  modules?: {
    title?: string;
    lessons?: { title?: string; objective?: string; format?: string }[];
  }[];
};

/**
 * Normalize a loose outline into a valid CourseTree:
 *  - trims titles; drops lessons with no title and modules with no lessons;
 *  - defaults a missing/unknown format to "concept";
 *  - derives a missing objective from the title ("You can explain <title>" is
 *    a placeholder the SCRIPT gate's objective_clarity criterion will force
 *    the operator to sharpen — better an honest placeholder than a crash);
 *  - caps modules/lessons for spend safety.
 */
export function buildCourseTree(input: CourseOutlineInput): CourseTree {
  const modules: ModuleSpec[] = [];
  for (const rawModule of (input.modules ?? []).slice(0, MAX_MODULES)) {
    const lessons: LessonSpec[] = [];
    for (const rawLesson of (rawModule.lessons ?? []).slice(0, MAX_LESSONS_PER_MODULE)) {
      const title = rawLesson.title?.trim();
      if (!title) continue;
      const format = (FORMATS as readonly string[]).includes(rawLesson.format ?? "")
        ? (rawLesson.format as LessonFormat)
        : "concept";
      lessons.push({
        title,
        objective: rawLesson.objective?.trim() || `You can explain ${title.toLowerCase()}`,
        format,
      });
    }
    const title = rawModule.title?.trim();
    if (!title || lessons.length === 0) continue;
    modules.push({ title, lessons });
  }
  return { title: input.title?.trim() || "Untitled course", modules };
}

export type FlatLesson = {
  /** 0-based production order across the whole course. */
  idx: number;
  moduleIdx: number;
  moduleTitle: string;
  lesson: LessonSpec;
};

/** Production order: modules in sequence, lessons in sequence within each. */
export function flattenLessons(tree: CourseTree): FlatLesson[] {
  const out: FlatLesson[] = [];
  tree.modules.forEach((m, moduleIdx) => {
    for (const lesson of m.lessons) {
      out.push({ idx: out.length, moduleIdx, moduleTitle: m.title, lesson });
    }
  });
  return out;
}

export type QuizCard = {
  question: string;
  answer: string;
  /** Beat the question came from (provenance for the editor UI). */
  sourceBeatIdx: number;
};

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

/**
 * Extract quiz cards from a lesson script's check-for-understanding moments.
 *
 * Heuristic (pure, deterministic — the craft laws make the writer produce the
 * pattern this reads): a teaching beat (never the hook, beat 0) that poses a
 * question gets a card whose question is the beat's last question-sentence and
 * whose answer is the confirmation that follows — the rest of that beat, or
 * the first sentence of the next beat when the question closes the beat.
 * Beats with no question yield nothing; a lesson normally yields exactly one.
 */
export function extractQuizCards(beats: ScriptBeat[]): QuizCard[] {
  const cards: QuizCard[] = [];
  for (let i = 1; i < beats.length; i++) {
    const sentences = beats[i].text.split(SENTENCE_SPLIT).filter((s) => s.trim());
    let lastQ = -1;
    for (let s = 0; s < sentences.length; s++) {
      if (sentences[s].trim().endsWith("?")) lastQ = s;
    }
    if (lastQ === -1) continue;
    const question = sentences[lastQ].trim();
    const sameBeatAnswer = sentences
      .slice(lastQ + 1)
      .join(" ")
      .trim();
    const nextBeatAnswer = beats[i + 1]?.text.split(SENTENCE_SPLIT)[0]?.trim() ?? "";
    const answer = sameBeatAnswer || nextBeatAnswer;
    if (!answer) continue; // a question nothing confirms is not a quiz card
    cards.push({ question, answer, sourceBeatIdx: i });
  }
  return cards;
}

/** Total lessons in a tree (dashboard + budget planning). */
export function lessonCount(tree: CourseTree): number {
  return tree.modules.reduce((n, m) => n + m.lessons.length, 0);
}
