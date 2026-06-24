// Stick Studio — Phase 1 verification: a real stick short rendered end-to-end
// through the production VerticalShort → BeatScene path, with stick scenes on
// the beats plus word-window captions overlaid (VO omitted in the sample).

import React from "react";
import { VerticalShort } from "../VideoComp";
import type { VideoProps, WordTiming } from "../types";
import { DEFAULT_CAST } from "./types";

function words(text: string, dur: number): WordTiming[] {
  const ws = text.split(/\s+/).filter(Boolean);
  const step = dur / ws.length;
  return ws.map((w, i) => ({ w, start: i * step, end: (i + 1) * step }));
}

export const STICK_SAMPLE: VideoProps = {
  title: "Alone in the Woods",
  projectName: "Stickyarn",
  brand: { primary: "#F5B829", secondary: "#17150F" },
  captions: true,
  stickCast: DEFAULT_CAST,
  beats: [
    {
      idx: 0,
      text: "He thought he was alone.",
      durationSec: 3,
      words: words("He thought he was alone.", 3),
      voUrl: null,
      shotType: "broll",
      stickScene: { setting: "forest", shot: "wide", actors: [{ action: "walk", x: 0.45, facing: "r" }] },
    },
    {
      idx: 1,
      text: "Then he heard something.",
      durationSec: 3,
      words: words("Then he heard something.", 3),
      voUrl: null,
      shotType: "broll",
      stickScene: {
        setting: "forest",
        shot: "medium",
        mood: "night",
        actors: [{ action: "lookAround", x: 0.5 }],
      },
    },
    {
      idx: 2,
      text: "So he ran.",
      durationSec: 2.5,
      words: words("So he ran.", 2.5),
      voUrl: null,
      shotType: "broll",
      stickScene: {
        setting: "forest",
        mood: "danger",
        fx: ["speedlines"],
        actors: [{ action: "run", x: 0.45, facing: "r" }],
      },
    },
  ],
};

export const StickShortSample: React.FC = () => <VerticalShort {...STICK_SAMPLE} />;
