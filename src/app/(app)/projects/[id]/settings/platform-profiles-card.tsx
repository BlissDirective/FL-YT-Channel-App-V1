import { MonitorSmartphone } from "lucide-react";
import { PLATFORM_PROFILES, type Aspect } from "@studio/core";

/**
 * Platform output profiles reference (list1 #20): the aspect/dimension/duration
 * presets each destination renders to. One assembly plan compiles to the
 * distinct aspects here (#29). Presentational — the render farm reads the
 * profile to size the composition.
 */
const ASPECT_ORDER: Aspect[] = ["16:9", "21:9", "9:16", "4:5", "1:1"];

export function PlatformProfilesCard() {
  const byAspect = ASPECT_ORDER.map((aspect) => ({
    aspect,
    items: PLATFORM_PROFILES.filter((p) => p.aspect === aspect),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4 rounded-card border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
          <MonitorSmartphone className="size-4" />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Platform profiles</h2>
          <p className="text-xs text-muted">One assembly plan renders to each distinct aspect</p>
        </div>
      </div>
      <div className="space-y-3">
        {byAspect.map((g) => (
          <div key={g.aspect}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{g.aspect}</p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl bg-card-warm px-3 py-2">
                  <AspectGlyph aspect={p.aspect} />
                  <div>
                    <p className="text-xs font-semibold leading-tight">{p.label}</p>
                    <p className="text-[10px] text-muted">
                      {p.width}×{p.height}
                      {p.maxDurationSec ? ` · ≤${p.maxDurationSec}s` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AspectGlyph({ aspect }: { aspect: Aspect }) {
  const [w, h] = aspect.split(":").map(Number);
  const scale = 16 / Math.max(w, h);
  return (
    <span
      className="shrink-0 rounded-sm border border-accent/50 bg-accent/10"
      style={{ width: `${Math.max(4, w * scale)}px`, height: `${Math.max(4, h * scale)}px` }}
      aria-hidden
    />
  );
}
