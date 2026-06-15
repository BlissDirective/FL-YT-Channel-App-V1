import Link from "next/link";
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
  /** When set, the node becomes a link to this stage's page. */
  href?: string;
};

/** Horizontal connected-node diagram, like the reference's "Live Energy
    Flow". Used as the pipeline visualizer. Scrolls horizontally when
    narrow; built-in padding keeps the floating count badges from being
    clipped by the scroll container. */
export function FlowDiagram({
  nodes,
  className,
}: {
  nodes: FlowNode[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex w-max min-w-full items-center pt-3 pr-3 pb-1">
        {nodes.map((node, i) => {
          const Icon = node.icon;
          const inner = (
            <>
              {node.count !== undefined && node.count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-ink">
                  {node.count}
                </span>
              )}
              <Icon className="size-5" />
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium",
                  node.emphasis ? "text-card" : "text-muted",
                )}
              >
                {node.label}
              </span>
            </>
          );
          const nodeClass = cn(
            "relative flex flex-col items-center gap-1.5 rounded-card px-4 py-3 transition-transform",
            node.emphasis
              ? "bg-ink text-accent shadow-float"
              : "bg-card-warm text-ink shadow-card",
            node.href && "hover:scale-[1.03] hover:shadow-float",
          );
          return (
            <div key={node.key} className="flex shrink-0 items-center">
              {i > 0 && <span className="h-px w-5 shrink-0 bg-ink/20 sm:w-8" />}
              {node.href ? (
                <Link href={node.href} className={nodeClass} aria-label={node.label}>
                  {inner}
                </Link>
              ) : (
                <div className={nodeClass}>{inner}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
