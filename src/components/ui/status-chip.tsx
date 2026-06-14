import { cn } from "@/lib/cn";

// Chip text is darkened from the brand hues so each badge clears WCAG AA
// (4.5:1) on its tinted background while staying recognizably green/coral/
// purple. Backgrounds keep the soft brand tint.
const TONES = {
  success: "bg-success-soft text-[#1d6b43]",
  neutral: "bg-canvas text-muted",
  warning: "bg-accent-soft text-ink",
  coral: "bg-coral/15 text-[#a8442b]",
  lavender: "bg-lavender/15 text-[#6b4cd6]",
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
