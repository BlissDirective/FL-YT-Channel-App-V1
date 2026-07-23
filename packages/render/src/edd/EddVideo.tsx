import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  introOutroRuntime,
  resolveWordAnchorSec,
  type AudioCue,
  type EditDocument,
  type Overlay,
  type VideoClip,
} from "@studio/core";
import { FPS, type EddClipMedia, type EddPayload, type Highlight, type HighlightPreset, type VideoProps } from "../types";
import { HighlightLayer } from "../highlights/HighlightLayer";
import { HighlightFonts } from "../highlights/fonts";
import { StickStage } from "../stick/StickStage";
import { ChartReveal } from "../dataviz/ChartReveal";
import { LottieInsert } from "../dataviz/LottieInsert";
import { EndCard, FONT, FallbackCard, IntroSting, LowerThird, MULTI_IMAGE_MIN_SEC, MultiImageSection } from "../scenes";
import { motionCss } from "./motion";
import { isStraddle, needsOverlap, straddleOverlayStyle, transitionExitStyle, transitionSec } from "./transitions";
import { EddCaptionPages } from "./EddCaptions";

/**
 * The EDD composition — renders an explicit Edit Decision Document instead of
 * the legacy beat derivation. Full vocabulary (Decision 1): explicit clip
 * timing + source trims, the transition registry (D6), keyframe motion (D5),
 * styled caption pages with per-token kinetic emphasis, word-anchored SFX
 * (D7, resolved through the same core resolver the validator uses — A4),
 * highlight / lower-third / progress-bar overlays. Music cues are skipped
 * (D8 — UI-gated off; the validator rejects them anyway).
 *
 * Clip stacking: clips render in REVERSE timeline order, each extended by its
 * outgoing transition's length, so during a transition the outgoing clip sits
 * on top (animating out via transitionExitStyle) while the incoming clip is
 * revealed beneath — and the outgoing clip's video/motion stay continuous
 * across the boundary (no restart at the overlap).
 */
export const EddVideo: React.FC<VideoProps> = (props) => {
  const edd = props.edd as EddPayload; // callers gate on props.edd
  const doc = edd.doc;
  const runtime = introOutroRuntime(doc);
  const vertical = doc.meta.aspect === "9:16";
  const clips = doc.tracks.video;
  // ALL frame boundaries derive from cumulative absolute positions —
  // f(start) and f(start+duration) — never from independently-rounded
  // durations, so adjacent windows share the exact same boundary frame and
  // fractional starts can't open a 1-frame hole (audit A18).
  const f = (sec: number) => Math.round(sec * FPS);
  const totalFrames = f(runtime);
  const outroStart = f(runtime - doc.outro.sec);

  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <HighlightFonts />

      {/* ── Video track (reverse order; outgoing clip on top during transitions) ── */}
      {[...clips].map((_, ri) => {
        const i = clips.length - 1 - ri;
        const clip = clips[i];
        const from = f(clip.start);
        const end = f(clip.start + clip.duration);
        const overlapSec = needsOverlap(clip.transitionOut) ? transitionSec(clip.transitionOut) : 0;
        const overlapFrames = overlapSec > 0 ? f(clip.start + clip.duration + overlapSec) - end : 0;
        const bodyFrames = Math.max(1, end - from);
        return (
          <Sequence key={clip.id} from={from} durationInFrames={bodyFrames + overlapFrames}>
            <EddClipScene
              clip={clip}
              media={clip.assetId ? edd.media[clip.assetId] : undefined}
              brand={props.brand}
              stickCast={props.stickCast}
              fallbackText={edd.beatText?.[String(clip.beatIdx)] ?? ""}
              bodyFrames={bodyFrames}
              overlapFrames={overlapFrames}
            />
          </Sequence>
        );
      })}

      {/* straddling boundaries (e.g. dip-to-black): an overlay centered on the
          cut instead of a clip overlap — registry-extensible in transitions.ts */}
      {clips.map((clip, i) => {
        if (i === clips.length - 1 || !isStraddle(clip.transitionOut)) return null;
        const sec = transitionSec(clip.transitionOut);
        const boundary = clip.start + clip.duration;
        const from = f(boundary - sec / 2);
        const dur = Math.max(1, f(boundary + sec / 2) - from);
        return (
          <Sequence key={`straddle-${clip.id}`} from={from} durationInFrames={dur}>
            <StraddleOverlay transition={clip.transitionOut} />
          </Sequence>
        );
      })}

      {/* readability scrim behind captions (legacy renders it on every beat) */}
      <Sequence from={f(doc.intro.sec)} durationInFrames={Math.max(1, outroStart - f(doc.intro.sec))}>
        <AbsoluteFill
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 35%)" }}
        />
      </Sequence>

      {/* ── Intro sting / outro end card ──
          Runtime ALWAYS reserves intro.sec / outro.sec (see introOutroRuntime),
          and clips are laid gapless strictly BETWEEN them — so the reserved head
          [0, intro.sec] and tail [outroStart, totalFrames] are painted ONLY by
          these two sequences. Gating them on the sting/endCard booleans (which
          an editor op can flip without zeroing the seconds) left the reserved
          span with nothing but the root background → a black frame on any
          dark-branded channel. Paint whenever the seconds are reserved; the
          booleans are equivalent to sec>0 on compile, so this matches intent and
          can never black out. */}
      {doc.intro.sec > 0 && (
        <Sequence durationInFrames={f(doc.intro.sec)}>
          <IntroSting {...props} />
        </Sequence>
      )}
      {doc.outro.sec > 0 && (
        <Sequence from={outroStart} durationInFrames={Math.max(1, totalFrames - outroStart)}>
          <EndCard {...props} compact={doc.meta.format === "short"} />
        </Sequence>
      )}

      {/* ── Audio track (VO + SFX; music is D8-gated) ── */}
      {doc.tracks.audio.map((cue, i) => (
        <EddAudioCue key={i} cue={cue} doc={doc} edd={edd} totalFrames={totalFrames} />
      ))}

      {/* ── Captions (props.captions === false is the runtime kill-switch,
             same as the legacy path; the DOCUMENT owns caption content) ── */}
      {props.captions !== false && (
        <EddCaptionPages pages={doc.tracks.captions} brand={props.brand} vertical={vertical} />
      )}

      {/* ── Overlays ── */}
      <EddOverlays overlays={doc.tracks.overlays} doc={doc} brand={props.brand} vertical={vertical} totalFrames={totalFrames} />
    </AbsoluteFill>
  );
};

// ── Clip scene ────────────────────────────────────────────────────────

const EddClipScene: React.FC<{
  clip: VideoClip;
  media?: EddClipMedia;
  brand: VideoProps["brand"];
  stickCast?: VideoProps["stickCast"];
  fallbackText: string;
  bodyFrames: number;
  overlapFrames: number;
}> = ({ clip, media, brand, stickCast, fallbackText, bodyFrames, overlapFrames }) => {
  const frame = useCurrentFrame();
  const tSec = frame / FPS; // clip-local; motionAt clamps past duration
  const motion = motionCss(clip.motion, tSec, clip.duration);

  // During the transition overlap (past the clip's own window) the whole
  // scene animates out on top of the next clip.
  const exiting = overlapFrames > 0 && frame >= bodyFrames;
  const exitStyle = exiting
    ? transitionExitStyle(clip.transitionOut, (frame - bodyFrames + 1) / Math.max(1, overlapFrames))
    : undefined;

  const trimIn = Math.max(0, clip.trim.in);
  const trimOut = Math.max(trimIn + 1 / FPS, clip.trim.out);
  const windowFrames = Math.max(1, Math.round((trimOut - trimIn) * FPS));
  const heroRate = clip.motion.kind === "heroHold" ? Math.max(0.05, clip.motion.rate) : null;
  // R5 speed ramp (footage only). undefined/1 → normal playback + loop.
  const clipSpeed = Math.max(0.25, Math.min(4, clip.speed ?? 1));

  return (
    <AbsoluteFill style={exitStyle}>
      {media?.dataViz ? (
        <ChartReveal spec={media.dataViz} brand={brand} />
      ) : media?.lottie ? (
        <LottieInsert spec={media.lottie} brand={brand} />
      ) : media?.stickScene ? (
        <StickStage scene={media.stickScene} cast={stickCast} />
      ) : media?.videoUrl && heroRate != null ? (
        // Hero clip: slowed playback stretches the trim window cinematically.
        <AbsoluteFill style={motion}>
          <Loop durationInFrames={Math.max(1, Math.floor(windowFrames / heroRate))}>
            <OffthreadVideo
              src={media.videoUrl}
              muted
              playbackRate={heroRate}
              startFrom={Math.round(trimIn * FPS)}
              endAt={Math.round(trimOut * FPS)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Loop>
        </AbsoluteFill>
      ) : media?.videoUrl ? (
        // The trim window is the source segment; shorter than the clip → loop
        // (legacy behavior, pinned by audit A10). R5: an optional speed ramp
        // sets playbackRate and shrinks/stretches the loop so the trim window
        // fills the clip at the chosen speed (speed undefined/1 → identical).
        <AbsoluteFill style={motion}>
          <Loop durationInFrames={Math.max(1, Math.round(windowFrames / clipSpeed))}>
            <OffthreadVideo
              src={media.videoUrl}
              muted
              playbackRate={clipSpeed}
              startFrom={Math.round(trimIn * FPS)}
              endAt={Math.round(trimOut * FPS)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Loop>
        </AbsoluteFill>
      ) : media?.images && media.images.length >= 2 && clip.duration >= MULTI_IMAGE_MIN_SEC ? (
        <MultiImageSection images={media.images} />
      ) : media?.imageUrl ? (
        <Img
          src={media.imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover", ...motion }}
        />
      ) : (
        <FallbackCard text={fallbackText} brand={brand} motion={motion} />
      )}
    </AbsoluteFill>
  );
};

const StraddleOverlay: React.FC<{ transition: Parameters<typeof straddleOverlayStyle>[0] }> = ({
  transition,
}) => {
  const frame = useCurrentFrame();
  // Inside a Sequence, durationInFrames is the sequence's own length.
  const { durationInFrames } = useVideoConfig();
  const p = durationInFrames > 1 ? frame / (durationInFrames - 1) : 1;
  return <AbsoluteFill style={straddleOverlayStyle(transition, p)} />;
};

// ── Audio cues ────────────────────────────────────────────────────────

const gainToVolume = (gainDb: number) => Math.pow(10, gainDb / 20);

const EddAudioCue: React.FC<{
  cue: AudioCue;
  doc: EditDocument;
  edd: EddPayload;
  totalFrames: number;
}> = ({ cue, doc, edd, totalFrames }) => {
  if (cue.kind === "music") return null; // D8 — gated off in v1

  if (cue.kind === "vo") {
    const url = edd.audio[cue.assetId];
    if (!url) return null;
    const from = Math.round(cue.start * FPS);
    return (
      <Sequence from={from} durationInFrames={Math.max(1, totalFrames - from)} layout="none">
        <Audio
          src={url}
          volume={gainToVolume(cue.gainDb)}
          startFrom={cue.trim ? Math.round(cue.trim.in * FPS) : undefined}
          endAt={cue.trim ? Math.round(cue.trim.out * FPS) : undefined}
        />
      </Sequence>
    );
  }

  // SFX — resolved through the same anchor resolver the validator uses (A4).
  const atSec = resolveWordAnchorSec(doc, cue.at);
  if (atSec == null) return null;
  const url =
    cue.ref.source === "generated" ? edd.audio[cue.ref.assetId] : edd.sfxLibrary?.[cue.ref.name];
  if (!url) return null;
  const from = Math.round(atSec * FPS);
  return (
    <Sequence from={from} durationInFrames={Math.max(1, totalFrames - from)} layout="none">
      <Audio src={url} volume={gainToVolume(cue.gainDb)} />
    </Sequence>
  );
};

// ── Overlays ──────────────────────────────────────────────────────────

const EddOverlays: React.FC<{
  overlays: Overlay[];
  doc: EditDocument;
  brand: VideoProps["brand"];
  vertical: boolean;
  totalFrames: number;
}> = ({ overlays, doc, brand, vertical, totalFrames }) => {
  // Highlight overlays reuse the curated kinetic-highlight renderer: absolute
  // ms map directly because HighlightLayer mounts its own Sequences from ms.
  const highlights: Highlight[] = overlays.flatMap((o, i) => {
    if (o.kind !== "highlight") return [];
    // A word anchor retimes the window to the anchored token (survives edits);
    // abs anchors keep the stored startMs/endMs.
    const anchored = resolveWordAnchorSec(doc, o.anchor);
    const startMs = o.anchor.kind === "word" && anchored != null ? anchored * 1000 : o.startMs;
    const lengthMs = Math.max(400, o.endMs - o.startMs);
    return [
      {
        id: `ov-${i}`,
        text: o.text,
        emphasisWord: o.emphasisWord,
        stylePreset: (o.style as HighlightPreset) ?? "word-pop",
        fontFamily: o.fontFamily ?? "inherit",
        emphasisColor: o.emphasisColor,
        position: o.position ?? "center",
        intensity: o.intensity ?? "med",
        maxLines: o.maxLines ?? 2,
        startMs,
        endMs: startMs + lengthMs,
      },
    ];
  });

  return (
    <>
      <HighlightLayer highlights={highlights} brand={brand} vertical={vertical} />
      {overlays.map((o, i) => {
        if (o.kind === "lowerThird") {
          return (
            <Sequence
              key={`lt-${i}`}
              from={Math.round(o.startSec * FPS)}
              durationInFrames={Math.max(1, Math.round(o.durationSec * FPS))}
            >
              <LowerThird brand={brand} text={o.text} sub={o.sub} />
            </Sequence>
          );
        }
        if (o.kind === "progressBar") {
          return (
            <Sequence key={`pb-${i}`} durationInFrames={totalFrames}>
              <EddProgressBar brand={brand} totalFrames={totalFrames} />
            </Sequence>
          );
        }
        return null;
      })}
    </>
  );
};

/** Thin retention progress bar along the bottom edge ("bar" style). */
const EddProgressBar: React.FC<{ brand: VideoProps["brand"]; totalFrames: number }> = ({
  brand,
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const pct = totalFrames > 0 ? Math.min(100, (frame / totalFrames) * 100) : 0;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <div style={{ height: 10, width: `${pct}%`, backgroundColor: brand.primary }} />
    </AbsoluteFill>
  );
};
