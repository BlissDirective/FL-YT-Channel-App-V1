"use client";

import { useActionState, useRef, useState } from "react";
import {
  Check,
  Mic,
  Palette,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import { createProject, type ProjectResult } from "@/lib/actions/projects";
import type { Voice } from "@/lib/adapters/voice";
import { cn } from "@/lib/cn";

const STEPS = [
  { key: "niche", label: "Niche", icon: Target },
  { key: "brand", label: "Brand", icon: Palette },
  { key: "voice", label: "Voice", icon: Mic },
  { key: "settings", label: "Autonomy", icon: Settings2 },
] as const;

const TONES = ["authoritative", "curious", "alarming", "calm", "aspirational"];
const THUMB_STYLES = ["cinematic", "bold-text", "conceptual", "dramatic"];
const PALETTES = [
  { primary: "#F5B829", secondary: "#17150F", name: "Amber" },
  { primary: "#F0876C", secondary: "#2A1A14", name: "Coral" },
  { primary: "#A78BFA", secondary: "#1A1726", name: "Lavender" },
  { primary: "#5BB98C", secondary: "#0F1F18", name: "Emerald" },
];
const GATES = [
  { key: "IDEA", label: "Idea selection" },
  { key: "SCRIPT", label: "Script review" },
  { key: "ASSETS", label: "Asset review" },
  { key: "FINAL", label: "Final render" },
];
const AUTONOMY_MODES = [
  { value: "assist", label: "Assist", hint: "Always ask me" },
  { value: "copilot", label: "Co-pilot", hint: "Auto-approve high confidence" },
  { value: "autopilot", label: "Autopilot", hint: "Never ask" },
];

const INITIAL: ProjectResult = {};

export function ProjectWizard({ voices }: { voices: Voice[] }) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(createProject, INITIAL);

  const [palette, setPalette] = useState(PALETTES[0]);
  const [voiceId, setVoiceId] = useState(voices[0]?.id ?? "");
  const [pipelineMode, setPipelineMode] = useState<"autonomous" | "director">("autonomous");
  const [autonomy, setAutonomy] = useState<Record<string, string>>({
    IDEA: "assist",
    SCRIPT: "assist",
    ASSETS: "assist",
    FINAL: "assist",
  });

  const selectedVoice = voices.find((v) => v.id === voiceId);
  const isLast = step === STEPS.length - 1;

  return (
    <form action={action} className="space-y-6">
      {/* Hidden fields carry controlled state into the server action */}
      <input type="hidden" name="brand_primary" value={palette.primary} />
      <input type="hidden" name="brand_secondary" value={palette.secondary} />
      <input type="hidden" name="voice_id" value={voiceId} />
      <input type="hidden" name="voice_name" value={selectedVoice?.name ?? ""} />
      <input type="hidden" name="pipeline_mode" value={pipelineMode} />
      {GATES.map((g) => (
        <input
          key={g.key}
          type="hidden"
          name={`autonomy_${g.key}`}
          value={autonomy[g.key]}
        />
      ))}

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-2xl transition-colors",
                    active && "bg-accent text-on-accent",
                    done && "bg-raised text-accent",
                    !active && !done && "bg-card-warm text-muted",
                  )}
                >
                  {done ? <Check className="size-5" /> : <Icon className="size-5" />}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="mx-2 h-px flex-1 bg-line" />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-card bg-card p-6 shadow-card">
        {/* Step 1 — Niche */}
        <div className={cn("space-y-4", step !== 0 && "hidden")}>
          <Field label="Project name" required>
            <input
              name="name"
              required
              placeholder="e.g. Money Mindset"
              className="input"
            />
          </Field>
          <Field label="Niche">
            <input name="niche" placeholder="e.g. Personal Finance" className="input" />
          </Field>
          <Field label="Audience" hint="Who is this channel for?">
            <textarea
              name="audience"
              rows={2}
              placeholder="Young professionals who want to build wealth but struggle with consistency"
              className="input"
            />
          </Field>
          <Field label="Content angle" hint="The POV this channel owns">
            <input
              name="angle"
              placeholder="Psychology-first money education with story-driven hooks"
              className="input"
            />
          </Field>
          <Field label="Tone">
            <div className="flex flex-wrap gap-2">
              {TONES.map((t, i) => (
                <label key={t} className="cursor-pointer">
                  <input
                    type="radio"
                    name="tone"
                    value={t}
                    defaultChecked={i === 0}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full bg-card-warm px-3.5 py-1.5 text-sm font-medium capitalize text-muted peer-checked:bg-accent peer-checked:text-ink">
                    {t}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* Step 2 — Brand */}
        <div className={cn("space-y-5", step !== 1 && "hidden")}>
          <Field label="Color palette">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PALETTES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPalette(p)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-card border-2 p-3 transition-colors",
                    palette.name === p.name
                      ? "border-ink"
                      : "border-transparent bg-card-warm",
                  )}
                >
                  <span className="flex gap-1">
                    <span
                      className="size-7 rounded-full"
                      style={{ background: p.primary }}
                    />
                    <span
                      className="size-7 rounded-full"
                      style={{ background: p.secondary }}
                    />
                  </span>
                  <span className="text-xs font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Live thumbnail preview */}
          <Field label="Preview" hint="How thumbnails will feel">
            <div
              className="flex aspect-video w-full max-w-xs items-end rounded-card p-4 shadow-card"
              style={{
                background: `linear-gradient(135deg, ${palette.secondary}, ${palette.primary})`,
              }}
            >
              <span
                className="rounded-lg px-3 py-1.5 text-lg font-bold"
                style={{ background: palette.primary, color: palette.secondary }}
              >
                YOUR HOOK HERE
              </span>
            </div>
          </Field>

          <Field label="Thumbnail style">
            <select name="thumbnail_style" className="input" defaultValue="cinematic">
              {THUMB_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Step 3 — Voice */}
        <div className={cn("space-y-3", step !== 2 && "hidden")}>
          <p className="text-sm text-muted">
            {voices.some((v) => v.previewUrl)
              ? "Pick a channel voice from your ElevenLabs library — tap ▶ to hear a preview."
              : "Pick a channel voice. These are sample voices — your real ElevenLabs library appears here once the voice API key is connected."}
          </p>
          <div role="radiogroup" aria-label="Channel voice" className="space-y-3">
          {voices.map((v) => (
            <div
              key={v.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-card p-4 transition-colors",
                voiceId === v.id ? "bg-accent-soft" : "bg-card-warm hover:bg-accent-soft/50",
              )}
            >
              {v.previewUrl ? (
                <VoicePreviewButton url={v.previewUrl} />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-ink shadow-card">
                  <Mic className="size-4" />
                </span>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={voiceId === v.id}
                onClick={() => setVoiceId(v.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {v.name}
                    {v.provider !== "mock" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          v.provider === "kokoro"
                            ? "bg-success/15 text-success"
                            : "bg-accent-soft text-ink",
                        )}
                      >
                        {v.provider === "kokoro" ? "volume · ~5× cheaper" : "premium"}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">{v.description}</span>
                </span>
                {voiceId === v.id && <Check className="size-5 shrink-0 text-ink" />}
              </button>
            </div>
          ))}
          </div>
        </div>

        {/* Step 4 — Autonomy & budget */}
        <div className={cn("space-y-5", step !== 3 && "hidden")}>
          <Field label="Pipeline mode" hint="Who drives work from idea to publish?">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "autonomous" as const,
                  label: "Autonomous",
                  blurb: "The studio drives the pipeline and auto-advances gates per your settings below.",
                },
                {
                  value: "director" as const,
                  label: "Director",
                  blurb: "You direct every stage. Nothing advances on its own; QC is advisory. (Per-gate autonomy below won't apply.)",
                },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPipelineMode(o.value)}
                  aria-pressed={pipelineMode === o.value}
                  className={cn(
                    "flex flex-col gap-1 rounded-card border p-3 text-left transition-colors",
                    pipelineMode === o.value
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-card-warm hover:border-accent/50",
                  )}
                >
                  <span className="text-sm font-semibold">{o.label}</span>
                  <span className="text-xs leading-relaxed text-muted">{o.blurb}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Autonomy per gate" hint="How much should the studio decide on its own?">
            {pipelineMode === "director" && (
              <p className="mb-2 rounded-lg bg-card-warm p-3 text-xs leading-relaxed text-muted">
                Director Mode ignores per-gate autonomy — you approve every stage yourself.
                These are saved for if you switch to Autonomous later.
              </p>
            )}
            <div className={cn("space-y-2", pipelineMode === "director" && "pointer-events-none opacity-50")}>
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
                        title={m.hint}
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
                defaultValue={15}
                className="input"
              />
            </Field>
            <Field label="Monthly budget (USD)">
              <input
                name="budget_monthly"
                type="number"
                min={1}
                defaultValue={150}
                className="input"
              />
            </Field>
          </div>
        </div>

        {state.error && (
          <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
            {state.error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-full bg-card px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          Back
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {pending ? "Creating…" : "Create project"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded-full bg-raised px-6 py-2.5 text-sm font-semibold text-card shadow-card"
          >
            Continue
          </button>
        )}
      </div>
    </form>
  );
}

function VoicePreviewButton({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    // Stop any other preview currently playing on the page.
    document
      .querySelectorAll<HTMLAudioElement>("audio[data-voice-preview]")
      .forEach((a) => a !== el && a.pause());
    setFailed(false);
    el.play().catch(() => {
      setFailed(true);
      setPlaying(false);
    });
  };

  return (
    <>
      <audio
        ref={ref}
        src={url}
        data-voice-preview
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      />
      <button
        type="button"
        disabled={failed}
        aria-label={failed ? "Preview unavailable" : playing ? "Pause preview" : "Play preview"}
        title={failed ? "Preview unavailable for this voice" : undefined}
        onClick={toggle}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl bg-card text-ink shadow-card hover:bg-accent",
          failed && "opacity-40",
        )}
      >
        {failed ? <Mic className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    </>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-medium">{label}</span>
        {required && <span className="text-xs text-coral">required</span>}
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
