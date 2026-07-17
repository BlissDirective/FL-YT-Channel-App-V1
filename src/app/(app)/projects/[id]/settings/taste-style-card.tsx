"use client";

import { useState, useTransition } from "react";
import { Palette, Plus, X } from "lucide-react";
import {
  DEFAULT_TASTE_PROFILE,
  STYLE_PLAYBOOKS,
  type TasteDial,
  type TasteProfile,
} from "@studio/core";
import { saveTasteProfile } from "@/lib/actions/taste";
import { cn } from "@/lib/cn";

/**
 * Taste & Style card (Batch 4: #13 taste dials, A6 anti-patterns panel, #16
 * playbook picker). The dials + editable "never do this" list become a taste
 * contract every downstream stage/critic reads; a playbook seeds a per-niche
 * look. Dark/on-brand.
 */

const DIALS: { key: keyof Pick<TasteProfile, "designRead" | "visualVariance" | "motionIntensity" | "informationDensity">; label: string; lo: string; hi: string }[] = [
  { key: "designRead", label: "Design read", lo: "Raw", hi: "Art-directed" },
  { key: "visualVariance", label: "Visual variance", lo: "Uniform", hi: "Eclectic" },
  { key: "motionIntensity", label: "Motion intensity", lo: "Still", hi: "Kinetic" },
  { key: "informationDensity", label: "Info density", lo: "Sparse", hi: "Packed" },
];

export function TasteStyleCard({
  projectId,
  initial,
  initialPlaybook,
}: {
  projectId: string;
  initial: TasteProfile | null;
  initialPlaybook: string | null;
}) {
  const [profile, setProfile] = useState<TasteProfile>(initial ?? DEFAULT_TASTE_PROFILE);
  const [playbook, setPlaybook] = useState<string | null>(initialPlaybook);
  const [newAnti, setNewAnti] = useState("");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const setDial = (key: (typeof DIALS)[number]["key"], v: TasteDial) =>
    setProfile((p) => ({ ...p, [key]: v }));

  const addAnti = () => {
    const t = newAnti.trim();
    if (!t) return;
    setProfile((p) => ({ ...p, antiPatterns: [...p.antiPatterns, t] }));
    setNewAnti("");
  };
  const removeAnti = (i: number) =>
    setProfile((p) => ({ ...p, antiPatterns: p.antiPatterns.filter((_, idx) => idx !== i) }));

  const save = () =>
    start(async () => {
      await saveTasteProfile(projectId, profile, playbook);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });

  return (
    <div className="space-y-5 rounded-card border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
          <Palette className="size-4" />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Taste & style</h2>
          <p className="text-xs text-muted">Carried through every stage — the critics enforce it</p>
        </div>
      </div>

      {/* Playbook picker */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Style playbook</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {STYLE_PLAYBOOKS.map((pb) => (
            <button
              key={pb.id}
              type="button"
              onClick={() => setPlaybook(playbook === pb.id ? null : pb.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                playbook === pb.id ? "border-accent/50 bg-accent/[0.07]" : "border-line bg-card-warm hover:border-accent/30",
              )}
            >
              <div className="flex items-center gap-1.5">
                {pb.palette.slice(0, 4).map((c) => (
                  <span key={c} className="size-3 rounded-full ring-1 ring-white/10" style={{ background: c }} />
                ))}
              </div>
              <p className="mt-2 text-sm font-semibold">{pb.label}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">{pb.niche}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Taste dials */}
      <div className="grid gap-3 sm:grid-cols-2">
        {DIALS.map((d) => (
          <div key={d.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold">{d.label}</span>
              <span className="tabular-nums text-muted">{profile[d.key]}/4</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDial(d.key, v as TasteDial)}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    v <= profile[d.key] ? "bg-accent" : "bg-raised hover:bg-accent/30",
                  )}
                  aria-label={`${d.label} ${v}`}
                />
              ))}
            </div>
            <div className="mt-0.5 flex justify-between text-[9px] uppercase tracking-wide text-muted/70">
              <span>{d.lo}</span>
              <span>{d.hi}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Anti-patterns (A6) */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Never do this (hard constraints)</p>
        <ul className="space-y-1.5">
          {profile.antiPatterns.map((a, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-card-warm px-3 py-1.5 text-xs">
              <span className="flex-1 text-ink">{a}</span>
              <button type="button" onClick={() => removeAnti(i)} className="text-muted hover:text-coral" aria-label="Remove">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            value={newAnti}
            onChange={(e) => setNewAnti(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAnti())}
            placeholder="e.g. No hard cuts on the hook"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={addAnti}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-card-warm text-ink hover:bg-accent-soft"
            aria-label="Add anti-pattern"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-success">Saved</span>}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save taste profile"}
        </button>
      </div>
    </div>
  );
}
