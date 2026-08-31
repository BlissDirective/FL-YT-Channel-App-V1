"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { deriveVariantsAction } from "@/lib/actions/variants";

/**
 * Fan the approved creative out into hook A/B variants — same offer and body,
 * a different first-3-seconds hook per variant, so the feed decides which angle
 * wins. Reuses the parent's paid VO/visuals for every beat but the hook.
 */
export function DeriveVariants({
  projectId,
  parentVideoId,
  defaultMax = 3,
}: {
  projectId: string;
  parentVideoId: string;
  defaultMax?: number;
}) {
  const [max, setMax] = useState(defaultMax);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [error, setError] = useState<string>();

  const derive = () =>
    startTransition(async () => {
      setMsg(undefined);
      setError(undefined);
      const r = await deriveVariantsAction(projectId, parentVideoId, { max });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMsg(`Staged ${r.count} hook variant${r.count === 1 ? "" : "s"} — each reuses this creative's assets except the hook.`);
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-2xl bg-lavender/15 text-lavender">
          <Copy className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Test hook variants</h2>
          <p className="text-xs text-muted">
            Spin up A/B hook variants from this creative — same offer and body,
            a different opener each. Only the hook is regenerated, so the rest of
            the spend is reused.
          </p>
        </div>
      </div>

      <Card className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total variants
          </span>
          <input
            type="number"
            min={2}
            max={6}
            value={max}
            onChange={(e) => setMax(Math.max(2, Math.min(6, Number(e.target.value) || 2)))}
            className="w-20 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={derive}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
          Make variants
        </button>
        {msg && <p className="w-full text-sm font-medium text-lavender">{msg}</p>}
        {error && <p className="w-full text-sm font-medium text-coral">{error}</p>}
      </Card>
    </div>
  );
}
