# v2 Backlog

Candidates intentionally **out of scope for v1** (see the development plan's
"Deliberately out of scope"), captured here for later. None block daily use.

## Publishing & growth
- **YouTube OAuth auto-upload** — push the finished MP4 + metadata directly to
  YouTube. Requires Google's API audit (the reason v1 keeps upload manual).
- **A/B thumbnail testing** — rotate the kept thumbnail candidates via YouTube's
  Test & Compare and fold the winner back into the brand kit.
- **Shorts auto-derivation schedule** — the render farm already produces a 9:16
  Short; add a cadence + queue so each long-form spawns scheduled Shorts.
- **Multi-language tracks** — alternate-language VO + captions from one script.

## Product & ops
- **Multi-user / teams** — roles, per-project access (v1 is single-operator).
- **Native mobile app** — the PWA covers mobile in v1.
- **Retention-curve mapping** — the long-form render already stores per-beat
  timings; overlay YouTube retention (needs Analytics OAuth) onto beats.
- **Source Library expansion** — more licensed providers; per-niche source
  presets (Phase 6.5 foundation).

## Hardening (deferred from Phase 9 — do against the live build)
- **Sentry** — production error tracking + alerting (free tier; one DSN env var).
- **Deeper E2E** — authenticated golden-path coverage (needs a CI test user +
  Supabase test project); v1 ships public-surface smoke tests.
- **Lighthouse budgets** — tighten the "warn" thresholds to hard "error" gates
  once the dashboard scores are stable.
