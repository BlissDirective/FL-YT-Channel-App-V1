/**
 * "Studio dark" design tokens (OpenMontage Remixed #8) — the app control panel
 * shares the cinema-dark language of the /launch hero. CSS custom properties in
 * src/app/globals.css must stay in sync with these values.
 */
export const tokens = {
  // 60% neutral — navy → slate-grey surfaces.
  bgCanvas: "#0A0D16",
  bgSurface: "#0F1420",
  bgCard: "#151B29",
  bgCardWarm: "#1C2333",
  raised: "#262E40",
  // 10% action — shining emerald.
  accent: "#10D48E",
  accentSoft: "rgba(16, 212, 142, 0.14)",
  onAccent: "#04140E",
  // 30% structure — deep purple + supporting hues.
  violet: "#7C5CFF",
  violetSoft: "rgba(124, 92, 255, 0.16)",
  sky: "#38BDF8",
  coral: "#FF6B6B",
  lavender: "#9B7CFF",
  success: "#10D48E",
  warn: "#F5B829",
  ink: "#F5F7FC",
  muted: "#9DA7BD",
  line: "rgba(180, 196, 224, 0.10)",
  edge: "rgba(165, 185, 220, 0.28)",
} as const;

/** Categorical series palette — distinct, bright hues that read on the dark
    navy surfaces (emerald action, deep purple, cyan, rose, amber). */
export const chartPalette = [
  tokens.accent,
  tokens.violet,
  tokens.sky,
  tokens.coral,
  tokens.warn,
] as const;
