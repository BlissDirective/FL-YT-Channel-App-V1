"use client";

import { useEffect, useState } from "react";

/**
 * Hero ambient clip (Track C — fal/LTX-2 generated, identity-free). Overlays the
 * FLUX poster image only when motion is allowed and autoplay is viable; under
 * prefers-reduced-motion it renders nothing and the static poster shows through.
 * Muted + loop + playsInline so mobile browsers autoplay it inline.
 */
export function HeroVideo() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
  }, []);
  if (!show) return null;
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      aria-hidden
      poster="/marketing/pipeline-nodes.png"
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
    >
      <source src="/marketing/hero-bg.mp4" type="video/mp4" />
    </video>
  );
}
