"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { parseOutlineText } from "@/lib/pipeline/course";
import { seedCourseFromOutlineAction } from "@/lib/actions/course";

const PLACEHOLDER = `# Intro to SQL

Foundations
  - SELECT basics | You can write a filtered SELECT | walkthrough
  - Filtering with WHERE | You can narrow a result set
Joins
  - Inner joins | You can combine two tables | concept`;

/**
 * Seed a whole course from a pasted outline: one lesson → one pipeline video,
 * each flowing through the normal script → assets → render gates. The parser is
 * pure (parseOutlineText); the seeding is the server action.
 */
export function CourseSeeder({ projectId }: { projectId: string }) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [error, setError] = useState<string>();

  const seed = () =>
    startTransition(async () => {
      setMsg(undefined);
      setError(undefined);
      const outline = parseOutlineText(text);
      const r = await seedCourseFromOutlineAction(projectId, outline);
      if (!r.ok) {
        setError(r.error ?? "Couldn't seed the course.");
        return;
      }
      setMsg(
        `Seeded ${r.count} lesson${r.count === 1 ? "" : "s"} across ${r.modules} ` +
          `module${r.modules === 1 ? "" : "s"} — “${r.courseTitle}”. Each lesson is now in the pipeline.`,
      );
      setText("");
    });

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-2xl bg-lavender/15 text-lavender">
          <GraduationCap className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Seed a course from an outline</h2>
          <p className="text-xs text-muted">
            Paste modules and lessons — one lesson becomes one video lesson, each
            written, produced, and reviewed through the normal gates.
          </p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={8}
        className="w-full resize-y rounded-xl border border-line bg-card px-3 py-2 font-mono text-xs outline-none focus:border-accent"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending || !text.trim()}
          onClick={seed}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <GraduationCap className="size-4" />}
          Seed course
        </button>
        {msg && <p className="text-sm font-medium text-lavender">{msg}</p>}
        {error && <p className="text-sm font-medium text-coral">{error}</p>}
      </div>
    </Card>
  );
}
