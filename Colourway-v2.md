# Colourway v2 — navy · emerald · deep purple

A full re-theme of the app + marketing hero to a **modern / technical /
sophisticated / clean / bold** identity, built on the **60-30-10** rule and
2026 dark-UI best practices (layered darkness over flat black, desaturated
accents, ambient mesh gradients, dark glassmorphism with visible hairline
borders). The app is fully tokenised, so the flip is a token-value change in
one `@theme` block + a mirrored `design-tokens.ts`.

## The system

**60% — Dominant neutral (navy → slate-grey).** Stepped surfaces, never pure
black: `canvas #0A0D16` → `surface #0F1420` → `card #151B29` →
`card-warm #1C2333` → `raised #262E40`. The shell sits on an **ambient mesh**
(`.app-aurora`): a navy→slate base wash plus two drifting, heavily-blurred
light-leaks (deep-purple + faint emerald).

**30% — Secondary / supporting structure (deep purple + cool grey + white).**
`violet #7C5CFF` (+ `violet-soft`) anchors sidebars, selected states, and
filled feature-block gradients. Cool grey (`muted #9DA7BD`) + near-white
(`ink #F5F7FC`) carry text; `edge rgba(165,185,220,0.28)` is the bold outline
for toggles/outlined blocks (≥3:1 on navy).

**10% — Accent / action (shining emerald, used sparingly).** `accent #10D48E`
(+ `accent-soft`, `on-accent #04140E`) for primary CTAs, active/live, key
links, and focus rings. Semantics: success unifies with emerald; `coral
#FF6B6B` = error; `warn #F5B829` (retained amber) = warning; `sky #38BDF8` =
info.

## Contrast rule (no dark-on-dark)

Every block/button/toggle resolves to one of two treatments, so nothing
disappears into the gradient:
- **Filled block** — `.fill-emerald` / `.fill-violet` gradient (max contrast).
- **Outlined glass** — `.glass` (translucent navy + hairline `line` border +
  backdrop blur); `.glass-edge` adds the bold `edge` border for toggles.

## Depth + flourish

- **`.glass-shine`** — a specular gloss overlay (top-left highlight + bright
  top hairline) layered on select glass cards and gradient fill blocks.
- **React Bits — Star Border** (`<StarBorder>` + `.star-border`): token-driven
  animated star tracks that spotlight KEY surfaces (the Clean House admin
  panel).
- **React Bits — Shiny Text** (`.shiny-text`): a light sweep across the nav
  wordmark.
- Existing effect CSS (tile glow, scanline, stage-pulse, spotlight, live-dot,
  gradient-text) retuned from amber → emerald/violet via an `--accent-rgb`
  channel var. `prefers-reduced-motion` disables all new animation.

## Scope

- `src/app/globals.css` — `@theme` tokens + mesh + glass/shine/fill/edge/
  star-border/shiny utilities + effect retune.
- `packages/core/src/design-tokens.ts` — value sync + distinct `chartPalette`.
- `src/app/(marketing)/marketing.css` + hero components — matched to the new
  palette (`--m-amber` now carries emerald; purple + navy throughout).
- Chart/nav/checkpoint literals flipped to the new palette. Data-viz +
  OG image updated.
- **Left intentionally unchanged:** per-project `brand_kit` colours (the
  Amber/Coral/Lavender/Emerald video-branding presets + defaults) — those are
  user *content* burned into rendered videos, not app chrome.

Verified: `tsc`, `eslint`, **968/968 vitest**, `next build`, visual QA (theme
board, login, Clean House flagship).
