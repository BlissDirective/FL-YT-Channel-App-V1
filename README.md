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
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Operations runbook (env, cron, MCP, troubleshooting) |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log |

## Stack

Next.js 15 · Supabase (Postgres/Auth/Storage/Realtime) · Anthropic Claude ·
ElevenLabs · fal.ai · Pexels · YouTube Data API · Remotion · Vercel ·
GitHub Actions (render farm + cron jobs)

## Repo layout

```
src/app             Next.js routes (dashboard, review queue, /insights, API)
src/lib/adapters    Provider adapters (mock-first: claude, voice, fal, youtube…)
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
change. See [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Operate it from Claude (studio-mcp)

The app ships an MCP server at `/api/mcp` so a Claude client can run your
studio conversationally ("what's pending review?", "approve everything QC
scored above 85"). One-line config in [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm typecheck
```

Build status: **Phases 0–9 complete** — full pipeline, publish kit, live
stats, intelligence/agents, and the studio MCP server. Phase 10 (guided
validation & handoff) remains.
