import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type FlowNode = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Dark "active" node, like the reference's Inverter block */
  emphasis?: boolean;
  /** Small count badge (e.g. videos at this stage) */
  count?: number;
};

/** Horizontal connected-node diagram, like the reference's "Live Energy
    Flow". Used as the pipeline visualizer. */
export function FlowDiagram({
  nodes,
  className,
}: {
  nodes: FlowNode[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      {nodes.map((node, i) => {
        const Icon = node.icon;
        return (
          <div key={node.key} className="flex items-center">
            {i > 0 && <span className="h-px w-6 bg-ink/20 sm:w-10" />}
            <div
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-card px-4 py-3",
                node.emphasis
                  ? "bg-ink text-accent shadow-float"
                  : "bg-card-warm text-ink shadow-card",
              )}
            >
              {node.count !== undefined && node.count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-ink">
                  {node.count}
                </span>
              )}
              <Icon className="size-5" />
              <span
                className={cn(
                  "text-xs font-medium",
                  node.emphasis ? "text-card" : "text-muted",
                )}
              >
                {node.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
