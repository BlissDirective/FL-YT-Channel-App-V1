# Decision Log

Deviations and notable choices during the autonomous build, per the plan's
standing rules (Full-App-Development-plan.md §5).

## 2026-06-11 — Phase 0

- **Custom warm component library instead of stock shadcn/ui components.**
  The design system (§1.1) is distinctive enough that themed-from-scratch
  components (StatCard, SemicircleGauge, FlowDiagram, etc.) are simpler than
  overriding shadcn primitives. shadcn-style conventions kept (`cn` util,
  composable props); individual shadcn primitives (dialog, dropdown,
  popover) will be added in later phases where accessibility plumbing
  matters.
- **Secret names as configured by the user** (differ from setup.md
  suggestions): `SUPABASE_ANON_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_SECRET_KEY`, `SUPABASE_PASSWORD`, `TRIGGER_SECRET_KEY`,
  `TRIGGER_DEV_PROJECT_REF`, `YOUTUBE_DATA_API_V3`. No `VERCEL_TOKEN` and no
  Supabase URL secret — Vercel access goes through the MCP/Git integration,
  and the Supabase project URL is public configuration, not a secret.
- **Next.js app at repo root instead of `apps/web`.** The pre-created Vercel
  project has no framework preset and no Root Directory configured, and
  neither is settable through the available MCP tools — the first Git deploy
  errored. Hosting the app at the root with `vercel.json` declaring
  `"framework": "nextjs"` makes Git deploys work with zero dashboard
  configuration, which the autonomous build requires. `packages/*` remain
  pnpm workspaces (`@studio/core` today; video/Remotion and mcp-server
  later). Turborepo dropped as unnecessary at this scale.
- **No Anthropic / ElevenLabs / fal.ai / Pexels keys yet** — expected; not
  needed until Phases 4–5. Mock adapters cover everything until then.
- **YouTube Data API key already provided** (`YOUTUBE_DATA_API_V3`) — ahead
  of schedule (Phase 7); verified valid against googleapis.com.
- **Credential verification results (Actions run 3):** the Supabase keys
  belong to project ref `reffwibuitzrkertuuvy` (a project outside this
  session's Supabase MCP scope). `SUPABASE_SECRET_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` verified ✅ (both service_role JWTs);
  `SUPABASE_ANON_PUBLIC_KEY` is **rejected (401)** despite decoding as the
  anon key for the same project — likely mis-copied or rotated; needs
  re-copying before Phase 1 auth work. Trigger.dev secret key
  authenticated ✅. DB password present (tested at first migration).
  Phase 1 migrations will run through GitHub Actions using
  `SUPABASE_PASSWORD`, since the project is outside MCP scope.
