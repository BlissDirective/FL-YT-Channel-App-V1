import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * React Bits — Star Border. Two radial "star" tracks travel the top + bottom
 * edges of a rounded surface, spotlighting a KEY component (admin panel, hero
 * CTA). Colour is token-driven (emerald by default); the CSS lives in
 * globals.css (.star-border / .sb-*). Self-contained — no external deps.
 *
 * Usage:
 *   <StarBorder>…card content…</StarBorder>
 *   <StarBorder color="var(--color-violet)" speed="7s">…</StarBorder>
 */
export function StarBorder({
  as,
  color = "var(--color-accent)",
  speed = "6s",
  thickness = 1.5,
  className,
  innerClassName,
  children,
}: {
  /** Element to render as the outer container (default div). */
  as?: ElementType;
  /** Star colour — any CSS colour or token var. */
  color?: string;
  /** Orbit duration (CSS time). */
  speed?: string;
  /** Track thickness in px. */
  thickness?: number;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  const Tag = as ?? "div";
  const track = {
    background: `radial-gradient(circle at center, ${color}, transparent 22%)`,
    animationDuration: speed,
    height: `${thickness * 10}px`,
  };
  return (
    <Tag className={cn("star-border", className)}>
      <span className="sb-track sb-bottom" style={track} aria-hidden />
      <span className="sb-track sb-top" style={track} aria-hidden />
      <div className={cn("sb-inner", innerClassName)}>{children}</div>
    </Tag>
  );
}
