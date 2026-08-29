# Course Video Studio — product transformation

This repo is a fork of the Faceless Studio agentic video engine, being
transformed into a **course & training video studio**: source material →
narrated video lessons with a consistent instructor, chapters, and quiz cards.

## Product shape

- **Input:** course outline, PDFs, SOPs, slide decks, or a topic list.
- **Output:** video lessons — instructor avatar + slides/screen capture +
  narration, organized into modules → lessons → chapters, with quiz cards and
  LMS/SCORM export.
- **Lesson formats:** `concept` (explainer), `walkthrough` (how-to/demo),
  `recap` (review).
- **Approval gates:** OUTLINE → LESSON SCRIPT → ASSETS → FINAL.
- **KPIs (replace YouTube Partner Program):** objective coverage, completion,
  assessment pass-rate, accuracy.
- **Moat:** Character Studio = one consistent instructor across the whole
  course library; the fact-check gate keeps teaching accurate.

## What carries over unchanged (the engine)

Gated state machine (`packages/core/src/state-machine.ts`), mock-first adapter
layer (`src/lib/adapters/*`), LLM-judge cascade (`src/lib/adapters/qc.ts`),
learning loop (`operator.ts`, `optimizer.ts`, `memory-service.ts`), cost ledger
(`ledger.ts`, `pricing.ts`, `catalog.ts`), Character Studio + avatar lip-sync,
Agent-SDK editor (`packages/agent/*`), MCP server (`src/lib/mcp/tools.ts`),
Remotion render farm (`packages/render/*`), embeddings + pgvector
(`src/lib/adapters/embeddings.ts`) — reused for doc ingestion / RAG.

## Niche-layer transformation — status

| # | Touch-point | File(s) | Status |
|---|---|---|---|
| 1 | Product identity | `package.json`, `README.md` | ✅ done |
| 2 | Script/generation brain | `src/lib/pipeline/templates.ts` | ✅ done (instructional lesson script: objective hook, teach-in-steps, worked example, CoU, recap; concept/walkthrough/recap formats) |
| 3 | Craft laws override | `src/lib/adapters/script-craft.ts` | ⬜ pending (retention laws → instructional-design laws) |
| 4 | Judge rubrics | `src/lib/pipeline/rubrics.ts` | ⬜ pending (objective coverage, accuracy, pedagogical clarity) |
| 5 | KPIs | `src/lib/pipeline/monetization.ts` | ✅ done (YPP → program growth targets: LEARNERS_GOAL / COMPLETION_HOURS_GOAL / PREVIEW_VIEWS_GOAL; mix = micro-lessons vs full lessons; function signatures unchanged; queries/panel/telegram/tests updated) |
| 6 | Course structure stage | `packages/core`, `engine.ts` | ⬜ pending (module→lesson→chapter tree; quiz cards) |
| 7 | Intelligence source | `src/lib/adapters/youtube.ts`, `intelligence.ts`, `scout.ts` | ⬜ pending (doc-ingest + RAG structuring via `embeddings.ts` + pgvector) |
| 8 | Render compositions | `packages/render/*` | ⬜ pending (slide + instructor-avatar + lower-thirds; chapter cards) |
| 9 | Guardrails | `src/lib/adapters/guardrails.ts` | ⬜ pending (factual-accuracy / citation guard; lean on existing fact-check) |
| 10 | Marketing site | `src/app/(marketing)/*` | ⬜ pending (course-studio positioning) |
| 11 | LMS/SCORM export | new (`src/lib/actions/publish.ts` sibling) | ⬜ pending (SCORM/xAPI package export) |

## Known follow-ups from increment 1

- The outro contract changed from a "subscribe" line to a recap+bridge beat.
  Check for a hardcoded subscribe-outro assertion in
  `src/lib/adapters/script.ts` (`hardRules`) and QC (`rubrics.ts`) and update
  to recap validation.
- `monetization.ts` exports (`desiredMixShortsPct`, `nearerPath`, `mixReason`)
  are imported by the engine/operator/UI — reinterpret semantics but keep names
  stable, or provide shims, so the build stays green.
