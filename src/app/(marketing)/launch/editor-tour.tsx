import { Play } from "lucide-react";
import { TiltedCard, InfiniteScrollY } from "@/components/bits/interactive";

/**
 * The editor tour (hero spec §3.5) — a stylized, on-theme mock of the /edit
 * screen with four pulsing hotspots (version history, trim/motion inspector,
 * kinetic captions, true-fidelity preview) and an infinite ticker of real
 * version-note strings. Pure CSS interactivity (hover + focus), so it's a
 * server component; the tilt + ticker come from the client bits.
 */

type Hotspot = { n: number; top: string; left: string; label: string; desc: string; side?: "top" | "bottom" };
const HOTSPOTS: Hotspot[] = [
  { n: 1, top: "14%", left: "16%", label: "Version history", desc: "v3 compiler · v4 agent · v5 you. Every save is a version — revert anything.", side: "bottom" },
  { n: 2, top: "40%", left: "88%", label: "Trim & motion inspector", desc: "Retime any clip and set its camera motion, frame-accurate.", side: "top" },
  { n: 3, top: "82%", left: "34%", label: "Kinetic captions", desc: "Word-timed captions you can emphasize, restyle, or mute.", side: "top" },
  { n: 4, top: "48%", left: "42%", label: "True-fidelity preview", desc: "See exactly what renders — no export, no round-trip.", side: "bottom" },
];

const NOTES = [
  "tighten hook −0.8s",
  "whip → crossfade at topic shift",
  "mute b6 for a dramatic pause",
  "swap b3 still → motion clip",
  "trim 0.4s of dead air at 0:12",
  "emphasis on “never” (b4)",
  "reorder: proof before promise",
  "bump caption size on the CTA",
];

export function EditorTour() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
      <TiltedCard className="m-star-border relative aspect-[16/10] w-full overflow-hidden p-3">
        {/* Editor chrome */}
        <div className="flex h-full flex-col gap-2 rounded-lg bg-black/40 p-3">
          {/* top bar: version chips */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[var(--m-muted)]">v3 compiler</span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[var(--m-muted)]">v4 agent</span>
            <span className="rounded bg-[var(--m-sky)]/20 px-1.5 py-0.5 text-[var(--m-sky)]">v5 you</span>
            <span className="ml-auto text-[var(--m-muted)]">/edit</span>
          </div>
          <div className="flex flex-1 gap-2">
            {/* preview */}
            <div className="relative flex-1 rounded-md bg-gradient-to-br from-white/[0.06] to-transparent ring-1 ring-white/5">
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid size-9 place-items-center rounded-full bg-[var(--m-amber)]/90 text-[#04140e]">
                  <Play className="size-4" fill="currentColor" />
                </span>
              </div>
              {/* kinetic caption line */}
              <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
                {["it", "has", "to", "land"].map((t, i) => (
                  <span
                    key={t}
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                    style={
                      i === 3
                        ? { background: "var(--m-amber)", color: "#04140e" }
                        : { background: "rgba(255,255,255,0.08)", color: "var(--m-muted)" }
                    }
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* inspector */}
            <div className="w-1/4 shrink-0 space-y-1.5">
              {["Trim", "Motion", "Caption", "Transition"].map((r) => (
                <div key={r} className="rounded bg-white/5 px-1.5 py-1 text-[8px] text-[var(--m-muted)]">
                  {r}
                  <div className="mt-1 h-1 rounded-full bg-white/10">
                    <div className="h-full w-2/3 rounded-full bg-[var(--m-sky)]/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* timeline strip */}
          <div className="flex h-6 gap-1">
            {[18, 22, 16, 20, 24].map((w, i) => (
              <div
                key={i}
                className="rounded"
                style={{ width: `${w}%`, background: i === 3 ? "rgba(16, 212, 142,0.3)" : "rgba(125,211,252,0.14)" }}
              />
            ))}
          </div>
        </div>

        {/* Hotspots */}
        {HOTSPOTS.map((h) => (
          <div key={h.n} className="group absolute z-10" style={{ top: h.top, left: h.left }}>
            <button
              type="button"
              className="relative grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center"
              aria-label={h.label}
            >
              <span className="absolute inline-flex size-5 rounded-full bg-[var(--m-amber)]/50 m-ping" />
              <span className="relative grid size-4 place-items-center rounded-full bg-[var(--m-amber)] text-[9px] font-bold text-[#04140e]">
                {h.n}
              </span>
            </button>
            <div
              className={`pointer-events-none absolute left-1/2 z-20 w-44 -translate-x-1/2 rounded-lg border border-[var(--m-line)] bg-[var(--m-bg-2)] p-2.5 text-left opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${
                h.side === "top" ? "bottom-full mb-2" : "top-full mt-2"
              }`}
            >
              <p className="text-xs font-semibold text-[var(--m-ink)]">{h.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--m-muted)]">{h.desc}</p>
            </div>
          </div>
        ))}
      </TiltedCard>

      {/* Copy + version-note ticker */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
          One document, two editors
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight text-[var(--m-ink)]">
          Human and agent are peers
        </h2>
        <p className="mt-4 leading-relaxed text-[var(--m-muted)]">
          No export, no round-trip. You edit the same document the agent does —
          your save is just the next version, and you can revert anything. Hover a
          marker to see what each part does.
        </p>

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--m-muted)]">
            Recent edits
          </p>
          <InfiniteScrollY
            className="h-28"
            items={NOTES.map((n) => (
              <span key={n} className="block rounded-md border border-[var(--m-line)] bg-[var(--m-card)] px-3 py-1.5 font-mono text-xs text-[var(--m-muted)]">
                {n}
              </span>
            ))}
          />
        </div>
      </div>
    </div>
  );
}
