import React from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import type { LottieSpec, VideoProps } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Tier 9.5 — Lottie icon/diagram b-roll insert. Fetches the animation JSON
    (signed URL) once and plays it centered over a branded backdrop. Falls back
    to a clean branded card if the JSON can't be loaded so a beat never goes
    blank. The curated/recolorable Lottie library is supplied by the operator or
    the data-viz adapter as a URL on the beat. */
export const LottieInsert: React.FC<{ spec: LottieSpec; brand: VideoProps["brand"] }> = ({
  spec,
  brand,
}) => {
  const [data, setData] = React.useState<LottieAnimationData | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [handle] = React.useState(() => delayRender("Fetching Lottie animation"));
  const frame = useCurrentFrame();

  React.useEffect(() => {
    let alive = true;
    fetch(spec.url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((json) => {
        if (alive) setData(json as LottieAnimationData);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => continueRender(handle));
    return () => {
      alive = false;
    };
  }, [handle, spec.url]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 42%, ${brand.secondary} 0%, #000 160%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {data && !failed ? (
        <Lottie
          animationData={data}
          loop={spec.loop ?? true}
          style={{ width: "72%", height: "72%" }}
        />
      ) : failed ? (
        // Provider failure → a quiet branded card (never a blank insert).
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 40,
            border: `8px solid ${brand.primary}`,
            opacity: 0.5 + 0.2 * Math.sin(frame / 8),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
