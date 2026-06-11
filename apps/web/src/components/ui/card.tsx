import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card bg-card p-5 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  linkout,
}: {
  children: React.ReactNode;
  linkout?: boolean;
}) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <h3 className="text-base font-semibold">{children}</h3>
      {linkout && <ArrowUpRight className="size-4 text-muted" />}
    </div>
  );
}
