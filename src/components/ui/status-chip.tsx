import { cn } from "@/lib/cn";

// On the studio-dark surfaces the tint sits over near-black, so chip text uses
// the bright brand hue (not a darkened one) to clear WCAG AA (4.5:1) while
// staying recognizably green/amber/coral/purple.
const TONES = {
  success: "bg-success-soft text-success",
  neutral: "bg-raised text-muted",
  warning: "bg-accent/15 text-accent",
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
