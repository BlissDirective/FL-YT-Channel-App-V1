"use client";

import { useRef } from "react";

/**
 * Interactive marketing surfaces (react-bits style). Pointer effects only —
 * they degrade to plain static cards/buttons on touch and under reduced motion
 * (the CSS drops the hover glow; the JS nudge is simply never triggered).
 */

/** Card with a cursor-following amber spotlight (see .m-spotlight in CSS). */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div onMouseMove={onMove} className={`m-spotlight ${className}`}>
      {children}
    </div>
  );
}

/** App-side spotlight (uses `.spotlight` from globals.css): composes a
    cursor-following amber glow ONTO existing card styling — pass your own
    `bg-card`/rounded/padding classes. Degrades to a static element on touch. */
export function Spotlight({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Tag onMouseMove={onMove} className={`spotlight ${className}`}>
      {children}
    </Tag>
  );
}

/** Subtle 3D tilt toward the cursor (max ~5°, desktop pointer only). */
export function TiltedCard({
  children,
  max = 5,
  className = "",
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${-py * max * 2}deg) rotateY(${px * max * 2}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)", transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

/** Vertically auto-scrolling, seamless list (pauses on hover/focus). Renders
    the items twice so the -50% keyframe loops without a visible seam. */
export function InfiniteScrollY({
  items,
  className = "",
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <div className={`m-vscroll-wrap ${className}`}>
      <ul className="m-vtrack space-y-2" tabIndex={0} aria-label="Recent version notes">
        {[...items, ...items].map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

/** Element that nudges slightly toward the cursor (desktop pointer only). */
export function Magnetic({
  children,
  strength = 0.25,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ display: "inline-block", transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)" }}
    >
      {children}
    </span>
  );
}
