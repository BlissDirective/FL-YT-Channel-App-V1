"use client";

import { useOptimistic, useTransition } from "react";
import { setKillSwitchAction } from "@/lib/actions/pipeline";
import { ToggleRow } from "@/components/ui/toggle-row";

export function KillSwitch({ enabled }: { enabled: boolean }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled);

  return (
    <ToggleRow
      label="Global kill switch"
      description="Pauses every pipeline immediately. Videos hold their place and resume when turned off."
      checked={optimistic}
      onChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          await setKillSwitchAction(next);
        })
      }
    />
  );
}
