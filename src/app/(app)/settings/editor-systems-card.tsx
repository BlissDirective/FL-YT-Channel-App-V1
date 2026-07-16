"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { ToggleRow } from "@/components/ui/toggle-row";
import { setEditorFlagsAction } from "@/lib/actions/editor";
import type { EditorFlags } from "@/lib/pipeline/editor-flags";

/**
 * Editor & Assembly systems — global on/off per system. Each ships dark and is
 * enabled here once validated. With all off, the editor behaves as before this
 * revision.
 */
const SYSTEMS: { key: keyof EditorFlags; label: string; description: string }[] = [
  { key: "assembly", label: "Assembly / Storyboard (R2)", description: "A granular pre-render planner: split beats into segments, assign each a medium + motion, compose still-sequences, and see live cost. Adds an Assembly link on the video page." },
  { key: "proEditor", label: "Pro editor timeline (R4)", description: "Frame-accurate preview scrubbing, snapping, waveforms, markers, ripple trim, and local undo/redo on the /edit timeline." },
  { key: "keyframes", label: "Keyframe editor (R5)", description: "Arbitrary Ken-Burns / speed-ramp keyframe editing per clip, beyond the motion presets." },
  { key: "segmentAgent", label: "Planning agent (R3)", description: "Let the MVDA propose the segment plan and edits as a reviewable diff on the Assembly screen." },
];

export function EditorSystemsCard({ initial }: { initial: EditorFlags }) {
  const [flags, setFlags] = useState<EditorFlags>(initial);
  const [, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardTitle>Editor &amp; Assembly</CardTitle>
      <p className="mb-3 text-sm text-muted">
        Turn on each editing system once you&apos;ve validated it. With all off, the editor is unchanged.
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
                const res = await setEditorFlagsAction({ [s.key]: next }).catch(() => ({ ok: false as const }));
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
