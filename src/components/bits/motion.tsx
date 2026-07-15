"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Marketing motion primitives (react-bits style, dependency-free). All are
 * scroll-triggered, enter once, and collapse to opacity (or skip) under
 * prefers-reduced-motion. See src/app/(marketing)/marketing.css for the
 * keyframes/utility classes these toggle.
 */

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Fade/rise a block in the first time it scrolls into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`m-reveal ${seen ? "m-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Reveal text word-by-word (SplitText/BlurText). */
export function WordReveal({
  text,
  className = "",
  wordClassName = "",
  stagger = 45,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  /** Applied to each word span. Use for per-word gradient clipping (a gradient
      on a parent won't clip to child glyphs, so it must live on the words). */
  wordClassName?: string;
  stagger?: number;
  startDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const words = text.split(" ");
  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className={`m-word ${wordClassName} ${seen ? "m-in" : ""}`}
          style={{ transitionDelay: `${startDelay + i * stagger}ms` }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Count from 0 → `to` when scrolled into view (easeOutCubic). */
export function CountUp({
  to,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      setVal(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          setVal(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Aurora background — mounted after first idle so it never blocks LCP. */
export function Aurora() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prefersReduced()) return;
    const ric =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 250));
    ric(() => setOn(true));
  }, []);
  if (!on) return null;
  return <div className="m-aurora" aria-hidden="true" style={{ animation: "none", opacity: 0, transition: "opacity 1.2s ease" }} ref={(el) => { if (el) requestAnimationFrame(() => (el.style.opacity = "1")); }} />;
}
