# Course Video Studio

An AI video-production studio for course creators and training teams. From
your source material — an outline, a PDF, a set of SOPs — it produces
**narrated video lessons** with a **consistent on-brand instructor**, chapter
structure, and quiz cards, ready for a course platform or LMS.

Built on a proven agentic engine (gated pipeline → lesson script → voiceover →
visuals → render → QC → human approval), with a **fact-check gate** for
accuracy and a **learning loop** that turns review feedback into reusable
lessons for future generations.

> **Fork note.** This repo is a niche pivot of an autonomous video engine
> originally built for faceless YouTube channels. The reusable core (state
> machine, mock-first provider adapters, LLM-judge cascade, cost ledger,
> **Character Studio** for a consistent instructor, avatar lip-sync, learning
> loop, Remotion render farm) carries over unchanged; the course product layer
> replaces the YouTube-specific prompts, rubrics, KPIs, intelligence, and
> render compositions. See [PRODUCT.md](PRODUCT.md) for the transformation
> roadmap and status.

## Why this niche

Higher-ticket, stickier, and more defensible than faceless YouTube. Enterprises
and creators spend real, recurring budgets on training and course content, and
the hard part — a **consistent instructor across an entire library** — is
exactly what Character Studio already solves. Buyer: course creators, coaches,
L&D / training teams.

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
