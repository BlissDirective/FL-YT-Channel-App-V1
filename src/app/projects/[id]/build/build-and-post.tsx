"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Loader2,
  Rocket,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { startBuildRunAction } from "@/lib/actions/pipeline";
import { estimateBuildRunAction, getBuildDefaultsAction } from "@/lib/actions/build";
import type { BuildCostEstimate, ChannelPlaybook } from "@/lib/pipeline/engine";

type IdeaOption = { id: string; title: string; angle: string };
type Kind = "long" | "short";
type Tier = "base" | "economy" | "premium" | "platinum";
type ScheduleMode = "all_at_once" | "multi_day" | "staggered";

const TIERS: { id: Tier; label: string; blurb: string }[] = [
  { id: "base", label: "Base", blurb: "Stills + stock + Ken Burns — no AI video (free)" },
  { id: "economy", label: "Economy", blurb: "A few Seedance Fast accents (≤3); rest stills/stock" },
  { id: "premium", label: "Premium", blurb: "Hero bookends + Seedance b-roll (~1/min)" },
  { id: "platinum", label: "Platinum", blurb: "Kling hero bookends + Seedance 2.0 b-roll" },
];

const THUMB_STYLES: { id: string; label: string }[] = [
  { id: "bold-bottom", label: "Bold-bottom" },
  { id: "center-punch", label: "Center-punch" },
  { id: "top-kicker", label: "Top-kicker" },
];

const SHORT_OPTS = [30, 60, 120, 180] as const;
const SHORT_LABEL: Record<number, string> = { 30: "30s", 60: "60s", 120: "2m", 180: "3m" };

/** Project-home "Build & Post" launcher: one config → 1–6 fully-automatic
    videos (idea → script → assets → render → scheduled auto-publish). */
export function BuildAndPost({
  projectId,
  ideas,
}: {
  projectId: string;
  ideas: IdeaOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.02]"
      >
        <Rocket className="size-4" /> Build &amp; Post
      </button>
      {open && <BuildModal projectId={projectId} ideas={ideas} onClose={() => setOpen(false)} />}
    </>
  );
}

function BuildModal({
  projectId,
  ideas,
  onClose,
}: {
  projectId: string;
  ideas: IdeaOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [count, setCount] = useState(3);
  const [ideaSource, setIdeaSource] = useState<"research" | "existing">(
    ideas.length > 0 ? "existing" : "research",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [kind, setKind] = useState<Kind>("long");
  const [longMinMin, setLongMinMin] = useState(2); // minutes
  const [longMaxMin, setLongMaxMin] = useState(4);
  const [shortMin, setShortMin] = useState<number>(30);
  const [shortMax, setShortMax] = useState<number>(60);
  const [thumbStyle, setThumbStyle] = useState("bold-bottom");
  const [tier, setTier] = useState<Tier>("economy");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("staggered");
  const [perDay, setPerDay] = useState(2);
  const [error, setError] = useState<string>();
  const [estimate, setEstimate] = useState<BuildCostEstimate>();
  const [playbook, setPlaybook] = useState<ChannelPlaybook>();
  const [estimating, startEstimate] = useTransition();
  const [launching, startLaunch] = useTransition();

  const lengthMinSec = kind === "long" ? longMinMin * 60 : shortMin;
  const lengthMaxSec = kind === "long" ? longMaxMin * 60 : shortMax;

  const config = useMemo(
    () => ({
      count,
      kind,
      lengthMinSec,
      lengthMaxSec,
      tier,
      thumbStyle,
      ideaSource,
      ideaIds: ideaSource === "existing" ? selected : undefined,
      scheduleMode,
      scheduleCfg: scheduleMode === "staggered" ? { perDay } : {},
    }),
    [count, kind, lengthMinSec, lengthMaxSec, tier, thumbStyle, ideaSource, selected, scheduleMode, perDay],
  );

  // Suggested defaults (performance playbook) on first open.
  useEffect(() => {
    getBuildDefaultsAction(projectId).then((r) => {
      if (r.ok && r.playbook) {
        setPlaybook(r.playbook);
        if (r.playbook.suggestKind) setKind(r.playbook.suggestKind);
      }
    });
  }, [projectId]);

  // Live cost estimate, debounced on config change.
  useEffect(() => {
    const t = setTimeout(() => {
      startEstimate(async () => {
        const r = await estimateBuildRunAction(projectId, config);
        if (r.ok) {
          setEstimate(r.estimate);
          if (r.playbook) setPlaybook(r.playbook);
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [projectId, config]);

  const toggleIdea = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(0, count)));

  const canLaunch =
    !launching &&
    !(ideaSource === "existing" && selected.length === 0) &&
    !(estimate?.overCap ?? false);

  const launch = () =>
    startLaunch(async () => {
      setError(undefined);
      const r = await startBuildRunAction(projectId, config);
      if (!r.ok) setError(r.error);
      else {
        onClose();
        router.refresh();
      }
    });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-ink text-white">
              <Rocket className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold leading-tight">Build &amp; Post</h2>
              <p className="text-xs text-muted">
                One config → fully-automatic videos, QC-gated and auto-published.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        {playbook && (
          <p className="mb-4 rounded-xl bg-canvas px-3 py-2 text-xs text-muted">
            <Sparkles className="mr-1 inline size-3.5 text-lavender" />
            {playbook.note}
          </p>
        )}

        <div className="space-y-5">
          {/* How many */}
          <Field label="How many videos">
            <div className="inline-flex rounded-full border border-line bg-card p-0.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pill key={n} active={count === n} onClick={() => setCount(n)}>
                  {n}
                </Pill>
              ))}
            </div>
          </Field>

          {/* Ideas */}
          <Field label="Ideas">
            <div className="inline-flex rounded-full border border-line bg-card p-0.5">
              <Pill active={ideaSource === "existing"} onClick={() => setIdeaSource("existing")}>
                Use my ideas
              </Pill>
              <Pill active={ideaSource === "research"} onClick={() => setIdeaSource("research")}>
                Research new
              </Pill>
            </div>
            {ideaSource === "existing" &&
              (ideas.length === 0 ? (
                <p className="mt-2 text-xs text-coral">
                  No ideas yet — switch to “Research new”, or generate ideas first.
                </p>
              ) : (
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-1">
                  {ideas.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggleIdea(i.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                        selected.includes(i.id) ? "bg-accent-soft" : "hover:bg-canvas"
                      }`}
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded border ${
                          selected.includes(i.id)
                            ? "border-ink bg-ink text-white"
                            : "border-line"
                        }`}
                      >
                        {selected.includes(i.id) && "✓"}
                      </span>
                      <span className="truncate">{i.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            {ideaSource === "research" && (
              <p className="mt-2 text-xs text-muted">
                Claude researches {count} fresh idea{count === 1 ? "" : "s"}, deduped against
                your prior videos{playbook && !playbook.coldStart ? " and ranked by what's working" : ""}.
              </p>
            )}
          </Field>

          {/* Type + length */}
          <Field label="Type & length">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-line bg-card p-0.5">
                <Pill active={kind === "long"} onClick={() => setKind("long")}>
                  <Clapperboard className="mr-1 inline size-3.5" /> Long
                </Pill>
                <Pill active={kind === "short"} onClick={() => setKind("short")}>
                  <Smartphone className="mr-1 inline size-3.5" /> Short
                </Pill>
              </div>
              {kind === "long" ? (
                <div className="flex items-center gap-1 text-sm">
                  <MinNum value={longMinMin} set={(n) => setLongMinMin(Math.min(n, longMaxMin))} />
                  <span className="text-muted">–</span>
                  <MinNum value={longMaxMin} set={(n) => setLongMaxMin(Math.max(n, longMinMin))} />
                  <span className="text-muted">min</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <SelectSec value={shortMin} set={(n) => setShortMin(Math.min(n, shortMax))} />
                  <span className="text-muted">–</span>
                  <SelectSec value={shortMax} set={(n) => setShortMax(Math.max(n, shortMin))} />
                </div>
              )}
            </div>
          </Field>

          {/* Thumbnail style */}
          <Field label="Thumbnail style">
            <div className="inline-flex flex-wrap gap-1">
              {THUMB_STYLES.map((s) => (
                <Pill key={s.id} active={thumbStyle === s.id} onClick={() => setThumbStyle(s.id)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </Field>

          {/* Tier */}
          <Field label="Quality tier">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    tier === t.id ? "border-ink bg-accent-soft" : "border-line hover:bg-canvas"
                  }`}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] leading-tight text-muted">{t.blurb}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Schedule */}
          <Field label="Publishing schedule">
            <div className="inline-flex flex-wrap rounded-full border border-line bg-card p-0.5">
              <Pill active={scheduleMode === "all_at_once"} onClick={() => setScheduleMode("all_at_once")}>
                All at once
              </Pill>
              <Pill active={scheduleMode === "multi_day"} onClick={() => setScheduleMode("multi_day")}>
                One a day
              </Pill>
              <Pill active={scheduleMode === "staggered"} onClick={() => setScheduleMode("staggered")}>
                Staggered
              </Pill>
            </div>
            {scheduleMode === "staggered" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted">Per day:</span>
                <div className="inline-flex rounded-full border border-line bg-card p-0.5">
                  {[1, 2, 3].map((n) => (
                    <Pill key={n} active={perDay === n} onClick={() => setPerDay(n)}>
                      {n}
                    </Pill>
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {perDay === 1 ? "2 PM CT" : perDay === 2 ? "10 AM + 2 PM CT" : "9 AM + 1 PM + 6 PM CT"}
                </span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-muted">
              {scheduleMode === "all_at_once"
                ? "Each video posts as soon as its cut passes final QC."
                : "Posts at 2 PM America/Chicago (DST-aware). Privacy is QC-tied: ≥8.0 Public · 7.0–8.0 Unlisted · <7.0 Held."}
            </p>
          </Field>
        </div>

        {/* Footer: cost + launch */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="text-sm">
            {estimating && !estimate ? (
              <span className="text-muted">Estimating…</span>
            ) : estimate ? (
              <>
                <span className="font-semibold">~${estimate.batchUsd.toFixed(2)}</span>
                <span className="text-muted"> for {count} ({" "}
                  ${estimate.perVideoUsd.toFixed(2)}/video) ·{" "}
                  ${estimate.capRemainingUsd.toFixed(2)} of ${estimate.capUsd} left this month
                </span>
                {estimate.overCap && (
                  <div className="text-xs font-medium text-coral">
                    Over the monthly cap — lower the tier, count, or length.
                  </div>
                )}
              </>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
          <button
            type="button"
            disabled={!canLaunch}
            onClick={launch}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {launching ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Launch run
          </button>
        </div>
        {error && <p className="mt-2 text-right text-xs font-medium text-coral">{error}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-accent text-ink" : "text-muted hover:text-ink"
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function MinNum({ value, set }: { value: number; set: (n: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      max={20}
      value={value}
      onChange={(e) => set(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
      className="w-14 rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-accent"
    />
  );
}

function SelectSec({ value, set }: { value: number; set: (n: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => set(Number(e.target.value))}
      className="rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-accent"
    >
      {SHORT_OPTS.map((s) => (
        <option key={s} value={s}>
          {SHORT_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
