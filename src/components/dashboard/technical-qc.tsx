import { AlertTriangle, CheckCircle2, CircleAlert, Film, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Post-render technical self-review (#6): a compact read-out of the ffprobe +
 * ffmpeg QC pass on the delivered render — frames sampled at four positions,
 * audio track, black/silence/loudness, and caption presence. A HARD failure
 * holds the video at Final review; warnings are advisory. Purely presentational
 * (data from the render asset's meta.mediaQc).
 */

type Check = { id: string; pass: boolean; hard: boolean; note: string };
type Probe = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  audioChannels: number | null;
  videoCodec: string | null;
};
type FrameSample = { atPct: number; mean: number; variance: number; blank: boolean };
export type MediaQc = {
  ran?: boolean;
  lufs?: number | null;
  checks?: Check[];
  hardFail?: boolean;
  probe?: Probe | null;
  frames?: FrameSample[];
};

const CHECK_LABEL: Record<string, string> = {
  frames: "Frames (4 positions)",
  audio: "Audio track",
  black: "Black frames",
  silence: "Silence gaps",
  freeze: "Frozen frames",
  loudness: "Loudness",
  subtitles: "Captions",
};

function statusFor(c: Check): { Icon: LucideIcon; cls: string } {
  if (c.pass) return { Icon: CheckCircle2, cls: "text-success" };
  if (c.hard) return { Icon: AlertTriangle, cls: "text-coral" };
  return { Icon: CircleAlert, cls: "text-accent" };
}

export function TechnicalQc({ qc }: { qc: MediaQc | null | undefined }) {
  if (!qc || !qc.ran || !qc.checks?.length) return null;
  const checks = qc.checks;
  const probe = qc.probe;

  return (
    <div className="space-y-3 rounded-card border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
            <Film className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Technical QC</p>
            <p className="text-[11px] text-muted">ffprobe + ffmpeg self-review of the render</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            qc.hardFail ? "bg-coral/15 text-coral" : "bg-success-soft text-success",
          )}
        >
          {qc.hardFail ? "held" : "clean"}
        </span>
      </div>

      {probe && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-raised px-3 py-2 text-[11px] text-muted">
          {probe.width && probe.height && (
            <span>{probe.width}×{probe.height}</span>
          )}
          {probe.durationSec != null && <span>{Math.round(probe.durationSec)}s</span>}
          {probe.videoCodec && <span>{probe.videoCodec}</span>}
          <span>{probe.hasAudio ? `audio ${probe.audioChannels ?? "?"}ch` : "no audio"}</span>
          {qc.lufs != null && <span>{qc.lufs.toFixed(1)} LUFS</span>}
        </div>
      )}

      <ul className="space-y-1.5">
        {checks.map((c) => {
          const { Icon, cls } = statusFor(c);
          return (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              <Icon className={cn("mt-0.5 size-3.5 shrink-0", cls)} />
              <span className="font-semibold text-ink">{CHECK_LABEL[c.id] ?? c.id}</span>
              <span className="text-muted">{c.note}</span>
            </li>
          );
        })}
      </ul>

      {qc.frames && qc.frames.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted">frames</span>
          {qc.frames.map((f, i) => (
            <span
              key={i}
              title={`${Math.round(f.atPct * 100)}% · mean ${f.mean}, var ${f.variance}`}
              className={cn(
                "h-2 flex-1 rounded-full",
                f.blank ? "bg-coral" : "bg-success",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
