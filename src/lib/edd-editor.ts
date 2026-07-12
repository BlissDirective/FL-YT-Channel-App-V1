/**
 * MVDA edit operations moved to @studio/core (edd-ops.ts) in Phase C — the
 * agent worker (packages/agent) and the /edit inspector call the SAME pure
 * mutation layer (C1). This shim keeps the app's import path stable.
 */
export {
  retimeClip,
  setTrim,
  swapClipAsset,
  setTransition,
  setMotion,
  kenBurnsPreset,
  heroHoldPreset,
  setClipSilent,
  setTokenEmphasis,
  setPageStyle,
  addAudioCue,
  removeAudioCue,
  setAudioGain,
  addOverlay,
  updateOverlay,
  removeOverlay,
  setIntroOutro,
  normalizeTarget,
  diffSummary,
} from "@studio/core";
