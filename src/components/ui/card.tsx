import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  // Forward the rest (data-testid above all): several surfaces tag their Card
  // for the e2e suite, and silently dropping the attribute broke every
  // getByTestId on a Card — the root cause of the authed suite's
  // "checkpoint-panel not found" flake.
  return (
    <div
      className={cn(
        "rounded-card bg-card p-5 shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  linkout,
  href,
}: {
  children: React.ReactNode;
  linkout?: boolean;
  /** When set, the whole title row becomes a link (and shows the linkout arrow). */
  href?: string;
}) {
  const title = <h3 className="text-base font-semibold">{children}</h3>;
  if (href) {
    return (
      <Link
        href={href}
        className="group mb-4 flex items-start justify-between transition-colors hover:text-accent"
      >
        {title}
        <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </Link>
    );
  }
  return (
    <div className="mb-4 flex items-start justify-between">
      {title}
      {linkout && <ArrowUpRight className="size-4 text-muted" />}
    </div>
  );
}
