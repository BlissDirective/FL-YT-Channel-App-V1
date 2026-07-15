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
