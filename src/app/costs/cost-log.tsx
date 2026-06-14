"use client";

import { useMemo, useState } from "react";

export type CostRow = {
  id: string;
  at: string;
  provider: string;
  description: string;
  usd: number;
  projectId: string | null;
  projectName: string;
};

type SortKey =
  | "newest"
  | "oldest"
  | "amount-desc"
  | "amount-asc"
  | "project"
  | "type";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "amount-desc", label: "Amount: high → low" },
  { key: "amount-asc", label: "Amount: low → high" },
  { key: "project", label: "Project (A → Z)" },
  { key: "type", label: "Spend type (A → Z)" },
];

/** Maps a raw provider key to the human spend category it represents, so the
    log reads as "what was this spend for" rather than an opaque vendor name. */
function spendType(provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes("claude") || p.includes("anthropic")) return "Script · Claude";
  if (p.includes("eleven")) return "Voiceover";
  if (p.includes("fal")) return "Video / image gen";
  if (p.includes("pexels") || p.includes("pixabay")) return "Stock footage";
  if (p.includes("youtube")) return "Research / stats";
  if (p.includes("render") || p.includes("remotion")) return "Video render";
  return provider;
}

export function CostLog({
  rows,
  projects,
}: {
  rows: CostRow[];
  projects: { id: string; name: string }[];
}) {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const view = useMemo(() => {
    const filtered =
      projectFilter === "all"
        ? rows
        : projectFilter === "none"
          ? rows.filter((r) => !r.projectId)
          : rows.filter((r) => r.projectId === projectFilter);

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.at.localeCompare(b.at);
        case "amount-desc":
          return b.usd - a.usd;
        case "amount-asc":
          return a.usd - b.usd;
        case "project":
          return (
            a.projectName.localeCompare(b.projectName) || b.at.localeCompare(a.at)
          );
        case "type":
          return (
            spendType(a.provider).localeCompare(spendType(b.provider)) ||
            b.at.localeCompare(a.at)
          );
        case "newest":
        default:
          return b.at.localeCompare(a.at);
      }
    });

    const total = filtered.reduce((s, r) => s + Number(r.usd), 0);
    return { sorted, total, count: filtered.length };
  }, [rows, projectFilter, sort]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Project</span>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="none">Unattributed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-right">
          <p className="text-xl font-bold tabular-nums">
            ${view.total.toFixed(2)}
          </p>
          <p className="text-xs text-muted">
            {view.count} {view.count === 1 ? "entry" : "entries"} shown
          </p>
        </div>
      </div>

      {/* Log */}
      {view.sorted.length === 0 ? (
        <p className="rounded-card bg-card p-5 text-sm text-muted shadow-card">
          No spend recorded for this filter yet. Every provider call and render
          cost is written here as it happens.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-card bg-card px-5 shadow-card">
          {view.sorted.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.description}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                  <span className="font-medium text-ink/70">{r.projectName}</span>
                  <span aria-hidden>·</span>
                  <span>{spendType(r.provider)}</span>
                  <span aria-hidden>·</span>
                  <span>{new Date(r.at).toLocaleString()}</span>
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                ${Number(r.usd).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
