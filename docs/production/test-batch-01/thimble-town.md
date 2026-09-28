# Thimble Town: Test Batch 01 (4 long-form + 4 Shorts)

**Channel:** Thimble Town (franchise: Tiny Worlds) · **Prepared:** 2026-09-28 · **Season in world:** Autumn (Bible §4.6, Sep–Nov) · **Status:** TEST batch, not yet generated.
**Inputs:** `docs/channels/tiny-worlds/Channel-Bible.md` (cast, look, Higgsfield spec, audio) · `docs/channels/tiny-worlds/Video-Ideas-60.md` (L01–L30, S01–S30).
**Pricing:** every video second at **$0.2057/s** list (Seedance 2.5 and Cinema Studio 4.0 share the rate in `src/lib/adapters/video-models.ts`). SOUL stills, ElevenLabs and music licensing are not included (see §5).
**Citations:** `[R#]` = the sources in §6. `[S#]` = Channel Bible sources. `[U]` = unverified, estimated or vendor-reported, so treat as directional.

## Contents
1. Viral format study (what we reuse, and how Thimble Town makes it its own)
2. The picks: top 4 long-form and top 4 Shorts, with rationale
3. Batch-wide production rules (locks, QC acceptance criteria, revision protocol)
4. Director briefs (8 videos)
5. Batch plan: production order, budget, publish calendar, A/B tests
6. Sources

---

## 1. Viral format study

**Method.** WebSearch/WebFetch on 2026-09-28. Where a page could not be fetched (403/503), only the search-result summary was used and the claim is marked `[U]`. **No per-video view counts for specific top videos were verified**: treat any 'most-viewed' framing as category-level evidence, not a ranked list `[U]`.

### 1.1 Platform mechanics that shape every format
- **Shorts can run up to 3 minutes** (square or vertical) since 15 Oct 2024 [R19]. The operator's 60–180s Shorts window is valid.
- **Shorts views count on every play or replay** since 31 Mar 2025. The old metric is now 'engaged views', and it is still the one used for revenue share and YPP [R17][R16]. So a loop inflates the public views, but what matters is *engaged* retention.
- **The first 1.3–3s decide the swipe.** Summaries of 2025–26 Shorts data say 50–60% of drop-offs happen in the first 3s, and recommend delivering the hook in 2–2.5s. Visual pattern-interrupts matter because many Shorts are watched muted (>60% by one estimate) [R18] `[U: vendor data]`.
- **Retention-curve playbook:** open on the most visually loaded frame, not an intro. Keep a 'stimulus' (a cut, a move, a sound event) every ~1.5–2s. The payoff goes in the first half-to-two-thirds. A composition-matched last frame produces a >100% spike at second 1, which is the sign of a working loop. The optimum length is 20–35s, with narrative arcs at 35–55s [R15] `[U: vendor data]`.
  - **Tension with our brief.** Our Shorts must run 60–180s. We resolve this by building each Short as **4–6 self-contained micro-payoff beats of 10–27s**. Each beat opens on a fresh satisfying event, and small events (a placement, a tap, a tink) land every 3–7s *inside* the beat. That is the cozy-speed version of the 1.5–2s stimulus rule. No Short relies on one continuous 60s+ action.
- **Loop devices** that work for faceless Shorts: a visual match cut (the last frame mirrors the first), audio continuity across the loop point, a callback, and a cliffhanger reversal. Writing the ending first makes the loop invisible [R16].
- **Long-form openings:** the first 30s show the steepest drop. A proven structure is: 0–5s a pattern interrupt, 5–15s a payoff promise, 15–30s a commitment hook, ideally as an open loop, *showing* rather than explaining [R20] `[U: vendor data]`. Our ambient version: a macro cold open, then the ident, then an establishing shot that promises the arc (a night, a build, a round, a festival).
- **Test & Compare** can A/B up to three titles and/or thumbnails per video over up to two weeks, and it optimises for **watch time**, not CTR [R21]. We use it on all four long-forms (§5).

### F1. Real tiny cooking (Miniature Space, Miniature Cusina, Tastemade *Tiny Kitchen*)
**Evidence:** Miniature Space is widely credited as the pioneer of the format, and a 2015 Tubular Labs estimate put miniature-food videos at up to about 3% of food-category views [R1][R3] `[U: via search summary]`. It is Guinness-listed as the most-subscribed miniature cooking channel [S10]. Tastemade's *Tiny Kitchen* had 600M+ views in about 18 months, cooks real food on a real tiny set (quail eggs, sterno flame) and trades on 'disbelief' [R4].

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | A recognisable dish at impossible scale, or tiny tools (tweezers, a Japan-sourced mini knife) touching real food [R4]. |
| Pacing | Long-form runs 5–12 min of calm, wordless process. The social versions are 1–3 min and fast [S11][S12]. |
| Sound | Close-mic process ASMR: sizzle, knife, pour. No speech. |
| Payoff timing | The finished dish reveal at about 80–90%, sometimes a 'taste' beat. |
| Loop | Rarely a loop in long-form. Social cuts end on the finished plate. |
| Title / thumbnail | `Miniature [dish] | tiny cooking ASMR` naming a famous dish. The thumbnail is the finished dish in macro `[U: pattern observed, not measured]`. |
| Retention | Process completion. Every step is visibly progress. |
| Thimble Town twist | **A resident cooks, not a human hand.** Miso's stand has canon (Noodle Row, a seasonal menu). Cooking is paired with *weather and customers*, so the dish is the midpoint payoff and the story (the last customer) is the ending. Found-object kitchen (bottlecap pot, spool counter, thimble bowl). The palette is amber against rain slate. Signature foley: rain-on-tin plus the ladle on ceramic. |

### F2. AI 'impossible-material' cut ASMR (glass fruit, crystal, lava desserts)
**Evidence:** It surfaced around June 2025 on Veo 3. #AIASMR reportedly drew 640M views in 90 days, with ~1.7× watch time versus standard ads and repeat viewing to 'decode' the surreal material [R6] `[U: secondary]`. Accounts gained millions of views in days [R9] `[U: search summary]`. A typical prompt: 'macro lens on a stationary tripod … satisfying cutting sounds' [R8].

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | The blade is already touching the object in frame 1. Familiar object, impossible material (cognitive dissonance) [R5][R6]. |
| Pacing | 5–20s clips. One cut, one crack, done [R6]. |
| Sound | The hero transient (crack plus tinkle) layered with soft pink noise. The sound drives rewatches [R5][R6]. |
| Payoff timing | The first cut, within about 1s. |
| Loop | Loops on 'silent frames' (the start and end states match) [R6]. |
| Title / thumbnail | Object plus material plus ASMR ('Glass Kiwi Cutting ASMR') `[U]`. |
| Retention | Novelty of the material plus sound. It saturates fast because it is templated, so it counts as 'inauthentic content' risk (Bible §9.1). |
| Thimble Town twist | We take **the mechanic, not the material**: blade contact in frame 1, a crisp dry hero transient, and a scale reveal instead of a material reveal. It is applied to the story's own craft (Bramble carving a pea-sized pumpkin in SB and LF4 §4), with a resident doing the cutting and a seasonal reason for it. It is not repeatable as a template, because each cut belongs to an episode. |

### F3. AI 'mini world / tiny workers' Shorts
**Evidence:** Tilt-shift, forced-perspective clips of tiny crews cleaning, building or cooking inside giant everyday objects. Popular from 2024 on, typically 15–60s assembled from 5–10s segments with 'slow, dreamlike movements' [R11]. They pull 'millions of views', per creator-tool blogs [R10] `[U]`.

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | A giant everyday object (a pancake, a watch, a sink) with tiny workers already mid-task. |
| Pacing | 5–10s segments cut together, with a slow camera drift [R11]. |
| Sound | Action-synced SFX plus library music [R11]. |
| Payoff timing | Task complete, or a before/after, by the end. |
| Loop | Often a task reset. |
| Title / thumbnail | `Tiny workers [verb] a giant [object]` `[U]`. |
| Retention | Surreal scale plus the 'oddly satisfying' feeling. A narrative arc (setup, reveal, reaction) lifts completion [R22] `[U]`. |
| Thimble Town twist | **Named, recurring residents and one locked crew.** The Builder Beetles appear in LF2 and SD with the same caps and belts. A world with addresses (Noodle Row, Lantern Lane). Craft texture (felt, resin, clay) instead of plastic CG. Every build becomes canon: the teapot bakery and Lumen's shed show up in later episodes. The scale cue is always a real object (a thimble, a matchbox, a pencil). |

### F4. Cozy lo-fi / ambience rooms (Lofi Girl, Cozy Rain)
**Evidence:** Lofi Girl has about 15.85M subscribers [S14]. Its uploads average about 1h37m and are 78% long-form [R12] `[U: search summary]`. The looping room has 'just enough animation for it not to be static', a day-to-night change with lights coming on in other windows, and a 'body doubling' companionship role [R12] `[U: search summary]`. Cozy Rain sells ambience files [S15][S16].

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | An instantly legible *mood* (rain, a lamp, a window). The thumbnail is the hook. |
| Pacing | Near-static. Micro-motions (rain, steam, a cat's tail). |
| Sound | Continuous bed (rain, fireplace, lo-fi) with no sharp transients. |
| Payoff timing | None. The value is the session. |
| Loop | A seamless animated loop. |
| Title / thumbnail | `[Place] + [weather] + [use: sleep/study]` ('Cozy Room Ambience, Rain on Window') `[U]`. |
| Retention | Long sessions tell the algorithm it is high-retention [R12]. |
| Thimble Town twist | The **rain-on-tin bed runs under the whole episode** (LF1) and every episode ends on 'lights on / lights out'. That makes the episodes *sleep-cut-ready*: the LF1, LF3 and LF4 sections feed the Night Lights compilations at no new generation cost. Our 'room' has residents and one story event per section, which is the upgrade over a static loop. |

### F5. Handmade-texture character miniatures (Andrea Love *Cooking With Wool*, *The Tiny Chef Show*)
**Evidence:** Andrea Love's all-felt stop-motion breakfast went 'mega-viral' in 2019 (about 3M views) and built a 1M+ Instagram following. The appeal is 'tiny clumps of fur' doing real cooking physics [R13] `[U: view count via summary]`. *The Tiny Chef* started as ≤1-minute stop-motion clips (400K IG in 2019), became an Emmy-winning series, and its character-led cancellation video drew about 100M views on X [R14].

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | An impossible material doing a real thing (felt butter melting). |
| Pacing | Short and dense. Every frame shows craft. |
| Sound | Real cooking foley over a soft material. |
| Payoff timing | The dish done, or the character's emotional beat. |
| Loop | Rare. |
| Title / thumbnail | Character or series name plus the dish. |
| Retention | Texture fascination, and *character attachment*, which is what builds a durable audience (Tiny Chef). |
| Thimble Town twist | This is the validation of our **needle-felted and resin figurine look plus named residents**. The locked cast blocks are the IP. We keep the 'visible fibres' scale cue in every keyframe, residents never speak (posture only), and emotional beats are small and warm (Miso's pressed leaf, Bramble's wave). |

### F6. 'A day in the tiny…' / micro-story
**Evidence:** A set place and a clock (dawn to night) with a setup, reveal, reaction arc [R22] `[U]`. Clear narrative structure is widely reported to lift retention (claims of up to 50% higher) [R20] `[U: vendor]`.

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | A tiny character mid-routine in a tiny world. |
| Pacing | Episodic beats, each with a small event (Bible §2: 6–12 calm sections). |
| Sound | Ambient world bed plus diegetic events. |
| Payoff timing | A reveal at about 70–80% (the lights come on, the letter arrives). |
| Loop | The day ends where it began (lights out). |
| Title / thumbnail | `A [time] at/in the Tiny [place]` (the Bible §6.7 formula). |
| Retention | Open loops: 'who is the last customer?', 'will the lamp get lit?' |
| Thimble Town twist | The **lamp-lighting ritual is the channel's clock and ident**. Lumen's round (LF3) doubles as a tour of canon places, and every episode's small events seed other episodes (Wren's Bottlecap letter points to L05). |

### F7. Build / transformation (Nerdforge-style builds, diorama build Shorts)
**Evidence:** Build-progress payoff and before/after [S19]. Diorama build Shorts are common on YouTube and TikTok [R23] `[U: views not verified]`. The pattern-interrupt tactic is a 0.3s flash of the finished result before rewinding to the start [R18].

| Mechanic | What the format does |
|---|---|
| Hook (1–3s) | The end result flashes first, then the raw object ('it's just a teapot'). |
| Pacing | Stage by stage, each stage ending on a visible completion. |
| Sound | Tool ASMR: taps, saws, clicks. |
| Payoff timing | The 'lights on' reveal at about 75%, then the opening or first use. |
| Loop | Shorts loop back to the result flash. |
| Title / thumbnail | `Building a Tiny ___ Inside a ___` or `[Object] → [Place]`. The thumbnail is the before/after or a half-built state. |
| Retention | The promise of the finished object, plus stage labels in Shorts. |
| Thimble Town twist | **The residents build** (Bible §9.2: never 'I built'). The build has a *reason* in canon (Bramble's bakery, Lumen's home). The finished object becomes a permanent set in later episodes. No giant human hands in this batch. |

### 1.2 The Thimble Town signature (applied to every format above)
- **Residents:** Miso, Bramble, Lumen and Wren, with cast blocks pasted verbatim (Bible §4.4). Walk-ons (frog, beetle, vole, sparrow, the Builder Beetles) are locked for this batch in §3.1 so they stay consistent across videos.
- **Lore:** places with names (Noodle Row, Lantern Lane, the Spool Bridge, the Teacup Harbour, the Thimble Tower). Builds persist: the teapot bakery (LF2) and Lumen's matchbox shed (SD) appear in LF3 and LF4. Wren's pressed-leaf letter (LF1) points ahead to L05, *Bottlecap City*.
- **Season:** the whole batch is autumn (the real calendar is late September to October): leaf drifts, acorn caps, pumpkins, and oil-ochre and twilight-fable palettes.
- **Texture:** needle-felt fibres, resin sheen and painted-wood brush marks are visible in every keyframe, and one everyday object serves as architecture in every shot.
- **Palette:** 70/30 warm/cool. Lantern Amber is present in every night frame, and nothing is pure black.
- **Foley signature:** the brand lamp *tink* (identical library file everywhere), rain-on-tin, the ladle on ceramic, and the music-box C–E–G motif at each episode's emotional payoff.

---

## 2. The picks

| # | Id(s) | Final title | Format tested | Length | Why it is a top first impression |
|---|---|---|---|---|---|
| LF1 | L01 (tweaked: autumn rain, trimmed to ~8:55, Bottlecap letter lore hook) | *A Rainy Night at the Tiny Ramen Shop* | Shop ambience + tiny cooking | 8:54 | F1 plus F4. This is the purest statement of the channel: tiny cooking plus cozy rain plus a resident plus a story. It targets the largest proven audience (miniature cooking, with hundreds of millions of views [R4]) and lo-fi and rain viewers. The Bible's own example title and thumbnail. It seeds three Shorts and a sleep cut. |
| LF2 | L02 (tweaked: autumn, trimmed to 9:00, crew replaces the giant hand, icon sign instead of lettering) | *Building a Tiny Bakery Inside a Teapot* | Build / transformation | 9:00 | F7 plus F3. Build payoff is the strongest 'finish the video' promise, and the teapot is the best found-object scale gag in the list. It creates a permanent set used by LF3 and LF4, which is visible authorship against the inauthentic-content policy. |
| LF3 | L03 (tweaked: narrated, 7:29, Lumen's home is the S08 matchbox shed, whole cast cameo) | *The Snail Who Lights the Lamps \| A Tiny Town Bedtime Story* | Journey tour, **narrated** | 7:29 | F6 plus F4. It introduces *all four residents and the town map* in one calm round, and it is the ident's origin story. Narrated, it is the batch's narration test and the channel's bedtime-story entry point. Its sections make an ideal Night Lights sleep cut. |
| LF4 | L08 + L21 merged (Autumn market + pumpkin carving + lantern parade), 8:49 | *Pumpkin Lantern Night in the Tiny Town* | Seasonal festival + cut ASMR | 8:49 | F2 (the cut mechanic) plus F1 plus F6, as a seasonal event. It is calendar-matched to late October, with timely search demand for pumpkins and autumn. The merge takes L08's market and cooking and L21's carving and parade, which fixes L21's short 6:20 runtime and cuts L08's crowd-heavy sections. |
| SA | S01 (tweaked: rain hook, scale-reveal by 0:06, raindrop loop) | *One Tiny Bowl of Ramen in the Rain* | Process ASMR (no text) | 1:32 | F1 as a Short. It is the tiny-cooking promise in 90s, and the no-text control arm. It funnels to LF1. |
| SB | S15 (tweaked: glass-fruit-style crunch hook, scale props in frame, carve-the-next loop) | *Carving a Pumpkin the Size of a Pea* | Cut ASMR (text label) | 1:30 | F2 as a Short. It transplants the glass-fruit blade-in-frame-1 hook to a seasonal craft object. It is the text-label arm, published at the Halloween peak, and funnels to LF4. |
| SC | S02 + S28 merged (first lamp, cascade, tallest-lamp climb, composition-matched loop), 100s | *The Snail Who Lights the Tallest Lamp* | Character micro-story | 1:40 | F6 as a Short. This is the character micro-story and brand trailer: the first frame *is* the ident gesture. The merge adds a small tension beat (the raindrop) to S02's thin 60s, and it funnels to LF3. |
| SD | S08 (tweaked: result-flash hook, becomes Lumen's canon home, stage labels) | *Turning a Matchbox Into a Tiny Shed* | Build short (stage labels) | 2:00 | F7 as a Short. Result-flash, then process, then loop. The shed becomes Lumen's home in LF3 (build becomes canon). It is the stage-label arm and funnels to LF2 and LF3. |

**Considered and passed on for a *first* impression:**
- L04 *First Snow* and L25 *Solstice*: out of season in October. Hold them for December.
- L05 and L27 *Bottlecap City* and *Spoonhaven*: 'another world' before viewers know the home world. Seeded instead by LF1's letter.
- L12 *Bookshelf Railway* ($140): too costly and complex for a test.
- L30 *A Year in Thimble Town*: a finale needs prior episodes.
- S25 *Snow globe* and S22 *Cocoa*: winter.
- S30 *Stand in 4 Minutes*: 240s exceeds the 180s cap.

---

## 3. Batch-wide production rules

### 3.1 Locked cast text
Resident blocks are copied **verbatim** from Bible §4.4 into every keyframe prompt below. The walk-on blocks below are **batch locks**: use them verbatim wherever a walk-on appears, so the same frog in LF1 is the same frog in LF2 and LF4.
```
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
BEETLE (walk-on, batch lock) — an unnamed beetle customer, hand-painted resin figurine with a glossy walnut-brown shell and a tiny cream knit scarf. About 2 cm long.
VOLE (walk-on, batch lock) — an unnamed vole, needle-felted soft grey-brown figurine with a terracotta-striped knit scarf. About 3 cm tall.
SPARROW (walk-on, batch lock) — an unnamed sparrow, felted buff-and-brown figurine with a small sage cloth satchel. About 3 cm tall.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
```

### 3.2 Reference packs to generate first (SOUL Standard 1080p, stills only)
- **Residents:** Miso, Bramble, Lumen and Wren, each in front, ¾ and profile, plus one autumn overlay each: Miso with a terracotta knit scarf, Bramble with a sage shawl, Lumen with a leaf tucked in his cap band, Wren with a cream scarf (Bible §5.3).
- **Walk-ons:** frog, beetle, vole, sparrow, and the Builder Beetles as a trio, 3/4 view each.
- **Sets:** Noodle Row (day, blue hour, night), the stall interior, the teapot (before and finished), the bakery interior, Lantern Lane, the matchbox shed, the Spool Bridge, the Teacup Harbour, the Thimble Tower, the pumpkin patch and the market.
- **The one pumpkin face design** (crooked grin and triangle eyes), shared by LF4 and SB.
- These refs feed Cinema Studio's `image_urls` and act as the QC 'truth' images.

### 3.3 Generation conventions (from Bible §5, restated for operators)
- **Seedance 2.5 i2v:** `image_url` = the SOUL keyframe (segment 1) or the previous segment's last frame (segment 2+). `end_image_url` = the end-pose still on the **final segment of a section only** (Shorts: the loop still). 720p. Each generation is 4–30s. A section over 30s is split evenly into ceil(s/30) gens (e.g. 45 → 23 + 22). The camera verb is repeated in every segment prompt, and every mid-chain segment carries 'motion continues'.
- **Cinema Studio 4.0:** only at hard cuts (it cannot continue a chain). `genre=drama`, `camera_model=35mm-film`. `pacing` and `camera_lens` are set per shot. `color_palette` is set by mood (Bible §5.1). 1–3 refs go in `image_urls`, and the adapter prefixes `<<<image_1>>>`. `era` is left unset.
- **Audio:** `generate_audio: true` for sync-critical foley. The brand *tink*, the ident and outro music, and the weather beds are always library assets. Strip any generated voices, mumbling or music.
- **Remotion:** a 6–10 frame audio crossfade at every seam, no video crossfade inside chains, and a 12-frame dip-to-warm (`#F2B35E` at 10%) only on time-jump cuts.

### 3.4 QC acceptance criteria (every clip, every video)
Check the first, middle and last frame of every segment, every chain seam at ±12 frames, and a full-speed watch with sound. **Any Reject item fails the clip.**

| Check | Accept | Reject |
|---|---|---|
| **Resident drift** | All cast marks present and correct whenever the resident is in the focus band: Miso's navy hachimaki, terracotta half-apron, cream shirt and white cloth. Bramble's round gold wire spectacles, sage cardigan with two wooden buttons, flour-dusted apron. Lumen's honey-amber shell with a cream spiral, brass lantern on a hook, navy peaked cap. Wren's chestnut feathers with cream barring and terracotta satchel. Minor fibre variance is acceptable. | A mark lost, recoloured or moved (for example, the apron turning navy). A species change. Extra limbs. A mouth moving as if talking. Two residents merging. A walk-on's scarf or colour swapping. |
| **Scale breaks** | Props match the scale table: thimble bowl ≈ 1.3× Miso's head width. Lamp head pea-sized, post pencil-stub high (≈ 3× Lumen's length). Pea pumpkin knee-high to Bramble. Teapot lid ≤ half the teapot body. Matchbox 5.3 × 3.6 cm, so Lumen fits with headroom. The everyday scale-cue object reads as real size. | Any prop that grows or shrinks between segments by more than 15%. A 'human-sized' knife, spoon or leaf. A pumpkin bigger than the resident. The town reading as full-size. |
| **Human hands or faces** | None. Resident paws are felted or resin and clearly non-human. | Any human finger, skin, face, silhouette or reflection in glass or water. Paws that turn into five-fingered hands. |
| **Texture consistency** | Needle-felt fibres, resin sheen, painted-wood brush marks, fine 35mm grain. Figurine medium constant within a video. | A slide into photoreal fur, glossy 3D-render plastic, a cartoon cel look, or a sudden sharpness change. Letters or signage text anywhere. |
| **Seam continuity** | At chain seams: the resident's position within ±5% of frame width, the same light level, the same camera direction and speed, no pose reset. At match cuts: the end pose ≈ the next keyframe. | A pop, jump, speed change, lighting step or prop teleport at a seam. A resident exiting frame at a boundary. |
| **Flicker** | Luminance stable within ±3% frame to frame, except for motivated events (a lamp lighting, the lightning glow, candle flicker inside a pumpkin). | Brightness pumping, texture 'boiling' on felt, strobing rain, or grain crawling in the flat sky. |
| **Brand and safety** | ≥1 Lantern Amber source in every night frame. No pure black. Fire only as a contained stove, tealight or candle glow. Weather gentle. | Neon or saturated primaries. Open flames spreading. Peril or injury. Scary storm imagery. |
| **Audio** | Foley in sync (±2 frames). No voices, mumbles or music in generated audio. Brand *tink* identical everywhere. | Generated speech or music left in. Clipping. Rain bed seams audible. |

### 3.5 Revision protocol (the operator authorised **2 targeted revisions per video**)
1. **First pass:** generate all sections, then run QC on every clip. An automatic in-pass re-roll (the same seed ±1, Bible §5.3) is allowed **only for hard Reject items** found at generation time, and it is budgeted inside the revision reserve below.
2. **Rough cut:** assemble, then run a full-speed watch plus the QC table.
3. **Revision 1:** re-generate only the weakest section (or only its failing segment, chained from the last good frame). Re-edit.
4. **Revision 2:** the next weakest section. Re-edit and lock.
5. If a section still fails after two revisions, use its **fallback** (written into each video's revision plan). A fallback reuses the same seconds or fewer, so it adds no cost. Never exceed the per-video reserve without operator sign-off.

---

## 4. Director briefs

### LF1 · A Rainy Night at the Tiny Ramen Shop

**Source idea:** L01 (tweaked: autumn rain, trimmed to ~8:55, Bottlecap letter lore hook) · **Series:** Shop Diaries (terracotta tick) · **Aspect:** 16:9 · **Runtime:** 8:54 · **Generated seconds:** 511s in 21 gens (50s Cinema Studio) · **Base cost:** $105.11

- **Final title:** *A Rainy Night at the Tiny Ramen Shop*
- **Alternate titles:** *Miso's Noodle Stand Stays Open Late | Thimble Town* · *Tiny Ramen Shop in the Rain — Cozy Miniature ASMR*
- **Thumbnail brief:** Extreme-macro thimble bowl of ramen filling 55% of the frame, steam catching Lantern Amber; Miso small and soft behind the counter; rain streaks on foreground glass; Night Ink/plum surround; the bowl's glow is the brightest area. Text **"open late"** (cream rounded serif, soft shadow, upper-left third). Terracotta 4px series tick top-left. Test variant B (Test & Compare): same frame, no text. Build it from the §6 end-pose still at 1080p SOUL, re-framed 16:9 with the bowl on the right third.
- **Hook (first 5s):** 0:00–0:06: extreme macro, a single raindrop falls from the tin awning into a thimble-sized ladle of broth. Crown splash, ripple rings in amber. Only the drip *plink* and rain on tin, with no music and no text. The viewer knows in under 2s that this is tiny and it is cooking. The pull-back comes in §1 after the ident.
- **Narration decision:** **Wordless.** This is the flagship of the ASMR and tiny-cooking audience, where Miniature Space and Tiny Kitchen show that wordless process wins and speech adds nothing. It is also the control arm for the narration A/B test against LF3. A narrated *Tales* remix can come later from the same footage (Bible §7).

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:06 | §0 Cold open: the drop | 6 | Seedance 2.5 i2v |
| 0:06–0:11 | **Ident "Lamps On"** (brand asset) | 5 | brand pack |
| 0:11–0:31 | §1 Rain arrives over Noodle Row | 20 | Cinema Studio 4.0 |
| 0:31–1:11 | §2 Shutters up, stove lit | 40 | Seedance 2.5 i2v |
| 1:11–2:11 | §3 Broth and noodles | 60 | Seedance 2.5 i2v |
| 2:11–3:01 | §4 The first customer | 50 | Seedance 2.5 i2v |
| 3:01–3:41 | §5 Lumen lights Noodle Row | 40 | Seedance 2.5 i2v |
| 3:41–4:41 | §6 One bowl, built | 60 | Seedance 2.5 i2v |
| 4:41–5:41 | §7 A full counter | 60 | Seedance 2.5 i2v |
| 5:41–6:11 | §8 Late, and thunder far off | 30 | Cinema Studio 4.0 |
| 6:11–7:11 | §9 The last customer | 60 | Seedance 2.5 i2v |
| 7:11–7:56 | §10 Closing up | 45 | Seedance 2.5 i2v |
| 7:56–8:36 | §11 Lamps out, rain stays | 40 | Seedance 2.5 i2v |
| 8:36–8:54 | **Outro + end screen** (brand asset) | 18 | brand pack |

**Chapters (storybook style):** `0:00` The rain comes · `0:31` Opening up · `1:11` Broth and noodles · `2:11` The first customer · `3:01` Lamps on Noodle Row · `3:41` One bowl · `4:41` A full counter · `5:41` Late · `6:11` The last customer · `7:11` Closing time

#### Script by section

#### §0 · Cold open: the drop — 6s (0:00–0:06)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | First frame of the video. Hard cut to the ident at 0:06. |
| Camera / lens / DOF / move | Locked extreme macro, 100mm look, f/2.8-equivalent, focus band on the broth surface; no move (stillness sells the drop). |
| Lighting | Amber stove glow from below-left; cool Rain Slate edge from the open awning. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the surface of broth in a thimble-sized ladle, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Extreme close-up: a toothpick-handled ladle full of golden broth fills the lower half of frame; a single raindrop hangs from the tin awning edge directly above it; Miso is a soft blur in the background holding the ladle handle.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the ripple rings spreading to the ladle rim, broth catching amber light.* Cast and set blocks stay verbatim.

**Stitch plan:** 6s → 1 gen (6).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 6s (0:00–0:06) | section keyframe | end-pose still | The raindrop falls from the awning edge into the ladle of broth; a crown splash and two ripple rings catch amber light; steam curls |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 6
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked extreme macro, no movement, constant speed, no cuts. The raindrop falls from the awning edge into the ladle of broth; a crown splash and two ripple rings catch amber light; steam curls, small toy-like movements.
Ambient motion: steam curling off the broth, rain falling out of focus behind. Lighting stays amber stove glow with rain-slate edge. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance audio: the drip *plink*. Library: rain-on-tin bed starts under frame 1 and runs under the whole episode.
- **Music cue:** None (Bible §7: no music in the first 5s).
- **On-screen text:** None.

#### §1 · Rain arrives over Noodle Row — 20s (0:11–0:31)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | Hard cut out of the ident (ident ends on the thimble tower; this opens on the same tower, wetter). |
| Camera / lens / DOF / move | Crane-down establishing: starts over tin-can rooftops, descends toward Noodle Row; 35mm-film look, warm tilt-shift band landing on the stall. |
| Lighting | Blue hour (Dusk Plum sky, Night Ink edges), every window Lantern Amber; the stall is the brightest source. |
| Narration | None (wordless). |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the lit ramen stall at the end of the lane, strong blur top and bottom. Miso's Noodle Stand on Noodle Row: hand-built
miniature street ramen stall on a cobbled lane made from an upturned wooden cotton-thread spool as the counter, a matchbox kitchen, a corrugated tin-can awning, pea-sized paper lanterns and a bottlecap stock pot on a tealight stove, with a brass sewing-thimble water tower on toothpick legs behind the rooftops (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Wide establishing view from rooftop height looking down Noodle Row toward the stall, rain beginning, the thimble tower silhouetted.
Lighting: blue hour with amber windows, soft rain, interior practical lamp glow spilling from the stall, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain arriving. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Establishing shot of Thimble Town's Noodle Row, a hand-built miniature town made of teacup houses, tin-can roofs and a sewing-thimble water tower, tilt-shift macro look, blue hour as soft rain begins, tiny amber windows, slow crane down over rooftops toward a glowing ramen stall with a tin-can awning, gentle toy-like motion of tiny figures in the distance, rain beading on tin, no people, no text."
image_urls = [noodle_row_set_ref, thimble_tower_ref]
genre = drama, pacing = calm, camera_model = 35mm-film, camera_lens = halation-vintage,
color_palette = twilight-fable, aspect_ratio = 16:9, resolution = 720p, duration = 20
```
**Stitch plan:** 20s → 1 gen (20s). Stand-alone shot between two hard cuts; no chain. Action: Crane down from rooftops to Noodle Row as the rain thickens; two distant walk-ons hurry under an awning.

- **Foley:** Library: rain-on-tin bed (continues), distant gutter trickle. No generated audio (CS clip muted).
- **Music cue:** None yet.
- **On-screen text:** None.

#### §2 · Shutters up, stove lit — 40s (0:31–1:11)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe) from the CS wide; eyeline continues down to the stall. |
| Camera / lens / DOF / move | Slow lateral macro dolly left-to-right along the stall front, 85mm look, f/2.8 band on Miso, rain-streaked foreground drips. |
| Lighting | Blue-hour exterior; the stall's lanterns warm up as the stove comes on. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Miso at the stall front, strong blur top and bottom. Miso's Noodle Stand on Noodle Row: hand-built
miniature street ramen stall on a cobbled lane made from an upturned wooden cotton-thread spool as the counter, a matchbox kitchen, a corrugated tin-can awning, pea-sized paper lanterns and a bottlecap stock pot on a tealight stove, with a brass sewing-thimble water tower on toothpick legs behind the rooftops (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso lifting a wooden roll-shutter above the spool counter with both paws, mid-push, rain beading on the tin awning.
Lighting: blue hour with amber windows, soft rain, interior practical lamp glow spilling from the stall, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Miso standing behind the spool counter, paws on her apron, the tealight stove glowing under the bottlecap pot.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (0:31–0:51) | section keyframe | — | Miso pushes the wooden shutter up and hooks it in place; the paper lanterns sway and brighten |
| 2 | 20s (0:51–1:11) | last frame of seg 1 | end-pose still | Miso turns a tiny brass knob under the counter; the tealight stove glows amber beneath the bottlecap pot and she settles behind the counter |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right, constant speed, no cuts. Miso pushes the wooden shutter up and hooks it in place; the paper lanterns sway and brighten, small toy-like movements.
Ambient motion: rain drips from the awning edge, pea lanterns sway slightly. Lighting stays blue hour with warm amber practicals. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right continues, constant speed, no cuts. Miso turns a tiny brass knob under the counter; the tealight stove glows amber beneath the bottlecap pot and she settles behind the counter, small toy-like movements.
Ambient motion: rain drips from the awning edge, pea lanterns sway slightly. Lighting stays blue hour with warm amber practicals. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: shutter wood slide, hook click, knob click, stove hush. Library: rain bed.
- **Music cue:** None (the town sound earns the first minute).
- **On-screen text:** None.

#### §3 · Broth and noodles — 60s (1:11–2:11)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut: §2 end pose (Miso behind counter) → this keyframe from the kitchen side. |
| Camera / lens / DOF / move | Very slow push-in, 100mm look, f/2.8 band on the pot rim; 3/4 top-down angle. |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the simmering bottlecap pot, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso stirring a simmering bottlecap pot with a toothpick-handled ladle, a kombu sheet the size of a stamp lifting on the ladle, a tiny mesh strainer and a nest of thread-thin noodles on a board beside her.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain outside. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Miso holding the tiny mesh strainer high, noodles steaming, water dripping back into the pot.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (1:11–1:41) | section keyframe | — | Miso stirs the broth, lifts the kombu sheet out, steam rolls up through the lantern light |
| 2 | 30s (1:41–2:11) | last frame of seg 1 | end-pose still | Miso drops the noodle nest into the boiling water, then lifts it in the tiny mesh strainer and gives two neat shakes |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in, constant speed, no cuts. Miso stirs the broth, lifts the kombu sheet out, steam rolls up through the lantern light, small toy-like movements.
Ambient motion: steam rising and curling, simmering bubbles, rain on the window behind. Lighting stays interior practical amber with rain-slate window. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in continues, constant speed, no cuts. Miso drops the noodle nest into the boiling water, then lifts it in the tiny mesh strainer and gives two neat shakes, small toy-like movements.
Ambient motion: steam rising and curling, simmering bubbles, rain on the window behind. Lighting stays interior practical amber with rain-slate window. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: simmer, ladle on ceramic, noodle swish, two strainer taps. Library: rain bed −3 dB.
- **Music cue:** Lo-fi keys enter 15s into the section (70–75 BPM, dusty felt piano, vinyl crackle) at −26 LUFS.
- **On-screen text:** None.

#### §4 · The first customer — 50s (2:11–3:01)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe): interior → exterior lane at figurine eye height. |
| Camera / lens / DOF / move | Low tracking macro dolly at 3 cm eye height, left-to-right, 85mm, band on the frog; wet cobbles reflect the stall. |
| Lighting | blue hour with amber windows, soft rain, interior practical lamp glow spilling from the stall |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the frog under a leaf umbrella, strong blur top and bottom. Miso's Noodle Stand on Noodle Row: hand-built
miniature street ramen stall on a cobbled lane made from an upturned wooden cotton-thread spool as the counter, a matchbox kitchen, a corrugated tin-can awning, pea-sized paper lanterns and a bottlecap stock pot on a tealight stove, with a brass sewing-thimble water tower on toothpick legs behind the rooftops (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
The frog walking along wet cobbles toward the glowing stall, leaf umbrella held high, rain drumming on the leaf; Miso a soft blur behind the counter.
Lighting: blue hour with amber windows, soft rain, interior practical lamp glow spilling from the stall, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: steady soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the frog seated on a button stool at the counter, leaf umbrella leaning against the spool, Miso giving a small nod.* Cast and set blocks stay verbatim.

**Stitch plan:** 50s → 2 gens (25 + 25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (2:11–2:36) | section keyframe | — | The frog walks toward the stall under the leaf umbrella, stepping around a puddle |
| 2 | 25s (2:36–3:01) | last frame of seg 1 | end-pose still | The frog ducks under the terracotta noren, folds the leaf, shakes off drops and climbs onto a button stool; Miso nods |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low tracking macro dolly left-to-right, constant speed, no cuts. The frog walks toward the stall under the leaf umbrella, stepping around a puddle, small toy-like movements.
Ambient motion: rain drumming on the leaf, ripples in puddles. Lighting stays blue hour with amber stall glow. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low tracking macro dolly left-to-right continues, constant speed, no cuts. The frog ducks under the terracotta noren, folds the leaf, shakes off drops and climbs onto a button stool; Miso nods, small toy-like movements.
Ambient motion: rain drumming on the leaf, ripples in puddles. Lighting stays blue hour with amber stall glow. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: rain on leaf, wet footsteps on cobble, noren cloth brush, tiny bell on the noren. Library: rain bed.
- **Music cue:** Keys continue, sparse.
- **On-screen text:** None.

#### §5 · Lumen lights Noodle Row — 40s (3:01–3:41)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true (replace the lamp *tink* with the library brand tink)` |
| Join in | Cut (new keyframe): wide lane. Optional 1.5s intro sting before this section (chapter transition). |
| Camera / lens / DOF / move | Low snail-height macro dolly left-to-right, 85mm, band on Lumen's lantern; lamp post fills right third. |
| Lighting | Blue hour moving to night; one dark lamp that becomes the section's new Lantern Amber source. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen and his brass lantern, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen gliding along wet cobbles toward a dark lamp post outside the ramen stall, brass lantern glowing on his shell hook, rain drops on his cap.
Lighting: blue hour with amber windows, soft rain, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the lamp head glowing amber above Lumen, its reflection spreading across the wet cobbles.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (3:01–3:21) | section keyframe | — | Lumen glides slowly along the wet cobbles to the base of the lamp post, lantern swinging gently |
| 2 | 20s (3:21–3:41) | last frame of seg 1 | end-pose still | Lumen stretches up and touches his lantern to the glass lamp head; it blooms amber and the glow spreads across the wet stones |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low snail-height macro dolly left-to-right, constant speed, no cuts. Lumen glides slowly along the wet cobbles to the base of the lamp post, lantern swinging gently, small toy-like movements.
Ambient motion: rain falling, reflections trembling in puddles. Lighting stays blue hour with amber windows. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low snail-height macro dolly left-to-right continues, constant speed, no cuts. Lumen stretches up and touches his lantern to the glass lamp head; it blooms amber and the glow spreads across the wet stones, small toy-like movements.
Ambient motion: rain falling, reflections trembling in puddles. Lighting stays blue hour with amber windows. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand lamp *tink* (sync to touch), slime-soft glide. Seedance: rain on brass, puddle ripples.
- **Music cue:** Keys duck −4 dB for the tink; music-box C note doubles the tink.
- **On-screen text:** None.

#### §6 · One bowl, built — 60s (3:41–4:41)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut to the counter macro (the lit lamp is now visible through the window behind). |
| Camera / lens / DOF / move | Locked 3/4 top-down, 100mm, f/2.8 band on the bowl; seg 2 adds a very slow push-in. |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a thimble-sized ceramic ramen bowl, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso pouring golden broth from the ladle into a thimble-sized cream ceramic bowl on the spool counter, toppings laid out in acorn caps beside it.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain outside. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the finished bowl — chashu slice, halved soft egg with amber yolk, scallion rings, a stamp-sized nori sheet — steaming, Miso's chopsticks lifting away.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (3:41–4:11) | section keyframe | — | Miso ladles broth into the bowl and folds the noodles in with toothpick chopsticks, laying them in a neat wave |
| 2 | 30s (4:11–4:41) | last frame of seg 1 | end-pose still | Miso places a chashu slice, a halved soft egg, scallion rings and a nori sheet one by one; steam curls up through the lantern light |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 top-down with a very slow push-in, constant speed, no cuts. Miso ladles broth into the bowl and folds the noodles in with toothpick chopsticks, laying them in a neat wave, small toy-like movements.
Ambient motion: steam curling, broth surface shimmering. Lighting stays interior practical amber. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 top-down with a very slow push-in continues, constant speed, no cuts. Miso places a chashu slice, a halved soft egg, scallion rings and a nori sheet one by one; steam curls up through the lantern light, small toy-like movements.
Ambient motion: steam curling, broth surface shimmering. Lighting stays interior practical amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: pour, chopstick taps, soft egg set-down, nori crackle. Library: rain bed −6 dB (foley-forward).
- **Music cue:** Keys continue at −28 LUFS under foley. Payoff A (~4:30, bowl complete).
- **On-screen text:** None.

#### §7 · A full counter — 60s (4:41–5:41)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut: §6 end pose (finished bowl) → Miso sliding it to the beetle, first frame of this keyframe. |
| Camera / lens / DOF / move | Slow lateral dolly left-to-right along the counter, 85mm, rain-streaked foreground glass for depth, band on each face in turn. |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the row of customers at the spool counter, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
BEETLE (walk-on, batch lock) — an unnamed beetle customer, hand-painted resin figurine with a glossy walnut-brown shell and a tiny cream knit scarf. About 2 cm long.
VOLE (walk-on, batch lock) — an unnamed vole, needle-felted soft grey-brown figurine with a terracotta-striped knit scarf. About 3 cm tall.
SPARROW (walk-on, batch lock) — an unnamed sparrow, felted buff-and-brown figurine with a small sage cloth satchel. About 3 cm tall.
The frog, the beetle, the vole and the sparrow seated in a row on button stools eating from thimble-sized bowls; Miso behind the counter sliding a bowl to the beetle.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: steady rain outside. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Miso at the end of the counter with the white cloth over her shoulder, all four customers eating.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (4:41–5:11) | section keyframe | — | The dolly passes the frog lifting noodles with chopsticks and the beetle sipping broth from a tiny spoon |
| 2 | 30s (5:11–5:41) | last frame of seg 1 | end-pose still | The dolly passes the vole blowing on noodles and the sparrow tucking a napkin; Miso wipes the counter at the end |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right, constant speed, no cuts. The dolly passes the frog lifting noodles with chopsticks and the beetle sipping broth from a tiny spoon, small toy-like movements.
Ambient motion: steam from four bowls, rain streaks on the foreground glass. Lighting stays interior practical amber. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right continues, constant speed, no cuts. The dolly passes the vole blowing on noodles and the sparrow tucking a napkin; Miso wipes the counter at the end, small toy-like movements.
Ambient motion: steam from four bowls, rain streaks on the foreground glass. Lighting stays interior practical amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: soft slurps (non-verbal only), bowl clinks, spoon taps, cloth wipe. Strip any mumble/voices.
- **Music cue:** Keys continue; a nylon-guitar line joins.
- **On-screen text:** None.

#### §8 · Late, and thunder far off — 30s (5:41–6:11)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | **Hard cut with 12-frame dip-to-warm** (time jump to late night). Optional intro sting. |
| Camera / lens / DOF / move | Slow single-shot orbit (15°) around the stall from across the lane, 35mm-film look, tilt-shift band on the stall. |
| Lighting | Night Ink sky, a soft blue lightning glow on distant clouds (fill only), the stall the only strong Lantern Amber source. |
| Narration | None (wordless). |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the lit stall across the lane, strong blur top and bottom. Miso's Noodle Stand on Noodle Row: hand-built
miniature street ramen stall on a cobbled lane made from an upturned wooden cotton-thread spool as the counter, a matchbox kitchen, a corrugated tin-can awning, pea-sized paper lanterns and a bottlecap stock pot on a tealight stove, with a brass sewing-thimble water tower on toothpick legs behind the rooftops (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Night wide from across the lane: Noodle Row mostly dark, the ramen stall glowing, paper lanterns tilted by a gust, puddles shining.
Lighting: night with amber windows, practical lamp glow, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: heavier rain, distant thunderstorm. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Night view of a hand-built miniature ramen stall with a tin-can awning on a cobbled lane in Thimble Town, tilt-shift macro look, heavy gentle rain, paper lanterns swaying in a gust, a soft blue glow of distant lightning on far clouds, the stall's amber light reflected in puddles, slow orbit, cozy and safe, never scary, no people, no text."
image_urls = [noodle_row_night_ref, stall_ref]
genre = drama, pacing = calm, camera_model = 35mm-film, camera_lens = halation-vintage,
color_palette = twilight-fable, aspect_ratio = 16:9, resolution = 720p, duration = 30
```
**Stitch plan:** 30s → 1 gen (30s). Stand-alone shot between two hard cuts; no chain. Action: Lanterns sway in a gust; distant lightning softly brightens clouds; the stall glows steady.

- **Foley:** Library: distant low thunder (−20 LUFS, rolled off below 60 Hz), lantern squeak, rain swell.
- **Music cue:** Keys fade out over the dip; a soft cello pad holds under the thunder.
- **On-screen text:** None.

#### §9 · The last customer — 60s (6:11–7:11)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe) back under the awning. |
| Camera / lens / DOF / move | Very slow push-in, 85mm, band holding both Wren and Miso; foreground drips. |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Wren and Miso at the counter, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
WREN — a small wren postbird courier, felted chestnut-brown feathers with fine cream
barring, an upturned tail, a tiny terracotta leather satchel across the chest, a folded
paper envelope often in her beak. About 3 cm tall. Quick, curious. Travels between
tiny worlds (our "visit another world" device).
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Wren just landed on the spool counter, soaked, feathers spiky, a damp folded envelope in her beak; Miso reaching toward her with the white cloth.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: heavy gentle rain outside. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Miso holding a pressed red autumn leaf and a tiny drawing of a bottle-cap skyline up to the lantern light, Wren wrapped in the white cloth eating from a small bowl.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (6:11–6:41) | section keyframe | — | Wren shakes her feathers; Miso drapes the white cloth over her and dabs her dry |
| 2 | 30s (6:41–7:11) | last frame of seg 1 | end-pose still | Wren offers the damp envelope; Miso sets a small bowl before her, unfolds the letter and lifts out a pressed red leaf and a tiny drawing of a bottle-cap city skyline |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in, constant speed, no cuts. Wren shakes her feathers; Miso drapes the white cloth over her and dabs her dry, small toy-like movements.
Ambient motion: drips from Wren's tail, steam from a fresh bowl. Lighting stays interior practical amber. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in continues, constant speed, no cuts. Wren offers the damp envelope; Miso sets a small bowl before her, unfolds the letter and lifts out a pressed red leaf and a tiny drawing of a bottle-cap city skyline, small toy-like movements.
Ambient motion: drips from Wren's tail, steam from a fresh bowl. Lighting stays interior practical amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: wing flutter, drips, cloth, paper unfold (hero sound, +2 dB), bowl set-down.
- **Music cue:** Music-box brand motif (C–E–G, celesta), slowed, on the leaf reveal. Payoff B (~6:50, ~77%). Lore hook for L05 Bottlecap City.
- **On-screen text:** None.

#### §10 · Closing up — 45s (7:11–7:56)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut: §9 end pose → Miso turning to the stove. |
| Camera / lens / DOF / move | Locked medium macro, 85mm, very slow push; Wren asleep at the counter stays in frame (no exits at seams). |
| Lighting | Interior practical amber dimming as the stove is turned down; one lantern stays lit. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Miso stacking bowls, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
WREN — a small wren postbird courier, felted chestnut-brown feathers with fine cream
barring, an upturned tail, a tiny terracotta leather satchel across the chest, a folded
paper envelope often in her beak. About 3 cm tall. Quick, curious. Travels between
tiny worlds (our "visit another world" device).
Miso stacking thimble-sized bowls beside the pot while Wren dozes on a button stool wrapped in the white cloth.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the window, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: rain easing. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Miso at the stove, the glow dim, one paper lantern lit, Wren asleep under the cloth.* Cast and set blocks stay verbatim.

**Stitch plan:** 45s → 2 gens (23 + 22).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 23s (7:11–7:34) | section keyframe | — | Miso stacks the bowls and wipes the counter in slow circles; steam thins |
| 2 | 22s (7:34–7:56) | last frame of seg 1 | end-pose still | Miso lowers the noren and turns the stove knob down; the glow fades to one lantern while Wren sleeps |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 23
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked medium macro with a very slow push, constant speed, no cuts. Miso stacks the bowls and wipes the counter in slow circles; steam thins, small toy-like movements.
Ambient motion: thinning steam, rain easing on the awning. Lighting stays interior practical amber dimming evenly. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 22
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked medium macro with a very slow push continues, constant speed, no cuts. Miso lowers the noren and turns the stove knob down; the glow fades to one lantern while Wren sleeps, small toy-like movements.
Ambient motion: thinning steam, rain easing on the awning. Lighting stays interior practical amber dimming evenly. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: bowls stacking, cloth wipe, knob click, noren slide. Library: rain easing.
- **Music cue:** Keys return for a final resolving phrase (8 bars), then out.
- **On-screen text:** None.

#### §11 · Lamps out, rain stays — 40s (7:56–8:36)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut: §10 end → exterior of the same lantern. Feeds straight into the outro. |
| Camera / lens / DOF / move | Slow pull-back from the stall to a town wide, 60mm look, tilt-shift band widening. |
| Lighting | Night Ink with a single Lantern Amber stall lantern and Lumen's lit lamp; windows going dark. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the half-shuttered stall, strong blur top and bottom. Miso's Noodle Stand on Noodle Row: hand-built
miniature street ramen stall on a cobbled lane made from an upturned wooden cotton-thread spool as the counter, a matchbox kitchen, a corrugated tin-can awning, pea-sized paper lanterns and a bottlecap stock pot on a tealight stove, with a brass sewing-thimble water tower on toothpick legs behind the rooftops (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso pulling the shutter halfway down, leaving one lantern burning for sleeping Wren, rain softer.
Lighting: night with one amber lantern and one lit street lamp, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *town wide at night, windows dark, the stall's single lantern and the lit street lamp the only warm lights, thimble tower silhouette.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (7:56–8:16) | section keyframe | — | Miso lowers the shutter halfway and steps inside; the other lanterns along the stall go out one by one |
| 2 | 20s (8:16–8:36) | last frame of seg 1 | end-pose still | The pull-back continues over wet rooftops to a town wide; windows go dark while the one stall lantern keeps glowing |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow pull-back, constant speed, no cuts. Miso lowers the shutter halfway and steps inside; the other lanterns along the stall go out one by one, small toy-like movements.
Ambient motion: soft rain, puddle ripples. Lighting stays night with the single amber lantern. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow pull-back continues, constant speed, no cuts. The pull-back continues over wet rooftops to a town wide; windows go dark while the one stall lantern keeps glowing, small toy-like movements.
Ambient motion: soft rain, puddle ripples. Lighting stays night with the single amber lantern. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: shutter clack. Library: rain bed only after that.
- **Music cue:** No music; rain alone for the last 20s, then the outro music-box reprise.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** Long holds with each section's single event landing in its middle third. Nothing is cut under 6s. The dolly speed is identical in every chained segment.
- **Cuts vs dissolves.** Hard cuts at section joins (match cuts where the end pose matches the next keyframe). Chain seams inside a section get no video transition, only a 6–10 frame audio crossfade. There is one 12-frame dip-to-warm (`#F2B35E` at 10%) into §8. Use the 1.5s intro sting only before §5 and §8, never more than twice.
- **Mix priorities.** (1) Hero foley per section (drip, noodle swish, nori crackle, paper unfold) at −16 to −14 LUFS short-term. (2) The rain-on-tin bed at −24, continuous under the whole episode so the seams disappear. (3) Lo-fi keys at −26 to −28, ducked −4 dB for every hero sound. Strip any generated audio that contains voices, mumbles or music. Master to −14 LUFS integrated.
- **Captions.** No burned-in text. Upload an English CC track of sound descriptions (`[rain on a tin roof]`, `[broth simmering]`, `[paper unfolding]`) for accessibility and search, with auto-translate on.
- **Delivery.** 16:9, sources at 720p, export 1080p (upscale step `[U]`: confirm the pipeline's upscaler; otherwise publish 720p). Chapters as listed. Description line: "Stories and worlds created with AI tools." 

#### Intro ident and outro
The ident ("Lamps On", 5s) sits at **0:06–0:11**, straight after the cold open, never at 0:00. The intro sting is optional before §5 and §8. The **outro (18s)** plays after §11. §11's pull-back already ends on a town wide with one lantern, so it cuts cleanly into the outro plate. End-screen slots: left = LF2 *Building a Tiny Bakery Inside a Teapot* (or "best for viewer" until LF2 is live), right = the Short *One Tiny Bowl of Ramen in the Rain*. Subscribe circle over the thimble tower.

#### QC acceptance: video-specific additions to §3.4
- The spool counter, bottlecap pot and tin-can awning are identical in all interior keyframes (use the same set reference).
- Rain reads as real-speed water at miniature scale and never as a snowy or static overlay.
- Every one of the 12 sections has at least one Lantern Amber source.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | §7 A full counter (60s) | Five figurines in one frame on a moving dolly: the highest identity drift and merge risk (beetle and vole swapping scarves, Miso's headband lost at the frame edge). | Pre-flight: generate 3 SOUL keyframe candidates and pick the one with the cleanest silhouettes. If seg 2 drifts, regenerate seg 2 only from seg 1's last frame, with seed ±1. If it still fails, split the section into two 30s hard-cut shots (frog and beetle; vole and sparrow) with new keyframes. Cost is unchanged. | 60s · $12.34 |
| R2 | §9 The last customer (60s) | Paper hand-off plus a small readable prop (the drawing of the bottle-cap skyline) invites garbled marks, and Wren's satchel can drift. | Pre-flight: make the drawing an image with no letters. Keep the envelope as a plain cream fold. If the reveal garbles, regenerate seg 2 with the end-pose still locked, framed so the drawing is seen at an angle. | 60s · $12.34 |

#### Estimate
- **Base generation:** 511s in 21 gens → **$105.11**.
- **Revision reserve** (both revisions used, full-section worst case): 120s → **$24.68**.
- **Ceiling for this video:** 631s → **$129.80**. The ident and outro come from the brand pack (§5), so they are not charged per video.

---

### LF2 · Building a Tiny Bakery Inside a Teapot

**Source idea:** L02 (tweaked: autumn, trimmed to 9:00, crew replaces the giant hand, icon sign instead of lettering) · **Series:** Build a Tiny (honey tick) · **Aspect:** 16:9 · **Runtime:** 9:00 · **Generated seconds:** 515s in 21 gens (50s Cinema Studio) · **Base cost:** $105.94

- **Final title:** *Building a Tiny Bakery Inside a Teapot*
- **Alternate titles:** *The Teapot Becomes a Bakery | Thimble Town* · *Tiny Builders Turn an Old Teapot Into a Bakery*
- **Thumbnail brief:** The finished teapot bakery at blue hour, filling 55% of the frame. One side still carries the toothpick scaffold with a builder beetle on it, and the door and two windows glow Lantern Amber. Bramble stands small on a toothpick ladder. Dusk Plum sky. **No text** (the before/after is the hook). Honey series tick top-left. Test variant B: split frame, the cracked plain teapot on the left and the glowing bakery on the right, with text **"it's a teapot"**.
- **Hook (first 5s):** 0:00–0:02: a flash of the *finished*, glowing teapot bakery at night (reused from §12, costs nothing). Then a hard cut: 0:02–0:07, top-down, Bramble chalks the last curve of an arched door on a plain cracked teapot. This is the OpusClip "flash the result, then rewind" pattern [R18]. It tells the viewer where the build ends before it starts, which is the Nerdforge-style build promise, compressed.
- **Narration decision:** **Wordless.** Build videos are carried by process sound (saw, clicks, taps) and visible progress. Narration would compete with the ASMR layer, which is the point of the format. Stage progress is shown through chapter titles and the story, never through burned-in text (Bible §4.7).

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:02 | Result flash (re-used frames, no generation) | 2 | — |
| 0:02–0:07 | §0 Cold open: the promise, then the chalk line | 5 | Seedance 2.5 i2v |
| 0:07–0:12 | **Ident "Lamps On"** (brand asset) | 5 | brand pack |
| 0:12–0:32 | §1 The teapot on the hill | 20 | Cinema Studio 4.0 |
| 0:32–1:12 | §2 Measuring up | 40 | Seedance 2.5 i2v |
| 1:12–2:02 | §3 Cutting the door | 50 | Seedance 2.5 i2v |
| 2:02–2:42 | §4 Windows | 40 | Seedance 2.5 i2v |
| 2:42–3:42 | §5 Floorboards | 60 | Seedance 2.5 i2v |
| 3:42–4:42 | §6 The oven | 60 | Seedance 2.5 i2v |
| 4:42–5:22 | §7 Shelves and flour sacks | 40 | Seedance 2.5 i2v |
| 5:22–5:52 | §8 Painting the sign | 30 | Seedance 2.5 i2v |
| 5:52–6:22 | §9 The lid goes on | 30 | Seedance 2.5 i2v |
| 6:22–7:12 | §10 First loaf | 50 | Seedance 2.5 i2v |
| 7:12–8:12 | §11 Opening day | 60 | Seedance 2.5 i2v |
| 8:12–8:42 | §12 Night on the hill | 30 | Cinema Studio 4.0 |
| 8:42–9:00 | **Outro + end screen** (brand asset) | 18 | brand pack |

**Chapters (storybook style):** `0:00` The teapot on the hill · `0:32` Measuring up · `1:12` A door · `2:42` Floors and an oven · `4:42` Shelves and a sign · `5:52` The lid · `6:22` First loaf · `7:12` Opening day

#### Script by section

#### §0 · Cold open: the promise, then the chalk line — 5s (0:02–0:07)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | 0:00–0:02 is a **free reuse**: the last 2s of §12 (finished teapot glowing at night). Hard cut at 0:02 to this 5s gen. Hard cut to ident at 0:07. |
| Camera / lens / DOF / move | Top-down macro, 85mm, band on the chalk line; locked. |
| Lighting | Early morning low sun from left. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on a chalk line on the teapot's side, strong blur top and bottom. The teapot on the hill: hand-built
miniature building site on a mossy hill made from an old, empty round cream ceramic teapot with a hairline crack, no door or windows yet, a toothpick-and-thread scaffold and a thread-spool winch beside it, a giant pencil lying in the moss (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Top-down view along the teapot's curved side: Bramble holding a chalk stub, finishing the last curve of an arched door outline on the cream ceramic.
Lighting: early morning low sun from left, soft mist, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the complete chalk arch, Bramble stepping back with the chalk stub.* Cast and set blocks stay verbatim.

**Stitch plan:** 5s → 1 gen (5).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 5s (0:02–0:07) | section keyframe | end-pose still | Bramble draws the last curve of an arched door outline in chalk on the teapot's side and steps back; chalk dust drifts |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 5
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down macro, constant speed, no cuts. Bramble draws the last curve of an arched door outline in chalk on the teapot's side and steps back; chalk dust drifts, small toy-like movements.
Ambient motion: chalk dust drifting in the sunbeam. Lighting stays early morning low sun. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: chalk scratch (hero). No music.
- **Music cue:** None.
- **On-screen text:** None.

#### §1 · The teapot on the hill — 20s (0:12–0:32)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | Hard cut out of the ident. |
| Camera / lens / DOF / move | Slow orbit (30°) around the teapot at figurine height, then rising; 35mm-film look; the pencil in the moss gives scale. |
| Lighting | Dawn: Honey key from low left, mist, first long shadows; Thimble Town's roofs soft in the valley. |
| Narration | None (wordless). |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the old teapot on the hill, strong blur top and bottom. The teapot on the hill: hand-built
miniature building site on a mossy hill made from an old, empty round cream ceramic teapot with a hairline crack, no door or windows yet, a toothpick-and-thread scaffold and a thread-spool winch beside it, a giant pencil lying in the moss (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Wide view of the empty teapot on the hill at dawn with Thimble Town's roofs below, the scaffold stacked beside it.
Lighting: early morning low sun from left, soft mist, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: fog morning lifting. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Establishing shot of an old cream ceramic teapot standing on a mossy hill above Thimble Town, a hand-built miniature town of teacup houses and a sewing-thimble water tower, tilt-shift macro look, autumn dawn with lifting mist, toothpick scaffold beside the teapot, a giant pencil lying in the moss for scale, slow orbit rising, gentle toy-like motion of tiny beetles carrying planks in the distance, no people, no text."
image_urls = [teapot_before_ref, town_ref, bramble_ref]
genre = drama, pacing = calm, camera_model = 35mm-film, camera_lens = warm-vintage,
color_palette = oil-ochre, aspect_ratio = 16:9, resolution = 720p, duration = 20
```
**Stitch plan:** 20s → 1 gen (20s). Stand-alone shot between two hard cuts; no chain. Action: Orbit around the teapot as mist lifts; tiny builder beetles carry planks up the hill in the distance.

- **Foley:** Library: dawn birds (tiny, sparse), breeze in moss.
- **Music cue:** Fingerpicked nylon guitar bed enters at 0:04 of this section (−26 LUFS).
- **On-screen text:** None.

#### §2 · Measuring up — 40s (0:32–1:12)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Rack focus (2–3s) from the thread spool in the foreground to Bramble, then slow lateral macro dolly left-to-right; 85mm. |
| Lighting | morning low sun from left, Honey key. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Bramble with a thread tape, strong blur top and bottom. The teapot on the hill: hand-built
miniature building site on a mossy hill made from an old, empty round cream ceramic teapot with a hairline crack, no door or windows yet, a toothpick-and-thread scaffold and a thread-spool winch beside it, a giant pencil lying in the moss (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Bramble unrolling a cream thread measuring tape around the teapot's belly while Miso holds the free end steady; a cotton-thread spool sharp in the foreground.
Lighting: early morning low sun from left, soft mist, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Bramble peering over her gold spectacles at a chalk tick-mark, nodding; Miso holding the tape end.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (0:32–0:52) | section keyframe | — | Bramble walks the thread tape around the teapot's curve while Miso holds the end |
| 2 | 20s (0:52–1:12) | last frame of seg 1 | end-pose still | Bramble makes a chalk tick at the measured point, peers over her spectacles and nods |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right, constant speed, no cuts. Bramble walks the thread tape around the teapot's curve while Miso holds the end, small toy-like movements.
Ambient motion: dust motes in the sunbeam, the thread gently swaying. Lighting stays warm morning low sun. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right continues, constant speed, no cuts. Bramble makes a chalk tick at the measured point, peers over her spectacles and nods, small toy-like movements.
Ambient motion: dust motes in the sunbeam, the thread gently swaying. Lighting stays warm morning low sun. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: thread unspool, footsteps on moss, chalk tick. Library: breeze.
- **Music cue:** Guitar continues.
- **On-screen text:** None.

#### §3 · Cutting the door — 50s (1:12–2:02)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut: §2 end pose → the chalk arch now with the crew in position. |
| Camera / lens / DOF / move | 3/4 macro, 85mm, band on the saw line; very slow push-in. |
| Lighting | Morning low sun from left; ceramic dust glows in the beam. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the builder beetles sawing the door arch, strong blur top and bottom. The teapot on the hill: hand-built
miniature building site on a mossy hill made from an old, empty round cream ceramic teapot with a hairline crack, no door or windows yet, a toothpick-and-thread scaffold and a thread-spool winch beside it, a giant pencil lying in the moss (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
The three builder beetles working a tiny bow saw along the chalk arch on the teapot's side, fine ceramic dust puffing; Bramble supervising, paws clasped.
Lighting: early morning low sun from left, soft mist, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the arched doorway open, the cut door panel propped against the teapot, the crew leaning on the saw, Bramble peering inside.* Cast and set blocks stay verbatim.

**Stitch plan:** 50s → 2 gens (25 + 25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (1:12–1:37) | section keyframe | — | The beetles saw steadily along the chalk arch; dust puffs with each stroke |
| 2 | 25s (1:37–2:02) | last frame of seg 1 | end-pose still | The cut panel tips free; the beetles catch it and prop it aside; sunlight falls into the dark interior |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in, constant speed, no cuts. The beetles saw steadily along the chalk arch; dust puffs with each stroke, small toy-like movements.
Ambient motion: fine ceramic dust drifting through the sunbeam. Lighting stays warm morning low sun. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in continues, constant speed, no cuts. The cut panel tips free; the beetles catch it and prop it aside; sunlight falls into the dark interior, small toy-like movements.
Ambient motion: fine ceramic dust drifting through the sunbeam. Lighting stays warm morning low sun. Warm cozy palette, fine film grain.
```

- **Foley:** Library: fine saw rasp (loop-cut to stroke rhythm), ceramic *tock* as the panel frees. Seedance for dust hush.
- **Music cue:** Guitar continues, one bar rest at the panel drop.
- **On-screen text:** None.

#### §4 · Windows — 40s (2:02–2:42)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow lateral macro dolly left-to-right across the four window holes, 85mm. |
| Lighting | Late-morning Honey key; mica panes flash as they catch the sun. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Miso fitting a mica window pane, strong blur top and bottom. The teapot on the hill: hand-built
miniature building site on a mossy hill made from an old, empty round cream ceramic teapot with a hairline crack, no door or windows yet, a toothpick-and-thread scaffold and a thread-spool winch beside it, a giant pencil lying in the moss (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Miso pressing a small mica pane into a round window hole in the teapot while Bramble polishes the neighbouring pane with a felt cloth.
Lighting: late-morning low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *four fitted windows reflecting the sun, Bramble tucking the felt cloth into her apron.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (2:02–2:22) | section keyframe | — | Miso presses the first pane in with a soft click and moves to the next |
| 2 | 20s (2:22–2:42) | last frame of seg 1 | end-pose still | Bramble polishes the last pane; all four windows catch the sun |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right, constant speed, no cuts. Miso presses the first pane in with a soft click and moves to the next, small toy-like movements.
Ambient motion: sun glints moving across the panes. Lighting stays warm late-morning sun. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right continues, constant speed, no cuts. Bramble polishes the last pane; all four windows catch the sun, small toy-like movements.
Ambient motion: sun glints moving across the panes. Lighting stays warm late-morning sun. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: pane *click* ×4 (hero), felt squeak. Library: breeze.
- **Music cue:** Guitar continues.
- **On-screen text:** None.

#### §5 · Floorboards — 60s (2:42–3:42)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut** (time jump; build stage change). Optional intro sting. |
| Camera / lens / DOF / move | Locked 90° top-down into the open teapot, with a very slow clockwise rotate; 60mm. |
| Lighting | Interior bounce light off the cream ceramic, sunbeam from the door arch. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the floor being laid inside the teapot, strong blur top and bottom. Inside the teapot bakery: hand-built
miniature bakery interior made from the curved cream ceramic inner wall of a teapot, coffee-stirrer floorboards, a domed oven of rice-grain clay bricks, toothpick shelves with bead jars and tea-bag flour sacks (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
Top-down into the lidless teapot: the three builder beetles laying coffee-stirrer floorboards in a neat row, half the floor done, a stack of planks by the door.
Lighting: soft interior bounce light with a sunbeam from the doorway, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *a complete floor of coffee-stirrer boards, the three beetles sitting on the last board.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (2:42–3:12) | section keyframe | — | The beetles lay boards one by one and tap them into place with a tiny mallet |
| 2 | 30s (3:12–3:42) | last frame of seg 1 | end-pose still | The last boards go in; the crew sits down in a row on the finished floor |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down with a very slow clockwise rotate, constant speed, no cuts. The beetles lay boards one by one and tap them into place with a tiny mallet, small toy-like movements.
Ambient motion: dust motes drifting in the doorway sunbeam. Lighting stays soft interior bounce light. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down with a very slow clockwise rotate continues, constant speed, no cuts. The last boards go in; the crew sits down in a row on the finished floor, small toy-like movements.
Ambient motion: dust motes drifting in the doorway sunbeam. Lighting stays soft interior bounce light. Warm cozy palette, fine film grain.
```

- **Foley:** Library: wood-block taps, tiny mallet, board slide (ASMR pattern, 2 taps per board).
- **Music cue:** Guitar thins to one motif; foley leads.
- **On-screen text:** None.

#### §6 · The oven — 60s (3:42–4:42)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow push-in, 100mm, band on the brick course being laid. |
| Lighting | Warm interior practical lamp, Honey spill from the doorway. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on Bramble building a clay brick oven, strong blur top and bottom. Inside the teapot bakery: hand-built
miniature bakery interior made from the curved cream ceramic inner wall of a teapot, coffee-stirrer floorboards, a domed oven of rice-grain clay bricks, toothpick shelves with bead jars and tea-bag flour sacks (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Bramble setting a rice-grain-sized clay brick onto the second course of a domed oven, a bottlecap of mortar at her side.
Lighting: interior practical lamp glow with honey spill from the doorway, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the closed brick dome, Bramble smoothing it with a paintbrush, the oven mouth dark and ready.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (3:42–4:12) | section keyframe | — | Bramble lays bricks course by course, pressing each into the mortar |
| 2 | 30s (4:12–4:42) | last frame of seg 1 | end-pose still | The dome closes; Bramble smooths the seams with a paintbrush and taps the crown |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in, constant speed, no cuts. Bramble lays bricks course by course, pressing each into the mortar, small toy-like movements.
Ambient motion: clay dust, a warm sunbeam through the arch. Lighting stays warm interior practical. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in continues, constant speed, no cuts. The dome closes; Bramble smooths the seams with a paintbrush and taps the crown, small toy-like movements.
Ambient motion: clay dust, a warm sunbeam through the arch. Lighting stays warm interior practical. Warm cozy palette, fine film grain.
```

- **Foley:** Library: clay *tuck* per brick, brush strokes. Seedance: mortar squish.
- **Music cue:** Guitar continues.
- **On-screen text:** None.

#### §7 · Shelves and flour sacks — 40s (4:42–5:22)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow lateral macro dolly right-to-left along the new shelves, 85mm. |
| Lighting | Warm interior practical lamp. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Miso carrying a tea-bag flour sack, strong blur top and bottom. Inside the teapot bakery: hand-built
miniature bakery interior made from the curved cream ceramic inner wall of a teapot, coffee-stirrer floorboards, a domed oven of rice-grain clay bricks, toothpick shelves with bead jars and tea-bag flour sacks (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Miso carrying a tea-bag flour sack past toothpick shelves while Bramble arranges bead jars of jam.
Lighting: interior practical lamp glow, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *stocked shelves, three tea-bag sacks stacked, Bramble adjusting her spectacles.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (4:42–5:02) | section keyframe | — | Miso sets a tea-bag sack down with a puff of flour; Bramble slides bead jars onto a shelf |
| 2 | 20s (5:02–5:22) | last frame of seg 1 | end-pose still | The dolly continues across full shelves; Bramble adjusts her spectacles |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly right-to-left, constant speed, no cuts. Miso sets a tea-bag sack down with a puff of flour; Bramble slides bead jars onto a shelf, small toy-like movements.
Ambient motion: a puff of flour as a sack lands. Lighting stays warm interior practical. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly right-to-left continues, constant speed, no cuts. The dolly continues across full shelves; Bramble adjusts her spectacles, small toy-like movements.
Ambient motion: a puff of flour as a sack lands. Lighting stays warm interior practical. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: sack thump, flour puff, jar clinks.
- **Music cue:** Guitar continues.
- **On-screen text:** None.

#### §8 · Painting the sign — 30s (5:22–5:52)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Locked 3/4 macro, 100mm, band on the brush tip. |
| Lighting | Afternoon Honey key through the door arch. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a paintbrush on a small wooden sign, strong blur top and bottom. Bramble's Bakery & Tea: hand-built
miniature two-storey bakery on a mossy hill made from a round cream ceramic teapot with an arched wooden door cut into its belly, four small mica-paned windows, the lid as the roof with a chimney through the knob and the spout as a bay window (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Bramble painting a small wooden hanging sign with a terracotta loaf and a cream teacup icon, no letters.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the finished icon sign (loaf and teacup, no letters) drying on a thread hook.* Cast and set blocks stay verbatim.

**Stitch plan:** 30s → 1 gen (30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (5:22–5:52) | section keyframe | end-pose still | Bramble paints the loaf icon and teacup icon in slow strokes, then hangs the sign on its thread hook |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 macro, constant speed, no cuts. Bramble paints the loaf icon and teacup icon in slow strokes, then hangs the sign on its thread hook, small toy-like movements.
Ambient motion: paint glistening. Lighting stays warm afternoon sun. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brush strokes (close), hook clink.
- **Music cue:** Guitar; one rising phrase.
- **On-screen text:** None.

#### §9 · The lid goes on — 30s (5:52–6:22)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Low heroic angle, 60mm, band on the lid rim; locked. |
| Lighting | Late golden hour, long shadows. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the teapot lid on a thread pulley, strong blur top and bottom. Bramble's Bakery & Tea: hand-built
miniature two-storey bakery on a mossy hill made from a round cream ceramic teapot with an arched wooden door cut into its belly, four small mica-paned windows, the lid as the roof with a chimney through the knob and the spout as a bay window (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
The teapot lid hanging from a thread pulley on a pencil crane just above the open teapot, the three builder beetles hauling the thread, Miso guiding the lid's edge from the scaffold.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the lid seated on the teapot, the chimney pipe poking through the knob, the crew cheering with raised caps.* Cast and set blocks stay verbatim.

**Stitch plan:** 30s → 1 gen (30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (5:52–6:22) | section keyframe | end-pose still | The beetles lower the lid inch by inch; Miso guides it; it settles with a soft ceramic clink |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked low heroic angle, constant speed, no cuts. The beetles lower the lid inch by inch; Miso guides it; it settles with a soft ceramic clink, small toy-like movements.
Ambient motion: the thread swaying slightly. Lighting stays late golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: rope creak, pulley squeak, ceramic *clink* (hero).
- **Music cue:** Guitar holds a suspended chord, resolves on the clink.
- **On-screen text:** None.

#### §10 · First loaf — 50s (6:22–7:12)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut with 12-frame dip-to-warm** (evening). |
| Camera / lens / DOF / move | Very slow push-in on the oven mouth, 100mm, band on the loaf. |
| Lighting | interior practical lamp glow and warm oven glow |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a small dough loaf on a wooden peel, strong blur top and bottom. Inside the teapot bakery: hand-built
miniature bakery interior made from the curved cream ceramic inner wall of a teapot, coffee-stirrer floorboards, a domed oven of rice-grain clay bricks, toothpick shelves with bead jars and tea-bag flour sacks (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Bramble sliding a small pale dough loaf into the glowing brick oven on a tiny wooden peel.
Lighting: interior practical lamp glow and warm oven glow, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear evening. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Bramble holding a golden-brown loaf on the peel, steam rising, spectacles glinting in the oven glow.* Cast and set blocks stay verbatim.

**Stitch plan:** 50s → 2 gens (25 + 25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (6:22–6:47) | section keyframe | — | Bramble slides the loaf in and closes the little iron oven door; the glow pulses through the gap |
| 2 | 25s (6:47–7:12) | last frame of seg 1 | end-pose still | Bramble opens the door; steam rolls out; she draws out a risen golden loaf on the peel |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in, constant speed, no cuts. Bramble slides the loaf in and closes the little iron oven door; the glow pulses through the gap, small toy-like movements.
Ambient motion: oven glow flickering gently, steam. Lighting stays warm oven glow. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: very slow push-in continues, constant speed, no cuts. Bramble opens the door; steam rolls out; she draws out a risen golden loaf on the peel, small toy-like movements.
Ambient motion: oven glow flickering gently, steam. Lighting stays warm oven glow. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: oven door creak, crackle, crust crackle on the reveal (hero +2 dB).
- **Music cue:** Music-box motif (C–E–G) on the loaf reveal. Payoff (~7:00, ~78%).
- **On-screen text:** None.

#### §11 · Opening day — 60s (7:12–8:12)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe) to the exterior. |
| Camera / lens / DOF / move | Slow lateral macro dolly left-to-right past the door and windows, 85mm. |
| Lighting | Last golden hour; every window Lantern Amber. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Bramble at her new door, strong blur top and bottom. Bramble's Bakery & Tea: hand-built
miniature two-storey bakery on a mossy hill made from a round cream ceramic teapot with an arched wooden door cut into its belly, four small mica-paned windows, the lid as the roof with a chimney through the knob and the spout as a bay window (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
BEETLE (walk-on, batch lock) — an unnamed beetle customer, hand-painted resin figurine with a glossy walnut-brown shell and a tiny cream knit scarf. About 2 cm long.
Bramble opening the arched door of the finished teapot bakery and hanging the icon sign, Miso, the frog and the beetle waiting on the moss path.
Lighting: golden hour low sun from left with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *a small queue at the lit door, Bramble handing the first loaf slice to Miso.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (7:12–7:42) | section keyframe | — | Bramble opens the door and hangs the sign; the windows glow |
| 2 | 30s (7:42–8:12) | last frame of seg 1 | end-pose still | The frog, beetle and Miso step up; Bramble hands out the first slices |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right, constant speed, no cuts. Bramble opens the door and hangs the sign; the windows glow, small toy-like movements.
Ambient motion: steam from the chimney, leaves drifting. Lighting stays golden hour with amber windows. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right continues, constant speed, no cuts. The frog, beetle and Miso step up; Bramble hands out the first slices, small toy-like movements.
Ambient motion: steam from the chimney, leaves drifting. Lighting stays golden hour with amber windows. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: door creak, tiny bell, footsteps on moss, bread tear.
- **Music cue:** Guitar + music-box together, full phrase.
- **On-screen text:** None.

#### §12 · Night on the hill — 30s (8:12–8:42)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | **Hard cut** (night). Its last 2s are re-used as the cold-open flash. |
| Camera / lens / DOF / move | Slow single-shot crane up and back from the teapot to the hill, 35mm-film look. |
| Lighting | Blue hour → night; teapot windows and chimney glow are the Lantern Amber anchors. |
| Narration | None (wordless). |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the glowing teapot bakery, strong blur top and bottom. Bramble's Bakery & Tea: hand-built
miniature two-storey bakery on a mossy hill made from a round cream ceramic teapot with an arched wooden door cut into its belly, four small mica-paned windows, the lid as the roof with a chimney through the knob and the spout as a bay window (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Night wide: the finished teapot bakery glowing on the hill, Lumen small at the door lighting the lamp beside it.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: starry clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Night establishing shot of a hand-built miniature bakery made from a cream teapot on a mossy hill above Thimble Town, tilt-shift macro look, starry blue hour, every little window glowing amber, a tiny snail with a lantern lighting a lamp beside the door, smoke from the knob chimney, slow crane up and back, gentle toy-like motion, no people, no text."
image_urls = [teapot_finished_ref, lumen_ref, town_ref]
genre = drama, pacing = single-shot, camera_model = 35mm-film, camera_lens = halation-vintage,
color_palette = twilight-fable, aspect_ratio = 16:9, resolution = 720p, duration = 30
```
**Stitch plan:** 30s → 1 gen (30s). Stand-alone shot between two hard cuts; no chain. Action: The lamp by the door lights; crane rises until the teapot is a warm dot above the town lights.

- **Foley:** Library: crickets, brand lamp *tink*.
- **Music cue:** Guitar out; crickets into the outro.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** Build sections alternate top-down and 3/4 views so each stage *looks* different. Every section ends on a completed sub-task (the end pose), so each chapter is a small payoff.
- **Cuts vs dissolves.** Hard cuts for the stage jumps into §5 and §10. §10 gets the 12-frame dip-to-warm. Match cuts elsewhere. No speed ramps. The only acceleration is the one time-passing beat inside §10 seg 2 (the loaf rises), shown as one continuous shot and not a timelapse cut.
- **Mix priorities.** (1) Tool foley: saw rasp, pane clicks, mallet taps, clay tucks. It is mostly library, cut to the on-screen strokes frame by frame. (2) Ambient bed: dawn birds, then breeze, then oven hum, then crickets. (3) Nylon guitar at −26, dropping to a single motif line in §5–§6 so the taps lead.
- **Captions.** A sound-description CC track only. No on-screen text.
- **Delivery.** As LF1. Keep §12's last 2s as a separate render for the cold open.

#### Intro ident and outro
The cold open runs 0:00–0:07. The **ident runs 0:07–0:12**. The **intro sting** marks the §5 chapter change. The **outro** follows §12, whose crane-back ends on the teapot as a warm dot, which matches the outro's town wide. End screen: left = LF3 *The Snail Who Lights the Lamps* (Lumen lights this bakery's lamp in §12, a continuity hand-off), right = the Short *Turning a Matchbox Into a Tiny Shed*.

#### QC acceptance: video-specific additions to §3.4
- The teapot silhouette, crack line and window positions stay constant from §3 onward (use the same set reference for every exterior keyframe).
- The door arch is the same shape as the chalk outline.
- The icon sign shows **no letters** at any frame.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | §9 The lid goes on (30s) | Scale break: the teapot lid must stay in proportion to the teapot (about 45% of body width) and must not come out as a giant human-scale object. There is also a risk of an implied hand pulling the thread. | Pre-flight: approve the SOUL still only if the lid width is ≤ half the teapot and the pencil crane is visible. If the gen breaks scale, regenerate with `end_image_url` = the lid-seated still, and shorten to 20s (saves 10s). | 30s · $6.17 |
| R2 | §5 Floorboards (60s) | A locked top-down with three identical beetles repeating an action: the crew count drifts (2 or 4 beetles), boards warp or interpenetrate, and the rotation causes texture boiling. | Pre-flight: drop the rotation if the test seg shows boiling. On failure, regenerate seg 2 from seg 1's last frame with "exactly three beetles" added to the prompt, and accept a reduced 20s seg if needed. | 60s · $12.34 |

#### Estimate
- **Base generation:** 515s in 21 gens → **$105.94**.
- **Revision reserve** (both revisions used, full-section worst case): 90s → **$18.51**.
- **Ceiling for this video:** 605s → **$124.45**. The ident and outro come from the brand pack (§5), so they are not charged per video.

---

### LF3 · The Snail Who Lights the Lamps | A Tiny Town Bedtime Story

**Source idea:** L03 (tweaked: narrated, 7:29, Lumen's home is the S08 matchbox shed, whole cast cameo) · **Series:** Night Lights (plum tick) · **Aspect:** 16:9 · **Runtime:** 7:29 · **Generated seconds:** 426s in 19 gens (60s Cinema Studio) · **Base cost:** $87.63

- **Final title:** *The Snail Who Lights the Lamps | A Tiny Town Bedtime Story*
- **Alternate titles:** *Lumen's Evening Round (Cozy Narrated Miniature Story)* · *Every Lamp in the Tiny Town, Lit by One Snail*
- **Thumbnail brief:** Extreme macro of Lumen's brass lantern touching a glowing lamp head, filling 50%. Lumen's navy cap and amber shell are sharp at lower-left. Behind them, the lit lane is a string of amber bokeh against Night Ink. Text **"lamps on"** (cream). Plum tick top-left. Test variant B: a wider frame with Lumen tiny at the foot of the thimble tower, all lamps lit, text **"goodnight"**.
- **Hook (first 5s):** 0:00–0:06: extreme macro, Lumen's brass lantern touches a dark lamp, *tink*, and the glass blooms amber. No voice until after the ident. The ident then repeats the same gesture at town scale, so the hook and the brand rhyme.
- **Narration decision:** **Narrated (soft "Keeper of the Lamps" narrator).** This is the one narrated video in the batch, chosen for three reasons. (1) It is a *tour* episode that introduces all four residents and the town's places, and naming them builds IP recall faster than posture alone. (2) It targets bedtime-story search. (3) It is the treatment arm of the batch's narration A/B test. The script is about 260 words over 7:29 (~35 WPM effective), with silence under both payoffs. ElevenLabs direction is as in Bible §7 (stability about 0.65, similarity about 0.8, style about 0.15). Each line is timed from its section start ("0:08" = 8s into the section).

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:06 | §0 Cold open: tink | 6 | Seedance 2.5 i2v |
| 0:06–0:11 | **Ident "Lamps On"** (brand asset) | 5 | brand pack |
| 0:11–0:31 | §1 Sunset over the rooftops | 20 | Cinema Studio 4.0 |
| 0:31–1:11 | §2 Out of the matchbox | 40 | Seedance 2.5 i2v |
| 1:11–1:51 | §3 The first lamp | 40 | Seedance 2.5 i2v |
| 1:51–2:41 | §4 Past Miso's stand | 50 | Seedance 2.5 i2v |
| 2:41–3:26 | §5 The spool bridge | 45 | Seedance 2.5 i2v |
| 3:26–4:11 | §6 A wave from the teapot | 45 | Seedance 2.5 i2v |
| 4:11–4:41 | §7 Wren overhead | 30 | Seedance 2.5 i2v |
| 4:41–5:31 | §8 Harbour lamps | 50 | Seedance 2.5 i2v |
| 5:31–6:31 | §9 The tower | 60 | Seedance 2.5 i2v |
| 6:31–7:11 | §10 Every lamp | 40 | Cinema Studio 4.0 |
| 7:11–7:29 | **Outro + end screen** (brand asset) | 18 | brand pack |

**Chapters (storybook style):** `0:00` Sunset · `0:31` The matchbox · `1:11` The first lamp · `1:51` Noodle Row · `2:41` The spool bridge · `3:26` The teapot · `4:41` The harbour · `5:31` The tower · `6:31` Every lamp

#### Script by section

#### §0 · Cold open: tink — 6s (0:00–0:06)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: false (library brand tink + crickets)` |
| Join in | First frame. Hard cut to ident at 0:06 (the ident repeats the gesture at town scale, a deliberate rhyme). |
| Camera / lens / DOF / move | Locked extreme macro, 100mm, f/2.8 band on the lamp glass. |
| Lighting | Blue hour; the lamp goes from dark to Lantern Amber. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen's brass lantern touching a glass lamp head, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Extreme close-up: Lumen's brass lantern on its shell hook a hair's breadth from a dark pea-sized glass lamp head, his navy cap edge in soft focus.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: starry clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the lamp glass fully bloomed amber, the brass lantern glinting.* Cast and set blocks stay verbatim.

**Stitch plan:** 6s → 1 gen (6).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 6s (0:00–0:06) | section keyframe | end-pose still | The lantern touches the lamp glass; the lamp blooms from a pinpoint to full amber glow |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 6
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked extreme macro, constant speed, no cuts. The lantern touches the lamp glass; the lamp blooms from a pinpoint to full amber glow, small toy-like movements.
Ambient motion: a moth drifting out of focus. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand *tink*, crickets. Narration: none.
- **Music cue:** None.
- **On-screen text:** None.

#### §1 · Sunset over the rooftops — 20s (0:11–0:31)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | Hard cut out of the ident. |
| Camera / lens / DOF / move | Slow crane-up over rooftops toward the setting sun, 35mm-film look. |
| Lighting | Golden hour, Honey key from low left, long roof shadows. |
| Narration | (enters at 0:04) *"Every evening, just as the sun slips behind the teacups, Thimble Town waits for one small light."* |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the rooftops of Thimble Town, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Wide rooftop view of Thimble Town at sunset, teacup roofs and tin-can chimneys, the thimble tower on the skyline, every lamp still dark.
Lighting: golden hour low sun from left turning to blue hour, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear golden. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Establishing shot of Thimble Town at sunset, a hand-built miniature town of teacup houses, tin-can roofs, a teapot bakery on a hill and a sewing-thimble water tower, tilt-shift macro look, autumn golden hour, lamps not yet lit, slow crane up over rooftops, falling leaves, gentle toy-like motion of tiny figures in the distance, no people, no text."
image_urls = [town_ref, thimble_tower_ref]
genre = drama, pacing = single-shot, camera_model = 35mm-film, camera_lens = warm-vintage,
color_palette = oil-ochre, aspect_ratio = 16:9, resolution = 720p, duration = 20
```
**Stitch plan:** 20s → 1 gen (20s). Stand-alone shot between two hard cuts; no chain. Action: Crane up over rooftops as the sun drops; leaves drift past.

- **Foley:** Library: evening birds, breeze, a far kettle.
- **Music cue:** Felt piano + music-box bed enters under the narrator (−26 LUFS, ducks −6 dB under VO).
- **On-screen text:** None.

#### §2 · Out of the matchbox — 40s (0:31–1:11)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Low macro, 85mm, band on the drawer; slow lateral dolly left-to-right following Lumen out. |
| Lighting | Late golden hour going cool; the lantern is the warm anchor. |
| Narration | 0:06 *"Lumen lives in a matchbox by the garden wall."* · 0:18 *"He is never in a hurry. He checks his lantern, straightens his cap, and sets off — at exactly the speed of a snail."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the matchbox drawer sliding open, strong blur top and bottom. Lumen's Matchbox Shed: hand-built
miniature garden shed beside a wall of stacked books made from a red-brown paper matchbox with cut windows, sunflower-seed-husk shingles, a staple hinge door and a bead lamp by the door (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
The matchbox shed's drawer half open, Lumen emerging head-first, brass lantern swinging on its hook.
Lighting: golden hour low sun from left turning to blue hour, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Lumen on the garden path heading right, cap settled, lantern steady.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (0:31–0:51) | section keyframe | — | The drawer slides open and Lumen glides out, lantern swinging |
| 2 | 20s (0:51–1:11) | last frame of seg 1 | end-pose still | Lumen tilts his head so the cap settles, then sets off along the path |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right, constant speed, no cuts. The drawer slides open and Lumen glides out, lantern swinging, small toy-like movements.
Ambient motion: leaves skittering on the path. Lighting stays late golden hour. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right continues, constant speed, no cuts. Lumen tilts his head so the cap settles, then sets off along the path, small toy-like movements.
Ambient motion: leaves skittering on the path. Lighting stays late golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance off; Library: matchbox drawer slide (paper-on-card), soft glide, leaves.
- **Music cue:** Bed continues.
- **On-screen text:** None.

#### §3 · The first lamp — 40s (1:11–1:51)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut: §2 end → Lumen at the first post. |
| Camera / lens / DOF / move | Low snail-height macro, 85mm, locked then slow tilt-up following the lantern. |
| Lighting | Blue hour; the first Lantern Amber lamp of the night. |
| Narration | 0:08 *"The first lamp is always the one on Lantern Lane."* · 0:24 *"A touch. A tink."* · 0:31 *"And the lane remembers it is evening."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen at the base of the first lamp post, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen at the foot of the first dark lamp post on Lantern Lane, stretching upward, lantern raised.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the first lamp lit, windows along the lane warming one by one behind Lumen.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (1:11–1:31) | section keyframe | — | Lumen stretches up the post; the lantern rises toward the glass |
| 2 | 20s (1:31–1:51) | last frame of seg 1 | end-pose still | Tink — the lamp blooms; one by one the windows along the lane answer |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow tilt-up, constant speed, no cuts. Lumen stretches up the post; the lantern rises toward the glass, small toy-like movements.
Ambient motion: moths gathering, windows lighting behind. Lighting stays blue hour. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow tilt-up continues, constant speed, no cuts. Tink — the lamp blooms; one by one the windows along the lane answer, small toy-like movements.
Ambient motion: moths gathering, windows lighting behind. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand *tink* (sync), window latches (tiny), crickets begin.
- **Music cue:** Music-box C on the tink.
- **On-screen text:** None.

#### §4 · Past Miso's stand — 50s (1:51–2:41)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Rack focus from Lumen (foreground) to Miso (mid) at 0:08, then slow lateral dolly left-to-right; 85mm. |
| Lighting | Blue hour; the stand's stove glow and the new lamp. |
| Narration | 0:04 *"On Noodle Row, Miso is lifting the shutters."* · 0:14 *"The broth has been whispering since noon."* · 0:30 *"When the lamp outside her stand comes on, she knows it's time to open."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen passing the ramen stall, strong blur top and bottom. Miso's Noodle Stand on Noodle Row: hand-built
miniature street ramen stall on a cobbled lane made from an upturned wooden cotton-thread spool as the counter, a matchbox kitchen, a corrugated tin-can awning, pea-sized paper lanterns and a bottlecap stock pot on a tealight stove, with a brass sewing-thimble water tower on toothpick legs behind the rooftops (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Lumen gliding along the cobbles in front of the ramen stall while Miso, behind the spool counter, raises the wooden shutter.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the stand's lamp lit, Miso giving a small bow of her head, Lumen continuing right.* Cast and set blocks stay verbatim.

**Stitch plan:** 50s → 2 gens (25 + 25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (1:51–2:16) | section keyframe | — | Lumen glides past as Miso hooks the shutter; steam rises |
| 2 | 25s (2:16–2:41) | last frame of seg 1 | end-pose still | Lumen lights the stand's lamp; Miso bows her head slightly |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right, constant speed, no cuts. Lumen glides past as Miso hooks the shutter; steam rises, small toy-like movements.
Ambient motion: steam from the pot, lanterns swaying. Lighting stays blue hour with amber stall glow. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right continues, constant speed, no cuts. Lumen lights the stand's lamp; Miso bows her head slightly, small toy-like movements.
Ambient motion: steam from the pot, lanterns swaying. Lighting stays blue hour with amber stall glow. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance on: simmer, shutter, tiny bell. Library: brand tink.
- **Music cue:** Bed continues.
- **On-screen text:** None.

#### §5 · The spool bridge — 45s (2:41–3:26)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut** (location change). Optional intro sting. |
| Camera / lens / DOF / move | Slow lateral macro dolly left-to-right, keeping pace with Lumen, 85mm; water in the foreground bokeh. |
| Lighting | Late blue hour; last sunset colour reflected in the stream. |
| Narration | 0:06 *"The spool bridge is long, for a snail."* · 0:22 *"Halfway across, Lumen stops, the way he always does, to watch the water carry the sunset away."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen on the ruler bridge, strong blur top and bottom. The Spool Bridge: hand-built
miniature footbridge over a gutter stream made from a wooden ruler deck resting on stacked cotton-thread spools with thread handrails over a glinting gutter stream (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen on the ruler deck at the start of the spool bridge, the stream below reflecting sunset.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Lumen paused at the bridge's middle, looking downstream, lantern reflected in the water.* Cast and set blocks stay verbatim.

**Stitch plan:** 45s → 2 gens (23 + 22).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 23s (2:41–3:04) | section keyframe | — | Lumen glides onto the ruler deck; the stream slides by beneath |
| 2 | 22s (3:04–3:26) | last frame of seg 1 | end-pose still | Lumen stops in the middle and watches a leaf float away on the reflected sunset |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 23
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right, constant speed, no cuts. Lumen glides onto the ruler deck; the stream slides by beneath, small toy-like movements.
Ambient motion: water glinting and flowing, a leaf floating by. Lighting stays late blue hour. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 22
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right continues, constant speed, no cuts. Lumen stops in the middle and watches a leaf float away on the reflected sunset, small toy-like movements.
Ambient motion: water glinting and flowing, a leaf floating by. Lighting stays late blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: water trickle, wood creak.
- **Music cue:** Bed thins to piano only.
- **On-screen text:** None.

#### §6 · A wave from the teapot — 45s (3:26–4:11)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow lateral dolly left-to-right past the bakery, then hold; 85mm, band on the spout window. |
| Lighting | Blue hour; the bakery windows Lantern Amber. |
| Narration | 0:04 *"In the teapot on the hill, Bramble is setting out tomorrow's dough."* · 0:22 *"She raises a paw at the window. Lumen raises his lantern back."* · 0:34 *"They have done this for years."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Bramble at the spout window, strong blur top and bottom. Bramble's Bakery & Tea: hand-built
miniature two-storey bakery on a mossy hill made from a round cream ceramic teapot with an arched wooden door cut into its belly, four small mica-paned windows, the lid as the roof with a chimney through the knob and the spout as a bay window (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Bramble at the teapot's spout bay window with a bowl of dough, Lumen passing below on the moss path.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Bramble's paw raised, Lumen's lantern lifted in reply.* Cast and set blocks stay verbatim.

**Stitch plan:** 45s → 2 gens (23 + 22).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 23s (3:26–3:49) | section keyframe | — | Lumen glides along the path below the lit bakery; Bramble kneads at the window |
| 2 | 22s (3:49–4:11) | last frame of seg 1 | end-pose still | Bramble raises a paw; Lumen lifts his lantern in reply |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 23
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right, constant speed, no cuts. Lumen glides along the path below the lit bakery; Bramble kneads at the window, small toy-like movements.
Ambient motion: chimney smoke curling from the knob. Lighting stays blue hour with amber windows. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 22
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right continues, constant speed, no cuts. Bramble raises a paw; Lumen lifts his lantern in reply, small toy-like movements.
Ambient motion: chimney smoke curling from the knob. Lighting stays blue hour with amber windows. Warm cozy palette, fine film grain.
```

- **Foley:** Library: window latch, crickets, dough pat.
- **Music cue:** Bed returns.
- **On-screen text:** None.

#### §7 · Wren overhead — 30s (4:11–4:41)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Low angle looking up past Lumen's shell, 60mm, locked; Wren crosses the sky. |
| Lighting | Late blue hour sky, Dusk Plum; lantern glow at frame bottom. |
| Narration | 0:08 *"Above them, Wren is racing the dark home, with the last of the day's letters."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on Wren flying overhead, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
WREN — a small wren postbird courier, felted chestnut-brown feathers with fine cream
barring, an upturned tail, a tiny terracotta leather satchel across the chest, a folded
paper envelope often in her beak. About 3 cm tall. Quick, curious. Travels between
tiny worlds (our "visit another world" device).
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Low angle from beside Lumen's shell looking up: Wren mid-flight across the dusk sky with an envelope in her beak.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Wren small against the sky near the thimble tower, Lumen's lantern glow at the bottom edge.* Cast and set blocks stay verbatim.

**Stitch plan:** 30s → 1 gen (30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (4:11–4:41) | section keyframe | end-pose still | Wren flies across the sky with a letter and circles once over Lumen before heading home |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked low angle, constant speed, no cuts. Wren flies across the sky with a letter and circles once over Lumen before heading home, small toy-like movements.
Ambient motion: first stars appearing. Lighting stays late blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: wing flutter pass (L→R pan).
- **Music cue:** Bed continues.
- **On-screen text:** None.

#### §8 · Harbour lamps — 50s (4:41–5:31)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut** (location). |
| Camera / lens / DOF / move | Slow lateral dolly left-to-right along the jetty at water level, 85mm; reflections in the lower third. |
| Lighting | Night Ink sky with Lantern Amber lamps doubled in the water. |
| Narration | 0:06 *"Down at the Teacup Harbour, the lamps are lit in pairs — one for the boat, and one for its reflection."* · 0:34 *"The water is very still tonight."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen on the clothes-peg jetty, strong blur top and bottom. The Teacup Harbour: hand-built
miniature little harbour made from a saucer-shaped pond edge, a clothes-peg jetty, walnut-shell boats and lamp posts the height of a pencil stub (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen on the jetty beside a dark lamp post, walnut-shell boats bobbing, the water glass-still.
Lighting: night with amber lamps, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: starry clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *three jetty lamps lit, each doubled in the still water, boats' tiny lanterns glowing.* Cast and set blocks stay verbatim.

**Stitch plan:** 50s → 2 gens (25 + 25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (4:41–5:06) | section keyframe | — | Lumen lights the first jetty lamp; its reflection blooms in the water |
| 2 | 25s (5:06–5:31) | last frame of seg 1 | end-pose still | Lumen lights the second; the boats' tiny lanterns answer |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right, constant speed, no cuts. Lumen lights the first jetty lamp; its reflection blooms in the water, small toy-like movements.
Ambient motion: boats bobbing, gentle ripples. Lighting stays night with amber lamps. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly left-to-right continues, constant speed, no cuts. Lumen lights the second; the boats' tiny lanterns answer, small toy-like movements.
Ambient motion: boats bobbing, gentle ripples. Lighting stays night with amber lamps. Warm cozy palette, fine film grain.
```

- **Foley:** Library: water lapping, boat creak, tink ×2.
- **Music cue:** Bed low.
- **On-screen text:** None.

#### §9 · The tower — 60s (5:31–6:31)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow crane up alongside the toothpick leg, keeping Lumen in the band, 85mm. |
| Lighting | Night; the town lights below as warm bokeh; the tower lamp dark until the end. |
| Narration | 0:06 *"And last of all, the tower."* · 0:16 *"It is a long way up."* · 0:30 *"He takes it one ring at a time."* · (silence under the lighting) · 0:52 *"There."* |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen climbing the tower stair, strong blur top and bottom. The Thimble Tower: hand-built
miniature water tower above the rooftops made from a brass sewing thimble on four toothpick legs with a paper-strip spiral stair wound around one leg and a pea-sized glass lamp on top (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen on the paper-strip spiral stair wound around the tower's toothpick leg, halfway up, the lit town far below in bokeh.
Lighting: night with amber town lights below, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: starry clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the tower lamp lit on top of the thimble, Lumen beside it, the whole town glowing below.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (5:31–6:01) | section keyframe | — | Lumen climbs the spiral stair around the toothpick leg, one ring at a time |
| 2 | 30s (6:01–6:31) | last frame of seg 1 | end-pose still | Lumen reaches the thimble's rim and touches his lantern to the tower lamp; it blooms |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow crane up, constant speed, no cuts. Lumen climbs the spiral stair around the toothpick leg, one ring at a time, small toy-like movements.
Ambient motion: stars twinkling, town bokeh shimmering. Lighting stays night. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow crane up continues, constant speed, no cuts. Lumen reaches the thimble's rim and touches his lantern to the tower lamp; it blooms, small toy-like movements.
Ambient motion: stars twinkling, town bokeh shimmering. Lighting stays night. Warm cozy palette, fine film grain.
```

- **Foley:** Library: glide on paper, far crickets, tink (+2 dB, reverb tail).
- **Music cue:** Bed drops out at 0:40; music-box C–E–G full motif on the lamp. Payoff (~6:20, ~85%; the last big beat before the fully-lit wide).
- **On-screen text:** None.

#### §10 · Every lamp — 40s (6:31–7:11)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | **Hard cut** (scale jump). |
| Camera / lens / DOF / move | Slow single-shot crane up and back over the fully lit town, 35mm-film. |
| Lighting | Night Ink sky, every window and lamp Lantern Amber; ident look extended. |
| Narration | 0:06 *"Every lamp in Thimble Town is lit."* · 0:16 *"Somewhere a kettle is on. Somewhere a letter is being read."* · 0:32 *"Goodnight, Lumen."* |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the fully lit town, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Night wide from above: every lamp and window in Thimble Town lit, the thimble tower lamp brightest.
Lighting: night with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: starry clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Night establishing shot of Thimble Town fully lit, a hand-built miniature town of teacup houses, a teapot bakery and a sewing-thimble water tower with a lamp on top, tilt-shift macro look, starry clear night, every tiny window amber, slow crane up and back, gentle toy-like motion of tiny figures, no people, no text."
image_urls = [town_night_ref, thimble_tower_ref, lumen_ref]
genre = drama, pacing = single-shot, camera_model = 35mm-film, camera_lens = halation-vintage,
color_palette = twilight-fable, aspect_ratio = 16:9, resolution = 720p, duration = 40
```
**Stitch plan:** 40s → 1 gen (40s). Stand-alone shot between two hard cuts; no chain. Action: Crane rises over the lit town; one window goes dark, then another, as the town settles.

- **Foley:** Library: crickets, far harbour water.
- **Music cue:** Music-box reprise leads into the outro.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** One continuous journey. Every section moves left-to-right (the same screen direction for the whole round), so hard cuts feel like one walk. The lit-lamp count rises shot by shot.
- **Cuts vs dissolves.** Hard cuts into §5 and §8 (locations) and into §10 (CS wide), with optional stings. There is no dip-to-warm because the episode happens in continuous time.
- **Mix priorities.** (1) Narration at −16 LUFS, dry, close-mic. (2) The brand *tink* at −14, never ducked. (3) Ambient bed: crickets, water, breeze. (4) Felt piano and music box at −26, auto-ducked −6 dB under the voice. Leave at least 1.5s of silence between lines. No narration under the §9 lamp or the §3 tink.
- **Captions.** A full English caption file of the narration, hand-timed, plus bracketed sound cues. Auto-translate on. Add an ElevenLabs dub later `[U]`.
- **Sleep cut.** This episode's sections form the first *Night Lights* sleep compilation (Bible §8), which needs no new gens.

#### Intro ident and outro
The cold open runs 0:00–0:06 and the **ident 0:06–0:11**. The ident's cascade is the same visual idea as the episode, which is intentional brand reinforcement. **Outro:** §10 ends on a town wide with windows dimming, which runs straight into the outro plate. The narrator's "Goodnight, Lumen" lands 2s before the outro music-box reprise. End screen: left = LF4 *Pumpkin Lantern Night* (or LF1), right = the Short *The Snail Who Lights the Tallest Lamp*.

#### QC acceptance: video-specific additions to §3.4
- Lumen moves left-to-right in every Seedance section.
- The lit-lamp count never goes down between sections.
- The matchbox shed matches the S08 build (seed husks, staple hinge, bead lamp).
- The narration's resident names match the canon spelling on screen and in the captions.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | §9 The tower (60s) | Vertical climb: snail locomotion on a thin leg is unfamiliar to the model. Expect Lumen floating, the shell flipping or the lantern detaching, plus scale drift of the thimble tower. | Pre-flight: the keyframe shows the paper spiral stair clearly, so the model reads it as walking up a ramp. On failure, regenerate seg 1 at 20s with `end_image_url` = a mid-climb still, and let seg 2 cover the top. If needed, cut the climb and keep the lighting moment only. | 60s · $12.34 |
| R2 | §7 Wren overhead (30s) | Flight: Wren's wing motion and the envelope can smear, and a bird in flight can drift toward photoreal. | Pre-flight: an extra "felted figurine, visible wool fibres" line in the motion prompt. On failure, regenerate once. Fallback: Wren perches on a lamp arm and takes off, with a shorter flight path. | 30s · $6.17 |

#### Estimate
- **Base generation:** 426s in 19 gens → **$87.63**.
- **Revision reserve** (both revisions used, full-section worst case): 90s → **$18.51**.
- **Ceiling for this video:** 516s → **$106.14**. The ident and outro come from the brand pack (§5), so they are not charged per video.

---

### LF4 · Pumpkin Lantern Night in the Tiny Town

**Source idea:** L08 + L21 merged (Autumn market + pumpkin carving + lantern parade), 8:49 · **Series:** Tiny Seasons: Autumn (sage tick) · **Aspect:** 16:9 · **Runtime:** 8:49 · **Generated seconds:** 506s in 21 gens (20s Cinema Studio) · **Base cost:** $104.08

- **Final title:** *Pumpkin Lantern Night in the Tiny Town*
- **Alternate titles:** *Carving Tiny Pumpkins for the Autumn Lantern Parade* · *A Cozy Autumn Market in a Miniature Town*
- **Thumbnail brief:** Macro of a pea-sized carved pumpkin, its grin glowing Lantern Amber, filling 55% of the frame. A pencil tip beside it gives the scale. Behind it, the parade of glowing pumpkins on poles is soft bokeh, with Lumen small at the front. Oil-ochre leaves in the foreground blur. Text **"lantern night"**. Sage tick top-left. Test variant B: Bramble carving mid-cut, knife in the grin, text **"pea-sized"**.
- **Hook (first 5s):** 0:00–0:06: extreme macro, a lit tealight is lowered into a pea-sized carved pumpkin and the crooked grin fills with amber light. The seasonal hook and the 'it's tiny' hook land together.
- **Narration decision:** **Wordless.** A seasonal festival carried by carving ASMR, cooking and a parade: all visual, all foley. It is a second wordless arm alongside LF1 and LF2, and the seasonal-calendar test (it publishes the Sunday before Halloween without being spooky).

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:06 | §0 Cold open: the grin lights | 6 | Seedance 2.5 i2v |
| 0:06–0:11 | **Ident "Lamps On"** (brand asset) | 5 | brand pack |
| 0:11–0:31 | §1 Leaf-fall over Thimble Town | 20 | Cinema Studio 4.0 |
| 0:31–1:11 | §2 Choosing pumpkins | 40 | Seedance 2.5 i2v |
| 1:11–1:51 | §3 Stalls unfold | 40 | Seedance 2.5 i2v |
| 1:51–2:51 | §4 Carving | 60 | Seedance 2.5 i2v |
| 2:51–3:51 | §5 Miso's pumpkin broth | 60 | Seedance 2.5 i2v |
| 3:51–4:31 | §6 Bramble's apple tarts | 40 | Seedance 2.5 i2v |
| 4:31–5:16 | §7 The gust | 45 | Seedance 2.5 i2v |
| 5:16–6:01 | §8 Lighting the pumpkins | 45 | Seedance 2.5 i2v |
| 6:01–7:01 | §9 The lantern parade | 60 | Seedance 2.5 i2v |
| 7:01–8:01 | §10 The long table | 60 | Seedance 2.5 i2v |
| 8:01–8:31 | §11 Candles out | 30 | Seedance 2.5 i2v |
| 8:31–8:49 | **Outro + end screen** (brand asset) | 18 | brand pack |

**Chapters (storybook style):** `0:00` Leaf-fall · `0:31` Choosing pumpkins · `1:11` The market opens · `1:51` Carving · `2:51` Pumpkin broth and apple tarts · `4:31` The gust · `5:16` Lighting the pumpkins · `6:01` The parade · `7:01` The long table

#### Script by section

#### §0 · Cold open: the grin lights — 6s (0:00–0:06)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | First frame. Hard cut to ident at 0:06. |
| Camera / lens / DOF / move | Locked extreme macro, 100mm, band on the carved grin. |
| Lighting | Dusk; the pumpkin interior goes from dark to Lantern Amber. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a carved pea-sized pumpkin, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Extreme close-up: a pea-sized carved pumpkin with a crooked grin, dark inside; Bramble's paw lowering a tiny lit tealight stub into it on toothpick tongs.
Lighting: blue hour with amber windows and candle-lit pumpkin lanterns, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the grin glowing warm amber, a thread of candle smoke rising.* Cast and set blocks stay verbatim.

**Stitch plan:** 6s → 1 gen (6).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 6s (0:00–0:06) | section keyframe | end-pose still | The tealight is lowered into the pumpkin; the carved grin fills with amber light |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 6
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked extreme macro, constant speed, no cuts. The tealight is lowered into the pumpkin; the carved grin fills with amber light, small toy-like movements.
Ambient motion: candle flame flicker inside. Lighting stays dusk. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: soft wick flutter, tealight tap.
- **Music cue:** None.
- **On-screen text:** None.

#### §1 · Leaf-fall over Thimble Town — 20s (0:11–0:31)

| Field | Spec |
|---|---|
| Model | **Cinema Studio 4.0** `higgsfield/cinema-studio/4.0` (reference-to-video, 720p, 16:9) — allowed here because this section opens on a **hard cut**. |
| Join in | Hard cut out of the ident. |
| Camera / lens / DOF / move | Slow crane down from the treetops to Noodle Row, 35mm-film. |
| Lighting | Golden afternoon, Honey key, leaves backlit. |
| Narration | None (wordless). |

**Keyframe / reference still (SOUL Standard, 16:9, 1080p)** — passed as `image_urls[0]` (`<<<image_1>>>`):
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on Noodle Row under falling leaves, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Wide establishing view of Noodle Row in autumn afternoon, leaves drifting down, market stalls folded and waiting.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: windy leaf-fall. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**Cinema Studio prompt + controls:**
```
prompt: "Establishing shot of Thimble Town in autumn, a hand-built miniature town of teacup houses and tin-can roofs with a sewing-thimble water tower, tilt-shift macro look, golden afternoon, oak leaves bigger than the rooftops drifting down, folded matchbox market stalls on the lane, slow crane down, gentle toy-like motion of tiny figures, no people, no text."
image_urls = [market_set_ref, town_ref]
genre = drama, pacing = calm, camera_model = 35mm-film, camera_lens = warm-vintage,
color_palette = oil-ochre, aspect_ratio = 16:9, resolution = 720p, duration = 20
```
**Stitch plan:** 20s → 1 gen (20s). Stand-alone shot between two hard cuts; no chain. Action: Crane down through falling leaves to the market lane.

- **Foley:** Library: wind through leaves, leaf skitter on cobbles.
- **Music cue:** Cello pad + nylon guitar enters at 0:04 (−26 LUFS).
- **On-screen text:** None.

#### §2 · Choosing pumpkins — 40s (0:31–1:11)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow lateral macro dolly left-to-right along the planter rows, 85mm. |
| Lighting | golden hour low sun from left, backlit vines. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Bramble tapping a pumpkin, strong blur top and bottom. The Planter Pumpkin Patch: hand-built
miniature pumpkin patch made from a terracotta flower planter with rows of pea-sized orange pumpkins on curling vines and a walnut-shell wheelbarrow (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Bramble tapping a pea-sized pumpkin (knee-high to her) with one knuckle, listening, while Miso waits with the walnut-shell wheelbarrow.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: breezy clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Miso wheeling the barrow with two pumpkins in it, Bramble walking beside.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (0:31–0:51) | section keyframe | — | Bramble walks the row and taps a pumpkin; she nods |
| 2 | 20s (0:51–1:11) | last frame of seg 1 | end-pose still | Miso rolls the pumpkin into the walnut barrow and adds a second; they set off |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right, constant speed, no cuts. Bramble walks the row and taps a pumpkin; she nods, small toy-like movements.
Ambient motion: vine leaves fluttering. Lighting stays golden afternoon. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral macro dolly left-to-right continues, constant speed, no cuts. Miso rolls the pumpkin into the walnut barrow and adds a second; they set off, small toy-like movements.
Ambient motion: vine leaves fluttering. Lighting stays golden afternoon. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: knuckle *tok* on pumpkin, vine snap, barrow wheel on soil.
- **Music cue:** Guitar.
- **On-screen text:** None.

#### §3 · Stalls unfold — 40s (1:11–1:51)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow lateral dolly right-to-left along the lane, 85mm. |
| Lighting | golden hour low sun from left |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the market stalls opening, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
BEETLE (walk-on, batch lock) — an unnamed beetle customer, hand-painted resin figurine with a glossy walnut-brown shell and a tiny cream knit scarf. About 2 cm long.
WREN — a small wren postbird courier, felted chestnut-brown feathers with fine cream
barring, an upturned tail, a tiny terracotta leather satchel across the chest, a folded
paper envelope often in her beak. About 3 cm tall. Quick, curious. Travels between
tiny worlds (our "visit another world" device).
The frog unfolding a handkerchief awning over a matchbox stall, the beetle stacking acorn-cap bowls, Wren pinning illustrated postcards (pictures only) to a thread line.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: breezy clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *a lane of open stalls, Wren's postcard line fluttering.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (1:11–1:31) | section keyframe | — | The frog shakes out the awning; the beetle stacks bowls |
| 2 | 20s (1:31–1:51) | last frame of seg 1 | end-pose still | Wren pins the last postcard; the line flutters |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly right-to-left, constant speed, no cuts. The frog shakes out the awning; the beetle stacks bowls, small toy-like movements.
Ambient motion: awnings fluttering, leaves drifting. Lighting stays golden afternoon. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow lateral dolly right-to-left continues, constant speed, no cuts. Wren pins the last postcard; the line flutters, small toy-like movements.
Ambient motion: awnings fluttering, leaves drifting. Lighting stays golden afternoon. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: cloth flap, bowl stacking clicks, peg clip.
- **Music cue:** Guitar.
- **On-screen text:** None.

#### §4 · Carving — 60s (1:51–2:51)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut** to the craft table (chapter change). Optional intro sting. |
| Camera / lens / DOF / move | Locked 3/4 macro, 100mm, band on the knife point; seg 2 very slow push-in. |
| Lighting | Golden hour key low from left, raking across pumpkin ribs. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a sewing-needle carving knife entering pumpkin skin, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Bramble at a spool table pressing a sewing-needle-sized carving knife into the top of a pea-sized pumpkin, marking a circular lid.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *a finished carved pumpkin with triangle eyes and a crooked grin, Bramble admiring it over her spectacles.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (1:51–2:21) | section keyframe | — | Bramble cuts a circular lid, lifts it by the stem and scoops seeds out with a tiny spoon |
| 2 | 30s (2:21–2:51) | last frame of seg 1 | end-pose still | Bramble carves triangle eyes and a crooked grin; curls of pumpkin flesh drop away |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 macro, constant speed, no cuts. Bramble cuts a circular lid, lifts it by the stem and scoops seeds out with a tiny spoon, small toy-like movements.
Ambient motion: fine pumpkin fibres, a curl of flesh lifting off the blade. Lighting stays golden hour. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 macro continues, constant speed, no cuts. Bramble carves triangle eyes and a crooked grin; curls of pumpkin flesh drop away, small toy-like movements.
Ambient motion: fine pumpkin fibres, a curl of flesh lifting off the blade. Lighting stays golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: crisp knife crunch (hero, glass-fruit-grade transient), wet scoop, seeds dropping into an acorn cap.
- **Music cue:** Guitar drops out for this section (foley only); returns on the final cut.
- **On-screen text:** None.

#### §5 · Miso's pumpkin broth — 60s (2:51–3:51)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Slow push-in, 100mm, band on the pot rim. |
| Lighting | Warm stall practicals + golden spill. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a bottlecap pot of orange broth, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso mashing roasted pumpkin into a bottlecap pot of golden broth with a tiny wooden masher, acorn-cap bowls lined up beside it.
Lighting: interior practical lamp glow with golden hour spill, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *a row of steaming acorn-cap bowls of orange broth sprinkled with toasted seeds.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (2:51–3:21) | section keyframe | — | Miso mashes and stirs; the broth turns deep orange |
| 2 | 30s (3:21–3:51) | last frame of seg 1 | end-pose still | Miso ladles into acorn-cap bowls and sprinkles toasted seeds |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in, constant speed, no cuts. Miso mashes and stirs; the broth turns deep orange, small toy-like movements.
Ambient motion: steam rising, broth bubbling. Lighting stays warm stall practicals. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in continues, constant speed, no cuts. Miso ladles into acorn-cap bowls and sprinkles toasted seeds, small toy-like movements.
Ambient motion: steam rising, broth bubbling. Lighting stays warm stall practicals. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: masher squish, simmer, ladle pour, seed sprinkle.
- **Music cue:** Guitar returns.
- **On-screen text:** None.

#### §6 · Bramble's apple tarts — 40s (3:51–4:31)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Locked 90° top-down, 85mm. |
| Lighting | Warm interior practicals. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on a lattice tart top-down, strong blur top and bottom. Inside the teapot bakery: hand-built
miniature bakery interior made from the curved cream ceramic inner wall of a teapot, coffee-stirrer floorboards, a domed oven of rice-grain clay bricks, toothpick shelves with bead jars and tea-bag flour sacks (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Top-down: Bramble weaving pastry strips into a lattice over a bottlecap-sized apple tart, three more tarts waiting.
Lighting: interior practical lamp glow, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *four golden baked lattice tarts on a tray.* Cast and set blocks stay verbatim.

**Stitch plan:** 40s → 2 gens (20 + 20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (3:51–4:11) | section keyframe | — | Bramble lays and weaves lattice strips |
| 2 | 20s (4:11–4:31) | last frame of seg 1 | end-pose still | Bramble slides the tray of baked golden tarts out and sets it down |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down, constant speed, no cuts. Bramble lays and weaves lattice strips, small toy-like movements.
Ambient motion: flour dust. Lighting stays warm interior. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down continues, constant speed, no cuts. Bramble slides the tray of baked golden tarts out and sets it down, small toy-like movements.
Ambient motion: flour dust. Lighting stays warm interior. Warm cozy palette, fine film grain.
```

- **Foley:** Library: pastry flap, rolling pin. Seedance: oven door, tray set-down.
- **Music cue:** Guitar.
- **On-screen text:** None.

#### §7 · The gust — 45s (4:31–5:16)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut** (weather event). |
| Camera / lens / DOF / move | Locked medium-wide at figurine eye height, 60mm. |
| Lighting | Golden hour tipping to dusk; lanterns swinging. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the market in a gust, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
A sudden gust: a handkerchief awning lifting, paper lanterns swinging, oak leaves swirling; Miso and the frog grabbing the awning poles, Bramble steadying the tart tray.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: windy leaf-fall. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *calm again: awning tied down with thread, Miso and the frog leaning on the poles, Bramble lifting the tray triumphantly.* Cast and set blocks stay verbatim.

**Stitch plan:** 45s → 2 gens (23 + 22).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 23s (4:31–4:54) | section keyframe | — | The gust lifts the awning and swirls leaves; everyone grabs hold |
| 2 | 22s (4:54–5:16) | last frame of seg 1 | end-pose still | The wind drops; Miso ties the awning down; Bramble raises the tart tray |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 23
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked medium-wide, constant speed, no cuts. The gust lifts the awning and swirls leaves; everyone grabs hold, small toy-like movements.
Ambient motion: leaves swirling, lanterns swinging. Lighting stays late golden hour. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 22
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked medium-wide continues, constant speed, no cuts. The wind drops; Miso ties the awning down; Bramble raises the tart tray, small toy-like movements.
Ambient motion: leaves swirling, lanterns swinging. Lighting stays late golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: wind swell (never harsh), cloth flaps, lantern squeaks, settling leaves.
- **Music cue:** Guitar pauses on the gust, returns with a light cello pluck.
- **On-screen text:** None.

#### §8 · Lighting the pumpkins — 45s (5:16–6:01)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true (replace the tink with the library brand tink)` |
| Join in | **Hard cut with 12-frame dip-to-warm** (dusk). |
| Camera / lens / DOF / move | Low snail-height dolly left-to-right along the row of pumpkins, 85mm. |
| Lighting | blue hour with amber windows and candle-lit pumpkin lanterns |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on a row of carved pumpkins at dusk, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Dusk: a row of carved pea-sized pumpkins along Lantern Lane's edge, Miso setting a tealight into the last one, Lumen gliding up with his lantern.
Lighting: blue hour with amber windows and candle-lit pumpkin lanterns, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *all pumpkins glowing, Lumen beside the first one.* Cast and set blocks stay verbatim.

**Stitch plan:** 45s → 2 gens (23 + 22).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 23s (5:16–5:39) | section keyframe | — | Miso places the last tealight; Lumen glides to the first pumpkin |
| 2 | 22s (5:39–6:01) | last frame of seg 1 | end-pose still | Lumen touches his lantern to the first wick; the glow passes pumpkin to pumpkin down the row |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 23
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low snail-height dolly left-to-right, constant speed, no cuts. Miso places the last tealight; Lumen glides to the first pumpkin, small toy-like movements.
Ambient motion: candle flicker in each grin. Lighting stays dusk. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 22
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low snail-height dolly left-to-right continues, constant speed, no cuts. Lumen touches his lantern to the first wick; the glow passes pumpkin to pumpkin down the row, small toy-like movements.
Ambient motion: candle flicker in each grin. Lighting stays dusk. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand tink, soft wick catch ×5 (staggered).
- **Music cue:** Music-box motif in a minor-to-major turn.
- **On-screen text:** None.

#### §9 · The lantern parade — 60s (6:01–7:01)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Low tracking dolly right-to-left ahead of the parade at eye height, 85mm; lanterns as bokeh. |
| Lighting | Blue hour; each carried pumpkin a moving Lantern Amber source. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen leading the lantern parade, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
WREN — a small wren postbird courier, felted chestnut-brown feathers with fine cream
barring, an upturned tail, a tiny terracotta leather satchel across the chest, a folded
paper envelope often in her beak. About 3 cm tall. Quick, curious. Travels between
tiny worlds (our "visit another world" device).
FROG (walk-on, batch lock) — an unnamed frog traveller, needle-felted moss-green figurine with a cream belly and tiny black bead eyes, a slate-grey knit scarf, carrying a broad green leaf as an umbrella. About 3 cm tall.
Lumen leading a small parade down Lantern Lane; Miso and Bramble behind carrying glowing pumpkins on toothpick poles, the frog behind them, Wren flying overhead with a tiny paper lantern.
Lighting: blue hour with amber windows and candle-lit pumpkin lanterns, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the parade arriving at the square, pumpkins held high.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (6:01–6:31) | section keyframe | — | The parade moves down the lane at snail pace; Wren circles above |
| 2 | 30s (6:31–7:01) | last frame of seg 1 | end-pose still | The parade reaches the square; Miso and Bramble lift their pumpkin lanterns |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low tracking dolly right-to-left, constant speed, no cuts. The parade moves down the lane at snail pace; Wren circles above, small toy-like movements.
Ambient motion: lantern bokeh bobbing, leaves on cobbles. Lighting stays blue hour with amber lanterns. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: low tracking dolly right-to-left continues, constant speed, no cuts. The parade reaches the square; Miso and Bramble lift their pumpkin lanterns, small toy-like movements.
Ambient motion: lantern bokeh bobbing, leaves on cobbles. Lighting stays blue hour with amber lanterns. Warm cozy palette, fine film grain.
```

- **Foley:** Library: footsteps on cobble (soft, multiple), lantern pole creaks, wing flutter.
- **Music cue:** Full cue: guitar + cello + music-box. Payoff (~6:30, ~74%).
- **On-screen text:** None.

#### §10 · The long table — 60s (7:01–8:01)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Cut (new keyframe). |
| Camera / lens / DOF / move | Locked overhead, 60mm, very slow clockwise rotate. |
| Lighting | Candle-lit pumpkins ring the table; Night Ink surround. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the ruler-plank long table, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
WREN — a small wren postbird courier, felted chestnut-brown feathers with fine cream
barring, an upturned tail, a tiny terracotta leather satchel across the chest, a folded
paper envelope often in her beak. About 3 cm tall. Quick, curious. Travels between
tiny worlds (our "visit another world" device).
Overhead: a ruler-plank long table with acorn-cap bowls of orange broth and lattice tarts, Miso, Bramble, Lumen and Wren seated, carved pumpkins glowing around.
Lighting: blue hour with amber windows and candle-lit pumpkin lanterns, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *plates empty, everyone leaning back, pumpkins glowing.* Cast and set blocks stay verbatim.

**Stitch plan:** 60s → 2 gens (30 + 30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (7:01–7:31) | section keyframe | — | Bowls are passed along; Bramble cuts the tarts |
| 2 | 30s (7:31–8:01) | last frame of seg 1 | end-pose still | Everyone eats; Wren shares seeds with Lumen |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked overhead with a very slow clockwise rotate, constant speed, no cuts. Bowls are passed along; Bramble cuts the tarts, small toy-like movements.
Ambient motion: steam from bowls, candle flicker. Lighting stays candle-lit night. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked overhead with a very slow clockwise rotate continues, constant speed, no cuts. Everyone eats; Wren shares seeds with Lumen, small toy-like movements.
Ambient motion: steam from bowls, candle flicker. Lighting stays candle-lit night. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: spoon clinks, tart cut, bowl slides (non-verbal only).
- **Music cue:** Guitar alone, soft.
- **On-screen text:** None.

#### §11 · Candles out — 30s (8:01–8:31)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut from the table's glow. |
| Camera / lens / DOF / move | Slow pull-back along the lane, 60mm. |
| Lighting | Night; pumpkins go out one by one; lamps stay lit. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 16:9, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the row of glowing pumpkins, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
No residents in frame.
Night: a row of glowing carved pumpkins along the lane, lamps lit, leaves settled, the square empty.
Lighting: night with amber lamps and pumpkin lanterns, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 16:9.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *one pumpkin still glowing beside a lamp post, the rest dark with thin smoke threads.* Cast and set blocks stay verbatim.

**Stitch plan:** 30s → 1 gen (30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (8:01–8:31) | section keyframe | end-pose still | The pumpkins go dark one by one from the far end, thin smoke curling, until one remains beside the lamp |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow pull-back, constant speed, no cuts. The pumpkins go dark one by one from the far end, thin smoke curling, until one remains beside the lamp, small toy-like movements.
Ambient motion: leaves settling, thin candle smoke. Lighting stays night. Warm cozy palette, fine film grain.
```

- **Foley:** Library: soft candle puffs ×6, crickets, last leaf skitter.
- **Music cue:** Out; crickets into the outro.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** The first half is daytime market plus craft (a satisfying-process run), and the second half is evening ritual. §4 is foley-only with the music out, the channel's 'glass-fruit' moment, followed by music returning in §5 to reward the ear.
- **Cuts vs dissolves.** Hard cuts into §4 and §7. A dip-to-warm into §8 (dusk). Match cut into §11. Stings before §4 and §8.
- **Mix priorities.** (1) The §4 carving crunch (the hero transient, −12 LUFS peak, no reverb). (2) Wind and leaves (never harsh; roll off above 8 kHz in §7). (3) Cello plus guitar at −26. (4) Candle puffs in §11 at a whisper.
- **Captions.** A sound-description CC track. No burned-in text.
- **Safety and tone.** Fire appears only as contained tealights inside pumpkins, with no open flame spreading. The gust is comic and brief. Nobody falls.

#### Intro ident and outro
The cold open runs 0:00–0:06 and the **ident 0:06–0:11**. **Outro** after §11: the single remaining glowing pumpkin beside a lamp dissolves into the outro plate (the one allowed cross-dissolve, 12 frames). End screen: left = LF3 *The Snail Who Lights the Lamps*, right = the Short *Carving a Pumpkin the Size of a Pea*.

#### QC acceptance: video-specific additions to §3.4
- Every carved pumpkin keeps the same crooked-grin design across §0, §4, §8 and §11 (one face design, locked by one SOUL still).
- The pumpkins stay pea-sized relative to residents (knee-high to Bramble).
- The seasonal overlay stays consistent: oak and maple leaves and acorn caps, with no snow.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | §9 The lantern parade (60s) | Crowd plus motion: five named or walk-on figures moving together, props on poles and a flying Wren. Expect drift and merged figures, and poles clipping through bodies. | Pre-flight: approve a keyframe with clear spacing between figures. On failure, regenerate seg 2 only. Fallback: drop the frog and Wren from the keyframe and move Wren's flight to an insert cut from LF3 §7-style framing (regenerate §9 at the same length, so no cost change). | 60s · $12.34 |
| R2 | §4 Carving (60s) | Cutting geometry: the carved face must stay consistent across the 30+30 chain (eyes changing shape between segments). Knife scale can break (a human-size knife). Pumpkin flesh can read as plastic. | Pre-flight: the keyframe specifies a sewing-needle knife with a pencil tip in frame. On failure, regenerate seg 2 with `end_image_url` = the finished-face still, which locks the face design. | 60s · $12.34 |

#### Estimate
- **Base generation:** 506s in 21 gens → **$104.08**.
- **Revision reserve** (both revisions used, full-section worst case): 120s → **$24.68**.
- **Ceiling for this video:** 626s → **$128.77**. The ident and outro come from the brand pack (§5), so they are not charged per video.

---

### SA · One Tiny Bowl of Ramen in the Rain

**Source idea:** S01 (tweaked: rain hook, scale-reveal by 0:06, raindrop loop) · **Series:** Shop Diaries (Short) · **Aspect:** 9:16 (native vertical) · **Runtime:** 1:32 · **Generated seconds:** 92s in 5 gens (0s Cinema Studio) · **Base cost:** $18.92

- **Final title:** *One Tiny Bowl of Ramen in the Rain*
- **Alternate titles:** *Tiny Ramen, Start to Finish (Miniature ASMR)* · *A Thimble-Sized Bowl of Ramen*
- **Thumbnail brief:** Cover frame: the Beat 3 end pose (finished bowl, top-down, steam). Cover text **"tiny ramen"** in cream in the upper-middle safe zone. The in-video version has no text.
- **Hook (first 5s):** 0:00–0:02: extreme macro, a raindrop ripple in golden broth catching amber light (a visual pattern-interrupt that works with sound off). 0:02–0:06: pull-back reveals that the whole bowl is thimble-sized and Miso is holding the ladle. The scale reveal lands by 6s.
- **Narration decision:** **Wordless, no on-screen text.** This is the no-text control arm of the Shorts text test.

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:12 | Beat 1 Ripple → it's a thimble | 12 | Seedance 2.5 i2v |
| 0:12–0:35 | Beat 2 Noodles | 23 | Seedance 2.5 i2v |
| 0:35–1:02 | Beat 3 Toppings | 27 | Seedance 2.5 i2v |
| 1:02–1:20 | Beat 4 Served | 18 | Seedance 2.5 i2v |
| 1:20–1:32 | Beat 5 The next drop (loop) | 12 | Seedance 2.5 i2v |

#### Script by section

#### Beat 1 · Ripple → it's a thimble — 12s (0:00–0:12)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Frame 1 of the Short (and the loop target). |
| Camera / lens / DOF / move | Extreme macro on the broth surface, then a 5s pull-back scale reveal to a medium macro of the bowl on the spool counter with Miso; 100mm→60mm look. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the surface of broth in a thimble-sized bowl, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Extreme close-up of golden broth in a thimble-sized cream ceramic bowl, a raindrop ripple catching amber light, Miso out of focus behind holding a ladle.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *medium macro: the thimble-sized bowl on the spool counter, Miso behind it with the ladle, rain beyond the awning.* Cast and set blocks stay verbatim.

**Stitch plan:** 12s → 1 gen (12).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 12s (0:00–0:12) | section keyframe | end-pose still | A ripple spreads across the broth; the camera pulls back to reveal the whole tiny bowl and Miso holding the ladle |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 12
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow pull-back, constant speed, no cuts. A ripple spreads across the broth; the camera pulls back to reveal the whole tiny bowl and Miso holding the ladle, small toy-like movements.
Ambient motion: ripple rings, steam curling. Lighting stays interior amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: drip plink, simmer. Library: rain-on-tin under the whole Short.
- **Music cue:** None for 0–5s; lo-fi keys from 0:05 at −28 LUFS.
- **On-screen text:** None (no-text arm of the test).

#### Beat 2 · Noodles — 23s (0:12–0:35)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut (beat boundary). |
| Camera / lens / DOF / move | Locked 3/4 top-down, 100mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a nest of thread-thin noodles, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso lifting a nest of thread-thin noodles from the bottlecap pot with toothpick chopsticks, steam rising.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *noodles folded in a neat wave in the bowl.* Cast and set blocks stay verbatim.

**Stitch plan:** 23s → 1 gen (23).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 23s (0:12–0:35) | section keyframe | end-pose still | Miso lifts the noodles, lets them drip, and folds them into the bowl in a neat wave |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 23
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 top-down, constant speed, no cuts. Miso lifts the noodles, lets them drip, and folds them into the bowl in a neat wave, small toy-like movements.
Ambient motion: steam. Lighting stays interior amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: noodle swish, drips, chopstick taps.
- **Music cue:** Keys.
- **On-screen text:** None.

#### Beat 3 · Toppings — 27s (0:35–1:02)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Locked top-down, slight push-in, 100mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the ramen bowl from above, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Top-down: Miso's paws placing a chashu slice onto the noodle bowl, a halved soft egg with amber yolk and scallion rings waiting in acorn caps.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the finished bowl: chashu, halved egg, scallion rings, stamp-sized nori.* Cast and set blocks stay verbatim.

**Stitch plan:** 27s → 1 gen (27).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 27s (0:35–1:02) | section keyframe | end-pose still | Miso places chashu, then the halved egg, then scallion rings, then the nori sheet, one satisfying placement at a time |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 27
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down with a slow push-in, constant speed, no cuts. Miso places chashu, then the halved egg, then scallion rings, then the nori sheet, one satisfying placement at a time, small toy-like movements.
Ambient motion: steam. Lighting stays interior amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: soft set-downs, nori crackle (hero).
- **Music cue:** Keys.
- **On-screen text:** None.

#### Beat 4 · Served — 18s (1:02–1:20)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Eye-level macro, 85mm; locked. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Miso sliding the bowl forward, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Miso sliding the finished bowl across the spool counter toward camera, rain streaming off the awning behind.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the bowl at the counter's front edge, Miso's small nod, steam rising.* Cast and set blocks stay verbatim.

**Stitch plan:** 18s → 1 gen (18).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 18s (1:02–1:20) | section keyframe | end-pose still | Miso slides the bowl forward and gives a small nod; steam rises into the lantern light |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 18
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked eye-level macro, constant speed, no cuts. Miso slides the bowl forward and gives a small nod; steam rises into the lantern light, small toy-like movements.
Ambient motion: rain streams, steam. Lighting stays interior amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: ceramic slide on wood. Library: rain.
- **Music cue:** Keys resolve.
- **On-screen text:** None.

#### Beat 5 · The next drop (loop) — 12s (1:20–1:32)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut; ends on the Beat 1 keyframe. |
| Camera / lens / DOF / move | Slow push-in into the broth, 100mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the broth surface, strong blur top and bottom. Inside Miso's Noodle Stand: hand-built
miniature ramen stall kitchen made from a matchbox kitchen with a bottlecap stock pot on a tealight stove, a thimble-sized ceramic bowl, a spool-top counter, toothpick chopsticks and a button stool, rain-streaked window behind (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
MISO — a small field-mouse ramen cook, needle-felted figurine texture, warm fawn-cream fur,
pale pink round ears, tiny black bead eyes, a navy-blue cloth headband (hachimaki) tied at
the back, a rust-terracotta half apron over a cream linen shirt with rolled sleeves, a white
cloth tucked in the apron string. About 3 cm tall. Calm, precise, kind. Runs "Miso's
Noodle Stand" on Noodle Row.
Close macro of the finished bowl's broth, a raindrop gathering at the awning edge above.
Lighting: interior practical lamp glow from pea-sized paper lanterns and the tealight stove, cool rain-slate blue beyond the awning, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: soft rain. Season: early autumn: a few fallen leaves stuck to wet cobbles, acorn caps as planters.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *(loop) = Beat 1 keyframe.* Cast and set blocks stay verbatim.

**Stitch plan:** 12s → 1 gen (12).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 12s (1:20–1:32) | section keyframe | **Beat 1 keyframe** (loop lock) | The camera pushes into the broth as a raindrop falls and ripples, arriving on the exact Beat 1 framing |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 12
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in, constant speed, no cuts. The camera pushes into the broth as a raindrop falls and ripples, arriving on the exact Beat 1 framing, small toy-like movements.
Ambient motion: steam, a drop forming. Lighting stays interior amber. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: plink matched to Beat 1's plink level.
- **Music cue:** Keys tail cut 6 frames before the loop point.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** Five beats of 12–27s, each opening on a new satisfying event (ripple, noodle lift, topping placements, the slide, the drop). Topping placements every 5–7s are the re-hook cadence: a 'stimulus' at gentle cozy speed rather than the 1.5–2s cut rhythm recommended for generic Shorts [R15].
- **Cuts.** Hard cuts at beat boundaries only. The final beat lands exactly on Beat 1's frame. Cut the last 2 frames if there is a luminance jump.
- **Mix.** Foley −14. Rain bed −24 running continuously *across* the loop point (the bed is loop-edited so it has no seam). Keys −28, ending 6 frames before the loop.
- **Captions.** None burned-in. A CC sound track.

#### Intro ident and outro
No ident and no outro (Shorts rule). The loop is the ending. Pin a comment linking LF1. Use the related-video link to LF1.

#### QC acceptance: video-specific additions to §3.4
- The bowl stays thimble-sized in every beat (same diameter relative to Miso's head, about 1.3×).
- The loop point shows no jump in steam density or brightness greater than 5%.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | Beat 3 Toppings (27s) | Four sequential placements in one 27s gen: toppings can pop in, duplicate or float, and Miso's paws can become hand-like. | Fallback: split into two 13–14s beats (chashu and egg; scallion and nori) with fresh keyframes. Same seconds. | 27s · $5.55 |
| R2 | Beat 5 The next drop (loop) (12s) | The loop lock: `end_image_url` = the Beat 1 keyframe can force a visible morph in the last second. | Fallback: regenerate once with a slower push. If the morph persists, end on the push and make the loop a hard match cut (the frames are composition-matched, not identical). | 12s · $2.47 |

#### Estimate
- **Base generation:** 92s in 5 gens → **$18.92**.
- **Revision reserve** (both revisions used, full-section worst case): 39s → **$8.02**.
- **Ceiling for this video:** 131s → **$26.95**. Shorts have no ident or outro.

---

### SB · Carving a Pumpkin the Size of a Pea

**Source idea:** S15 (tweaked: glass-fruit-style crunch hook, scale props in frame, carve-the-next loop) · **Series:** Tiny Seasons: Autumn (Short) · **Aspect:** 9:16 (native vertical) · **Runtime:** 1:30 · **Generated seconds:** 90s in 5 gens (0s Cinema Studio) · **Base cost:** $18.51

- **Final title:** *Carving a Pumpkin the Size of a Pea*
- **Alternate titles:** *Tiny Pumpkin Carving ASMR* · *The Smallest Jack-o'-Lantern in Thimble Town*
- **Thumbnail brief:** Cover frame: the Beat 5 glowing grin with the pencil tip in frame. Cover text **"pea-sized"**.
- **Hook (first 5s):** 0:00–0:01: a needle-fine blade crunches into ribbed orange skin in extreme macro. It is the AI glass-fruit mechanic (blade contact in frame 1 plus a crisp transient [R6][R7]) applied to a real-feeling craft object. 0:01–0:05: pull-back reveals a sewing needle and a pencil tip beside it, and Bramble carving.
- **Narration decision:** **Wordless with one 2s text label** ("tiny pumpkin"). This is the text arm of the Shorts text test. The label restates the scale claim for sound-off viewers (60%+ watch muted [R18]).

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:12 | Beat 1 Crunch → it's a pea | 12 | Seedance 2.5 i2v |
| 0:12–0:30 | Beat 2 The lid | 18 | Seedance 2.5 i2v |
| 0:30–0:48 | Beat 3 Seeds | 18 | Seedance 2.5 i2v |
| 0:48–1:13 | Beat 4 The face | 25 | Seedance 2.5 i2v |
| 1:13–1:30 | Beat 5 Glow, and the next one (loop) | 17 | Seedance 2.5 i2v |

#### Script by section

#### Beat 1 · Crunch → it's a pea — 12s (0:00–0:12)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Frame 1 (loop target). |
| Camera / lens / DOF / move | Extreme macro on the knife point, then 5s pull-back reveal beside a sewing-needle eye and a pencil tip; 100mm→60mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Golden hour key raking across the pumpkin ribs, dark plum surround. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a needle-fine knife point entering orange pumpkin skin, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Extreme close-up: a sewing-needle-sized carving knife pressing into the ribbed orange skin of a pea-sized pumpkin; a sewing needle's eye and a pencil tip lie beside it; Bramble out of focus holding the knife.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *medium macro: Bramble at a spool table with the pea-sized pumpkin, the needle and pencil tip beside it.* Cast and set blocks stay verbatim.

**Stitch plan:** 12s → 1 gen (12).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 12s (0:00–0:12) | section keyframe | end-pose still | The knife point crunches into the skin; the camera pulls back to reveal the pea-sized pumpkin beside a needle and a pencil tip, and Bramble carving |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 12
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow pull-back, constant speed, no cuts. The knife point crunches into the skin; the camera pulls back to reveal the pea-sized pumpkin beside a needle and a pencil tip, and Bramble carving, small toy-like movements.
Ambient motion: a bead of pumpkin juice on the blade. Lighting stays golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: crisp crunch (hero transient, glass-fruit grade).
- **Music cue:** None 0–5s; cello pizzicato + music-box from 0:05.
- **On-screen text:** "tiny pumpkin" 0:00–0:02, cream rounded serif, upper-middle (below the top 12%) — text arm of the test.

#### Beat 2 · The lid — 18s (0:12–0:30)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Locked 3/4 macro, 100mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Golden hour. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the lid circle being cut, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Bramble cutting a circle around the pumpkin's stem with the tiny knife.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Bramble lifting the lid by its stem, fibres stretching.* Cast and set blocks stay verbatim.

**Stitch plan:** 18s → 1 gen (18).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 18s (0:12–0:30) | section keyframe | end-pose still | Bramble completes the circle and lifts the lid by the stem |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 18
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 macro, constant speed, no cuts. Bramble completes the circle and lifts the lid by the stem, small toy-like movements.
Ambient motion: fibres. Lighting stays golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: cutting crunch, wet lid pop.
- **Music cue:** Pizzicato.
- **On-screen text:** None.

#### Beat 3 · Seeds — 18s (0:30–0:48)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Top-down macro, 100mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Golden hour. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on seeds inside the pumpkin, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Top-down into the open pumpkin: Bramble scooping seeds with a tiny spoon into an acorn cap; each seed the size of her paw pad.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *an acorn cap full of seeds, the pumpkin clean inside.* Cast and set blocks stay verbatim.

**Stitch plan:** 18s → 1 gen (18).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 18s (0:30–0:48) | section keyframe | end-pose still | Bramble scoops the seeds out spoon by spoon into the acorn cap |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 18
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down macro, constant speed, no cuts. Bramble scoops the seeds out spoon by spoon into the acorn cap, small toy-like movements.
Ambient motion: glistening pulp. Lighting stays golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: wet scoop, seed clicks into the cap.
- **Music cue:** Pizzicato.
- **On-screen text:** None.

#### Beat 4 · The face — 25s (0:48–1:13)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Locked eye-level macro, 100mm, slow push-in. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Golden hour tipping to dusk. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on the pumpkin's face being carved, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Bramble carving the first triangle eye into the pumpkin's face, a curl of orange flesh lifting off the blade.
Lighting: golden hour low sun from left, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the finished crooked grin and triangle eyes, Bramble peering over her spectacles.* Cast and set blocks stay verbatim.

**Stitch plan:** 25s → 1 gen (25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (0:48–1:13) | section keyframe | end-pose still | Bramble carves two triangle eyes, then a crooked grin; each piece pops out cleanly |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in, constant speed, no cuts. Bramble carves two triangle eyes, then a crooked grin; each piece pops out cleanly, small toy-like movements.
Ambient motion: curls of flesh dropping. Lighting stays golden hour. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: crunch per cut, piece *pop* (hero).
- **Music cue:** Music-box enters.
- **On-screen text:** None.

#### Beat 5 · Glow, and the next one (loop) — 17s (1:13–1:30)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut; ends on the Beat 1 keyframe. |
| Camera / lens / DOF / move | Locked 3/4 macro, 85mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Dusk; the pumpkin becomes the Lantern Amber source. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the carved pumpkin at dusk, strong blur top and bottom. Noodle Row Harvest Market: hand-built
miniature autumn market street made from matchbox market stalls with handkerchief awnings, acorn-cap bowls, a ruler-plank long table and pea-sized carved pumpkin lanterns, the tin-can awning of Miso's stand in the background (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BRAMBLE — an elderly hedgehog baker and tea-keeper, hand-painted resin figurine, soft
brown-grey quills with cream tips, round gold wire spectacles, a sage-green knit cardigan
with two wooden buttons, a flour-dusted cream apron. About 3.5 cm tall. Slow, warm,
grandmotherly. Runs "Bramble's Bakery & Tea" in a teapot-shaped building.
Dusk: Bramble lowering a tiny lit tealight on toothpick tongs into the carved pumpkin, a row of already glowing pumpkins behind.
Lighting: blue hour with amber windows and candle-lit pumpkin lanterns, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: still air. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *(loop) = Beat 1 keyframe.* Cast and set blocks stay verbatim.

**Stitch plan:** 17s → 1 gen (17).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 17s (1:13–1:30) | section keyframe | **Beat 1 keyframe** (loop lock) | The grin lights up; Bramble sets it in the glowing row, turns to a fresh uncarved pumpkin and presses the knife point to its skin |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 17
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked 3/4 macro, constant speed, no cuts. The grin lights up; Bramble sets it in the glowing row, turns to a fresh uncarved pumpkin and presses the knife point to its skin, small toy-like movements.
Ambient motion: candle flicker. Lighting stays dusk. Warm cozy palette, fine film grain.
```

- **Foley:** Seedance: tealight tap, wick flutter; crunch at the end matched to Beat 1.
- **Music cue:** Music-box resolves 8 frames before the loop point.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** Beats every 12–25s, each with an audible transient (crunch, lid pop, seed clicks, piece pops, candle).
- **Cuts.** Hard cuts. Loop into Beat 1's crunch.
- **Mix.** The crunch is the hero sound (−12 LUFS peak, dry). Music ducks −6 dB under every cut.
- **Captions.** The burned-in label 0:00–0:02 only.

#### Intro ident and outro
No ident or outro. Related video: LF4. Publish Friday before the Halloween week.

#### QC acceptance: video-specific additions to §3.4
- The pumpkin stays pea-sized relative to the needle eye (about 1.5× the eye length) in every beat.
- The face design is identical to LF4's.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | Beat 4 The face (25s) | The carved face must stay symmetrical and consistent within 25s. The knife may grow to human scale. | Fallback: regenerate with `end_image_url` = the finished-face still (the same face design as LF4). | 25s · $5.14 |
| R2 | Beat 5 Glow, and the next one (loop) (17s) | Two actions in 17s (lighting the pumpkin, then starting the next one) plus the loop lock. | Fallback: trim the action to 'the grin lights, then Bramble turns to the next pumpkin', and let the loop cut carry the knife touch. | 17s · $3.50 |

#### Estimate
- **Base generation:** 90s in 5 gens → **$18.51**.
- **Revision reserve** (both revisions used, full-section worst case): 42s → **$8.64**.
- **Ceiling for this video:** 132s → **$27.15**. Shorts have no ident or outro.

---

### SC · The Snail Who Lights the Tallest Lamp

**Source idea:** S02 + S28 merged (first lamp, cascade, tallest-lamp climb, composition-matched loop), 100s · **Series:** Night Lights (Short) · **Aspect:** 9:16 (native vertical) · **Runtime:** 1:40 · **Generated seconds:** 100s in 5 gens (0s Cinema Studio) · **Base cost:** $20.57

- **Final title:** *The Snail Who Lights the Tallest Lamp*
- **Alternate titles:** *A Tiny Snail Lights Up the Whole Town* · *Lamps On in the Tiny Town*
- **Thumbnail brief:** Cover frame: Lumen at the top of the pole with the tall lamp blooming and the town lights below. Cover text **"all the way up"**.
- **Hook (first 5s):** 0:00–0:02: *tink*, a lamp blooms in extreme macro (the brand sound in frame 1). 0:02–0:06: pull-back shows that the lamp post is pencil-stub high and the lamplighter is a snail. A micro-story promise follows: one small resident, a very tall lamp.
- **Narration decision:** **Wordless, no text.** This is the character micro-story arm of the Shorts format test (versus the process ASMR in SA and SB, and the build in SD).

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:10 | Beat 1 Tink → the post is a pencil | 10 | Seedance 2.5 i2v |
| 0:10–0:30 | Beat 2 The lane lights up | 20 | Seedance 2.5 i2v |
| 0:30–0:55 | Beat 3 The tallest lamp | 25 | Seedance 2.5 i2v |
| 0:55–1:20 | Beat 4 The raindrop | 25 | Seedance 2.5 i2v |
| 1:20–1:40 | Beat 5 The top (loop) | 20 | Seedance 2.5 i2v |

#### Script by section

#### Beat 1 · Tink → the post is a pencil — 10s (0:00–0:10)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Frame 1 (loop target). |
| Camera / lens / DOF / move | Extreme macro on the lantern/glass, then 4s pull-back revealing a pencil-stub-high post and Lumen at its foot; 100mm→60mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour; first Lantern Amber. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen's brass lantern touching a dark lamp head, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Extreme close-up: Lumen's brass lantern touching a dark pea-sized glass lamp head at the bottom of a lane that climbs a stair of stacked books.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: light drizzle beginning. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *medium: the lit lamp, Lumen at its foot, the lane climbing up-frame with dark lamps.* Cast and set blocks stay verbatim.

**Stitch plan:** 10s → 1 gen (10).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 10s (0:00–0:10) | section keyframe | end-pose still | Tink — the lamp blooms; the camera pulls back to show the lane stacked up the frame and Lumen tiny at its foot |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 10
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow pull-back, constant speed, no cuts. Tink — the lamp blooms; the camera pulls back to show the lane stacked up the frame and Lumen tiny at its foot, small toy-like movements.
Ambient motion: drizzle specks. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand tink (identical to the ident).
- **Music cue:** None 0–5s; music-box from 0:05.
- **On-screen text:** None (no-text arm).

#### Beat 2 · The lane lights up — 20s (0:10–0:30)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Locked vertical composition; lamps stacked up the frame; 60mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour; lamps light bottom-to-top. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on the lamps stacked up the lane, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Vertical lane climbing a stair of stacked books, six dark lamp posts rising up the frame, Lumen at the second lamp.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: light drizzle. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *five lamps lit in a rising line; the tallest lamp at the top still dark.* Cast and set blocks stay verbatim.

**Stitch plan:** 20s → 1 gen (20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (0:10–0:30) | section keyframe | end-pose still | Lumen climbs the book-stair lamp by lamp; each lamp blooms in sequence up the frame |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked vertical composition, constant speed, no cuts. Lumen climbs the book-stair lamp by lamp; each lamp blooms in sequence up the frame, small toy-like movements.
Ambient motion: drizzle, windows warming. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: tink ×4 rising in pitch (C, D, E, G).
- **Music cue:** Music-box.
- **On-screen text:** None.

#### Beat 3 · The tallest lamp — 25s (0:30–0:55)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Low angle up the pole, slow crane up with Lumen, 85mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour; the top lamp dark against Dusk Plum. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen at the base of a tall brass pole, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen at the base of a lamp post as tall as a whole pencil, wet brass, the dark lamp far above against the dusk sky.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: light drizzle. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Lumen a third of the way up the wet brass pole.* Cast and set blocks stay verbatim.

**Stitch plan:** 25s → 1 gen (25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (0:30–0:55) | section keyframe | end-pose still | Lumen begins to climb the tall wet pole, slow and steady, lantern swaying |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow crane up, constant speed, no cuts. Lumen begins to climb the tall wet pole, slow and steady, lantern swaying, small toy-like movements.
Ambient motion: drizzle beading on brass. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: soft glide on brass, drizzle.
- **Music cue:** Cello pad (tension without peril).
- **On-screen text:** None.

#### Beat 4 · The raindrop — 25s (0:55–1:20)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Tight macro on Lumen and the pole, slow crane up, 100mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on a fat raindrop sliding down the pole, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen halfway up the tall brass pole, a fat raindrop as big as his shell sliding down the pole toward him.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: light drizzle. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Lumen unfurled again, continuing upward, the split drop falling below.* Cast and set blocks stay verbatim.

**Stitch plan:** 25s → 1 gen (25).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 25s (0:55–1:20) | section keyframe | end-pose still | The raindrop slides down; Lumen tucks into his shell; the drop splits around him; he unfurls and climbs on |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 25
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow crane up, constant speed, no cuts. The raindrop slides down; Lumen tucks into his shell; the drop splits around him; he unfurls and climbs on, small toy-like movements.
Ambient motion: drizzle. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: shell tuck *tok*, water slide, drop splash far below.
- **Music cue:** Cello pad; music-box returns as he unfurls.
- **On-screen text:** None.

#### Beat 5 · The top (loop) — 20s (1:20–1:40)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut; ends on a composition-matched still of Beat 1. |
| Camera / lens / DOF / move | Top of the pole, 100mm macro, locked. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour → the tall lamp blooms Lantern Amber over the town. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 100mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen at the top lamp, strong blur top and bottom. Lantern Lane: hand-built
miniature cobbled lane of cottages made from painted wooden-block cottages with teacup and tin-can roofs, iron lamp posts the height of a pencil stub with glass lamp heads the size of a pea, the brass sewing-thimble water tower at the far end (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen at the top of the tall pole beside the dark lamp head, the lit lane and town glowing below.
Lighting: blue hour with amber windows, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: drizzle clearing. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *(loop) = Beat 1 keyframe (same framing: lantern touching a dark lamp).* Cast and set blocks stay verbatim.

**Stitch plan:** 20s → 1 gen (20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (1:20–1:40) | section keyframe | **Beat 1 keyframe** (loop lock) | Lumen touches his lantern to the tall lamp; it blooms over the whole town; the frame settles tight on lantern and glass |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked macro, constant speed, no cuts. Lumen touches his lantern to the tall lamp; it blooms over the whole town; the frame settles tight on lantern and glass, small toy-like movements.
Ambient motion: drizzle clearing, town bokeh. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand tink (+2 dB), crickets.
- **Music cue:** Full C–E–G motif; ends 6 frames before the loop.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** The sequence rises from the first lamp through the cascade to the tall lamp. The mid-point tension beat (the raindrop, 0:55–1:20) is the re-hook for a 100s runtime.
- **Cuts.** Hard cuts. The tink ×4 cascade is pitched upward (C, D, E, G). The loop lands on a composition match (lantern touching glass).
- **Mix.** Brand tink −14. Cello pad under Beats 3–4 at −26. Crickets across the loop point.
- **Captions.** None burned-in.

#### Intro ident and outro
No ident or outro. The first frame *is* the ident gesture, so the Short works as a brand trailer. Related video: LF3.

#### QC acceptance: video-specific additions to §3.4
- Lamps light strictly bottom-to-top and never un-light (except across the loop point).
- The tall pole's height stays about 3× Lumen's lamp posts.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | Beat 4 The raindrop (25s) | The raindrop interaction: the shell-tuck plus a drop splitting around the body is a complex physics beat, with risks of a melting shell and the drop passing through Lumen. | Fallback: simplify to 'Lumen pauses and a drop rolls past beside him'. Same 25s. | 25s · $5.14 |
| R2 | Beat 3 The tallest lamp (25s) | Climbing a vertical pole (as in LF3 §9). | Fallback: add a paper-strip spiral to the pole in the keyframe, as in LF3. | 25s · $5.14 |

#### Estimate
- **Base generation:** 100s in 5 gens → **$20.57**.
- **Revision reserve** (both revisions used, full-section worst case): 50s → **$10.29**.
- **Ceiling for this video:** 150s → **$30.86**. Shorts have no ident or outro.

---

### SD · Turning a Matchbox Into a Tiny Shed

**Source idea:** S08 (tweaked: result-flash hook, becomes Lumen's canon home, stage labels) · **Series:** Build a Tiny (Short) · **Aspect:** 9:16 (native vertical) · **Runtime:** 2:00 · **Generated seconds:** 119s in 6 gens (0s Cinema Studio) · **Base cost:** $24.48

- **Final title:** *Turning a Matchbox Into a Tiny Shed*
- **Alternate titles:** *Matchbox → Tiny House (Miniature Build)* · *Building Lumen's Matchbox Shed*
- **Thumbnail brief:** Cover frame: the finished shed at blue hour, windows glowing, seed-husk roof crisp. Cover text **"matchbox → shed"**.
- **Hook (first 5s):** 0:00–0:01: a flash of the finished, glowing matchbox shed (reused from Beat 5, costs nothing). Hard cut, 0:01–0:04: an ordinary matchbox drawer slides open on a workbench and three builder beetles climb onto it. Result-first, then the process [R18].
- **Narration decision:** **Wordless with stage labels** ("matchbox", "roof", "door", "Lumen's shed"), 1–2 words each, lower-case cream. This is the label arm of the text test and the build-format arm.

#### Timeline

| Time | Block | Sec | Model |
|---|---|---|---|
| 0:00–0:01 | Result flash (re-used frames, no generation) | 1 | — |
| 0:01–0:25 | Beat 1 The matchbox opens | 24 | Seedance 2.5 i2v |
| 0:25–1:00 | Beat 2 Seed-husk roof | 35 | Seedance 2.5 i2v |
| 1:00–1:30 | Beat 3 Door and lamp | 30 | Seedance 2.5 i2v |
| 1:30–1:50 | Beat 4 Dusk: the owner arrives | 20 | Seedance 2.5 i2v |
| 1:50–2:00 | Beat 5 Home (loop) | 10 | Seedance 2.5 i2v |

#### Script by section

#### Beat 1 · The matchbox opens — 24s (0:01–0:25)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | 0:00–0:01 **free reuse**: last 1s of Beat 5 (finished shed, lit) as a result flash; hard cut to this beat. |
| Camera / lens / DOF / move | Locked top-down, 60mm; slow rotate 10°. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Warm workbench lamp from upper left. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on an open matchbox on a workbench, strong blur top and bottom. The matchbox build site: hand-built
miniature shed build site on a wooden workbench made from an ordinary red-brown paper matchbox, a pencil, sunflower-seed husks, staples and a bead, laid out on a painted wooden workbench (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
Top-down: the matchbox drawer sliding open, the three builder beetles climbing onto the sleeve with a tiny saw and pencil.
Lighting: warm workbench practical lamp, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: indoor. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *two window holes and an arched door cut into the matchbox sleeve, the crew beside them.* Cast and set blocks stay verbatim.

**Stitch plan:** 24s → 1 gen (24).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 24s (0:01–0:25) | section keyframe | end-pose still | The drawer slides open; the beetles mark and cut two windows and a door in the sleeve |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 24
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down with a slow 10° rotate, constant speed, no cuts. The drawer slides open; the beetles mark and cut two windows and a door in the sleeve, small toy-like movements.
Ambient motion: paper dust. Lighting stays warm workbench lamp. Warm cozy palette, fine film grain.
```

- **Foley:** Library: drawer slide (brand-consistent with LF3 §2), paper saw rasp.
- **Music cue:** Nylon guitar from 0:04.
- **On-screen text:** "matchbox" 0:01–0:03 (label arm).

#### Beat 2 · Seed-husk roof — 35s (0:25–1:00)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | Locked top-down, 60mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Warm workbench lamp. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 60mm macro lens look, shallow depth of field
with a horizontal focus band on seed-husk shingles on the matchbox roof, strong blur top and bottom. The matchbox build site: hand-built
miniature shed build site on a wooden workbench made from an ordinary red-brown paper matchbox, a pencil, sunflower-seed husks, staples and a bead, laid out on a painted wooden workbench (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
Top-down: the beetles laying sunflower-seed-husk shingles in overlapping rows on the matchbox roof, one row done.
Lighting: warm workbench practical lamp, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: indoor. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the whole roof shingled in neat husk rows.* Cast and set blocks stay verbatim.

**Stitch plan:** 35s → 2 gens (18 + 17).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 18s (0:25–0:43) | section keyframe | — | The beetles lay the first rows of husk shingles, each pressed down with a tap |
| 2 | 17s (0:43–1:00) | last frame of seg 1 | end-pose still | The last rows go on; a beetle taps the ridge husk into place |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 18
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down, constant speed, no cuts. The beetles lay the first rows of husk shingles, each pressed down with a tap, small toy-like movements.
Ambient motion: husk dust. Lighting stays warm workbench lamp. Motion continues naturally past the end of
the clip (do not settle to a stop). Warm cozy palette, fine film grain.

# seg 2 — duration = 17
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked top-down continues, constant speed, no cuts. The last rows go on; a beetle taps the ridge husk into place, small toy-like movements.
Ambient motion: husk dust. Lighting stays warm workbench lamp. Warm cozy palette, fine film grain.
```

- **Foley:** Library: husk tap per shingle (ASMR rhythm).
- **Music cue:** Guitar.
- **On-screen text:** "roof" 0:02 of the beat.

#### Beat 3 · Door and lamp — 30s (1:00–1:30)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Hard cut. |
| Camera / lens / DOF / move | 3/4 macro, 85mm, slow push-in. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Warm workbench lamp. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the door being hinged with a staple, strong blur top and bottom. Lumen's Matchbox Shed: hand-built
miniature garden shed beside a wall of stacked books made from a red-brown paper matchbox with cut windows, sunflower-seed-husk shingles, a staple hinge door and a bead lamp by the door (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
BUILDER BEETLES (walk-on crew, batch lock) — three unnamed builder beetles, hand-painted resin figurines with glossy walnut-brown shells, tiny honey-yellow cloth caps and cream canvas tool belts. Each about 2 cm long.
The beetles fitting a matchstick-plank door onto the matchbox shed with a staple hinge, a glass bead lamp waiting on the step.
Lighting: warm workbench practical lamp, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: indoor. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *the door hung, the bead lamp fixed beside it, unlit.* Cast and set blocks stay verbatim.

**Stitch plan:** 30s → 1 gen (30).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 30s (1:00–1:30) | section keyframe | end-pose still | The beetles press the staple hinge in, swing the door, and fix the bead lamp beside it |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 30
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: slow push-in, constant speed, no cuts. The beetles press the staple hinge in, swing the door, and fix the bead lamp beside it, small toy-like movements.
Ambient motion: none. Lighting stays warm workbench lamp. Warm cozy palette, fine film grain.
```

- **Foley:** Library: staple press click, door creak, bead click.
- **Music cue:** Guitar.
- **On-screen text:** "door" 0:02 of the beat.

#### Beat 4 · Dusk: the owner arrives — 20s (1:30–1:50)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | **Hard cut with dip-to-warm** (time jump). |
| Camera / lens / DOF / move | Low snail-height, 85mm, locked. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour; the shed windows dark; Lumen's lantern the warm anchor. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on Lumen approaching the new shed, strong blur top and bottom. Lumen's Matchbox Shed: hand-built
miniature garden shed beside a wall of stacked books made from a red-brown paper matchbox with cut windows, sunflower-seed-husk shingles, a staple hinge door and a bead lamp by the door (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Blue hour: Lumen gliding up the path toward the finished matchbox shed, the crew waiting by the door.
Lighting: blue hour with amber lantern, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *Lumen at the door, the crew stepping aside.* Cast and set blocks stay verbatim.

**Stitch plan:** 20s → 1 gen (20).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 20s (1:30–1:50) | section keyframe | end-pose still | Lumen glides up the path to the shed; the crew steps aside and opens the door |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 20
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked low angle, constant speed, no cuts. Lumen glides up the path to the shed; the crew steps aside and opens the door, small toy-like movements.
Ambient motion: leaves on the path. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: glide, crickets.
- **Music cue:** Music-box enters.
- **On-screen text:** "Lumen's shed" (final label).

#### Beat 5 · Home (loop) — 10s (1:50–2:00)

| Field | Spec |
|---|---|
| Model | **Seedance 2.5 i2v** `bytedance/seedance-2.5/image-to-video`, 720p, `generate_audio: true` |
| Join in | Match cut; ends on the finished-shed still that also opens the Short. |
| Camera / lens / DOF / move | Locked, 85mm. Tilt-shift band horizontal at ~55% height; keep action out of the top 12% and bottom 20% (UI). |
| Lighting | Blue hour; the shed window turns Lantern Amber. |
| Narration | None (wordless). |

**Keyframe still (SOUL Standard, 9:16, 1080p)** — Seedance `image_url` for segment 1:
```
Miniature diorama photograph, tilt-shift macro, 85mm macro lens look, shallow depth of field
with a horizontal focus band on the matchbox shed doorway, strong blur top and bottom. Lumen's Matchbox Shed: hand-built
miniature garden shed beside a wall of stacked books made from a red-brown paper matchbox with cut windows, sunflower-seed-husk shingles, a staple hinge door and a bead lamp by the door (scale cue), painted wood, felt, paper and clay
micro-props, visible craft texture.
LUMEN — a snail lamplighter, glossy clay shell in honey-amber with a cream spiral, soft
sage-grey body, a tiny brass lantern hanging from a hook on the shell, a small navy peaked
cap. About 2.5 cm long. Unhurried. Lights every street lamp at dusk (the channel ident).
Lumen gliding in through the matchbox shed door, lantern hook catching the frame.
Lighting: blue hour with amber lantern, color palette lantern amber #F2B35E, honey #E8A94B, terracotta #C8643B, cream #F6EAD3, sage #9DB28A, dusk plum #5B4A6B. Weather: clear. Season: autumn: acorn caps, leaf drifts and pumpkin lanterns.
Fine 35mm grain, cozy, warm, no text, no people, no photoreal animals, no human hands or fingers, no lettering or signage text. 9:16.
```
**End-pose still (`end_image_url`, final segment only):** same prompt as the keyframe with the frozen pose line replaced by: *(loop) = the flash still at 0:00: finished shed at blue hour, windows glowing, Lumen's lantern hung inside.* Cast and set blocks stay verbatim.

**Stitch plan:** 10s → 1 gen (10).

| Seg | Sec | `image_url` | `end_image_url` | Action |
|---|---|---|---|---|
| 1 | 10s (1:50–2:00) | section keyframe | **result-flash still** (= frame 0) | Lumen glides inside; the bead lamp and windows glow warm |

**Motion prompts (one per segment, same camera verb throughout):**
```
# seg 1 — duration = 10
Continuous single shot inside a miniature diorama, tilt-shift macro, shallow depth
of field. Camera: locked, constant speed, no cuts. Lumen glides inside; the bead lamp and windows glow warm, small toy-like movements.
Ambient motion: window glow. Lighting stays blue hour. Warm cozy palette, fine film grain.
```

- **Foley:** Library: brand tink as the lamp lights.
- **Music cue:** Music-box resolves before the loop.
- **On-screen text:** None.

#### Edit notes
- **Pacing.** Taps and placements every 2–4s inside the build beats (the build-short rhythm). Labels appear at each stage's start for 1.5s.
- **Cuts.** Hard cuts, a dip-to-warm into Beat 4 (dusk), and a loop back to the result flash.
- **Mix.** Husk taps and staple clicks lead. Guitar at −26.
- **Captions.** Stage labels only.

#### Intro ident and outro
No ident or outro. Related video: LF3. The shed is Lumen's home in LF3 §2, so link from the LF3 description ('how Lumen's shed was built').

#### QC acceptance: video-specific additions to §3.4
- The matchbox proportions stay constant (a real matchbox is about 5.3 × 3.6 cm, so the 2.5 cm Lumen fits inside with headroom).
- The staple hinge and bead lamp match LF3 §2.

#### Revision plan (2 authorised targeted revisions)
| Rev | Target | Risk | Mitigation and fallback | Reserve |
|---|---|---|---|---|
| R1 | Beat 2 Seed-husk roof (35s) | Repetitive shingle placement over 35s (two segs): shingles can multiply or float, and the crew count can drift. | Fallback: regenerate seg 2 from seg 1's last frame with 'exactly three beetles'. Or shorten to one 25s seg (saves 10s). | 35s · $7.20 |
| R2 | Beat 5 Home (loop) (10s) | The loop end must match the result-flash still exactly (the flash *is* frame 0). | Fallback: if the gen does not converge, use the Beat 5 last frame *as* the new flash (re-export the 0:00–0:01 reuse), which makes the loop self-consistent by construction. | 10s · $2.06 |

#### Estimate
- **Base generation:** 119s in 6 gens → **$24.48**.
- **Revision reserve** (both revisions used, full-section worst case): 45s → **$9.26**.
- **Ceiling for this video:** 164s → **$33.73**. Shorts have no ident or outro.

---

## 5. Batch plan

### 5.1 Production order (dependencies first)
| Step | Item | Seconds · cost | Why here |
|---|---|---|---|
| 0 | Reference packs (§3.2): residents, walk-ons, sets, pumpkin face | SOUL stills only | Everything downstream depends on them. Approve before paying for any motion. |
| 1 | Brand pack: ident 'Lamps On' (5s, CS twilight-fable single-shot), intro sting (4s gen, trimmed to 1.5s), outro plate (18s, CS) | 27s · $5.55 | Needed by all four long-forms. One-time and reusable. |
| 2 | **LF1** *A Rainy Night at the Tiny Ramen Shop* | 511s · $105.11 | Establishes Noodle Row, the stall interior, Miso, Wren and the walk-ons. It is the flagship and the lowest-risk proof of the pipeline. |
| 3 | **SA** *One Tiny Bowl of Ramen in the Rain* | 92s · $18.92 | Reuses LF1's stall refs, which gives a fast win for the Shorts pipeline and vertical QC. |
| 4 | **LF2** *Building a Tiny Bakery Inside a Teapot* | 515s · $105.94 | Creates the finished-teapot set that LF3 and LF4 need. |
| 5 | **SD** *Turning a Matchbox Into a Tiny Shed* | 119s · $24.48 | Creates Lumen's shed, which LF3 §2 needs. |
| 6 | **LF3** *The Snail Who Lights the Lamps* (plus ElevenLabs VO) | 426s · $87.63 | Needs the teapot and shed sets. Record VO against the rough cut. |
| 7 | **SC** *The Snail Who Lights the Tallest Lamp* | 100s · $20.57 | Reuses Lumen and Lantern Lane refs and LF3's climb learnings. |
| 8 | **LF4** *Pumpkin Lantern Night in the Tiny Town* | 506s · $104.08 | Needs every set. It is the most complex, so it goes last, when the prompts are tuned. |
| 9 | **SB** *Carving a Pumpkin the Size of a Pea* | 90s · $18.51 | Shares LF4's pumpkin face lock and carving learnings. |

### 5.2 Budget
| Line | Seconds | Cost @ $0.2057/s |
|---|---|---|
| LF1 *A Rainy Night at the Tiny Ramen Shop*: base | 511 | $105.11 |
| LF2 *Building a Tiny Bakery Inside a Teapot*: base | 515 | $105.94 |
| LF3 *The Snail Who Lights the Lamps \| A Tiny Town Bedtime Story*: base | 426 | $87.63 |
| LF4 *Pumpkin Lantern Night in the Tiny Town*: base | 506 | $104.08 |
| SA *One Tiny Bowl of Ramen in the Rain*: base | 92 | $18.92 |
| SB *Carving a Pumpkin the Size of a Pea*: base | 90 | $18.51 |
| SC *The Snail Who Lights the Tallest Lamp*: base | 100 | $20.57 |
| SD *Turning a Matchbox Into a Tiny Shed*: base | 119 | $24.48 |
| Brand pack (ident 5s, sting 4s, outro 18s) | 27 | $5.55 |
| **Base subtotal** | **2386** | **$490.80** |
| Revision reserve (2 targeted revisions × 8 videos, worst case) | 596 | $122.60 |
| **Batch ceiling (video generation)** | **2982** | **$613.40** |

- The long-form base is 1958s ($402.76), about $100.69 per episode. That is below the Bible's ~$123 per 10-min episode, because runtimes are 7:29–9:00 and the ident and outro are shared. The Shorts base is 401s ($82.49).
- **Not included** `[U]`: SOUL Standard stills (68 section keyframes + 57 end-pose stills + ~45 reference-pack stills, plus re-rolls, billed in Higgsfield credits), ElevenLabs VO for LF3 (about 260 words), music and SFX library licences, and the upscale step.
- **Expected spend** if about half the reserve is used: ≈ $552.10.

### 5.3 Publish calendar (autumn-synced, Sunday long-form)
| Date | Slot | Video | Note |
|---|---|---|---|
| Fri 2 Oct 2026 | Short | SA *One Tiny Bowl of Ramen in the Rain* | Channel's first upload: a pure hook test before any long-form |
| Sun 4 Oct | Long | LF1 *A Rainy Night at the Tiny Ramen Shop* | Flagship. Test & Compare: 'open late' vs no-text thumbnail |
| Tue 6 Oct | Short | SD *Turning a Matchbox Into a Tiny Shed* | Build Short, stage labels |
| Sun 11 Oct | Long | LF2 *Building a Tiny Bakery Inside a Teapot* | Test & Compare: no-text vs 'it's a teapot' split |
| Fri 16 Oct | Short | SC *The Snail Who Lights the Tallest Lamp* | Brand trailer; teases LF3 |
| Sun 18 Oct | Long | LF3 *The Snail Who Lights the Lamps* (narrated) | Narration arm. Out of Bible series order (Night Lights before Tiny Seasons) to calendar-match LF4 |
| Fri 23 Oct | Short | SB *Carving a Pumpkin the Size of a Pea* | Seasonal; text-label arm |
| Sun 25 Oct | Long | LF4 *Pumpkin Lantern Night in the Tiny Town* | Seasonal peak, the Sunday before Halloween |

The distinctness rule holds (Bible §9.1): no two consecutive long-forms share location, weather and activity (rain/stall/cooking → clear/hill/build → dusk/lane/journey → windy/market/festival). Between the natives, publish **centre-safe cut-downs** from the long-forms (LF1 §6 bowl, LF2 §5 floorboards, LF4 §4 carving) on the remaining Tue/Fri slots to reach the Bible's cadence without new gens. These are optional and cost nothing.

### 5.4 What this batch A/B-tests
| # | Question | Arms | Primary metric (read at 7 and 28 days) | Decision it drives |
|---|---|---|---|---|
| 1 | Does soft narration help or hurt? | LF3 narrated vs LF1, LF2 and LF4 wordless | Average % viewed and returning viewers; secondary: comments mentioning residents by name | Whether *Thimble Town Tales* stays at 1 in 4 episodes (Bible §7), goes up, or drops |
| 2 | Which long-form format retains best? | Shop ambience (LF1) · Build (LF2) · Journey tour (LF3) · Seasonal festival (LF4) | AVD, the 30s retention cliff, and the ratio of browse to suggested traffic | The series weighting for batch 02 |
| 3 | Which Short format earns engaged views? | Process ASMR (SA, SB) · Micro-story (SC) · Build (SD) | Engaged-view rate (engaged ÷ views), the >100% loop spike at second 1, and subscribers per 1K engaged views | The S-list weighting |
| 4 | Does on-screen text help Shorts? | None (SA, SC) vs a 2s label (SB) vs stage labels (SD) | 3s hold rate (swipe-away) and the engaged-view rate | The Shorts text policy |
| 5 | Do Shorts funnel to long-form? | Each Short's related-video link and pinned comment point to its paired long-form | Clicks from Shorts to long-form and subscriber conversions | Whether Shorts run as trailers or stand-alone |
| 6 | Thumbnail text vs none | YouTube Test & Compare on all 4 long-forms (2 variants each) [R21] | Watch-time share (the tool's own criterion) | The thumbnail system (Bible §6.6) |
| 7 | Wordless tiny cooking vs a craft or brand hook in Shorts | SA (food) vs SB (carving) vs SC (brand ritual) | Views in the first 48h and the swipe rate | Which hook family leads the next Shorts batch |

**Caveat:** with n = 1 per arm this is a directional read, not significance. Confounds such as publish order, day and season are logged. A 'win' needs a ≥20% relative gap on the primary metric before it changes the plan `[U: threshold is a judgement call]`.

---

## 6. Sources (accessed 2026-09-28)
- [R1] Miniature food (Wikipedia): https://en.wikipedia.org/wiki/Miniature_food
- [R2] NPR: Tiny kitchen videos cook up real food in doll-sized portions: https://www.npr.org/sections/thesalt/2016/05/03/475783900/tiny-kitchen-videos-cook-up-real-food-in-doll-sized-portions
- [R3] Atlas Obscura: Soothe yourself by watching tiny meals… (fetch 403; search summary only): https://www.atlasobscura.com/articles/soothe-yourself-by-watching-tiny-meals-being-cooked-in-tiny-kitchens
- [R4] CBS News: Creating the bite-sized foods of Tiny Kitchen: https://www.cbsnews.com/news/creating-the-bite-sized-foods-of-tiny-kitchen/
- [R5] Perfect Corp: AI glass fruit cutting ASMR: https://www.perfectcorp.com/consumer/blog/video-editing/ai-asmr
- [R6] Quantilus: Glass Fruit & Rainbow Drips, inside TikTok's viral AI-generated ASMR craze: https://quantilus.com/article/glass-fruit-rainbow-drips-inside-tiktoks-viral-ai-generated-asmr-craze/
- [R7] Pollo AI: How to make viral glass fruit cutting AI ASMR videos: https://pollo.ai/hub/how-to-make-viral-glass-fruit-cutting-ai-asmr-videos
- [R8] TikTok @synthesia_ai: Veo 3 glass ASMR prompt: https://www.tiktok.com/@synthesia_ai/video/7518068959896177942
- [R9] Fast Company: AI-generated ASMR is taking over (fetch 403; search summary only): https://www.fastcompany.com/91353440/ai-generated-asmr-is-taking-over-tiktok
- [R10] Puletech: How to create viral mini workers videos with AI: https://puletech.com/how-to-create-viral-mini-workers-videos-with-ai/
- [R11] Grokipedia: Miniature world video: https://grokipedia.com/page/Miniature_world_video
- [R12] Lofi Girl format: Formats Unpacked (fetch 503), WBUR Endless Thread, OutlierKit (search summaries): https://www.formatsunpacked.com/p/formats-unpacked-lofi-girl · https://www.wbur.org/endlessthread/2023/09/15/lofi-girl · https://outlierkit.com/channel/lofigirl
- [R13] Dragonframe: Cooking With Wool by Andrea Love · BUST profile: https://www.dragonframe.com/blog/cooking-with-wool-by-andrea-love/ · https://bust.com/arts/198757-andrea-love-felting-fiber-artist-cooking-with-wool.html
- [R14] Parade: Tiny Chef cancellation video · Houston Chronicle 2019 (PressReader): https://parade.com/news/viral-oscar-worthy-video-of-nickelodeon-cancellation-announcement-of-beloved-childrens-show-tiny-chef-show-leaves-fans-gutted · https://www.pressreader.com/usa/houston-chronicle/20190822/282578789697463
- [R15] Aibrify: YouTube Shorts Retention Curve Playbook (2026): https://aibrify.com/blog/youtube-shorts-retention-curve-playbook
- [R16] Virvid: Looping structure, the hidden retention trick: https://virvid.ai/blog/looping-structure-shorts-retention-2026
- [R17] PPC Land: YouTube changes how Shorts views are counted from March 31: https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/
- [R18] OpusClip: YouTube Shorts hook formulas: https://www.opus.pro/blog/youtube-shorts-hook-formulas
- [R19] Variety: YouTube Shorts max length to 3 minutes · YouTube Help: three-minute Shorts: https://variety.com/2024/digital/news/youtube-shorts-maximum-video-length-three-minutes-1236166349/ · https://support.google.com/youtube/answer/15424877?hl=en
- [R20] Prepublish: YouTube first 30 seconds · Teleprompter: audience retention guide (search summaries): https://prepublish.ai/guides/first-30-seconds · https://www.teleprompter.com/blog/youtube-audience-retention
- [R21] YouTube Help: A/B test titles & thumbnails · Tubefilter (Jul 2025): https://support.google.com/youtube/answer/16391400?hl=en · https://www.tubefilter.com/2025/07/16/youtube-feature-test-and-compare-titles-thumbnails/
- [R22] Viral AI Prompts: Mini rescue AI videos (setup → reveal → reaction): https://viralaiprompts.com/mini-rescue-ai-videos-viral-tiktok-prompt/
- [R23] YouTube: miniature city street diorama build Short (example; views not verified): https://www.youtube.com/watch?v=ly491TfX0LM
- [S10], [S11], [S12], [S14], [S15], [S16], [S19]: see the Channel Bible §10.

