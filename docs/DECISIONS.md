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
- **No Anthropic / ElevenLabs / fal.ai / Pexels keys yet** — expected; not
  needed until Phases 4–5. Mock adapters cover everything until then.
- **YouTube Data API key already provided** (`YOUTUBE_DATA_API_V3`) — ahead
  of schedule (Phase 7); verified valid against googleapis.com.
