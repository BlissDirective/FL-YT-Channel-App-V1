import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ActivityItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  time: string;
  tone?: "accent" | "success" | "coral" | "lavender";
};

const ICON_TONES = {
  accent: "bg-accent-soft text-ink",
  success: "bg-success-soft text-success",
  coral: "bg-coral/15 text-coral",
  lavender: "bg-lavender/15 text-lavender",
} as const;

export function ActivityFeed({
  items,
  className,
}: {
  items: ActivityItem[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-card p-2.5 transition-colors hover:bg-card-warm"
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                ICON_TONES[item.tone ?? "accent"],
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {item.detail && (
                <p className="truncate text-xs text-muted">{item.detail}</p>
              )}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {item.time}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
