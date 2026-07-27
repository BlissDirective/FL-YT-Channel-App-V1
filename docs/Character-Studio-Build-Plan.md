# Character Studio — Build Plan

**Status:** Fully specified — all 14 decisions closed (§0 and §10), ready to build
**Goal:** Make characters and art styles first-class objects in the app, designed
through a chat interface, locked to reference images, and injected automatically
into every image, animation, and avatar prompt.

---

## 0. Confirmed decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Character scope | **Global library, linked into projects** — one canonical lock per character, reusable across channels |
| 2 | Style locks | **Multiple named styles per project** — a project can hold "Pastel Vector" and "Watercolor Paper-Craft" simultaneously |
| 3 | Scene injection | **Auto name-match + manual override** — mentioning "Bo" injects Bo; per-beat chips correct it |
| 4 | Generation | **In-app generation + auto character sheet** on lock |
| 5 | Models | **Premium by default** for character work — consistency and multi-reference over cost |

---

## 1. Why this exists

Setting up Mindful Minis exposed the gap precisely. To get a consistent cast we
had to: hand-write two markdown files of prose character blocks → paste a
600-word blob into a single free-text field → generate six character sheets in
an external tool → upload them → and manually remember which reference belongs
to which character. The app's entire notion of "who is in this picture" is one
`presenter_image_path` column and an unstructured `instructions` string.

Every manual step there is a place consistency breaks. This plan moves the
assembly rule — `STYLE + CHARACTERS PRESENT + SCENE + EXCLUSIONS` — out of the
operator's head and into the system.

---

## 2. Model selection (premium default)

Research-verified, July 2026. All available through the existing `FAL_KEY`.

### Image — character design, sheets, and storyboard scenes

| Model | Cost | Reference capability | Role |
|---|---|---|---|
| **Nano Banana Pro** (Gemini 3 Pro Image) | **$0.15/img** ($0.30 at 4K) | **Up to 14 reference images**; holds consistency across ~5 characters in one scene | **DEFAULT** for character design, sheets, and any multi-character scene |
| FLUX.2 Pro | $0.03/MP | Multi-reference up to 10 images | Volume tier for single-character or background scenes |
| Seedream 4.5 | ~$0.03 | Up to 14 references | Alternate volume tier |
| FLUX schnell / dev | $0.003 / $0.025 | Weak | Existing budget tier; kept, no longer default for character work |

**Why Nano Banana Pro is the right default here:** the whole feature depends on
feeding *multiple locked reference images into one scene* — Bo and Breeze
together, both recognizably themselves. That is precisely its headline
capability, and no cheaper model matches it. Its text rendering is also the
best available, which matters for thumbnails later.

### Video — character-consistent animation

| Model | Reference capability | Role |
|---|---|---|
| **Kling 3.0 (reference-to-video)** | Multi-frame references; ~95% character consistency reported with 4–6 consistent references | **DEFAULT** when a locked character appears in an animated clip |
| Kling 2.5-turbo, Seedance, Veo 3.1 | Single start frame | Existing catalog; keep for non-character b-roll. Veo remains the pick when native audio matters more than carrying a character |

### Honest cost math

Premium is ~50× the cheapest image tier. Per unit of real work it is still small:

- **Design loop:** a 2×4 candidate grid on Nano Banana Pro ≈ **$1.20 per round**. Locking six characters at ~3 rounds each ≈ **$20–25 once per style**.
- **Character sheet:** 3-view turnaround ≈ $0.15–0.45 per character per style.
- **Per video:** a 12-scene storyboard song ≈ **$1.80** in premium stills vs ~$0.04 on FLUX schnell.

**Design implication:** the model must be **per-action configurable**, not
hardcoded. Character design, sheets, and multi-character scenes default to
premium; single-character and background scenes can drop to FLUX.2 Pro. Expose
the choice in the catalog like every other model, so a cost-sensitive channel
can dial it down without a code change.

---

## 3. Data model

### The central insight: identity is style-independent, images are not

A character's **description** works in any style — *"a cheerful 4-year-old boy
with warm brown skin, mustard-yellow tee with a white star."* A character's
**reference image** does not: Bo-in-Pastel-Vector is the wrong reference for a
watercolor scene.

So a character has **one identity** and **one locked look per style**. This is
what makes decisions 1 and 2 compose cleanly, and it is what makes the Mindful
Minis A/B collapse into a single project: one cast, two styles, two looks each.

### Tables

```
characters                    -- GLOBAL (account-level), style-independent identity
  id, name, aliases[]         -- aliases power name-matching ("Bo", "Bo the boy")
  role                        -- "presenter" | "cast" | "prop" | "location"   (Q7:
                              --   a location is a character that never moves)
  description                 -- the locked prose block, source of truth
  description_owned_by_operator -- Q8: true once hand-edited; from then on the
                              --   agent may PROPOSE a rewrite but never applies one
  identity_anchor             -- the ONE detail that must survive every frame
  species_or_type, notes
  status                      -- draft | locked  (Q6: drafts ARE usable, but badged)
  version                     -- bumped on every relock; pinned onto videos (Q5)
  created_at, locked_at

styles                        -- PROJECT-scoped, multiple per project
  id, project_id, name        -- "Pastel Vector", "Watercolor Paper-Craft"
  style_string                -- the art-direction paragraph
  palette                     -- jsonb: named hex values
  composition_rules, exclusions
  is_default                  -- the project's primary look
  created_at

character_looks               -- the join that resolves the tension above
  id, character_id, style_id
  look_type                   -- Q2: "illustration" (full-body, storyboard scenes)
                              --   | "portrait" (chest-up front-facing, avatars)
                              --   A character may hold BOTH per style
  canonical_image_path        -- the locked reference
  sheet_image_path            -- auto-generated 3-view turnaround
  extra_ref_paths[]           -- optional angles/expressions
  stale                       -- Q4: set when the parent style_string changes;
                              --   offers one-click regeneration, never auto-spends
  status                      -- draft | locked
  locked_at, version

project_characters            -- which global characters this project uses
  project_id, character_id, sort_order

character_design_messages     -- the Character Studio chat thread (replayable)
  id, character_id, role, content, intent, candidate_asset_ids[]
```

### Changes to existing objects

- `videos.style_id` — which style this video renders in. Null → project default (Q9: chosen silently, switchable in one click, always shown on the card). This is what lets the outcome loop report per-style performance, making the A/B native.
- `videos.character_versions` (jsonb) — **Q5:** `{character_id: version}` stamped when the video's assets are generated. Editing a character later is forward-only; the eleven videos made before the change keep the Bo they were made with, and the card can show "made with Bo v1."
- `projects.presenter_image_path` — **superseded but kept**. The presenter becomes the character with `role = 'presenter'`; a migration copies any existing value into a character record. The avatar generator reads the character's locked look, falling back to the old column so nothing breaks mid-flight.
- `projects.instructions` — **narrowed in meaning** to channel context (audience, tone, editorial direction). Style and cast move out of it into structured records. Existing text stays and still injects; it just stops being the only home for art direction.

---

## 4. UI/UX specification

### 4.1 The Character Studio (split view)

The core surface. **Chat on the left, live subject card on the right** — pure
chat loses the artifact, and you need to see the character while you talk about
it.

```
┌───────────────────────────────┬──────────────────────────────┐
│  CHAT                          │  SUBJECT: Bo        [draft]  │
│                                │  ┌────────┬────────┐         │
│  you: a 4-year-old boy,        │  │ cand 1 │ cand 2 │         │
│  warm brown skin, curly hair,  │  ├────────┼────────┤         │
│  yellow tee with a star        │  │ cand 3 │ cand 4 │         │
│                                │  └────────┴────────┘         │
│  agent: four takes — the       │   ↻ more    ⬆ upload         │
│  third keeps the star reading  │                              │
│  clearly at thumbnail size.    │  DESCRIPTION (source of      │
│                                │  truth, editable)            │
│  you: take 3, rounder face,    │  ┌────────────────────────┐  │
│  keep the star                 │  │ Bo, a cheerful 4-year- │  │
│                                │  │ old boy with warm...   │  │
│  [describe or drop an image…]  │  └────────────────────────┘  │
│                                │  IDENTITY ANCHOR             │
│                                │  [mustard tee, white star]   │
│                                │                              │
│                                │  🔒 Lock Bo   ·  ~$0.45      │
└───────────────────────────────┴──────────────────────────────┘
```

**Interaction rules:**
- Every send generates a **2×4 candidate grid** (premium model). Click one to promote it to the subject slot; refine in words from there.
- **Upload is a first-class input** — drop a reference image and the agent writes the description *from* it, or uses it as a style/likeness reference for generation.
- The **description panel is directly editable**. It is the source of truth; the agent proposes, the operator owns.
- **Identity anchor** is its own field, not buried in prose. It's what the name-matcher highlights and what drift detection checks against.

### 4.2 The lock ritual

Locking is the moment the feature pays off, so it should feel like a commitment
with visible consequence.

**On lock:**
1. Freeze the description as the character's canonical text.
2. Save the chosen image as `canonical_image_path` for the **current style** and look type.
3. **Auto-generate the 3-view turnaround sheet** (front / three-quarter / side) — the single highest-leverage consistency artifact. The operator should never have to think about it.
4. Set `status = locked`, stamp `locked_at`, start a usage counter.
5. **Q2 — offer the portrait look.** For any character likely to appear as an avatar, offer a second, chest-up front-facing look under the same style. Avatar models frame tightly, so inheriting a full-body illustration reference crops badly. Same character, second look type — generated on request, not automatically.
6. **Q1 — offer the cast group shot** once two or more characters are locked in a style. It's the only artifact that fixes relative scale between characters and it doubles as channel art and a thumbnail base plate. **Offered prominently, never required** — a hard gate here would turn a helpful nudge into a toll booth.

**Spend visibility (Q10):** the subject panel carries a running total for the
character being designed and a soft per-character budget. Crossing it **warns and
continues** — it never blocks — matching the advisory posture chosen for QC.

**Unlocking** requires a confirm ("this changes how Bo looks in future videos"),
bumps `version`, and preserves the prior look so a bad relock is recoverable.

**Adding a style to an existing cast** offers a one-click "generate looks for all
locked characters in this style" — this is the Mindful Minis A/B in a single
action.

### 4.3 Placement

| Surface | Purpose |
|---|---|
| **Project wizard, new step after descriptors** | "Style & Cast" — **skippable**, with a hard gate up front: *"Does this channel have recurring characters?"* Faceless channels must never be forced through it |
| **Project Settings → Cast tab** | Permanent manager: add/edit/lock characters, manage styles, regenerate looks. Characters get created constantly after launch, not just at setup |
| **Workspace composer** | `@Bo` chips for explicit control mid-production; a "Cast" strip on the beat card showing who the matcher detected |

**Wizard order matters:** style is locked *before* characters, because every
character inherits it. Offer two entry paths — describe the style, or **upload a
reference image and have the agent extract a style string and palette from it.**
The second path is powerful: point at a look you love, get a reusable text lock.

---

## 5. Auto-injection (decision 3)

**Match:** on scene generation, scan the beat text and visual prompt for
character names and aliases (word-boundary, case-insensitive). Matches resolve
to that project's linked characters only, so a global library never leaks a
character into the wrong channel.

**Inject:** for each match, append the description block and attach the
character's locked look **for the video's style**. Nano Banana Pro takes them as
multi-reference inputs.

**Cap and degrade:** hard-cap at 4 characters per frame (references stay optimal
at ≤6, and scene coherence degrades past ~3 anyway). Beyond the cap, keep the
characters named earliest in the beat and note the drop in the thread rather
than silently truncating.

**Override:** each beat card shows a chip row of detected characters — remove a
false positive (a name mentioned in passing), add one the text implies but
doesn't name. Overrides persist on the beat.

**Fallbacks:** a character with no locked look for the current style injects its
description text only, and the thread says so — degraded, never blocked. The same
applies to **draft characters (Q6)**: they inject and generate normally, but the
beat card badges them and the thread notes that consistency isn't guaranteed
until the character is locked. A **stale look (Q4)** still injects — it was
correct under the previous style string — but carries a "regenerate" affordance.

### Prompt assembly

One composer replaces the current ad-hoc `buildVisualPrompt`:

```
style.style_string
+ palette
+ composition_rules
+ [character.description for each matched character]
+ scene / visual prompt
+ style.exclusions
+ [reference images: each matched character's canonical look]
```

The Visual Bible (VCE) still runs and layers on top — it handles per-video
visual continuity, which is a different axis from per-character identity.

---

## 6. Drift detection (enhancement, Phase 4)

After generating a scene containing a locked character, run a cheap vision check
against that character's locked sheet: *"does this match?"* Flag mismatches as a
QC badge on the card with a one-click re-roll. The vision-critique layer already
exists, so this is reuse rather than new machinery — and it is the thing that
catches slow drift before it becomes twelve inconsistent videos.

---

## 7. Build phases

**Phase 1 — Data model + prompt assembly (headless)** ✅ *shipped*
Migrations for the five new tables and `videos.style_id`; the prompt composer;
the name-matcher as a pure, unit-tested function; presenter back-compat shim.
No UI. Existing behavior must be byte-identical when a project has no characters
or styles — that's the phase's acceptance test.

*Landed as:* `supabase/migrations/0072_character_studio.sql`,
`packages/core/src/cast.ts` (pure), `src/lib/pipeline/cast-resolver.ts` (I/O),
`tests/character-studio.test.ts` (25 cases).

**Phase 2 — Character Studio UI** ✅ *shipped*
The split view, candidate grids, upload-and-describe, the description editor,
the lock ritual with auto-sheet generation. Wizard step + Cast tab. Premium
model wired through the catalog with per-action defaults.

*Landed as:*
- `src/lib/adapters/reference-image.ts` — Nano Banana Pro (default) + FLUX.2
  Pro; references switch the call to the model's edit/compose endpoint.
- `src/lib/adapters/character-design.ts` — the design agent; forbidden from
  writing art-medium words into a description.
- `src/lib/pipeline/character-studio.ts` — all operations, `db`-injected.
- `src/lib/actions/characters.ts` — 16 server actions (thin edge).
- `supabase/migrations/0073_character_spend.sql` — `cost_ledger.character_id`,
  so design spend is attributable per character while staying system-scoped and
  therefore unable to eat a project's production cap.
- Routes: `/characters`, `/characters/[cid]`, `/projects/[id]/cast`; the
  new-project wizard's skippable **Look** step.
- `tests/character-studio-phase2.test.ts` + `tests/character-studio-ui.test.ts`
  (56 cases).

Two deviations from the spec as written, both deliberate:
- **Candidate grid defaults to 4, not 8.** At $0.15/image a default 2×4 grid is
  $1.20 a press. Four is the default, eight the ceiling, and the count is a
  visible control with the USD on the button.
- **No fifth project tab.** The project tab bar stays at four (the mobile grid
  tops out at five columns once Home is prepended), so Cast hangs off the
  Library header and the *global* character library takes the new global tab.

**Phase 3 — Auto-injection** ✅ *shipped*
Matcher into the generation path, per-beat chip overrides, caps and degraded
fallbacks, thread narration of what was injected.

*Landed as:*
- `makeBeatClip` renders a beat on the reference-capable model, conditioned on
  the matched characters' locked images — **only** when the beat has at least
  one matched character with a locked look. Everything else stays on the
  existing FLUX path, at the existing price, on the byte-identical cache key.
- The FLUX cache key now includes the reference set and the cast model for cast
  beats, so a cached frame can never be served to a different cast.
- Every degradation falls back to FLUX rather than failing the beat: no locked
  look (description still injects), a mock-mode look with no signable URL, a
  reference-model outage, a missing table.
- `videos.character_versions` is stamped at the end of the asset stage, and one
  thread line names who was in the video, how many beats used real references,
  and what was left out and why.
- Per-beat chips on the beat card show the matcher's verdict **before** anything
  is rendered, and post corrections as a diff against it. Chat reaches the same
  action ("add Breeze to beat 3").
- `supabase/migrations/0074_character_scene_model.sql` +
  a Cast-page selector: the per-project cost lever, because injecting references
  moves a cast beat from ~$0.025 to ~$0.15 and that should be a choice.
- `tests/character-studio-phase3.test.ts` (27 cases) including an end-to-end run
  of the real pipeline with a cast.

One bug this phase surfaced in the test harness itself: the fake query-builder
had no `upsert`, so the engine's FLUX-cache write had been silently throwing
into its "cache table absent" guard in *every* test since that cache was added.
Fixed in `tests/helpers/fake-db.ts`; the full suite still passes with caching
now genuinely exercised.

**Phase 4 — Multi-style + avatar + drift** ✅ *shipped*
Style switcher per video, "generate looks for all characters in this style,"
avatar generator reading the presenter character, drift detection, cast group
shots. **Migrate Mindful Minis** from two projects to one project with two
styles as the acceptance case.

*Landed as:*
- **Style switcher** in the workspace header, shown only when the project has
  more than one style. Switching says plainly that existing visuals were made
  in the old style rather than silently implying a restyle.
- **Batch looks per style** — "Looks for everyone" and "Regenerate stale", both
  quoting the total before they spend, both producing DRAFTS. A restyle
  deliberately ignores the old style's image as a reference, or the new style
  never takes.
- **Cast group shot** (`0075_style_group_shot.sql`): one frame with the whole
  cast, conditioned on the locked looks, asking for correct relative heights.
  It rides along as an extra reference on scenes with two or more characters,
  appended LAST so it can never crowd a per-character identity out of a capped
  reference list.
- **Presenter designation** on the Cast page: promoting one demotes the
  incumbent in that project, and the UI warns when the new presenter has no
  chest-up portrait (avatar models crop a full-body illustration badly).
- **Drift detection** (`src/lib/adapters/character-drift.ts`): a vision
  comparison of each cast frame against its locked reference, judging identity
  only and explicitly told that pose, expression, angle and background are
  supposed to differ. Verdicts land as `qc_reviews` rows against the asset, so
  the existing beat-card badge shows them with no new UI. Advisory — a failed
  check is "no opinion", never "bad", and nothing blocks.
- **The migration** (`src/lib/pipeline/channel-presets.ts`): the Mindful Minis
  cast and both art tracks as data, applied to one project from the Cast page.
  Idempotent, spends nothing, links an existing global character rather than
  duplicating it, and never overwrites a description or style string the
  operator has already tuned. `AB-TEST-SETUP.md` now leads with the
  one-project method.
- `tests/character-studio-phase4.test.ts` (29 cases) + Phase 4 UI contracts.

One bug this phase surfaced: in mock mode, a character's look paths omitted the
style id, so the same character's looks in two different styles collided on one
path. Live mode was always correct; the mock branch is now consistent with it.

---

## 8. Migration & back-compat

- **Existing projects keep working untouched.** No characters, no styles → the current instructions-only path runs exactly as today.
- `presenter_image_path` values migrate into a `role='presenter'` character with a locked look under an auto-created "Default" style; the avatar path prefers the character and falls back to the column.
- **Mindful Minis is the proof case:** import the six characters from `STYLE-LOCK-A.md`/`-B.md` as global characters, create both styles in one project, generate looks per style, and retire the second project. If that migration is clean, the model is right.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Premium cost surprises during design iteration | Candidate grid cost shown **before** each round; per-action model config; a "draft grid" toggle that explores on FLUX.2 Pro and locks on Nano Banana Pro |
| Multi-character scenes degrade past ~3 subjects | Hard cap at 4, cast group shot to establish scale, thread narration when characters are dropped |
| Name-matcher false positives ("a bo tie") | Word-boundary matching, alias list, per-beat override chips, and the matcher's decisions always visible on the card — never silent |
| Feature becomes mandatory ceremony for faceless channels | Hard skip gate in the wizard; every downstream path degrades cleanly with zero characters |
| Style/character coupling confusion | The identity/look split is the mental model — description is style-free, images are per-style. UI must say this in one line at the top of the Cast tab |
| Locked characters drift anyway over months | Phase 4 drift detection against the locked sheet; versioned locks so a regression is recoverable |

---

## 10. Resolved build decisions

All ten open questions are settled. No question in this plan is outstanding —
the build starts from a closed spec.

| # | Question | Decision | Where it lands |
|---|---|---|---|
| 1 | Cast group shot required? | **Offered prominently, never required** | §4.2 lock ritual, step 6 |
| 2 | Presenter portrait look? | **Yes — two look types per character per style** (`illustration`, `portrait`) | `character_looks.look_type`; §4.2 step 5 |
| 3 | Styles global? | **No — project-scoped**, as originally decided | §3 `styles.project_id` |
| 4 | Style edited after locks? | **Mark looks stale, offer one-click regeneration.** Never silently regenerate (that's money), never silently ignore (that's drift) | `character_looks.stale` |
| 5 | Character changed after videos exist? | **Pin the character version onto each video** — forward-only, history stays coherent | `videos.character_versions` |
| 6 | Draft characters usable? | **Yes, but badged**, with a thread warning that consistency isn't guaranteed until locked | `characters.status`; §5 |
| 7 | Locations and props? | **Yes — same mechanism, different role.** A location is a character that never moves | `characters.role` gains `location` |
| 8 | Who owns the description? | **The operator.** After the first manual edit the agent proposes but never overwrites | `characters.description_owned_by_operator` |
| 9 | Multi-style video selection? | **Default silently, switch in one click, always shown on the card** | `videos.style_id`; §4.3 |
| 10 | Studio spend guardrails? | **Soft per-character budget with a running total — warn and continue, never block** | §4.2 spend visibility |

**Decided by default (raise these if you disagree):** alias lists auto-derive
from the character name and stay hand-editable; avatar capability is available to
any character rather than only `role = 'presenter'`.

### Two consequences worth calling out

**Locations change the economics of the whole feature.** A recurring setting —
"Bo's bedroom," "the meadow" — is currently regenerated from scratch every time
it appears, which is the second-largest source of visual inconsistency after
characters. Treating locations as characters means a twelve-song series shares
one locked bedroom. It costs almost nothing to support because it's the same
machinery, but only if `role` is designed in now rather than retrofitted.

**Version pinning makes the outcome loop honest.** Because each video records the
character versions it was made with, a performance comparison across a redesign
becomes meaningful: you can ask whether Bo v2 actually outperformed Bo v1 rather
than guessing. That turns a cosmetic change into a measurable one.
