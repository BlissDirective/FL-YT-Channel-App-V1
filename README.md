# GTM Video Studio

An AI video-production studio for go-to-market teams. From a single product
brief it produces two things founders and growth marketers actually pay for:

1. **UGC-style ad creatives** — short, hook-led, feed-native videos with an
   AI presenter, generated in **A/B variants** so you can test hooks and angles.
2. **Product-demo / launch videos** — tight feature walkthroughs and
   go-to-market launch narratives, narrated over screen capture and b-roll.

Built on a proven agentic engine (gated pipeline → script → voiceover →
visuals → render → QC → human approval), with a **self-improving loop** that
learns which hooks and angles win and biases future generations toward them.

> **Fork note.** This repo is a niche pivot of an autonomous video engine
> originally built for faceless YouTube channels. The reusable core (state
> machine, mock-first provider adapters, LLM-judge cascade, cost ledger,
> character/avatar consistency, learning loop, Remotion render farm) carries
> over unchanged; the go-to-market product layer replaces the YouTube-specific
> prompts, rubrics, KPIs, intelligence, and render compositions. See
> [PRODUCT.md](PRODUCT.md) for the transformation roadmap and status.

## Why this niche

Faceless YouTube is saturated and increasingly penalized. GTM video points the
same engine at buyers with real budgets and measurable ROI: ad creative maps to
ROAS, and the existing bandit/optimizer loop *is* creative-performance
optimization. Buyer: founders, growth/performance marketers, agencies.

## Stack

Next.js 15 · Supabase (Postgres/Auth/Storage/Realtime) · Anthropic Claude ·
ElevenLabs · fal.ai (video + avatar lip-sync) · Pexels · Remotion · Vercel ·
GitHub Actions (render farm + cron jobs)

## Repo layout

```
src/app             Next.js routes (dashboard, review queue, API)
src/lib/adapters    Provider adapters (mock-first: claude, voice, fal, avatar…)
src/lib/pipeline    State machine engine, intelligence & optimizer runs
src/lib/mcp         studio-mcp tool registry (operate the app from Claude)
packages/core       Domain logic: state machine, design tokens
packages/render     Remotion compositions + the Actions render worker
supabase/migrations SQL migrations (applied by the DB Migrate workflow)
docs/               Plans, decision log, and the operations runbook
```

## Mock-first

Every external service sits behind a typed adapter with a mock mode, so the
whole app — UI, pipeline, review gates, rendering, agents — runs end-to-end
with **zero credentials**. Adding a key flips that adapter to live with no code
change.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm typecheck
```
