import { cn } from "@/lib/cn";

/** Bold amber progress bar with the % inside the fill, like the
    reference's "Battery Level 76%". */
export function ProgressBar({
  percent,
  label,
  className,
}: {
  percent: number;
  /** Defaults to "NN%" */
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("h-14 w-full overflow-hidden rounded-2xl bg-canvas", className)}>
      <div
        className="flex h-full min-w-fit items-center rounded-2xl bg-accent px-4 transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      >
        <span className="text-2xl font-bold tabular-nums text-ink">
          {label ?? `${Math.round(clamped)}%`}
        </span>
      </div>
    </div>
  );
}
