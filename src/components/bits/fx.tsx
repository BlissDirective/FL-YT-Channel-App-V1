"use client";

import { useEffect, useRef } from "react";

/**
 * React Bits-style effect layer for the marketing hero (cinema-dark). Four
 * pieces: the signature ControlGrid canvas background (RippleGrid + LightRays
 * fused into the ChannelIntro motif), global ClickSpark feedback, the
 * MagicBento feature card, and a tilt+glare frame for the product screenshot.
 * Every effect is desktop-pointer sugar: it never runs under reduced motion,
 * canvases pause off-screen, and everything degrades to a static layout.
 */

function prefersReduced(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/** The signature background: a faint circuit grid whose dots glow and swell
    around the cursor, with emerald data-beams sweeping across — the same
    motif as the branded ChannelIntro that opens every rendered video. */
export function ControlGrid() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || prefersReduced()) return;
    const host = cv.parentElement;
    const ctx = cv.getContext("2d");
    if (!host || !ctx) return;

    const CELL = 46;
    let W = 0;
    let H = 0;
    let run = false;
    let t = 0;
    let raf = 0;
    let mx = -1e3;
    let my = -1e3;
    let dots: { x: number; y: number; p: number }[] = [];
    type Beam = { y: number; x: number; v: number; w: number };
    const beams: Beam[] = [];
    const newBeam = (): Beam => ({
      y: (0.15 + Math.random() * 0.7) * H,
      x: -0.3 * W,
      v: 2.2 + Math.random() * 2.6,
      w: 120 + Math.random() * 160,
    });

    const fit = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let x = CELL / 2; x < W; x += CELL)
        for (let y = CELL / 2; y < H; y += CELL) dots.push({ x, y, p: Math.random() * 6.28 });
      if (!beams.length) for (let i = 0; i < 3; i++) beams.push({ ...newBeam(), x: Math.random() * W });
    };

    const draw = () => {
      if (!run) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(150,180,220,0.045)";
      ctx.lineWidth = 1;
      for (let x = CELL / 2; x < W; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = CELL / 2; y < H; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (const d of dots) {
        const near = Math.max(0, 1 - Math.hypot(d.x - mx, d.y - my) / 190);
        const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + d.p);
        const a = 0.05 + tw * 0.05 + near * 0.75;
        ctx.fillStyle = near > 0.02 ? `rgba(16,212,142,${a})` : `rgba(150,180,220,${a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.1 + near * 2.4, 0, 6.28);
        ctx.fill();
      }
      for (const b of beams) {
        b.x += b.v;
        if (b.x - b.w > W * 1.2) Object.assign(b, newBeam());
        const g = ctx.createLinearGradient(b.x - b.w, 0, b.x, 0);
        g.addColorStop(0, "rgba(16,212,142,0)");
        g.addColorStop(0.85, "rgba(16,212,142,0.5)");
        g.addColorStop(1, "rgba(185,255,228,0.9)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "rgba(16,212,142,0.8)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(b.x - b.w, b.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(220,255,240,0.95)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.1, 0, 6.28);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    const onLeave = () => {
      mx = -1e3;
      my = -1e3;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting && !run) {
            run = true;
            fit();
            raf = requestAnimationFrame(draw);
          } else if (!e.isIntersecting) {
            run = false;
          }
        }),
      { threshold: 0.05 },
    );
    io.observe(cv);
    const onResize = () => run && fit();
    window.addEventListener("resize", onResize);
    return () => {
      run = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="m-controlgrid" aria-hidden="true" />;
}

/** Global click feedback: eight emerald sparks radiate from every pointer
    press. Mount once per page; renders nothing itself. */
export function ClickSpark() {
  useEffect(() => {
    if (prefersReduced()) return;
    const onDown = (e: PointerEvent) => {
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.className = "m-cspark";
        const a = (i / 8) * 6.283;
        const dist = 26 + Math.random() * 14;
        s.style.left = `${e.clientX}px`;
        s.style.top = `${e.clientY}px`;
        document.body.appendChild(s);
        s.animate(
          [
            { transform: `translate(-50%,-50%) rotate(${a + 1.5708}rad) translateX(6px) scaleY(1)`, opacity: 1 },
            { transform: `translate(-50%,-50%) rotate(${a + 1.5708}rad) translateX(${dist}px) scaleY(0.2)`, opacity: 0 },
          ],
          { duration: 420, easing: "cubic-bezier(.2,.8,.3,1)" },
        ).onfinish = () => s.remove();
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}

/** MagicBento card: the spotlight card plus tiny emerald particles that float
    off the card while the cursor is on it. */
export function BentoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onEnter = () => {
    const el = ref.current;
    if (!el || prefersReduced() || window.matchMedia("(pointer: coarse)").matches) return;
    timer.current = setInterval(() => {
      const s = document.createElement("span");
      s.className = "m-bento-dot";
      s.style.left = `${8 + Math.random() * (el.clientWidth - 16)}px`;
      s.style.top = `${30 + Math.random() * (el.clientHeight - 40)}px`;
      el.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }, 260);
  };
  const onLeave = () => {
    if (timer.current) clearInterval(timer.current);
  };
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`m-spotlight ${className}`}
    >
      {children}
    </div>
  );
}

/** 3D tilt + moving glare for the product screenshot — one static image made
    physical. Children render above the glare layer. */
export function TiltGlare({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(px - 0.5) * 7}deg) rotateX(${(0.5 - py) * 6}deg)`;
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div className="m-tilt-wrap">
      <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className={`m-tilt ${className}`}>
        {children}
        <div className="m-glare" aria-hidden="true" />
      </div>
    </div>
  );
}
