"use client";

import { useActionState, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  deleteProject,
  updateProject,
  type ProjectResult,
} from "@/lib/actions/projects";
import type { Project } from "@/lib/db/types";
import { cn } from "@/lib/cn";

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

export function SettingsForm({ project }: { project: Project }) {
  const [state, action, pending] = useActionState(updateProject, INITIAL);
  const [saved, setSaved] = useState(false);
  const [autonomy, setAutonomy] = useState<Record<string, string>>({
    ...project.autonomy,
  });
  const [status, setStatus] = useState(project.status);

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
