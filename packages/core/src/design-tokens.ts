/**
 * "Warm control panel" design tokens — locked in
 * docs/Full-App-Development-plan.md §1.1. CSS custom properties in
 * apps/web/src/app/globals.css must stay in sync with these values.
 */
export const tokens = {
  bgCanvas: "#EDEBE7",
  bgSurface: "#FAF7F1",
  bgCard: "#FFFFFF",
  bgCardWarm: "#FDFBF7",
  accent: "#F5B829",
  accentSoft: "#FCEBC2",
  ink: "#17150F",
  coral: "#F0876C",
  lavender: "#A78BFA",
  success: "#5BB98C",
  muted: "#8A8578",
} as const;

export const chartPalette = [
  tokens.accent,
  tokens.coral,
  tokens.lavender,
  tokens.success,
] as const;
