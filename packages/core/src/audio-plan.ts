/**
 * Music plan, soundtrack ducking & voice direction (OpenMontage Remixed
 * list1 #15/#27/#28, list2 #22/#17).
 *
 * The MUSIC PLAN is resolved at PROPOSAL time, never deferred to render (late
 * music failure is expensive, #22): mood/tempo/intensity + a ducking spec are
 * decided from the taste profile + niche up front. VOICE DIRECTION carries a
 * per-beat tone/emotion/pace that flows into the narration prompt and the
 * caption emphasis (#28 / #17). Ducking + a VO cleanup pass activate the
 * previously-gated D8 audio path (#27).
 *
 * Pure — the adapters synthesize; this decides. Reuses the EDD `DuckSpec`.
 */
import type { DuckSpec } from "./edd";

// ── Music plan (resolved at proposal, #15 / #22) ──────────────────────────
export type MusicMood = "calm" | "uplifting" | "tense" | "epic" | "playful" | "neutral";

export type MusicPlan = {
  enabled: boolean;
  mood: MusicMood;
  tempoBpm: number;
  /** 0..1 bed loudness relative to VO. */
  intensity: number;
  duck: DuckSpec;
  /** A promptable brief for a music generator (ElevenLabs Music / Suno). */
  prompt: string;
};

export type MusicPlanInput = {
  niche?: string | null;
  /** motionIntensity dial 0..4 from the taste profile. */
  motionIntensity?: number;
  /** whether the operator enabled music for this project. */
  musicEnabled?: boolean;
  kind?: "long" | "short";
};

const MOOD_BY_NICHE: { re: RegExp; mood: MusicMood }[] = [
  { re: /history|documentary|deep|science/i, mood: "epic" },
  { re: /finance|business|news/i, mood: "tense" },
  { re: /kids|fun|meme|game/i, mood: "playful" },
  { re: /wellness|calm|sleep|meditat/i, mood: "calm" },
  { re: /motivat|success|fitness/i, mood: "uplifting" },
];

/**
 * Resolve the music plan up front from niche + taste. Ducking defaults to a
 * sidechain that dips the bed under narration; a Short runs a touch hotter.
 * Pure + deterministic.
 */
export function planMusic(input: MusicPlanInput): MusicPlan {
  const mood = MOOD_BY_NICHE.find((m) => m.re.test(input.niche ?? ""))?.mood ?? "neutral";
  const motion = input.motionIntensity ?? 2;
  const short = input.kind === "short";
  const intensity = Math.max(0.15, Math.min(0.6, 0.2 + motion * 0.08 + (short ? 0.1 : 0)));
  const tempoBpm = 80 + motion * 12 + (short ? 15 : 0);
  const duck: DuckSpec = { mode: "sidechain", depthDb: -12 - motion, attackMs: 40, releaseMs: 320 };
  return {
    enabled: Boolean(input.musicEnabled),
    mood,
    tempoBpm,
    intensity: Math.round(intensity * 100) / 100,
    duck,
    prompt: `${mood} instrumental bed, ${tempoBpm} BPM, ${short ? "energetic short-form" : "documentary"} underscore, no vocals, loops cleanly`,
  };
}

// ── Voice direction (#28 / #17) ────────────────────────────────────────────
export type VoiceEmotion = "neutral" | "warm" | "serious" | "excited" | "somber" | "authoritative";
export type VoicePace = "slow" | "measured" | "brisk";

export type VoiceDirection = {
  emotion: VoiceEmotion;
  pace: VoicePace;
  /** 0..1 emphasis — feeds caption emphasis weighting too. */
  emphasis: number;
  /** A short directive appended to the narration prompt. */
  cue: string;
};

export type BeatForVoice = {
  idx: number;
  text?: string;
  shotType?: string;
  /** Marked hero/marquee beat. */
  hero?: boolean;
};

/**
 * Derive per-beat voice direction from the beat + the project's motion dial.
 * Hooks and heroes get more energy/emphasis; a question reads brighter; a
 * statistic reads authoritative. Pure — flows into the ElevenLabs prompt and
 * the caption emphasis. */
export function voiceDirectionForBeat(beat: BeatForVoice, motionIntensity = 2): VoiceDirection {
  const t = (beat.text ?? "").trim();
  const isHook = beat.idx === 0;
  const isQuestion = /\?\s*$/.test(t);
  const hasStat = /\d[\d.,]*\s*(%|percent|million|billion)|\b\d[\d.,]*x\b/i.test(t);

  let emotion: VoiceEmotion = "neutral";
  let pace: VoicePace = "measured";
  let emphasis = 0.4 + motionIntensity * 0.08;

  if (isHook || beat.hero) {
    emotion = "excited";
    pace = "brisk";
    emphasis += 0.2;
  } else if (hasStat) {
    emotion = "authoritative";
  } else if (isQuestion) {
    emotion = "warm";
  }
  emphasis = Math.max(0, Math.min(1, emphasis));

  const cue = [
    emotion !== "neutral" ? `${emotion} tone` : null,
    pace !== "measured" ? `${pace} pace` : null,
    isHook ? "land the hook" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return { emotion, pace, emphasis: Math.round(emphasis * 100) / 100, cue: cue || "even, clear delivery" };
}

// ── VO cleanup pass (#27) ──────────────────────────────────────────────────
export type VoCleanup = { targetLufs: number; highPassHz: number; deEss: boolean; normalize: boolean };

/** Sensible narration cleanup defaults (matches the -14..-16 LUFS media-QC band). */
export const DEFAULT_VO_CLEANUP: VoCleanup = { targetLufs: -15, highPassHz: 80, deEss: true, normalize: true };
