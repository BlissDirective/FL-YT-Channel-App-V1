"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildCourseTree,
  lessonCount,
  lessonSeedRows,
  type CourseOutlineInput,
} from "@/lib/pipeline/course";

export type SeedCourseResult = {
  ok: boolean;
  error?: string;
  /** Lessons seeded as pipeline videos. */
  count?: number;
  /** Modules in the normalized tree. */
  modules?: number;
  courseTitle?: string;
};

/**
 * Seed a course outline into the pipeline: normalize the loose outline into a
 * module→lesson tree, then insert one IDEA-status video per lesson (in
 * production order) so each lesson flows through the normal gates
 * script → assets → render. Mirrors the intelligence idea-seed
 * (src/lib/actions/intelligence.ts) and the operator's day-seeding; the pure
 * tree/row helpers are unit-tested in tests/course.test.ts.
 *
 * The outline typically comes from doc ingestion (roadmap item 7) or the user;
 * this action is the seam that turns it into real videos.
 */
export async function seedCourseFromOutlineAction(
  projectId: string,
  outline: CourseOutlineInput,
): Promise<SeedCourseResult> {
  try {
    const tree = buildCourseTree(outline);
    const total = lessonCount(tree);
    if (total === 0) {
      return { ok: false, error: "The outline has no lessons to seed." };
    }

    const supabase = await createClient();
    const rows = lessonSeedRows(projectId, tree);
    const { error } = await supabase.from("videos").insert(rows);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/library`);
    return {
      ok: true,
      count: rows.length,
      modules: tree.modules.length,
      courseTitle: tree.title,
    };
  } catch (err) {
    console.error("seedCourseFromOutlineAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
