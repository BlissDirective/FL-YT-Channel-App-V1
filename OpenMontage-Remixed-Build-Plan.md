This is going to be a large build plan with multiple new complex systems. We will build everything item by item. Once we begin the build. I’d like you to detail the item to me in chat, with your evaluation, and any potential enhancements you think would be beneficial for the individual item at hand, or if the item would benefit from being joined or merged with. Previously built or existing system. 
Whenbuilding items or tasks from this spec, aftwr each item/task completion upon mext merge push to main branch, add a completion note to this doc "signing off" on completion of that individual task or item for future build reference. 
Main rules for UI/Design builds:
Moving forward I want all designs to be visually striking, modern, and organized, user friendly and design savvy. Use your absolute best judgement based on top video production apps for the full app design. Everything should be coherent from the hero page to the settings page. Leverage animations, react bits, unique fonts, striking effects, and modern organized layouts throughout the app. 

Any new functions or capabilities should be added in a clean organized manner. If multiple types of systems fall into a similar functional category, consider adding drop down or expanding menu options to the app to keep it clean and organized while adding unique effects and modern flare and styles

Each item/task should be tested thoroughly. Push merge to main after each task, use browser viewing capabilities to assess the actual look, UX, and functionality as well as any code tests applicable. 

Await my review and authorization of actions before proceeding to next task in build plan. Unless I directly specify otherwise. (I.e.: build and test the next 5 tasks in a row)

Perform a quick scan of all items/tasks to assess totality of the build plan. If anything stands out (should be grouped or built together, or anything that should be built first) please speak up. All of these items/tasks should build coherently and expand/enhance the app in a holistic manner. 

Please proceed to elaborate upon and build the following concepts:
8.	Live production board (“Backlot”). A project-level board where stages light up and scene cards shimmer while assets generate, with replay/scrub. Remix: you just built the tile glow + live progress — this is the bigger version: a per-project live activity board (my earlier idea #6). Strong director-mode fit. Synchronize design, look, feel, color-way, and effects as the hero page. I like the darker, more colorful design concepts. I want to steer away from the beige and light orange colorway we have in the main app. Also I would like to integrate more designs, animations, react bits, and effects into the actual app. The live production board should integrate with the library as an interactive user home hub control panel screen (Think, futuristic modern, clean organized video editing studio) when redesigning, run critical and thorough tests to make sure no features and capabilities are lost. This should be a major redesign, as well as adding the live activity board concept functions. 

> ✅ **SIGNED OFF — Task #8 complete (branch `claude/openmontage-build-plan-be7rb9`).**
> **Major dark redesign + Backlot live production board.**
> - **App-wide "studio dark" theme.** The whole control panel now shares the `/launch` hero's cinema-dark language (coherent hero → settings). Done as a token-value flip in `globals.css` + `packages/core/design-tokens.ts` — every semantic surface (`bg-card`/`text-ink`/`text-muted`/…) re-themes at once, so no screen lost functionality. The overloaded `ink` token was split into `ink` (light primary text), `raised` (dark elevated chips/overlays) and `on-accent` (dark text on amber); ~100 inversion spots were migrated by a verified mechanical pass. Chart/gauge/status literal colors were repointed to the dark palette. Expanded colourway now uses amber + sky + lavender + coral + green (steered off beige/light-orange). Display faces (Space Grotesk / Sora) loaded into the app so headings match the hero; nav wordmark + gradient logo restyled; a fixed aurora atmosphere sits behind the shell.
> - **New effect/react-bits layer in the app:** `.spotlight`, `.gradient-text`, `.app-aurora`, `.marquee`, `.scanline`, `.stage-live`/`.flow-spark` (stage glow + travelling energy spark), `.live-dot`, plus shared scroll-reveal primitives and a new app-side `<Spotlight>` bit.
> - **Backlot board** now heads the Library (the home-hub control panel): a live **stage rail** (5 pipeline lanes that pulse/glow when an agent is working the lane, with live counts + "your turn" pips + connector sparks — `backlotStages()` in `pipeline.ts`, `backlot-stage-rail.tsx`), and a **live activity board** with LIVE marquee + REPLAY scrub of the real `getFeedEntries()` stream (`backlot-ticker.tsx`). Active scene cards gained a `.scanline` render sweep over the existing tile-glow. Realtime publication extended (`0057_backlot_realtime.sql`: assets, scripts, cost_ledger, operator_events, qc_reviews) so the board animates the moment work happens.
> - **No features lost.** All Library capabilities preserved (sections, tiles, quick-actions, director mode, Scout, Intel/Settings, new-asset, idea generator, signal strip). Verified: `tsc` clean, `eslint` clean, **811/811 vitest**, `next build` clean, and desktop + mobile visual QA of the board (temporary preview route used then removed).
> - **Slots for later tasks:** the rail + card states are structured to accept richer progress from #4/C10 (`partial_progress`) and B5 (structured blocker) without a redesign.

	1.	Scored provider selection (7-dimension). They score every provider on task-fit/quality/control/reliability/cost/latency/continuity and log the winner + alternatives. Remix: extend your V2 routeMedium from “cheapest medium” into a scored model selector across your fal providers (Seedance/Kling/Veo/LTX/Wan, FLUX schnell/dev) — pick per beat with a logged rationale.

> ✅ **SIGNED OFF — Task #1 complete (branch `claude/openmontage-build-plan-be7rb9`).**
> **7-dimension scored provider/model selector, per beat, with logged rationale.**
> - **Pure core scorer** (`packages/core/src/provider-score.ts`): `scoreProviders(candidates, ctx)` scores every candidate on the seven dimensions — **task-fit / quality / control / reliability / cost / latency / continuity** — with a shot-role weight profile (heroes weight quality/continuity/reliability; b-roll weights cost/latency/fit), returns the **winner + ranked alternatives + per-dimension breakdown + a human rationale**, prefers the best *affordable* model, and never fails (falls back to cheapest, mirroring `routeMedium`). Catalog-agnostic + I/O-free → fully unit-tested (`tests/provider-score.test.ts`, 11 cases).
> - **App adapter** (`provider-selector.ts` + client-safe `provider-candidates.ts`): maps `VIDEO_MODELS` → candidates (quality/control/latency priors), constrains a **per-tier candidate pool** (Economy stays cheap; Platinum/Director can reach Veo/Kling; Custom respects the operator's locked recipe), and folds in **live provider health** — the fal circuit-breaker benches all fal models on outage, and **recent per-model `clip_jobs` error rates** down-weight a flaky model (a self-improving reliability signal).
> - **Integrated at the real seam:** `fullAutoGenerate`'s clip enqueue now scores each already-selected beat (tier pick = prior/fallback, so `auto-tiers` stays the deterministic baseline and its tests stay green), threads a per-beat budget + continuity family, and **enqueues the winner** with the full decision logged to the new **`clip_jobs.selection` jsonb** (`0058_clip_job_selection.sql`). The clip worker copies it onto `assets.meta.selection` for regenerable-asset provenance, and the cost-ledger line names the model — this is the seed of the #9 decision audit trail.
> - **Visible surface:** a live, interactive **Model-selection scoreboard** on the project Settings page (`provider-scoreboard.tsx`) runs the *same* pure scorer and shows, per tier + hero/b-roll, the ranked models with 7-dimension bars and the winner's rationale — dark/cinematic, on-brand with the #8 redesign.
> - Verified: `tsc` clean, `eslint` clean, **822/822 vitest** (+11 new), `next build` clean, and visual QA of the scoreboard.

	6.	Post-render technical self-review. ffprobe the output: frames at 4 positions, audio levels, black-frame/silence detection, subtitle presence. Remix: extend your Self-Watch watch-gate with a technical QC pass (your frame-critic judges content; this catches broken renders).

> ✅ **SIGNED OFF — Task #6 complete (branch `claude/openmontage-build-plan-be7rb9`).**
> **Post-render technical self-review — extended the existing media-QC into a full ffprobe + frame-sampling pass.**
> - The app already ran a free ffmpeg pass (black / freeze / silence / loudness) that holds a broken render at Final review. #6 adds the missing dimensions, all in `packages/render/src/media-qc.ts`:
>   - **ffprobe structural probe** (`parseProbe`): duration, resolution, video codec, and — the new hard check — **audio-track presence** (a silent narration render is held).
>   - **Frames at four positions** (`sampleFrameBlanks` + `evaluateFrame`): extracts a 16×16 grayscale frame at 8/35/62/90% via ffmpeg (no image lib) and flags **blank** frames by luma variance; **≥2 blank positions hard-holds** (a broken/truncated render the black-*stretch* detector misses), a single stylistic solid frame does not.
>   - **Subtitle / caption presence**: reports soft subtitle streams from ffprobe and reconciles against the caption intent (burned-in captions carry no stream) — advisory.
> - All new inputs to `evaluateMediaQc` are **optional**, so the existing black/silence/loudness behaviour and its tests are unchanged; the driver `runMediaQc(filePath, { captionsExpected })` orchestrates ffmpeg + ffprobe + frame sampling and degrades gracefully when a binary is absent.
> - **Wired** into the render worker (`render-queue.ts`): the verdict stores on the render asset's `meta.mediaQc`, a hard defect holds the video with a **specific reason** (which check failed), and the Self-Watch gate already consumes this meta.
> - **UI:** a **Technical QC panel** on the video page (`technical-qc.tsx`) — probe summary, per-check pass/warn/fail with notes, and a four-segment frame strip. Dark/on-brand.
> - Verified: `tsc` clean, `eslint` clean, **839/839 vitest** (+11 new: parseProbe, frame eval, frames/audio/subtitle checks), `next build` clean, and visual QA of the clean + held panels.

	7.	Source-media inspection. Probe every generated asset (resolution, codec, duration, audio channels) before using it. Remix: an asset-spec validator in runAssetGeneration — reject a malformed Seedance clip before it reaches compile.

> ✅ **SIGNED OFF — Task #7 complete.** Pure `validateMediaSpec(spec, expect)` in `@studio/core` rejects a clearly-broken generated clip — no video stream, zero-length, truncated to under half its target duration, or below the resolution floor — while never false-rejecting a healthy asset. Wired into the clip worker (`clip-queue.ts`): each generated clip is `ffprobe`-probed and validated BEFORE upload/compile; a malformed clip throws → the beat re-rolls instead of poisoning the cut. The probed spec is stored on `assets.meta.sourceSpec` (provenance for #9/C2). ffprobe-absent → validation skipped (no false reject). Verified: `tsc`, `eslint`, **848/848 vitest** (+9 new).

	9.	Decision audit trail. Every creative/technical choice (provider, style, voice, music, fallbacks) logged with alternatives + confidence + reasoning. Remix: extend operator_decisions / cost ledger into a per-video decision log — improves explainability and feeds your operator-signal learning.

> ✅ **SIGNED OFF — Tasks #9 + C2 complete (built together, branch `claude/openmontage-build-plan-be7rb9`).**
> These two share one substrate — a per-choice record carrying the exact reproduction params — so they were built as one coherent change on top of #1's `clip_jobs.selection`.
> **#9 Decision audit trail:**
> - New append-only **`decisions` table** (`0059_decisions.sql`, RLS + realtime): one row per creative/technical choice — `kind` (model/provider/medium/tier/voice/music/style/fallback/regenerate), `choice`, `alternatives` jsonb, `confidence`, `reasoning`, `cost_usd`, and the exact **`params`** to reproduce. Generalises the Director-only `operator_decisions` into a log every mode writes to.
> - **`recordDecision` / `recordDecisions`** best-effort writers (never break generation) in `pipeline/decisions.ts` (unit-tested, 5 cases).
> - **Wired at real choice points:** each beat's scored model pick (from #1) → a `model` decision with alternatives + confidence + reasoning; the Visual Bible → a `style` decision; every re-roll → a `regenerate` decision.
> - **Decision Trail UI** (`decision-trail.tsx`): a collapsible per-video panel on the video page — kind icons, choice, confidence, ranked alternatives, reasoning, cost, live-updating via realtime. Dark/on-brand.
> **C2 Regenerable workspace:**
> - Every generated still now stores its **exact request** on `meta.request` (prompt, model, endpoint, image size, **seed**) — `generateImage` was extended to capture/return a concrete seed (`fal.ts`), so an asset is reproducible, not just re-rollable.
> - **`regenerateAsset` + `regenerateAssetAction(projectId, assetId, reproduce)`** replay the stored request (same seed = exact reproduction; fresh seed = a variation) without re-running the stage, logging a `regenerate` decision. Registered in the server-action contract manifest.
> - **First-class UI:** a "Reproduce" control on each regenerable clip tile (ClipsGrid); the clip worker also copies the selection/request onto `assets.meta` for provenance.
> - Verified: `tsc` clean, `eslint` clean, **828/828 vitest** (+6 new), `next build` clean, and visual QA of the Decision Trail.

	10.	Localization & dub pipeline. Subtitle/dub/translate an existing video into other languages. Remix: a new repurpose path over your EDD (swap the VO track + captions per language) — a real monetization multiplier on content you already made.


	11.	Provider fallback chains. Scored primary → automatic fallback on failure, logged. Remix: thread a fallback list through your mock-first adapters (isXLive) for reliability.

> ✅ **SIGNED OFF — Task #11 + B1 complete (Batch 1).** The #1 scored ranking IS the fallback chain: pure `buildFallbackChain(selection)` → `[winner, ...alternatives]`, and `fallbackForAttempt(chain, attempt)` walks it (`@studio/core/provider-fallback.ts`, 8 tests). Wired into the clip worker: a failed clip now **re-queues** (previously it just errored) and on each retry walks to the **next-best scored model** instead of hammering the one that failed, logging the substitution as a `kind:"fallback"` decision (#9 trail). Past the chain it flags `exhausted` with a terminal cross-medium edge to a still (B1's tool-graph fallback). Verified: `tsc`, `eslint`, **856/856 vitest** (+8).

	14.	Free-corpus documentary retrieval (CLIP-indexed). Build b-roll from Archive.org/Wikimedia/Pexels via CLIP retrieval, no paid video API. Remix: a new “free footage” medium in your router + a boost to V4 grounding (retrieve real motion, not just stills).

> ✅ **SIGNED OFF — Batch 9 (list1 #14).** New `free_footage` medium in the shot-router (cost 0; maps to stock execution + segment) — gated behind `ctx.freeFootageAllowed` so establish/motion beats get **real free documentary motion before any paid i2v**, with existing routing unchanged when off. Core `free-footage.ts` (`@studio/core`): `isEligible` (open-license incl. Pexels + min-length gate over Archive.org/Wikimedia/Pexels) and `rankFreeFootage`/`bestFreeFootage` ranking by CLIP score when supplied else keyword overlap, with corpus priors. Verified: `tsc`, `eslint`, **913/913 vitest** (+7, existing router tests unaffected).

15.	Music generation + bed. Suno / ElevenLabs Music for a soundtrack with ducking. Remix: turn on your D8 music (currently schema-present, gated off) via an ElevenLabs-Music adapter + your existing DuckSpec.

> ✅ **SIGNED OFF — Batch 6: list1 #15/#27/#28, list2 #22/#17.** Core `audio-plan.ts` (`@studio/core`): `planMusic(input)` resolves the soundtrack at **proposal time** (mood from niche + intensity/tempo from the taste dial + a **sidechain DuckSpec**), so late music failure is impossible (#22); `voiceDirectionForBeat(beat)` derives per-beat tone/emotion/pace/emphasis (hook → excited, stat → authoritative, question → warm) that flows into narration + caption emphasis (#28/#17); `DEFAULT_VO_CLEANUP` targets the media-QC band (#27). Mock-first **ElevenLabs Music adapter** (`music.ts`, isMusicLive) synthesises the planned bed. Voice direction is wired into `synthesizeSpeech` → ElevenLabs `voice_settings` (steadier for authoritative, more expressive for excited). Verified: `tsc`, `eslint`, **895/895 vitest** (+11).

	16.	Style playbooks (reusable YAML looks). A library of named visual styles. Remix: promote your per-video Visual Bible into reusable per-niche style playbooks you can apply to new videos.

	17.	Scene detection on generated clips. Detect cut points inside footage. Remix: feed into the MVDA’s retime/trim decisions for tighter cuts.

> ✅ **SIGNED OFF — Batch 10 (list1 #17).** Core `scene-detection.ts` (`@studio/core`): `scenesFromCuts(cuts, duration)` turns ffmpeg scene-change scores into contiguous sub-scenes, `sceneTrimSuggestion(scenes, targetSec)` picks a trim window inside a single scene so a cut never crosses an internal jump (falling back to the longest scene, flagged), and `trimCrossesCut` is a retime/QC signal — feeding the MVDA's trim decisions for tighter cuts. Verified: `tsc`, `eslint`, **918/918 vitest** (+7).

	20.	Platform output profiles. 16:9 / 9:16 / Reels / TikTok / LinkedIn / 21:9 render presets. Remix: your model already has 9:16/short — formalize platform profiles (ties into your TikTok/IG expansion).

> ✅ **SIGNED OFF — Batch 7: list1 #20/#29.** Core `platform-profiles.ts` (`@studio/core`): named `PLATFORM_PROFILES` (YouTube 16:9 + Short 9:16, TikTok, Reels, IG Feed 4:5, LinkedIn 1:1, Cinema 21:9) each with dimensions, platform duration ceiling, and caption safe-area; `defaultProfilesFor(kind)`, `fitsProfileDuration`, and `multiAspectTargets(ids)` which dedupes a profile set to the distinct aspects one assembly plan compiles to (#29 — TikTok+Reels+Short = one 9:16 render). UI: a **Platform profiles** reference card on project Settings (grouped by aspect with proportional glyphs, dims, limits). Verified: `tsc`, `eslint`, **901/901 vitest** (+6), `next build`.

	22.	Web-research-first brief — structured research (YouTube/Reddit/HN/news/academic) with citations before scripting. Remix: upgrade Scout into a cited research brief feeding runScripting.

> ✅ **SIGNED OFF — Batch 8: list1 #22.** Core `research-brief.ts` (`@studio/core`): a `ResearchBrief` (topic/angle/audience + findings tied to sources across youtube/reddit/hn/news/academic), `findingConfidence` scored from citation credibility + breadth, `citedFindings` (only cited, above-floor findings feed scripting — no uncited hunches), and `briefToScriptContext` rendering a citation-annotated block for the scripting prompt. Mock-first `research.ts` adapter (isResearchLive) upgrades Scout into this brief with zero credentials. Verified: `tsc`, `eslint`, **906/906 vitest** (+6).

	23.	Three-layer knowledge architecture (tools → skills → deep tech knowledge). Remix: formalize a per-stage skill file set (you now have the editing-craft one) so each agent has a house rubric.
	24.	HyperFrames-style kinetic typography / SVG character animation. Remix: you already have programmatic “stick” scenes — borrow their GSAP kinetic-typography patterns for punchier text moments.
	25.	Reviewer/checkpoint “meta” skills — explicit reviewer protocols at gates. Remix: codify your QC-gate reviewer behavior as a skill the judge reads.
	26.	Resumable checkpoints with cost snapshot. Remix: enrich build_runs with a decision + cost snapshot so a failed run resumes cleanly.
	27.	Audio mixing / ducking / noise-reduction / enhance. Remix: activate your gated audio-ducking path + a cleanup pass on VO.
	28.	Voice direction (tone embedded in narration prompt). Remix: pass tone/emotion cues into your ElevenLabs adapter per beat.
	29.	Multi-aspect single-render output. Produce 16:9 + 9:16 from one project. Remix: one Assembly plan → two compiled EDDs at two aspects.


1.	Canonical artifact per stage + schema validation — each stage emits one JSON artifact validated against a schema (brief → script → scene_plan → asset_manifest → edit_decisions → render_report). Remix: formalize your stage outputs as schema-validated artifacts (you have EditDocument/validateEdd — extend the same discipline upstream to brief/plan/manifest).

> ✅ **SIGNED OFF — Batch 2: list2 #1/#3/#4/C10, list1 #26, list2 #6.** Core `stage-artifacts.ts` (`@studio/core`): the 6 canonical stages, `validateStageArtifact(kind, data)` schema validation, the `CHECKPOINT_STATUSES` vocabulary (`in_progress/completed/awaiting_human/failed`), and `partial_progress` (`progressLabel`/`progressFraction`/`remainingUnits` — the resume math). `cost-reconcile.ts`: `reconcileCosts(ledger, assets)` → per-provider/per-kind attribution + drift. New tables/cols (`0060`): `stage_artifacts` (schema-validated per-stage JSON), `videos.partial_progress` (persisted "N of M clips" → resumable), `build_runs.cost_snapshot`. Wired: the clip worker persists `partial_progress` as each clip lands; the render worker upserts a validated `render_report` artifact. UI: a **Cost reconciliation panel** on the Spend page (ledger vs. asset manifest, per-provider deltas, per-kind chips) + display-font header. Verified: `tsc`, `eslint`, **866/866 vitest** (+10), `next build`, visual QA.

	3.	Scene-plan as a first-class stage (with a gate) between script and assets. Remix: your Assembly SegmentPlan basically is this — elevate it to a canonical, schema-validated, gate-able pipeline stage.

	4.	Checkpoint status vocabulary + partial_progress (in_progress / completed / awaiting_human / failed, refreshed during multi-asset stages). Remix: enrich build_runs with partial_progress to feed the live board + your new working-tile progress at finer granularity.

	6.	Provenance-linked cost reconciliation — per-provider spend reconciled against the asset_manifest. Remix: reconcile cost_ledger to per-asset provenance for true per-asset cost.

7.	Registry-driven tool discovery (never hardcode providers). Tools self-declare capability/provider/runtime/fallback/skills/install-steps; selectors auto-discover. Remix: a provider registry so adding a model becomes config, not code — your adapters become registry entries.

> ✅ **SIGNED OFF — Batch 3: list2 #7/#9/#10/#11/#29.** Declarative `capability-registry.ts` (`@studio/core`): each capability self-declares its required services, setup **effort** (env / install / hardware, #11), **stability** tier (production / beta / test, #29), and exact **unlock** steps — adding a capability is config, not code (#7). `computeCapabilities(present)` resolves available vs. locked; `capabilitySummary` gives "X of Y". UI: a **Capability menu** on Settings (#10) — "what you can do now / could unlock", grouped by effort, locked items showing their unlock commands, stability badges throughout. Verified: `tsc`, `eslint`, **869/869 vitest** (+3), `next build`, visual QA.

	9.	Per-tool agent_skills (Layer-3 vendor knowledge) the agent must read before calling. Remix: attach a per-model prompting skill (e.g. “seedance-2-0”, “flux-best-practices”) your generation adapters inject — “usable” vs “cinematic” prompts.

	10.	Capability menu preflight (“X of Y configured”, grouped by setup effort). Remix: upgrade your Settings credential-health into a “here’s what you can do now / could unlock” menu.

	11.	Install-instructions grouped by effort (env var / install / hardware). Remix: make credential-health actionable — each missing key shows exactly how to unlock it.

	13.	Taste dials / taste_profile — design read, visual variance, motion intensity, information density, anti-patterns — carried from proposal through every stage. Remix: a taste_profile on the project that conditions the Visual Bible, compositor, and critics. Big consistency lever.

> ✅ **SIGNED OFF — Batch 4: list2 #13/#14/#24, A6, C9, list1 #16.** Core `taste.ts` (`@studio/core`): a per-project `TasteProfile` (design read / visual variance / motion intensity / information density dials + editable anti-patterns + machine-checkable quality rules), reusable `STYLE_PLAYBOOKS` (Clean Explainer / Cinematic Documentary / Kinetic Short — palette + dials + rules), `checkQualityRules(rules, measured)` that enforces constraints as violations with 3-tier severity (C9/#24/#26), `applyPlaybook`, and `scoreDistinctness` (#14 — a pure "could this be any other product's video?" pre-gate). Persisted on `projects.taste_profile` + `style_playbook` (`0061`); a playbook merges into the stored effective profile every stage reads. UI: a **Taste & style** card on project Settings — playbook picker w/ palette swatches, taste dials, and the editable **anti-patterns panel** (A6). Verified: `tsc`, `eslint`, **879/879 vitest** (+8, action manifest updated), visual QA.

	14.	Distinctness review: “Could this be any other product’s video?” Remix: a distinctness critic/gate that rejects generic output — a direct antidote to AI sameness.

	15.	Disney’s 12 principles of animation as the motion rubric. Remix: bake the 12 principles into the MVDA’s motion/keyframe skill — smarter than preset picking.

	16.	Scene-types as a “mechanics codex,” not a menu — in bespoke mode, read your scene specs as composable primitives, not drag-and-drop blocks. Remix: treat your compositor scene-spec vocabulary as building blocks for one-off scenes.

	17.	Voice/tone → embedded direction carried in the artifact so downstream stages preserve it. Remix: a tone/emotion field on beats that flows into ElevenLabs + caption emphasis.

	20.	Decision Communication Contract: “announce before execution” — before any paid call, state tool/provider/model/reason/sample-or-batch. Remix: a pre-spend announcement line (huge for director-mode trust).

	21.	“Ask before major changes” list — an explicit set of changes that re-trigger approval (switch provider/model/treatment/engine, drop narration/music, sample→batch). Remix: codify which mid-run changes re-open a gate.
	22.	Music plan resolved at proposal time, never deferred (late music failure is expensive). Remix: decide music at script/plan stage, not render.
	23.	Structured blocker escalation — a standard payload: what was attempted / what failed / category / options / recommendation. Remix: replace bare “failed” on tiles/console with this structured blocker.
	24.	Playbook quality_rules as hard constraints (not suggestions). Remix: let your style playbooks carry enforceable rules (“≤2 caption lines”) the critics treat as constraints.

	25.	Reviewer protocol: max two review rounds, then pass-with-warnings. Remix: cap your refine/autofix loops with an explicit “2 rounds then warn” rule — prevents infinite polishing spend.

> ✅ **SIGNED OFF — Batch 5: list2 #23/#25/#26/#27, B5/B7/B8, list1 #23/#25.** Core `review-protocol.ts` (`@studio/core`): `REVIEW_FOCUS` per stage (script → hook+payoff, assets → consistency+distinctness, cut → pacing+captions — #27/B8); 3-tier `tierFindings` where only critical blocks (#26); `reviewLoopDecision(rounds, findings)` enforcing the **max-2-rounds** cap → revise / pass-with-warnings / escalate (#25/B7); and the `StructuredBlocker` object + `buildBlocker`/`categorizeBlocker` (#23/B5). UI: a **structured "your turn" blocker card** now renders for any held video (categorised from its reason into what's blocked / needed / tried / actionable options with a recommendation), replacing the vague pause line. Verified: `tsc`, `eslint`, **887/887 vitest** (+11), `next build`.
	26.	Findings tiered: critical / suggestion / nitpick (only critical blocks). Remix: add 3-tier severity to your critics/lint so the agent knows what must-fix vs note.
	27.	review_focus per stage in the manifest — each stage declares what the reviewer checks. Remix: per-gate review checklists driving your QC judges.

	28.	Onboarding skill: “curious → making a video in <60s” — vague first message triggers discovery + tailored starter prompts. Remix: a guided first-run for new projects (empty-state → running).
	29.	Stability tiers on features (production / beta / test). Remix: label your VCE/Assembly systems by maturity in Settings so you know what’s battle-tested vs experimental.
	30.	Ink Theater / hand-drawn “whiteboard doodle” engine with named mocap clips only (agent never hand-tunes character motion). Remix: a distinctive sketch/whiteboard style for explainers built on your “stick” scenes — plus the safety pattern of a curated motion library the agent picks from rather than free-keyframing.

A6. Taste “anti-patterns” panel
Seed: OpenMontage’s taste_profile carries explicit anti-patterns.
Remix: In the style/taste settings, a visible “never do this” list (e.g. “no zoom-bounce on every still,” “no more than 3 crossfades in a row”) that the MVDA reads as hard constraints. Turns your existing lint/craft rules into a user-editable taste contract.

B1. related_skills / fallback_tools graph
Seed: OpenMontage tools declare related skills and fallback tools.
Remix: Give each MVDA tool a small fallbacks: [] + related: [] field. When generate_clip fails on Seedance, the agent walks the fallback edge to Flux-stills-with-motion automatically, logging the substitution. Extends your existing provider-fallback idea into the agent’s tool graph.

B5. Structured blocker escalation object
Seed: OpenMontage escalates blockers as structured objects, not prose.
Remix: When the agent can’t proceed, it emits { blocker, tried[], needs, options[] } that renders as a “your turn” card with actionable buttons (raise cap / swap provider / edit brief) rather than a vague pause reason. Upgrades your existing paused_reason.

B7. Reviewer max-2-rounds enforcement
Seed: OpenMontage caps reviewer loops at 2 rounds.
Remix: Hard-cap the QC↔revision loop so a video can’t burn budget ping-ponging. On round 2 no-pass, it escalates to you with the diff of what changed between rounds. A loop-safety rail on the agent queue.

B8. Review-focus per stage
Seed: OpenMontage assigns a review_focus to each stage.
Remix: The reviewer agent gets a stage-specific lens (script → “hook + payoff,” assets → “consistency + distinctness,” cut → “pacing + captions”). Sharpens critiques instead of generic passes. Slots into your existing critics.

C1. framework-smoke minimal end-to-end pipeline
Seed: OpenMontage ships a tiny smoke-test pipeline that exercises every stage with stubs.
Remix: A --smoke mode that runs research→…→render on mock adapters in seconds, asserting each stage produces a schema-valid artifact. Becomes a CI gate that catches contract breaks before deploy — complements your action-manifest test.

C2. Kebab-case regenerable-workspace convention
Seed: OpenMontage uses a kebab-case project workspace where assets are regenerable by convention.
Remix: Formalize “every asset is reproducible from its artifact + provider params” — store the exact request alongside each generated asset so any single asset can be re-rolled without re-running the stage. Provenance you’re already partly capturing; make regeneration a first-class action.

C9. Quality-rules-as-constraints compiler
Seed: OpenMontage’s style playbooks carry quality_rules the system enforces.
Remix: Compile a style playbook’s rules into machine-checkable constraints the linter/critics enforce automatically (max caption words/sec, min shot length, palette limits), rather than prose the agent may ignore. Turns A6’s anti-patterns + playbooks into executable gates.

C10. Checkpoint status vocabulary + partial_progress resumability
Seed: OpenMontage’s checkpoints (in_progress / completed / awaiting_human / failed) with partial_progress.
Remix: Standardize every stage on that status vocabulary and persist partial_progress (e.g. “18 of 30 stills done”) so a crashed/interrupted render resumes mid-stage instead of restarting. Directly powers your live-progress tiles (#3) with real resumability underneath.

