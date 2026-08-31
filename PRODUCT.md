# GTM Video Studio — product transformation

This repo is a fork of the Faceless Studio agentic video engine, being
transformed into a **go-to-market video studio**: UGC-style ad creatives (with
A/B variants) and product-demo / launch videos for B2B teams.

## Product shape

- **Input (brief):** product URL / positioning doc, feature list, ICP, brand
  kit (logo, colors, voice), optional screenshots.
- **Two output modes:**
  - `ugc_ad` — 15–45s, AI presenter (avatar lip-sync), hook-led, N A/B variants.
  - `product_demo` — 60–120s, screen capture + narration + b-roll, feature
    walkthrough / launch narrative.
- **Approval gates:** BRIEF → SCRIPT/HOOK → VARIANTS/ASSETS → FINAL.
- **KPIs (replace YouTube Partner Program):** hook-rate, CTR, ROAS, cost/variant.
- **Moat:** the existing bandit/optimizer loop pointed at variant performance —
  the studio learns which hooks/angles convert and biases new generations.

## What carries over unchanged (the engine)

Gated state machine (`packages/core/src/state-machine.ts`), mock-first adapter
layer (`src/lib/adapters/*`), LLM-judge cascade (`src/lib/adapters/qc.ts`),
learning loop (`operator.ts`, `bandit.ts`, `optimizer.ts`, `memory-service.ts`),
cost ledger (`ledger.ts`, `pricing.ts`, `catalog.ts`), avatar/character
consistency, Agent-SDK editor (`packages/agent/*`), MCP server
(`src/lib/mcp/tools.ts`), Remotion render farm (`packages/render/*`).

## Niche-layer transformation — status

| # | Touch-point | File(s) | Status |
|---|---|---|---|
| 1 | Product identity | `package.json`, `README.md` | ✅ done |
| 2 | Script/generation brain | `src/lib/pipeline/templates.ts` | ✅ done (DR marketing script, ugc_ad + product_demo, hook/CTA structure) |
| 3 | Craft laws override | `src/lib/adapters/script-craft.ts` | ✅ done (retention laws → direct-response ad craft: 3-second hooks, pain→stakes→mechanism→proof→CTA spine, punch/show/talk pacing, UGC voice + claim compliance, single-CTA close) |
| 4 | Judge rubrics | `src/lib/pipeline/rubrics.ts` | ✅ done (IDEA→ICP fit/pain evidence/angle/hook potential/offer coherence; SCRIPT→hook×2, offer delivery×2, spine economy, claim compliance×2, native voice, CTA clarity; ASSETS→product visibility; FINAL→feed-ready; qc.ts gate briefs = performance creative director) |
| 5 | KPIs | `src/lib/pipeline/monetization.ts` | ✅ done (YPP → campaign growth targets: AUDIENCE_GOAL / CONSIDERATION_HOURS_GOAL / AD_VIEWS_GOAL; mix = ad variants vs demos; function signatures unchanged; queries/panel/telegram/tests updated) |
| 6 | Variant fan-out stage | `src/lib/pipeline/variants.ts`, `src/lib/actions/variants.ts` | ✅ done — core + engine wiring. `deriveVariantsAction` inserts sibling videos via `parent_video_id` (mirrors derived Shorts) + a per-variant `scripts` row (hook-swapped beats), entering at GENERATING_ASSETS so the asset cache reuses the parent's VO/visuals for beats 1..n. `DeriveVariants` surface on the video page; action manifest updated. Tests in `tests/variants.test.ts` |
| 7 | Intelligence source | `src/lib/adapters/youtube.ts`, `intelligence.ts`, `scout.ts` | ⬜ pending (competitor-ad research / winning-hook mining) |
| 8 | Render compositions | `packages/render/*` | ⬜ pending (UGC vertical talking-head + demo screen/captions) |
| 9 | Guardrails | `src/lib/adapters/guardrails.ts` | ⬜ pending (ad-platform claims/compliance) |
| 10 | Marketing site | `src/app/(marketing)/*` | ⬜ pending (GTM positioning) |

## Known follow-ups from increment 1

- ✅ Resolved: the closing contract is now a single offer-CTA end-to-end —
  `hardRules` closing-beat rule, `ensureCtaBeat` fallback, `isCtaLike` offer
  patterns (start free / book a demo / get the template), the mock script's
  final beat, and the SCRIPT rubric's `cta_clarity` criterion all agree.
- `monetization.ts` exports (`desiredMixShortsPct`, `nearerPath`, `mixReason`)
  are imported by the engine/operator/UI — reinterpret semantics but keep names
  stable, or provide shims, so the build stays green.
