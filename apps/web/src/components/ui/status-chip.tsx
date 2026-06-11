import { cn } from "@/lib/cn";

const TONES = {
  success: "bg-success-soft text-success",
  neutral: "bg-canvas text-muted",
  warning: "bg-accent-soft text-ink",
  coral: "bg-coral/15 text-coral",
  lavender: "bg-lavender/15 text-lavender",
} as const;

export function StatusChip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
