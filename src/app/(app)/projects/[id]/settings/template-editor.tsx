"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { saveTemplateAction } from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

/** Per-project script prompt template — every save creates a new active
    version, so changes are revertible from the database. */
export function TemplateEditor({
  projectId,
  initialBody,
  version,
  defaultBody,
}: {
  projectId: string;
  initialBody: string;
  version: number;
  defaultBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const save = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await saveTemplateAction(projectId, "script", body);
      if (!r.ok) setError(r.error);
      else setSaved(true);
    });

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <CardTitle>Script prompt template</CardTitle>
        {version > 0 && <StatusChip tone="lavender">v{version}</StatusChip>}
      </div>
      <p className="mb-3 text-sm text-muted">
        This is the brief Claude follows when writing scripts for this
        project. Placeholders like{" "}
        <code className="rounded bg-canvas px-1">{"{{topic}}"}</code> are
        filled automatically. Saving creates a new version.
      </p>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaved(false);
        }}
        rows={14}
        className="w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-accent"
      />
      {error && <p className="mt-2 text-sm font-medium text-coral">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || body === initialBody}
          onClick={save}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-card disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? "Saved" : "Save new version"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBody(defaultBody);
            setSaved(false);
          }}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-ink"
        >
          <RotateCcw className="size-4" /> Reset to default
        </button>
      </div>
    </Card>
  );
}
