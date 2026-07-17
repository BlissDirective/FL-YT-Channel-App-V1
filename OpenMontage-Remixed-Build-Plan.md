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

	1.	Scored provider selection (7-dimension). They score every provider on task-fit/quality/control/reliability/cost/latency/continuity and log the winner + alternatives. Remix: extend your V2 routeMedium from “cheapest medium” into a scored model selector across your fal providers (Seedance/Kling/Veo/LTX/Wan, FLUX schnell/dev) — pick per beat with a logged rationale.

	6.	Post-render technical self-review. ffprobe the output: frames at 4 positions, audio levels, black-frame/silence detection, subtitle presence. Remix: extend your Self-Watch watch-gate with a technical QC pass (your frame-critic judges content; this catches broken renders).

	7.	Source-media inspection. Probe every generated asset (resolution, codec, duration, audio channels) before using it. Remix: an asset-spec validator in runAssetGeneration — reject a malformed Seedance clip before it reaches compile.

	9.	Decision audit trail. Every creative/technical choice (provider, style, voice, music, fallbacks) logged with alternatives + confidence + reasoning. Remix: extend operator_decisions / cost ledger into a per-video decision log — improves explainability and feeds your operator-signal learning.

	10.	Localization & dub pipeline. Subtitle/dub/translate an existing video into other languages. Remix: a new repurpose path over your EDD (swap the VO track + captions per language) — a real monetization multiplier on content you already made.


	11.	Provider fallback chains. Scored primary → automatic fallback on failure, logged. Remix: thread a fallback list through your mock-first adapters (isXLive) for reliability.

	14.	Free-corpus documentary retrieval (CLIP-indexed). Build b-roll from Archive.org/Wikimedia/Pexels via CLIP retrieval, no paid video API. Remix: a new “free footage” medium in your router + a boost to V4 grounding (retrieve real motion, not just stills).

15.	Music generation + bed. Suno / ElevenLabs Music for a soundtrack with ducking. Remix: turn on your D8 music (currently schema-present, gated off) via an ElevenLabs-Music adapter + your existing DuckSpec.

	16.	Style playbooks (reusable YAML looks). A library of named visual styles. Remix: promote your per-video Visual Bible into reusable per-niche style playbooks you can apply to new videos.

	17.	Scene detection on generated clips. Detect cut points inside footage. Remix: feed into the MVDA’s retime/trim decisions for tighter cuts.

	20.	Platform output profiles. 16:9 / 9:16 / Reels / TikTok / LinkedIn / 21:9 render presets. Remix: your model already has 9:16/short — formalize platform profiles (ties into your TikTok/IG expansion).

	22.	Web-research-first brief — structured research (YouTube/Reddit/HN/news/academic) with citations before scripting. Remix: upgrade Scout into a cited research brief feeding runScripting.

	23.	Three-layer knowledge architecture (tools → skills → deep tech knowledge). Remix: formalize a per-stage skill file set (you now have the editing-craft one) so each agent has a house rubric.
	24.	HyperFrames-style kinetic typography / SVG character animation. Remix: you already have programmatic “stick” scenes — borrow their GSAP kinetic-typography patterns for punchier text moments.
	25.	Reviewer/checkpoint “meta” skills — explicit reviewer protocols at gates. Remix: codify your QC-gate reviewer behavior as a skill the judge reads.
	26.	Resumable checkpoints with cost snapshot. Remix: enrich build_runs with a decision + cost snapshot so a failed run resumes cleanly.
	27.	Audio mixing / ducking / noise-reduction / enhance. Remix: activate your gated audio-ducking path + a cleanup pass on VO.
	28.	Voice direction (tone embedded in narration prompt). Remix: pass tone/emotion cues into your ElevenLabs adapter per beat.
	29.	Multi-aspect single-render output. Produce 16:9 + 9:16 from one project. Remix: one Assembly plan → two compiled EDDs at two aspects.


1.	Canonical artifact per stage + schema validation — each stage emits one JSON artifact validated against a schema (brief → script → scene_plan → asset_manifest → edit_decisions → render_report). Remix: formalize your stage outputs as schema-validated artifacts (you have EditDocument/validateEdd — extend the same discipline upstream to brief/plan/manifest).

	3.	Scene-plan as a first-class stage (with a gate) between script and assets. Remix: your Assembly SegmentPlan basically is this — elevate it to a canonical, schema-validated, gate-able pipeline stage.

	4.	Checkpoint status vocabulary + partial_progress (in_progress / completed / awaiting_human / failed, refreshed during multi-asset stages). Remix: enrich build_runs with partial_progress to feed the live board + your new working-tile progress at finer granularity.

	6.	Provenance-linked cost reconciliation — per-provider spend reconciled against the asset_manifest. Remix: reconcile cost_ledger to per-asset provenance for true per-asset cost.

7.	Registry-driven tool discovery (never hardcode providers). Tools self-declare capability/provider/runtime/fallback/skills/install-steps; selectors auto-discover. Remix: a provider registry so adding a model becomes config, not code — your adapters become registry entries.

	9.	Per-tool agent_skills (Layer-3 vendor knowledge) the agent must read before calling. Remix: attach a per-model prompting skill (e.g. “seedance-2-0”, “flux-best-practices”) your generation adapters inject — “usable” vs “cinematic” prompts.

	10.	Capability menu preflight (“X of Y configured”, grouped by setup effort). Remix: upgrade your Settings credential-health into a “here’s what you can do now / could unlock” menu.

	11.	Install-instructions grouped by effort (env var / install / hardware). Remix: make credential-health actionable — each missing key shows exactly how to unlock it.

	13.	Taste dials / taste_profile — design read, visual variance, motion intensity, information density, anti-patterns — carried from proposal through every stage. Remix: a taste_profile on the project that conditions the Visual Bible, compositor, and critics. Big consistency lever.

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

