"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { runIntelligenceNowAction } from "@/lib/actions/intelligence";
import { PillTabs } from "@/components/ui/pill-tabs";

type Length = "short" | "long" | "either";
const LENGTHS: { value: Length; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
  { value: "either", label: "Either" },
];

/** "Generate ideas" — on demand, scouts the niche and lands a batch of scored
    idea-stage videos in the review queue (approve/reject at the Idea gate).
    The length sets each idea's target runtime. Lives in the project header's
    overflow menu, styled as a menu item. */
export function RunIntelligenceButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [length, setLength] = useState<Length>("either");
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        role="menuitem"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const r = await runIntelligenceNowAction(projectId, length);
            if (!r.ok && r.error) setError(r.error);
            else router.push(`/projects/${projectId}/library`);
          })
        }
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Generate ideas
      </button>
      <PillTabs
        size="sm"
        ariaLabel="Idea length"
        options={LENGTHS}
        value={length}
        onChange={(v) => setLength(v as Length)}
        className="mx-3"
      />
      {error && <p className="px-3 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
