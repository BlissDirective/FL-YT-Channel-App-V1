"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dices, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { rerollStickSceneAction, setStickSceneAction } from "@/lib/actions/pipeline";
import { STICK_ACTIONS, STICK_MOODS, STICK_SETTINGS } from "@/lib/stick-types";

export type StickSceneRow = {
  beatIdx: number;
  text: string;
  action: string;
  setting: string;
  mood: string;
};

export function StickScenesEditor({
  projectId,
  videoId,
  scenes,
}: {
  projectId: string;
  videoId: string;
  scenes: StickSceneRow[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold leading-tight">Stick scenes</h2>
        <p className="text-xs text-muted">
          Each beat is choreographed into a stick-figure scene. Tweak the action,
          setting, or mood — or re-roll a beat for a fresh take. Changes apply on
          the next render.
        </p>
      </div>
      <Card className="divide-y divide-line p-0">
        {scenes.map((s) => (
          <SceneRow key={s.beatIdx} projectId={projectId} videoId={videoId} scene={s} />
        ))}
      </Card>
    </div>
  );
}

function SceneRow({
  projectId,
  videoId,
  scene,
}: {
  projectId: string;
  videoId: string;
  scene: StickSceneRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const patch = (p: { action?: string; setting?: string; mood?: string }) =>
    startTransition(async () => {
      setError(undefined);
      const r = await setStickSceneAction(projectId, videoId, scene.beatIdx, p);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const reroll = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await rerollStickSceneAction(projectId, videoId, scene.beatIdx);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-accent-soft text-[11px] font-bold text-ink">
          {scene.beatIdx + 1}
        </span>
        <p className="line-clamp-2 flex-1 text-sm text-ink/90">{scene.text}</p>
        <button
          type="button"
          disabled={isPending}
          onClick={reroll}
          title="Re-choreograph this beat"
          className="inline-flex items-center gap-1.5 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-ink shadow-card hover:bg-accent-soft disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Dices className="size-3.5" />}
          Re-roll
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 pl-8">
        <Select label="Action" value={scene.action} options={STICK_ACTIONS} onChange={(v) => patch({ action: v })} disabled={isPending} />
        <Select label="Setting" value={scene.setting} options={STICK_SETTINGS} onChange={(v) => patch({ setting: v })} disabled={isPending} />
        <Select label="Mood" value={scene.mood} options={["none", ...STICK_MOODS]} onChange={(v) => patch({ mood: v })} disabled={isPending} />
      </div>
      {error && <p className="pl-8 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs capitalize outline-none focus:border-accent disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">{o}</option>
        ))}
      </select>
    </label>
  );
}
