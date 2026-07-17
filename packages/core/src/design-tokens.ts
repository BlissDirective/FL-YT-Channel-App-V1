/**
 * "Studio dark" design tokens (OpenMontage Remixed #8) — the app control panel
 * shares the cinema-dark language of the /launch hero. CSS custom properties in
 * src/app/globals.css must stay in sync with these values.
 */
export const tokens = {
  bgCanvas: "#08070D",
  bgSurface: "#100E18",
  bgCard: "#17151F",
  bgCardWarm: "#201D2B",
  raised: "#262230",
  accent: "#F5B829",
  accentSoft: "rgba(245, 184, 41, 0.14)",
  onAccent: "#17150F",
  sky: "#7DD3FC",
  coral: "#F0876C",
  lavender: "#A78BFA",
  success: "#57C98A",
  ink: "#F4F1EA",
  muted: "#9C96A8",
  line: "rgba(244, 241, 234, 0.09)",
} as const;

/** Categorical series palette — bright hues that read on the dark surfaces. */
export const chartPalette = [
  tokens.accent,
  tokens.sky,
  tokens.lavender,
  tokens.coral,
  tokens.success,
] as const;
