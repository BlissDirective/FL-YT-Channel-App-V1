"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { ToggleRow } from "@/components/ui/toggle-row";
import { setVceFlagsAction } from "@/lib/actions/pipeline";
import type { VceFlags } from "@/lib/pipeline/vce";

/**
 * Visual Craft Engine systems — global on/off per system. Each ships dark and
 * is enabled here once validated. Flags condition how visuals are generated;
 * with all off, generation is byte-identical to pre-VCE.
 */
const SYSTEMS: { key: keyof VceFlags; label: string; description: string }[] = [
  { key: "bible", label: "Visual Bible (V1)", description: "Derive a per-video visual continuity bible from the script and condition every prompt on it — specific subjects, consistent style, no generic cliché." },
  { key: "router", label: "Medium Router (V2)", description: "Plan each beat's cheapest satisfying medium — free motion-graphics/charts for explainers, premium generative video only for hero beats." },
  { key: "refine", label: "Per-Beat Refine (V3)", description: "When a still misses the floor, rewrite the prompt from the critic's specific note and re-roll (cheap-first) instead of a blind retry." },
  { key: "grounding", label: "Grounded Generation (V4)", description: "Seed factual beats (real entities/places/stats) from a licensed reference so they're grounded, not hallucinated." },
  { key: "compositor", label: "Remotion Compositor (V5)", description: "Author programmatic scenes (quote cards, stat tickers, comparisons) and composite captions/callouts over generative clips." },
];

export function VceSystemsCard({ initial }: { initial: VceFlags }) {
  const [flags, setFlags] = useState<VceFlags>(initial);
  const [, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardTitle>Visual Craft Engine</CardTitle>
      <p className="mb-3 text-sm text-muted">
        Turn on each visual system once you&apos;ve validated it. With all off, generation
        is unchanged.
      </p>
      <div className="space-y-2">
        {SYSTEMS.map((s) => (
          <ToggleRow
            key={s.key}
            label={s.label}
            description={s.description}
            checked={flags[s.key]}
            onChange={(next) =>
              startT(async () => {
                setFlags((f) => ({ ...f, [s.key]: next }));
                setError(null);
                const res = await setVceFlagsAction({ [s.key]: next }).catch(() => ({ ok: false as const }));
                if (!res.ok) {
                  setFlags((f) => ({ ...f, [s.key]: !next }));
                  setError(`Couldn't update ${s.label} — try again.`);
                }
              })
            }
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-coral" role="alert">{error}</p>}
    </Card>
  );
}
