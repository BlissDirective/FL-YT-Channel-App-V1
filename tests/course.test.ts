/**
 * Course structure (Course Video Studio): the module→lesson tree the pipeline
 * seeds videos from, and quiz-card extraction from check-for-understanding
 * beats. Pure planning helpers.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_LESSONS_PER_MODULE,
  MAX_MODULES,
  buildCourseTree,
  extractQuizCards,
  flattenLessons,
  lessonCount,
} from "@/lib/pipeline/course";
import type { ScriptBeat } from "@/lib/db/types";

const beat = (idx: number, text: string): ScriptBeat => ({
  idx,
  text,
  visualPrompt: `visual ${idx}`,
  shotType: idx === 0 ? "hero" : "broll",
});

describe("buildCourseTree", () => {
  it("normalizes a loose outline: trims, defaults, and derives objectives", () => {
    const tree = buildCourseTree({
      title: "  Intro to SQL  ",
      modules: [
        {
          title: " Foundations ",
          lessons: [
            { title: " SELECT basics ", objective: "You can write a filtered SELECT", format: "walkthrough" },
            { title: "Joins", format: "not-a-format" },
          ],
        },
      ],
    });
    expect(tree.title).toBe("Intro to SQL");
    expect(tree.modules).toHaveLength(1);
    expect(tree.modules[0].lessons[0]).toEqual({
      title: "SELECT basics",
      objective: "You can write a filtered SELECT",
      format: "walkthrough",
    });
    // Unknown format defaults to concept; missing objective derives from title.
    expect(tree.modules[0].lessons[1]).toEqual({
      title: "Joins",
      objective: "You can explain joins",
      format: "concept",
    });
  });

  it("drops titleless lessons, then modules left empty, and handles a bare input", () => {
    const tree = buildCourseTree({
      modules: [
        { title: "Ghost module", lessons: [{ title: "  " }, {}] },
        { lessons: [{ title: "Orphan lesson" }] }, // module without a title
        { title: "Real", lessons: [{ title: "Kept" }] },
      ],
    });
    expect(tree.title).toBe("Untitled course");
    expect(tree.modules.map((m) => m.title)).toEqual(["Real"]);
    expect(lessonCount(tree)).toBe(1);
  });

  it("caps modules and lessons for spend safety", () => {
    const tree = buildCourseTree({
      modules: Array.from({ length: MAX_MODULES + 5 }, (_, m) => ({
        title: `M${m}`,
        lessons: Array.from({ length: MAX_LESSONS_PER_MODULE + 10 }, (_, l) => ({ title: `L${l}` })),
      })),
    });
    expect(tree.modules).toHaveLength(MAX_MODULES);
    expect(tree.modules[0].lessons).toHaveLength(MAX_LESSONS_PER_MODULE);
  });
});

describe("flattenLessons", () => {
  it("yields the production order with module provenance and stable idx", () => {
    const tree = buildCourseTree({
      title: "C",
      modules: [
        { title: "M1", lessons: [{ title: "A" }, { title: "B" }] },
        { title: "M2", lessons: [{ title: "C" }] },
      ],
    });
    const flat = flattenLessons(tree);
    expect(flat.map((f) => [f.idx, f.moduleTitle, f.lesson.title])).toEqual([
      [0, "M1", "A"],
      [1, "M1", "B"],
      [2, "M2", "C"],
    ]);
  });
});

describe("extractQuizCards", () => {
  it("builds a card from a check-for-understanding beat with its confirmation", () => {
    const beats = [
      beat(0, "By the end you'll read a query plan cold."),
      beat(1, "An index scan walks the tree. So which is faster here, scan or seek? The seek — it touches three pages instead of three thousand."),
      beat(2, "You can now read the plan. Next lesson we tune it."),
    ];
    const cards = extractQuizCards(beats);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({
      question: "So which is faster here, scan or seek?",
      answer: "The seek — it touches three pages instead of three thousand.",
      sourceBeatIdx: 1,
    });
  });

  it("uses the next beat's opening sentence when the question closes its beat", () => {
    const beats = [
      beat(0, "Hook."),
      beat(1, "Here's the rule of thumb. What happens when both sides are indexed?"),
      beat(2, "The planner picks the smaller side. That's the whole trick."),
    ];
    const cards = extractQuizCards(beats);
    expect(cards).toHaveLength(1);
    expect(cards[0].answer).toBe("The planner picks the smaller side.");
  });

  it("never reads the hook beat, and yields nothing without questions or answers", () => {
    expect(
      extractQuizCards([
        beat(0, "Isn't this the hook asking a question? It is."),
        beat(1, "Pure statements only. Nothing asked."),
      ]),
    ).toEqual([]);
    // A trailing question with no confirmation anywhere is not a card.
    expect(extractQuizCards([beat(0, "Hook."), beat(1, "So what would you pick?")])).toEqual([]);
  });
});
