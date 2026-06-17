import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

/**
 * Loads the highlight display fonts from Google Fonts (CSS2). Dependency-free
 * on purpose — no @remotion/google-fonts package to install on the CI render
 * worker; we inject the stylesheet, force-load the families, and gate the
 * render on document.fonts so headless Chromium never paints a fallback.
 */

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Anton",
    "family=Bangers",
    "family=Archivo+Black",
    "family=Montserrat:wght@700;800",
    "family=Oswald:wght@600;700",
    "family=Bebas+Neue",
    "family=Inter:wght@600;800",
    "family=Playfair+Display:ital,wght@0,700;0,900;1,700",
  ].join("&") +
  "&display=block";

const FAMILIES = [
  "Anton",
  "Bangers",
  "Archivo Black",
  "Montserrat",
  "Oswald",
  "Bebas Neue",
  "Inter",
  "Playfair Display",
];

export const HighlightFonts: React.FC = () => {
  const [handle] = useState(() => delayRender("highlight-fonts"));
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    link.onload = () => {
      const fonts = document.fonts;
      Promise.all(
        FAMILIES.map((f) => fonts.load(`700 64px "${f}"`).catch(() => undefined)),
      )
        .then(() => fonts.ready)
        .then(finish, finish);
    };
    link.onerror = finish; // never block the render on a font fetch failure
    document.head.appendChild(link);
    // Safety net so a slow/blocked CDN can't hang the render farm.
    const timer = setTimeout(finish, 8000);
    return () => clearTimeout(timer);
  }, [handle]);
  return null;
};
