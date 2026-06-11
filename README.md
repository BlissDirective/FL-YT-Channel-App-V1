# Faceless Studio

A near-fully-autonomous web app for running faceless YouTube channel
projects: daily content intelligence, AI script + voiceover + video
production with human approval gates, programmatic rendering, and a
publish kit for manual upload — all from one warm, calm control panel.

## Docs

| Doc | Purpose |
|---|---|
| [docs/FacelessChannel-MasterPlan.md](docs/FacelessChannel-MasterPlan.md) | The business playbook |
| [docs/AppBlueprint-TechnicalPlan.md](docs/AppBlueprint-TechnicalPlan.md) | Architecture rationale |
| [docs/Full-App-Development-plan.md](docs/Full-App-Development-plan.md) | Phase-by-phase autonomous build plan |
| [docs/setup.md](docs/setup.md) | Accounts & credentials checklist |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log |

## Stack

Next.js 15 · Supabase · Trigger.dev · Anthropic Claude · ElevenLabs ·
fal.ai · Remotion · Vercel

## Repo layout

```
src/            Next.js app (dashboard, review queue, API)
packages/core   Domain logic: state machine, design tokens
docs/           Plans & decision log
```

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm typecheck
```

Build status: **Phase 0** — scaffold, design system, deploy.
