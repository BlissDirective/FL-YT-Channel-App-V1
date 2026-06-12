"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Play, Trash2 } from "lucide-react";
import {
  deleteProject,
  updateProject,
  type ProjectResult,
} from "@/lib/actions/projects";
import type { Voice } from "@/lib/adapters/voice";
import type { Project } from "@/lib/db/types";
import { cn } from "@/lib/cn";

const PROVIDER_LABELS: Record<string, string> = {
  elevenlabs: "ElevenLabs — premium",
  kokoro: "Kokoro — volume tier (~5× cheaper)",
  mock: "Sample voices (no synthesis)",
};

const TONES = ["authoritative", "curious", "alarming", "calm", "aspirational"];
const GATES = [
  { key: "IDEA", label: "Idea selection" },
  { key: "SCRIPT", label: "Script review" },
  { key: "ASSETS", label: "Asset review" },
  { key: "FINAL", label: "Final render" },
];
const AUTONOMY_MODES = [
  { value: "assist", label: "Assist" },
  { value: "copilot", label: "Co-pilot" },
  { value: "autopilot", label: "Autopilot" },
];

const INITIAL: ProjectResult = {};

export function SettingsForm({
  project,
  voices,
}: {
  project: Project;
  voices: Voice[];
}) {
  const [state, action, pending] = useActionState(updateProject, INITIAL);
  const [saved, setSaved] = useState(false);
  const [autonomy, setAutonomy] = useState<Record<string, string>>({
    ...project.autonomy,
  });
  const [status, setStatus] = useState(project.status);
  const [voiceId, setVoiceId] = useState(project.voice_id ?? voices[0]?.id ?? "");
  const selectedVoice = voices.find((v) => v.id === voiceId);
  const providers = [...new Set(voices.map((v) => v.provider))];

  return (
    <div className="space-y-6">
      <form
        action={async (fd) => {
          await action(fd);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }}
        className="space-y-5 rounded-card bg-card p-6 shadow-card"
      >
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="brand_primary" value={project.brand_kit.primary} />
        <input
          type="hidden"
          name="brand_secondary"
          value={project.brand_kit.secondary}
        />
        <input
          type="hidden"
          name="thumbnail_style"
          value={project.brand_kit.thumbnailStyle}
        />
        {GATES.map((g) => (
          <input
            key={g.key}
            type="hidden"
            name={`autonomy_${g.key}`}
            value={autonomy[g.key]}
          />
        ))}

        <Field label="Project name">
          <input name="name" defaultValue={project.name} className="input" />
        </Field>
        <Field label="Niche">
          <input name="niche" defaultValue={project.niche} className="input" />
        </Field>
        <Field label="Audience">
          <textarea
            name="audience"
            rows={2}
            defaultValue={project.audience}
            className="input"
          />
        </Field>
        <Field label="Content angle">
          <input name="angle" defaultValue={project.angle} className="input" />
        </Field>
        <Field label="Tone">
          <select name="tone" defaultValue={project.tone} className="input">
            {TONES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </Field>

        <input type="hidden" name="voice_id" value={voiceId} />
        <input type="hidden" name="voice_name" value={selectedVoice?.name ?? ""} />
        <Field label="Channel voice">
          <div className="flex items-center gap-2">
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="input flex-1"
            >
              {!voices.some((v) => v.id === voiceId) && voiceId && (
                <option value={voiceId}>
                  {project.voice_name ?? voiceId} (current)
                </option>
              )}
              {providers.map((p) => (
                <optgroup key={p} label={PROVIDER_LABELS[p] ?? p}>
                  {voices
                    .filter((v) => v.provider === p)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.description}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {selectedVoice?.previewUrl && (
              <VoicePreview url={selectedVoice.previewUrl} />
            )}
          </div>
          {selectedVoice?.provider === "kokoro" && (
            <p className="mt-1 text-xs text-muted">
              Volume tier: ~$0.15 per 8-min video via fal.ai. Word-sync
              timings are estimated rather than exact.
            </p>
          )}
        </Field>

        <Field label="Status">
          <div className="flex gap-1 rounded-full bg-canvas p-1">
            {["active", "paused"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s as Project["status"])}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  status === s ? "bg-card text-ink shadow-card" : "text-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Autonomy per gate">
          <div className="space-y-2">
            {GATES.map((g) => (
              <div
                key={g.key}
                className="flex flex-col gap-2 rounded-card bg-card-warm p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium">{g.label}</span>
                <div className="flex gap-1 rounded-full bg-canvas p-1">
                  {AUTONOMY_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() =>
                        setAutonomy((a) => ({ ...a, [g.key]: m.value }))
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        autonomy[g.key] === m.value
                          ? "bg-card text-ink shadow-card"
                          : "text-muted hover:text-ink",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget per video (USD)">
            <input
              name="budget_per_video"
              type="number"
              min={1}
              defaultValue={project.budget.perVideoUsd}
              className="input"
            />
          </Field>
          <Field label="Monthly budget (USD)">
            <input
              name="budget_monthly"
              type="number"
              min={1}
              defaultValue={project.budget.monthlyUsd}
              className="input"
            />
          </Field>
        </div>

        {state.error && (
          <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm font-medium text-success">
              <Check className="size-4" /> Saved
            </span>
          )}
        </div>
      </form>

      <form
        action={deleteProject}
        className="rounded-card border border-coral/30 bg-card p-6 shadow-card"
      >
        <input type="hidden" name="id" value={project.id} />
        <h3 className="text-sm font-semibold text-coral">Danger zone</h3>
        <p className="mt-1 text-sm text-muted">
          Deleting a project removes all its videos, scripts, and assets. This
          cannot be undone.
        </p>
        <button
          type="submit"
          className="mt-4 flex items-center gap-2 rounded-full bg-coral/10 px-5 py-2.5 text-sm font-semibold text-coral transition-colors hover:bg-coral/20"
        >
          <Trash2 className="size-4" /> Delete project
        </button>
      </form>
    </div>
  );
}

function VoicePreview({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  return (
    <>
      <audio ref={ref} src={url} preload="none" />
      <button
        type="button"
        aria-label="Play voice preview"
        onClick={() => ref.current?.play()}
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-card-warm text-ink shadow-card hover:bg-accent"
      >
        <Play className="size-4" />
      </button>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
