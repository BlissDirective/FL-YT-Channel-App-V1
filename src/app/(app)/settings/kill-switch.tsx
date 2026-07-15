"use client";

import { useState, useOptimistic, useTransition } from "react";
import { setKillSwitchAction } from "@/lib/actions/pipeline";
import { ToggleRow } from "@/components/ui/toggle-row";

export function KillSwitch({ enabled }: { enabled: boolean }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ToggleRow
        label="Global kill switch"
        description="Pauses every pipeline immediately. Videos hold their place and resume when turned off."
        checked={optimistic}
        onChange={(next) =>
          startTransition(async () => {
            setOptimistic(next);
            setError(null);
            const res = await setKillSwitchAction(next).catch(() => ({
              ok: false as const,
            }));
            // On failure the optimistic value reverts to the server prop when
            // the transition settles; say so instead of lying silently.
            if (!res.ok) setError("Couldn't update the kill switch — try again.");
          })
        }
      />
      {error ? (
        <p className="mt-2 text-xs font-medium text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
