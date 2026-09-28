# INKLIGHT: 60 Video Ideas (30 Long-Form Mini-Movies + 30 Shorts)

Companion to `Channel-Bible.md`. Every entry is a **distinct storyline**. The recurring cast is allowed, but no two episodes share a premise, location or set-piece (YouTube inauthentic-content policy; see Bible §1.3).

**Legend**
- **SDi** = Seedance 2.5 i2v (`bytedance/seedance-2.5/image-to-video`, 720p). The SOUL keyframe is `image_url`, with an optional `end_image_url` landing pose.
- **SDt** = Seedance 2.5 t2v.
- **CS4[genre/pacing/lens/palette]** = Cinema Studio 4.0 reference-to-video, `camera_model: modern` unless noted, `image_urls` = cast refs in the fixed order Bolt=1, Pip=2, Nova=3, Brick=4, Smudge=5, then env/props.
- **Gens** = ceil(sec/30) generations. The app front-loads splits as 30 + 30 + remainder (min 4s), chained **seamlessly** (the last frame becomes the next keyframe) with the **same prompt**. So every multi-gen scene prompt describes *continuous* action, and the planned motion beat sits on each 30s boundary.
- **Hard cut** = a new scene (new keyframe), used deliberately for action cuts, reactions and time jumps.
- Runtime = generated seconds + 23s Remotion ident (5s) and outro (18s). Cost ≈ gens × 30s × $0.2057 at most, ~1.6× with re-rolls.
- Style lock, cast descriptors and prompt templates are in Bible §4–§5. Every prompt pastes `STYLE_LOCK` plus the verbatim `DESC_*` of each on-screen character.

---

## Part A: Long-Form Mini-Movies (L01–L30)

### Season 1: *The Margin Lands* (L01–L10). Quest for the Nib shards; Smudge introduced.

#### L01 · The Page That Fell
**Alt title:** Born in the Margin · **Tag:** S1·E01 · **Runtime:** ~10:23 (600s generated + 23s ident/outro)

**Hook (0–5s):** Black frame, then BOLT free-falls past torn paper cliffs, scarf a cyan comet, and slams onto a ledge. Narrator: "Every page has a margin."

**Logline:** Four ink figures wake in the margin of a forgotten sketchbook just as their world starts tearing apart, and find the first shard of the Nib, a pen-tip that can draw doors.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: Bolt free-falls past paper cliffs | 15 | 1 | CS4[action/chaotic/anamorphic/highway-standoff], top-down to low-angle tracking |
| 2 | Awakening: four figures blink awake in a vast margin world | 75 | 3 (30+30+15) | SDi crane-down 24mm, gold volumetric shafts; boundary on Brick sitting up |
| 3 | Gag: Brick sits on Pip; Nova's deadpan | 30 | 1 | SDi locked-off wide, snap-zoom reaction (Remotion) |
| 4 | The Tear: the sky rips and the canyon cracks | 70 | 3 (30+30+10) | SDi wide establishing, 21:9 letterbox feel, dust haze |
| 5 | Bridge run: team sprints across a collapsing rope bridge | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/highway-standoff] lateral track; boundaries at Nova's vault apex (30s) and Brick's plank catch (60s) |
| 6 | Pip's grapple fails, Brick saves him | 50 | 2 (30+20) | SDi low angle, end_image_url = Pip dangling pose |
| 7 | Nib shard found glowing in a crevice | 70 | 3 (30+30+10) | SDi macro push-in, halation glow, shallow DOF |
| 8 | Smudge's first sighting: grey ink goons attack | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic/the-crimson-ballet]; boundaries on staff-lock (30s) and leap apex (60s) |
| 9 | Hero moment: Bolt's scarf ignites and he leaps the chasm | 15 | 1 | CS4[action/single-shot/anamorphic] slow-mo speed ramp |
| 10 | Campfire: first quiet moment together | 75 | 3 (30+30+15) | SDi calm, warm practical firelight, slow orbit |
| 11 | Cliffhanger: the shard draws a door of light; crimson eyes watch | 20 | 1 | SDi static wide, end_image_url = door silhouette |

**Stitch plan:** 600s → **24 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 70s → 30+30+10; #5 90s → 30+30+30; #6 50s → 30+20; #7 70s → 30+30+10; #8 90s → 30+30+30; #10 75s → 30+30+15. Hard cuts: 1→ident→2, 4→5 (whip-pan), 8→9 (impact frame), 10→11 (smash to dark).

**Cinematography:** 24mm wides for scale, 50mm for gags, 85mm macro on the Nib; warm gold key for the canyon, crimson backlight for Smudge.

**Characters:** Bolt, Pip, Nova, Brick, Smudge (cameo) · **Music/SFX:** Rising brass hero motif (Bolt), taiko under the bridge run, detuned music box for Smudge; paper-tear rips, ink splash-to-spark tinks.

**Thumbnail:** Bolt mid-leap over the chasm, cyan scarf comet, a torn sky above. Text: "DON'T LOOK DOWN".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Bridge-run chase (45s, native 9:16 keyframes) · (b) Brick sits on Pip gag (30s loop) · (c) Smudge reveal teaser (20s)

#### L02 · Temple of a Thousand Traps
**Alt title:** Pip vs. the Puzzle Door · **Tag:** S1·E02 · **Runtime:** ~10:20 (597s generated + 23s ident/outro)

**Hook (0–5s):** A stone blade whooshes an inch over Pip's head. He freezes. Every trap in the hall clicks at once.

**Logline:** The second Nib shard sits in a jungle temple that punishes brute force, so it's Pip's turn to lead, and his nerves nearly bury everyone.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: blade trap misses Pip | 12 | 1 | SDi locked-off wide, dust motes |
| 2 | Jungle approach: vines, waterfalls, giant stone faces | 45 | 2 (30+15) | SDt establishing, drone-like glide, the jungle as scale |
| 3 | Gag: Bolt kicks the door; the door wins | 30 | 1 | SDi locked-off wide, comedic beat of silence |
| 4 | Pip studies the glyph lock | 70 | 3 (30+30+10) | SDi 85mm close-ups on goggles, amber reflections |
| 5 | Trap gauntlet: rolling boulders, dart walls | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/the-emerald-ambush]; boundaries on Nova's slide (30s) and Brick's boulder block (60s) |
| 6 | Pip panics; Nova talks him down | 75 | 3 (30+30+15) | SDi calm, 2-shot, soft green bounce light |
| 7 | The rotating-floor puzzle solved | 75 | 3 (30+30+15) | SDi overhead god-shot, rotating rings; boundary on ring alignment click |
| 8 | Guardian statue awakens: fight | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic/the-emerald-ambush]; boundary on statue fist slam |
| 9 | Pip's gadget topples the guardian | 15 | 1 | CS4[action/single-shot] slow-mo |
| 10 | Shard claimed; the temple collapses, escape | 80 | 3 (30+30+20) | CS4[action/dynamic] forward tracking run |
| 11 | Tag: Pip gets a hero moment; the goggles glint | 15 | 1 | SDi push-in, end_image_url = Pip proud pose |

**Stitch plan:** 597s → **24 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #4 70s → 30+30+10; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 75s → 30+30+15; #8 90s → 30+30+30; #10 80s → 30+30+20. Hard cuts: 3→4 (reaction snap), 7→8 (statue eyes flare), 10→11 (daylight smash cut).

**Cinematography:** Anamorphic flares through canopy; 35mm for puzzle work; jade-green haze with amber practicals.

**Characters:** Pip (lead), Bolt, Nova, Brick · **Music/SFX:** Marimba Pip motif turning heroic; bamboo percussion; stone grinds, dart thwips, rumble.

**Thumbnail:** Pip tiny under a giant falling blade, eyes two panic circles. Text: "ONE WRONG STEP".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Door-wins gag (30s) · (b) Boulder gauntlet (45s) · (c) Pip's hero moment (20s loop)

#### L03 · Sky-Rail Showdown
**Alt title:** The Cloud Train · **Tag:** S1·E03 · **Runtime:** ~10:18 (595s generated + 23s ident/outro)

**Hook (0–5s):** A train bursts out of a cloudbank at full speed, and Nova is already standing on the roof, staff spinning.

**Logline:** Smudge's goons hijack a sky-rail carrying the next shard, and Nova must hold the roof while Bolt and Brick uncouple the burning cars.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: train bursts from clouds, Nova on roof | 10 | 1 | CS4[action/single-shot/anamorphic/highway-standoff] helicopter shot |
| 2 | Boarding: team leaps onto the moving train | 85 | 3 (30+30+25) | CS4[action/dynamic]; boundary on Brick's landing |
| 3 | Gag: Brick stuck in a train door | 25 | 1 | SDi locked-off interior wide |
| 4 | Goons swarm the roof | 55 | 2 (30+25) | SDi wide, wind-whipped rim lights |
| 5 | Roof fight part 1: Nova vs five goons | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/highway-standoff]; boundary on staff-bind (30s) |
| 6 | Bolt and Brick crawl beneath the cars | 75 | 3 (30+30+15) | SDi low tracking, sparks from rails |
| 7 | Tunnel ahead! Duck beat | 15 | 1 | SDi POV-forward, hard cut into darkness |
| 8 | Roof fight part 2 in the tunnel's strobing light | 90 | 3 (30+30+30) | CS4[action/chaotic/after-dark]; boundary on duck-under apex |
| 9 | Uncoupling: the burning cars fall away | 55 | 2 (30+25) | SDi wide, end_image_url = car separating |
| 10 | Smudge appears on the last car, laughs, vanishes in ink | 20 | 1 | SDi Dutch tilt, crimson key |
| 11 | Sunset ride: the team on the roof | 75 | 3 (30+30+15) | SDi calm orbit, volumetric gold |

**Stitch plan:** 595s → **23 generations** (≤30s each). Seamless multi-segment scenes: #2 85s → 30+30+25; #4 55s → 30+25; #5 90s → 30+30+30; #6 75s → 30+30+15; #8 90s → 30+30+30; #9 55s → 30+25; #11 75s → 30+30+15. Hard cuts: 6→7 (tunnel smash), 7→8 (strobe), 9→10 (Dutch reveal).

**Cinematography:** Anamorphic 35–40mm, motion blur on backgrounds; warm afternoon to strobe to golden hour.

**Characters:** Nova (lead), Bolt, Brick, Pip, Smudge · **Music/SFX:** Koto-synth Nova motif over driving rail rhythm; wind roar, rail clack, staff whoosh.

**Thumbnail:** Nova on the train roof mid-spin, magenta arcs, three goons leaping. Text: "HOLD THE ROOF".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Roof fight part 1 (60s) · (b) Brick door gag (25s) · (c) Tunnel strobe fight (45s)

#### L04 · Brick Is Afraid of the Dark
**Alt title:** The Glowworm Cave · **Tag:** S1·E04 · **Runtime:** ~10:18 (595s generated + 23s ident/outro)

**Hook (0–5s):** Total darkness. Two lime eyes blink. A tiny whisper: "...guys?"

**Logline:** Separated in a lightless cave, Brick must cross it alone and discovers the monster everyone fears is just lonely.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: darkness, lime eyes, whisper | 8 | 1 | SDi near-black frame, eye glow only |
| 2 | How we got here: cave-in separates the team | 70 | 3 (30+30+10) | SDi wide, dust, falling rocks, boundary on rock slam |
| 3 | Brick alone; rim light dims | 65 | 3 (30+30+5) | SDi 50mm, low key, dripping water |
| 4 | Pip and Bolt on the other side: comic walkie-talkie banter | 50 | 2 (30+20) | SDi locked-off 2-shot |
| 5 | Glowworm ceiling reveal | 45 | 2 (30+15) | SDt establishing, blue-green bioluminescence |
| 6 | Something huge breathes; chase through tunnels | 90 | 3 (30+30+30) | CS4[horror/dynamic/vintage-anamorphic/after-dark]; boundary on Brick's slide |
| 7 | Brick corners himself; the creature is a baby ink-mole | 70 | 3 (30+30+10) | SDi low angle, reveal via rim light |
| 8 | Heart: Brick shares his snack | 70 | 3 (30+30+10) | SDi calm, warm light bloom returns |
| 9 | The mole digs the team a way out | 65 | 3 (30+30+5) | SDi tracking, boundary on tunnel breakthrough |
| 10 | Reunion hug; shard in the mole's nest | 50 | 2 (30+20) | SDi slow push-in |
| 11 | Tag: the mole follows them home | 12 | 1 | SDi locked-off gag |

**Stitch plan:** 595s → **26 generations** (≤30s each). Seamless multi-segment scenes: #2 70s → 30+30+10; #3 65s → 30+30+5; #4 50s → 30+20; #5 45s → 30+15; #6 90s → 30+30+30; #7 70s → 30+30+10; #8 70s → 30+30+10; #9 65s → 30+30+5; #10 50s → 30+20. Hard cuts: 1→2 (flashback card), 6→7 (silence beat), 10→11 (comic reveal).

**Cinematography:** Low-key, practical-only light; bioluminescent teal; lime rim as the emotional meter.

**Characters:** Brick (lead), Pip, Bolt, Nova, ink-mole (guest) · **Music/SFX:** Solo tuba motif, soft celesta; drips, breathing, heartbeat, the snack crunch.

**Thumbnail:** Brick huge but cowering, a giant shadow looming, one glowworm. Text: "WHAT'S THERE?"

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Dark-cave whisper hook (20s) · (b) Ink-mole reveal (40s) · (c) Snack-sharing heart moment (30s)

#### L05 · The Desert Sail Race
**Alt title:** Winds of the Dune Sea · **Tag:** S1·E05 · **Runtime:** ~9:35 (552s generated + 23s ident/outro)

**Hook (0–5s):** A sand-sail skims a dune crest, airborne, and lands inches from a crimson-sailed rival.

**Logline:** A shard is the prize in the Dune Sea's wind race, and Bolt must beat Smudge's ink-powered sled without cheating like him.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: airborne sand-sail landing | 12 | 1 | CS4[action/single-shot/anamorphic/highway-standoff] |
| 2 | Race town: flags, sails, grey ink crowds | 45 | 2 (30+15) | SDt establishing, heat shimmer |
| 3 | Gag: Pip's sail design is a kite | 30 | 1 | SDi locked-off wide |
| 4 | Starting line standoff with Smudge | 25 | 1 | SDi low-angle, wind, Dutch on Smudge |
| 5 | Race leg 1: dune slalom | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/highway-standoff]; boundary on dune crest jump |
| 6 | Smudge sabotages; the sail rips | 75 | 3 (30+30+15) | SDi close, torn fabric, crimson ink |
| 7 | Fix it mid-race: Brick becomes the mast | 75 | 3 (30+30+15) | SDi tracking, comedic heroism |
| 8 | Race leg 2: sandstorm canyon | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic/highway-standoff]; boundary on canyon wall skim |
| 9 | Photo finish (slow-mo) | 15 | 1 | CS4[action/single-shot] speed ramp |
| 10 | Bolt refuses the cheat shortcut; wins anyway | 75 | 3 (30+30+15) | SDi 2-shot |
| 11 | Night: Smudge's sled found empty, ink trail leads away | 20 | 1 | SDi cool moonlight |

**Stitch plan:** 552s → **22 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 75s → 30+30+15; #8 90s → 30+30+30; #10 75s → 30+30+15. Hard cuts: 4→5 (flag drop), 8→9 (freeze), 9→10 (crowd roar).

**Cinematography:** Long lens 100mm heat-shimmer for sails, 24mm for canyon; orange sand with cyan and crimson sails.

**Characters:** Bolt (lead), Brick, Pip, Nova, Smudge · **Music/SFX:** Desert percussion, oud-synth hybrid; wind, sail snaps, sand hiss.

**Thumbnail:** Two sails head to head on a dune crest, cyan vs crimson. Text: "NO CHEATING".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Airborne landing hook (15s loop) · (b) Brick-as-mast gag (40s) · (c) Photo finish (25s)

#### L06 · Pip's Very Bad Invention
**Alt title:** Too Many Bolts · **Tag:** S1·E06 · **Runtime:** ~10:31 (608s generated + 23s ident/outro)

**Hook (0–5s):** Pip hits a button. Ding. There are now nine Bolts.

**Logline:** Pip builds a copy-machine to speed up the quest, and a flood of chaotic, overconfident Bolt clones overruns the camp.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: nine Bolts appear | 8 | 1 | SDi locked-off wide, comedic hold |
| 2 | Earlier: Pip builds the copier | 75 | 3 (30+30+15) | SDi montage-like continuous build, amber sparks |
| 3 | First copy works: a tiny extra Brick | 55 | 2 (30+25) | SDi snap-zoom reaction |
| 4 | Bolt insists on being copied | 25 | 1 | SDi 2-shot |
| 5 | Clone chaos: Bolts wreck the camp | 90 | 3 (30+30+30) | CS4[comedy/chaotic/clean-sharp/bubblegum-boulevard]; boundary on tent collapse |
| 6 | Real Bolt can't prove he's real | 75 | 3 (30+30+15) | SDi locked-off wide lineup gag |
| 7 | Nova's test: who says sorry? | 55 | 2 (30+25) | SDi locked-off, beat of silence |
| 8 | Clones race to the shard map | 85 | 3 (30+30+25) | CS4[comedy/dynamic/bubblegum-boulevard]; boundary on map grab |
| 9 | Pip reverses the machine; clones pop into sparks | 55 | 2 (30+25) | SDi wide, amber-cyan sparks |
| 10 | Heart: Pip apologizes; Bolt admits he's reckless too | 75 | 3 (30+30+15) | SDi calm 2-shot |
| 11 | Tag: one tiny Bolt clone remains in Pip's backpack | 10 | 1 | SDi close, loop-ready |

**Stitch plan:** 608s → **24 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #3 55s → 30+25; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 55s → 30+25; #8 85s → 30+30+25; #9 55s → 30+25; #10 75s → 30+30+15. Hard cuts: 1→2 ("EARLIER" card), 6→7 (silence), 9→10 (quiet).

**Cinematography:** Bright comedy lighting, 35mm, clean-sharp; saturated candy palette.

**Characters:** Pip (lead), Bolt ×9, Nova, Brick · **Music/SFX:** Pizzicato and clarinet, escalating kazoo-synth; boings, pops, crowd of Bolt yelps.

**Thumbnail:** Nine Bolts in a pile, Pip holding a remote. Text: "TOO MANY".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Nine-Bolts reveal (20s) · (b) Who says sorry? test (30s) · (c) Tiny clone tag (loop 12s)

#### L07 · The Frozen Peak
**Alt title:** Nova's Master · **Tag:** S1·E07 · **Runtime:** ~9:53 (570s generated + 23s ident/outro)

**Hook (0–5s):** An avalanche fills the frame, and a magenta staff punches out through the snow.

**Logline:** Climbing the frozen peak toward a shard, Nova faces the ice-carved monument of the master she abandoned and must forgive herself mid-avalanche.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: staff through avalanche | 10 | 1 | CS4[epic/single-shot/anamorphic] |
| 2 | Base camp: blizzard, ice spires | 45 | 2 (30+15) | SDt establishing, blue volumetric snow |
| 3 | Climb: rope team on an ice wall | 75 | 3 (30+30+15) | SDi vertical tracking; boundary on Brick's axe swing |
| 4 | Gag: Brick's snack freezes to his hand | 20 | 1 | SDi locked-off |
| 5 | Nova finds her master's frozen staff | 75 | 3 (30+30+15) | SDi 85mm close, halation |
| 6 | Flashback: training in cherry-blossom snow | 75 | 3 (30+30+15) | SDi 35mm-film look via prompt, warm pinks |
| 7 | Avalanche triggered by Smudge | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic]; boundary on snow wave crest |
| 8 | Nova's hero moment: dual staffs split the snow | 15 | 1 | CS4[epic/single-shot] slow-mo |
| 9 | Summit: shard in an ice shrine | 75 | 3 (30+30+15) | SDi wide sunrise |
| 10 | Nova carves a thank-you in the ice | 75 | 3 (30+30+15) | SDi calm, quiet wind |
| 11 | Tag: Smudge collects a single ice shard of his own | 15 | 1 | SDi crimson backlight |

**Stitch plan:** 570s → **24 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #3 75s → 30+30+15; #5 75s → 30+30+15; #6 75s → 30+30+15; #7 90s → 30+30+30; #9 75s → 30+30+15; #10 75s → 30+30+15. Hard cuts: 5→6 (flashback white-flash), 6→7 (smash to roar), 8→9 (silence).

**Cinematography:** Cold blue key, magenta rim popping; 24mm for scale, 85mm for grief.

**Characters:** Nova (lead), Bolt, Pip, Brick, Smudge · **Music/SFX:** Solo koto, then full orchestra at the avalanche; creaking ice, wind, deep snow roar.

**Thumbnail:** Nova with two glowing staffs facing a wall of snow. Text: "SPLIT IT".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Avalanche split hero moment (30s) · (b) Frozen snack gag (20s) · (c) Flashback training (45s)

#### L08 · The Floating Ink Market
**Alt title:** Bolt Gets Scammed · **Tag:** S1·E08 · **Runtime:** ~10:21 (598s generated + 23s ident/outro)

**Hook (0–5s):** Bolt proudly holds up a "shard." It's a painted rock. A merchant is already sprinting away.

**Logline:** In a bazaar of floating islands, a slick merchant cons Bolt out of the map, and the team must out-hustle a hustler across rope-bridge rooftops.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: fake shard reveal | 8 | 1 | SDi locked-off gag |
| 2 | Market establishing: floating islands, lanterns | 45 | 2 (30+15) | SDt drone-glide, lantern bokeh |
| 3 | The merchant's pitch | 70 | 3 (30+30+10) | SDi 2-shot, fast gestures |
| 4 | Pip's price-negotiation gag | 70 | 3 (30+30+10) | SDi locked-off |
| 5 | Rooftop chase after the merchant | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/a-dream-in-color]; boundaries on bridge swing (30s) and lantern leap (60s) |
| 6 | Brick falls into a noodle stall | 20 | 1 | SDi wide comedic aftermath |
| 7 | Nova corners the merchant | 70 | 3 (30+30+10) | SDi low angle |
| 8 | Twist: the merchant is hiding refugees from Smudge | 75 | 3 (30+30+15) | SDi calm, warm interior |
| 9 | Team trades the map to protect them | 75 | 3 (30+30+15) | SDi 2-shot |
| 10 | Night lantern festival; merchant gifts a real clue | 75 | 3 (30+30+15) | SDi orbit, lantern light |

**Stitch plan:** 598s → **25 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #3 70s → 30+30+10; #4 70s → 30+30+10; #5 90s → 30+30+30; #7 70s → 30+30+10; #8 75s → 30+30+15; #9 75s → 30+30+15; #10 75s → 30+30+15. Hard cuts: 1→2, 5→6 (splash), 7→8 (tone shift).

**Cinematography:** Warm lanterns, magenta-teal dusk; 35mm handheld feel for the chase.

**Characters:** Bolt (lead), Pip, Brick, Nova, merchant (guest) · **Music/SFX:** Hand percussion and plucked strings; crowd walla, rope creaks, noodle splash.

**Thumbnail:** Bolt holding a painted rock, merchant waving in the background. Text: "SCAMMED".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Painted-rock hook (15s) · (b) Noodle stall crash (25s) · (c) Rooftop chase (45s)

#### L09 · Smudge's Masquerade
**Alt title:** The Crimson Ball · **Tag:** S1·E09 · **Runtime:** ~9:38 (555s generated + 23s ident/outro)

**Hook (0–5s):** A ballroom door opens. Every guest is wearing a Smudge mask, including Brick.

**Logline:** The team infiltrates Smudge's masked ball to steal back the shards he has collected, and the dance floor becomes a duel.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: ballroom of Smudge masks | 10 | 1 | SDi symmetrical wide, crimson chandeliers |
| 2 | Plan briefing with doodle diagrams | 75 | 3 (30+30+15) | SDi locked-off; Remotion diagram overlays |
| 3 | Gag: Brick's mask is too small | 20 | 1 | SDi close snap-zoom |
| 4 | Entering the ball; waltz among grey guests | 90 | 3 (30+30+30) | CS4[drama/calm/vintage-anamorphic/the-crimson-ballet]; boundary on dance spin |
| 5 | Pip sneaks to the vault | 75 | 3 (30+30+15) | SDi low tracking, after-dark shadows |
| 6 | Smudge's theatrical speech | 75 | 3 (30+30+15) | SDi Dutch tilt, spotlight |
| 7 | Masks off: dance-floor duel, Nova vs Smudge | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/the-crimson-ballet]; boundaries on twirl-bind (30s) and chandelier leap (60s) |
| 8 | Vault opened: shards secured | 25 | 1 | SDi macro glow |
| 9 | Escape through stained-glass window | 20 | 1 | CS4[action/single-shot] slow-mo glass-to-sparks |
| 10 | Smudge, alone, removes his own crown, ominously calm | 75 | 3 (30+30+15) | SDi 85mm, single crimson key |

**Stitch plan:** 555s → **22 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 90s → 30+30+30; #5 75s → 30+30+15; #6 75s → 30+30+15; #7 90s → 30+30+30; #10 75s → 30+30+15. Hard cuts: 2→3, 6→7 (mask rip), 9→10 (glass silence).

**Cinematography:** Vintage-anamorphic ovals, crimson/gold; 85mm portraits for Smudge.

**Characters:** Nova, Pip, Bolt, Brick, Smudge (co-lead) · **Music/SFX:** Villain waltz in 3/4 (detuned music box → full strings); glass tinks, mask clatter.

**Thumbnail:** Nova and Smudge mid-duel in a crimson ballroom, masks flying. Text: "MASKS OFF".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Ballroom masks hook (15s) · (b) Dance-floor duel (60s) · (c) Stained-glass escape (20s loop)

#### L10 · The Door Between Pages
**Alt title:** Season 1 Finale · **Tag:** S1·E10 · **Runtime:** ~8:45 (502s generated + 23s ident/outro)

**Hook (0–5s):** The completed Nib ignites in Bolt's hand and draws a door in mid-air. Smudge's hand reaches through first.

**Logline:** With every shard united, the team draws a door out of the Margin, but Smudge pulls Pip through to a neon city on the other side.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: door drawn, Smudge's hand reaches through | 12 | 1 | CS4[epic/single-shot/anamorphic/a-dream-in-color] |
| 2 | Assembling the Nib at the canyon rim | 75 | 3 (30+30+15) | SDi macro to wide, gold sunrise |
| 3 | Gag: arguing about what door to draw | 30 | 1 | SDi locked-off lineup |
| 4 | Smudge arrives with an ink storm army | 75 | 3 (30+30+15) | SDi wide, crimson storm |
| 5 | Final battle part 1: team vs army | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic/the-crimson-ballet] refs ×5; boundaries on shield bash (30s) and aerial flip (60s) |
| 6 | Bolt vs Smudge on the tear's edge | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic]; boundary on scarf-grab |
| 7 | Pip seized and pulled through the door | 20 | 1 | SDi close, amber eyes wide |
| 8 | Hero moment: Bolt dives after him, too late | 15 | 1 | CS4[epic/single-shot] slow-mo |
| 9 | The door closes; silence | 75 | 3 (30+30+15) | SDi calm, rim lights dimmed |
| 10 | Cliffhanger: through a crack, neon rain and a city skyline | 20 | 1 | SDt neon-rain vista, end_image_url = S2 opener keyframe |

**Stitch plan:** 502s → **20 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 75s → 30+30+15; #5 90s → 30+30+30; #6 90s → 30+30+30; #9 75s → 30+30+15. Hard cuts: 4→5 (war cry), 7→8 (slow-mo), 8→9 (silence), 9→10 (neon smash).

**Cinematography:** Gold-to-crimson grade across the episode; 24mm epic wides, 85mm for Pip's capture.

**Characters:** Full cast; Smudge · **Music/SFX:** All four motifs combine; choir; ink storm roar, door hum, sudden silence.

**Thumbnail:** Pip being pulled into a glowing door, Bolt reaching. Text: "PIP!"

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Door-drawn hook (15s) · (b) Army battle (60s) · (c) Neon cliffhanger teaser (20s)

### Season 2: *Neon Rift* (L11–L20). Rescue Pip in a cyber-megacity; heists, races, Static.

#### L11 · Welcome to Rift City
**Alt title:** Rain on Ink · **Tag:** S2·E01 · **Runtime:** ~8:13 (470s generated + 23s ident/outro)

**Hook (0–5s):** Rain hisses on a neon street. Three rim lights flicker on in an alley: cyan, magenta, lime. The amber one is missing.

**Logline:** Bolt, Nova and Brick land in a vertical megacity and search for Pip, whose goggles are on every billboard.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: three rim lights in an alley | 10 | 1 | SDi low wide, neon reflections |
| 2 | City vista: towers, hover-traffic, holograms | 45 | 2 (30+15) | SDt 21:9 feel, neon-rain vista |
| 3 | Gag: Brick vs a talking vending machine | 30 | 1 | SDi locked-off |
| 4 | Pip's goggles on a giant billboard | 20 | 1 | SDi tilt-up reveal |
| 5 | Chased by drone cops | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/neon-rain-at-midnight]; boundary on alley slide |
| 6 | Hiding in a noodle bar; locals explain Smudge's rule | 75 | 3 (30+30+15) | SDi warm interior 2-shot |
| 7 | Climb the mega-tower exterior | 90 | 3 (30+30+30) | CS4[action/dynamic/neon-rain-at-midnight]; boundary on ledge catch |
| 8 | Window glimpse: Pip in a glass office, smiling? | 25 | 1 | SDi long lens through glass |
| 9 | Nova holds Bolt back | 75 | 3 (30+30+15) | SDi rain 2-shot |
| 10 | Tag: Pip's desk sign reads CEO | 10 | 1 | SDi close gag, Remotion text |

**Stitch plan:** 470s → **19 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 90s → 30+30+30; #9 75s → 30+30+15. Hard cuts: 4→5 (siren), 6→7, 9→10 (smash to gag).

**Cinematography:** Wet asphalt reflections, anamorphic neon streaks; teal-magenta grade.

**Characters:** Bolt, Nova, Brick, Pip (cameo) · **Music/SFX:** Synthwave-orchestral hybrid; rain, hover-traffic, drone whine.

**Thumbnail:** Bolt on a rooftop in rain looking at a giant Pip billboard. Text: "WHERE'S PIP?"

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Missing amber light hook (15s) · (b) Vending machine gag (30s) · (c) Drone chase (45s)

#### L12 · The Hover-League
**Alt title:** Bolt Can't Drive · **Tag:** S2·E02 · **Runtime:** ~9:18 (535s generated + 23s ident/outro)

**Hook (0–5s):** A hover-bike flips three times through a neon ring, and Bolt is riding it upside down.

**Logline:** The only way into Smudge's tower is a champion's pass, so Bolt enters a hover-bike league he has no idea how to ride.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: upside-down ring pass | 10 | 1 | CS4[action/single-shot/anamorphic/neon-rain-at-midnight] |
| 2 | Garage: Brick builds a bike from scrap | 75 | 3 (30+30+15) | SDi warm sparks |
| 3 | Gag: test ride through a wall | 20 | 1 | SDi locked-off |
| 4 | League arena reveal | 45 | 2 (30+15) | SDt establishing, stadium lights |
| 5 | Qualifier race | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic]; boundary on ring pass |
| 6 | Rival racer 'Static' intimidates Bolt | 25 | 1 | SDi low angle 2-shot |
| 7 | Final race: tunnel section | 90 | 3 (30+30+30) | CS4[action/chaotic/after-dark]; boundary on tunnel exit flash |
| 8 | Crash and recovery | 75 | 3 (30+30+15) | SDi wide debris, sparks |
| 9 | Hero moment: scarf trail as a racing line | 15 | 1 | CS4[action/single-shot] slow-mo |
| 10 | Podium: champion's pass won | 75 | 3 (30+30+15) | SDi confetti light |
| 11 | Tag: Static salutes, an unlikely respect | 15 | 1 | SDi rain close |

**Stitch plan:** 535s → **22 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 45s → 30+15; #5 90s → 30+30+30; #7 90s → 30+30+30; #8 75s → 30+30+15; #10 75s → 30+30+15. Hard cuts: 3→4, 7→8 (crash impact frame), 9→10.

**Cinematography:** Stadium top lights, long lens for speed compression; cyan racing lines.

**Characters:** Bolt (lead), Brick, Nova, Static (guest rival) · **Music/SFX:** Electronic race score, 140bpm; engine whines, crowd, crash crunch.

**Thumbnail:** Bolt upside-down on a hover-bike through a neon ring. Text: "NO BRAKES".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Upside-down hook (15s loop) · (b) Through-the-wall gag (20s) · (c) Tunnel race (45s)

#### L13 · Pip, CEO
**Alt title:** The Boardroom · **Tag:** S2·E03 · **Runtime:** ~9:23 (540s generated + 23s ident/outro)

**Hook (0–5s):** Pip in a tiny suit jacket at a giant boardroom table: "Next item: world domination?" Everyone claps.

**Logline:** Smudge has flattered Pip into running his tech empire, and the team must convince their friend he's being used without hurting him.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: boardroom clap | 10 | 1 | SDi symmetrical wide |
| 2 | Pip's glamorous office tour | 75 | 3 (30+30+15) | SDi tracking, sterile white-cyan light |
| 3 | Gag: Pip's intercom buttons do random things | 30 | 1 | SDi locked-off |
| 4 | Team sneaks in as janitors | 75 | 3 (30+30+15) | SDi wide, comedic stealth |
| 5 | Reunion goes badly: Pip defensive | 75 | 3 (30+30+15) | SDi 2-shot, cold light |
| 6 | Smudge reveals the plan: Pip's gadgets as ad-hypnosis | 75 | 3 (30+30+15) | SDi Dutch, crimson screens |
| 7 | Pip realizes; security bots attack | 90 | 3 (30+30+30) | CS4[action/dynamic/clean-sharp/static-noon]; boundary on desk vault |
| 8 | Escape down the elevator shaft | 25 | 1 | CS4[action/single-shot] vertical fall |
| 9 | Heart: Pip apologizes, the team forgives | 75 | 3 (30+30+15) | SDi calm, amber rim returns |
| 10 | Tag: Pip keeps the tiny jacket | 10 | 1 | SDi close gag |

**Stitch plan:** 540s → **22 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 75s → 30+30+15; #5 75s → 30+30+15; #6 75s → 30+30+15; #7 90s → 30+30+30; #9 75s → 30+30+15. Hard cuts: 1→2, 5→6, 8→9 (landing silence).

**Cinematography:** Corporate sterile vs warm reunion; 50mm; static-noon deadpan.

**Characters:** Pip (lead), Bolt, Nova, Brick, Smudge · **Music/SFX:** Muzak-parody lounge into action; keyboard clicks, elevator ding, bot servos.

**Thumbnail:** Pip in a tiny suit at a huge desk, Smudge shadow behind. Text: "PIP, CEO".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Boardroom clap hook (15s) · (b) Intercom button gag (30s) · (c) Elevator shaft fall (30s)

#### L14 · The Vault of Light
**Alt title:** One Shot Heist · **Tag:** S2·E04 · **Runtime:** ~10:23 (600s generated + 23s ident/outro)

**Hook (0–5s):** Nova hangs upside-down on a wire, a crimson laser grid inches beneath her staff.

**Logline:** To recover the Nib from Smudge's vault, the reunited team pulls a four-part heist with exactly one shot at each step.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: Nova on the wire above lasers | 10 | 1 | SDi top-down, crimson grid |
| 2 | Heist plan with Remotion blueprint overlay | 75 | 3 (30+30+15) | SDi locked-off table wide |
| 3 | Step 1: Brick as delivery robot (comedic) | 75 | 3 (30+30+15) | SDi wide lobby |
| 4 | Step 2: Pip hacks cameras | 65 | 3 (30+30+5) | SDi close, screen glow |
| 5 | Step 3: Bolt's vent crawl | 65 | 3 (30+30+5) | SDi POV-ish tracking |
| 6 | Step 4: Nova's laser descent | 90 | 3 (30+30+30) | CS4[noir/calm/vintage-anamorphic/after-dark]; boundary on staff-touch near-miss |
| 7 | Alarm! Everything goes wrong | 20 | 1 | SDi red strobe |
| 8 | Vault escape fight | 90 | 3 (30+30+30) | CS4[action/chaotic/after-dark]; boundary on door slam |
| 9 | Rooftop getaway on hover-bike | 90 | 3 (30+30+30) | CS4[action/dynamic/neon-rain-at-midnight] |
| 10 | Twist: the Nib is a fake; Smudge on a screen laughing | 20 | 1 | SDi screen close |

**Stitch plan:** 600s → **24 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #3 75s → 30+30+15; #4 65s → 30+30+5; #5 65s → 30+30+5; #6 90s → 30+30+30; #8 90s → 30+30+30; #9 90s → 30+30+30. Hard cuts: each heist step is a hard cut with step card; 6→7 (alarm smash).

**Cinematography:** Noir shadows, laser haze; 35mm anamorphic; crimson/teal.

**Characters:** Nova (lead), Pip, Bolt, Brick, Smudge · **Music/SFX:** Heist bass and brushed drums into full action; laser hums, alarm, vault clunk.

**Thumbnail:** Nova upside-down over a laser grid. Text: "ONE SHOT".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Laser descent (45s) · (b) Delivery-robot gag (30s) · (c) Fake-Nib twist teaser (20s)

#### L15 · Brick and the Big Robot
**Alt title:** Robot Babysitter · **Tag:** S2·E05 · **Runtime:** ~10:28 (605s generated + 23s ident/outro)

**Hook (0–5s):** A robot the size of a building lowers its hand and Brick sets a single flower on it.

**Logline:** Brick befriends a decommissioned giant maintenance robot scheduled for scrap and must save it before Smudge repurposes it as a weapon.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: flower on robot hand | 10 | 1 | SDi low angle, drizzle |
| 2 | Scrapyard establishing | 45 | 2 (30+15) | SDt wide, towering junk |
| 3 | Brick and robot play catch with a car | 75 | 3 (30+30+15) | SDi locked-off comedic |
| 4 | Robot's memory: it used to clean the city | 75 | 3 (30+30+15) | SDi soft hologram flashback |
| 5 | Smudge's crew arrives to hijack it | 65 | 3 (30+30+5) | SDi wide threat |
| 6 | Robot controlled; rampages through market | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic/neon-rain-at-midnight]; boundary on footstep crash |
| 7 | Brick climbs the robot | 90 | 3 (30+30+30) | CS4[action/dynamic]; boundary on shoulder grab |
| 8 | Inside the head: Brick talks it back | 75 | 3 (30+30+15) | SDi calm, lime glow |
| 9 | Robot saves civilians | 65 | 3 (30+30+5) | SDi wide heroic |
| 10 | Tag: robot becomes the team's taxi | 15 | 1 | SDi gag wide |

**Stitch plan:** 605s → **25 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #3 75s → 30+30+15; #4 75s → 30+30+15; #5 65s → 30+30+5; #6 90s → 30+30+30; #7 90s → 30+30+30; #8 75s → 30+30+15; #9 65s → 30+30+5. Hard cuts: 4→5, 5→6 (crimson takeover), 8→9.

**Cinematography:** Scale contrast shots, 16–24mm; lime heart light inside cockpit.

**Characters:** Brick (lead), robot (guest), Pip, Bolt, Nova, Smudge's crew · **Music/SFX:** Tuba motif with synth pads; servo groans, footsteps, rain.

**Thumbnail:** Brick on the shoulder of a giant robot in neon rain. Text: "MY FRIEND".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Flower hook (15s) · (b) Catch with a car (30s) · (c) Robot rampage (45s)

#### L16 · Rooftop Rain Duel
**Alt title:** Nova vs. Static · **Tag:** S2·E06 · **Runtime:** ~8:48 (505s generated + 23s ident/outro)

**Hook (0–5s):** Lightning. Two silhouettes on a rooftop. A single raindrop falls between them and then they move.

**Logline:** Static, the rival racer, is revealed as Smudge's enforcer, and Nova challenges her to a one-on-one duel to free the league.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: raindrop standoff | 10 | 1 | CS4[action/single-shot/anamorphic/neon-rain-at-midnight] |
| 2 | Static's betrayal revealed | 75 | 3 (30+30+15) | SDi 2-shot, hologram light |
| 3 | Gag: Bolt insists on 'helping'; Nova ties him up | 25 | 1 | SDi locked-off |
| 4 | Duel exchange A | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/neon-rain-at-midnight]; boundary on staff-blade bind |
| 5 | Reversal: Nova disarmed near the edge | 90 | 3 (30+30+30) | CS4[action/dynamic]; end on hanging grip |
| 6 | Memory flash: master's lesson (callback L07) | 20 | 1 | SDi warm flashback |
| 7 | Duel exchange B on neon signage | 90 | 3 (30+30+30) | CS4[action/chaotic/neon-rain-at-midnight]; boundary on sign-swing apex |
| 8 | Hero moment: Nova's rain-splitting spin | 15 | 1 | CS4[action/single-shot] slow-mo |
| 9 | Static yields; truce | 75 | 3 (30+30+15) | SDi calm rain close |
| 10 | Tag: Static joins as an ally | 15 | 1 | SDi walking-away wide |

**Stitch plan:** 505s → **20 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 90s → 30+30+30; #5 90s → 30+30+30; #7 90s → 30+30+30; #9 75s → 30+30+15. Boundaries mapped to binds and apexes; hard cuts 5→6 (flash), 7→8 (freeze).

**Cinematography:** Backlit rain, anamorphic streaks; magenta vs electric white.

**Characters:** Nova (lead), Static, Bolt · **Music/SFX:** Taiko and synth duel theme; rain, thunder, staff clashes (glassy tinks).

**Thumbnail:** Nova and Static clashing in rain, magenta and white trails. Text: "ONE ON ONE".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Raindrop standoff (15s loop) · (b) Duel exchange A (60s) · (c) Rain-split spin (20s)

#### L17 · The Ad That Ate the City
**Alt title:** Hypno-Billboards · **Tag:** S2·E07 · **Runtime:** ~9:33 (550s generated + 23s ident/outro)

**Hook (0–5s):** Every citizen on the street stops and turns their head toward the camera. Their eyes flicker crimson.

**Logline:** Smudge's billboards hypnotize the city into buying his ink, and Pip must hack the network while the team keeps the crowds from the tower.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: citizens turn in unison | 10 | 1 | SDi symmetrical wide |
| 2 | The ad campaign montage | 75 | 3 (30+30+15) | SDi continuous tracking past billboards |
| 3 | Gag: Brick almost buys 40 cans of ink | 25 | 1 | SDi locked-off |
| 4 | Plan: hack the central antenna | 75 | 3 (30+30+15) | SDi 3-shot, blueprint overlay |
| 5 | Crowd-surge chase | 90 | 3 (30+30+30) | CS4[action/dynamic/neon-rain-at-midnight]; boundary on crowd split |
| 6 | Pip hacks inside the antenna | 75 | 3 (30+30+15) | SDi close, code glow |
| 7 | Bolt and Nova hold the stairs | 90 | 3 (30+30+30) | CS4[action/chaotic]; boundary on stairwell flip |
| 8 | Pip's counter-ad: a dancing Brick | 25 | 1 | SDi billboard comedic |
| 9 | City wakes up laughing | 75 | 3 (30+30+15) | SDi wide, warm light |
| 10 | Tag: Brick is now a meme | 10 | 1 | SDi gag |

**Stitch plan:** 550s → **22 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 75s → 30+30+15; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 90s → 30+30+30; #9 75s → 30+30+15. Hard cuts: 1→2, 7→8 (reveal smash), 9→10.

**Cinematography:** Crimson billboard light over teal; long lenses for crowd compression.

**Characters:** Pip (lead), Bolt, Nova, Brick, Smudge (screens) · **Music/SFX:** Jingle parody turning sinister; crowd hum, glitch, laugh eruption.

**Thumbnail:** A giant billboard with Smudge's grin over hypnotized crowds. Text: "DON'T LOOK".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Heads-turn hook (15s) · (b) 40-cans gag (25s) · (c) Dancing Brick billboard (loop 20s)

#### L18 · Blackout
**Alt title:** Lights Out in Rift City · **Tag:** S2·E08 · **Runtime:** ~10:23 (600s generated + 23s ident/outro)

**Hook (0–5s):** The whole skyline goes dark. Only four rim lights remain, then one flickers.

**Logline:** Smudge cuts the city's power to hunt the team in the dark, and Brick, afraid of the dark, becomes the only light the city has.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: skyline blackout | 10 | 1 | SDt wide, lights die in sequence |
| 2 | Panic in the streets | 75 | 3 (30+30+15) | SDi tracking, handheld feel |
| 3 | Gag: Pip uses Brick as a flashlight | 25 | 1 | SDi locked-off |
| 4 | Ink shadows hunt in the dark | 90 | 3 (30+30+30) | CS4[horror/dynamic/halation-vintage/after-dark]; boundary on shadow lunge |
| 5 | Team separated in the subway | 75 | 3 (30+30+15) | SDi low-key |
| 6 | Brick's choice: brighten his rim to guide people | 75 | 3 (30+30+15) | SDi slow push, lime flare |
| 7 | Shadow swarm fight | 90 | 3 (30+30+30) | CS4[action/chaotic/after-dark]; boundary on lime light burst |
| 8 | Pip restores power grid | 75 | 3 (30+30+15) | SDi close, power surge |
| 9 | City cheers for Brick | 75 | 3 (30+30+15) | SDi wide, warm |
| 10 | Tag: Brick sleeps with a nightlight | 10 | 1 | SDi gag close |

**Stitch plan:** 600s → **24 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 90s → 30+30+30; #5 75s → 30+30+15; #6 75s → 30+30+15; #7 90s → 30+30+30; #8 75s → 30+30+15; #9 75s → 30+30+15. Hard cuts on light pops; 6→7 (flare).

**Cinematography:** Light-as-story: rim light is the only key; halation-vintage bloom.

**Characters:** Brick (lead), Pip, Bolt, Nova · **Music/SFX:** Horror-lite drones into heroic brass; hum dropouts, footsteps, crowd gasps.

**Thumbnail:** Brick glowing bright lime in total darkness, shadows retreating. Text: "LIGHTS OUT".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Blackout hook (15s) · (b) Brick flashlight gag (25s) · (c) Lime light burst (30s)

#### L19 · Bolt Loses His Scarf
**Alt title:** Who Am I Without It? · **Tag:** S2·E09 · **Runtime:** ~8:28 (485s generated + 23s ident/outro)

**Hook (0–5s):** Bolt leaps, and there's no cyan trail behind him. He looks down. The scarf is gone.

**Logline:** Smudge steals Bolt's scarf, and with it his confidence; Bolt has to win a fight as himself for the first time.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: leap with no trail | 10 | 1 | SDi slow-mo, conspicuous absence |
| 2 | Earlier: scarf snatched in a crowd | 75 | 3 (30+30+15) | SDi tracking |
| 3 | Gag: team offers substitute scarves | 30 | 1 | SDi locked-off lineup |
| 4 | Bolt fails a jump; spirals | 75 | 3 (30+30+15) | SDi wide, rain |
| 5 | Static trains Bolt without tricks | 75 | 3 (30+30+15) | SDi rooftop training |
| 6 | Smudge wears the scarf, taunting | 25 | 1 | SDi Dutch |
| 7 | Fight: scarfless Bolt vs Smudge | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/the-crimson-ballet]; boundaries on dodge roll (30s) and pillar kick (60s) |
| 8 | Bolt wins it back and ties it on | 20 | 1 | SDi close |
| 9 | Heart: 'It was never the scarf' | 75 | 3 (30+30+15) | SDi calm |
| 10 | Tag: Pip adds a cupholder to the scarf | 10 | 1 | SDi gag |

**Stitch plan:** 485s → **20 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 75s → 30+30+15; #5 75s → 30+30+15; #7 90s → 30+30+30; #9 75s → 30+30+15. Hard cuts: 1→2 (EARLIER card), 6→7, 8→9.

**Cinematography:** Desaturated grade until the scarf returns; then cyan floods back.

**Characters:** Bolt (lead), Static, Nova, Pip, Brick, Smudge · **Music/SFX:** Muted brass motif, rebuilt by the end; rain, cloth whip.

**Thumbnail:** Bolt reaching for his scarf held by Smudge. Text: "GIVE IT BACK".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) No-trail hook (15s) · (b) Substitute scarves gag (30s) · (c) Scarfless fight (60s)

#### L20 · Rift Collapse
**Alt title:** Season 2 Finale · **Tag:** S2·E10 · **Runtime:** ~9:15 (532s generated + 23s ident/outro)

**Hook (0–5s):** Rift City folds in half like paper, towers bending over our heroes.

**Logline:** Smudge rips Rift City's page to escape to the Last Page, and the team must save the city even if it means letting him go.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: the city folds | 12 | 1 | CS4[epic/single-shot/anamorphic/after-dark] |
| 2 | Smudge's broadcast: 'I'm done with small pages' | 75 | 3 (30+30+15) | SDi screen close |
| 3 | Evacuation: robot taxi returns (callback L15) | 75 | 3 (30+30+15) | SDi wide heroic |
| 4 | Gag: Static and Brick argue who's lifting | 20 | 1 | SDi locked-off |
| 5 | Tower battle | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic/the-crimson-ballet] refs ×5; boundaries on shield wall (30s) and tower leap (60s) |
| 6 | Choice: chase Smudge or hold the tower up | 75 | 3 (30+30+15) | SDi calm 4-shot |
| 7 | Hero moment: Brick holds the tower | 15 | 1 | CS4[epic/single-shot] slow-mo |
| 8 | Smudge escapes through the rift | 75 | 3 (30+30+15) | SDi wide |
| 9 | Bolt hurt; rim light dims | 75 | 3 (30+30+15) | SDi 85mm close |
| 10 | Cliffhanger: a white page horizon | 20 | 1 | SDt a-dream-in-color vista |

**Stitch plan:** 532s → **22 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #3 75s → 30+30+15; #5 90s → 30+30+30; #6 75s → 30+30+15; #8 75s → 30+30+15; #9 75s → 30+30+15. Hard cuts: 1→2, 6→7 (slow-mo), 9→10 (white).

**Cinematography:** Fold physics: tilted horizons; anamorphic; crimson vs lime.

**Characters:** Full cast, Static, robot, Smudge · **Music/SFX:** Choir and synth crescendo; paper tear, glass, silence.

**Thumbnail:** Brick holding up a falling tower. Text: "HOLD IT".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) City fold hook (15s) · (b) Tower hold slow-mo (20s) · (c) S3 white page teaser (20s)

### Season 3: *The Last Page* (L21–L30). The mythic finale: the library, the split, Smudge's origin, redemption.

#### L21 · The Library at the End
**Alt title:** Shelves to the Sky · **Tag:** S3·E01 · **Runtime:** ~8:40 (497s generated + 23s ident/outro)

**Hook (0–5s):** Our heroes are tiny on a bookshelf a mile high. A single book falls past them in slow motion.

**Logline:** The team reaches the Last Page, an infinite library, where every book is a world, and one of them tells Smudge's story.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: falling book past tiny heroes | 12 | 1 | CS4[epic/single-shot/vintage-anamorphic/a-dream-in-color] |
| 2 | Library establishing: cathedral of shelves | 45 | 2 (30+15) | SDt crane, dust god-rays |
| 3 | Bolt's injury; Pip builds a splint | 75 | 3 (30+30+15) | SDi close warm |
| 4 | Gag: Brick reads a book upside down | 20 | 1 | SDi locked-off |
| 5 | Shelf-climbing expedition | 90 | 3 (30+30+30) | CS4[action/dynamic/a-dream-in-color]; boundary on page-rope swing |
| 6 | Ink-moth swarm attack | 90 | 3 (30+30+30) | CS4[action/chaotic]; boundary on swarm burst |
| 7 | The glowing book with a crimson crown | 75 | 3 (30+30+15) | SDi macro |
| 8 | Reading it: fragments of Smudge's past | 75 | 3 (30+30+15) | SDi 8mm-film look via prompt, sepia |
| 9 | Tag: the Author's voice speaks from the pages | 15 | 1 | SDi calm, narrator on-screen presence |

**Stitch plan:** 497s → **20 generations** (≤30s each). Seamless multi-segment scenes: #2 45s → 30+15; #3 75s → 30+30+15; #5 90s → 30+30+30; #6 90s → 30+30+30; #7 75s → 30+30+15; #8 75s → 30+30+15. Hard cuts: 1→2, 6→7 (silence), 8→9.

**Cinematography:** Warm sepia god-rays, extreme scale; vintage-anamorphic.

**Characters:** Full cast · **Music/SFX:** Harp, choir, ambient; page flutter, moth wings.

**Thumbnail:** Tiny team on a massive bookshelf, falling book. Text: "THE LAST PAGE".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Falling-book hook (15s loop) · (b) Upside-down book gag (20s) · (c) Moth swarm (40s)

#### L22 · The Paper Ocean
**Alt title:** Sail the Unwritten Sea · **Tag:** S3·E02 · **Runtime:** ~8:30 (487s generated + 23s ident/outro)

**Hook (0–5s):** A paper whale breaches, unfolding its fins mid-air, and the team's boat is on its back.

**Logline:** Crossing an ocean of blank pages to reach Smudge, the team befriends a paper whale that is slowly being erased.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: paper whale breach | 12 | 1 | CS4[epic/single-shot/anamorphic/a-dream-in-color] |
| 2 | Building a boat from book covers | 75 | 3 (30+30+15) | SDi warm build |
| 3 | Gag: Pip seasick | 20 | 1 | SDi locked-off |
| 4 | Open-sea voyage | 45 | 2 (30+15) | SDt wide, paper waves |
| 5 | Eraser storm | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic]; boundary on wave crest |
| 6 | The whale rescues them | 75 | 3 (30+30+15) | SDi underwater light |
| 7 | The whale's erasure; team redraws its tail | 75 | 3 (30+30+15) | SDi close, Nib glow |
| 8 | Night sail under paper stars | 75 | 3 (30+30+15) | SDi calm |
| 9 | Landfall: Smudge's paper fortress on the horizon | 20 | 1 | SDt vista |

**Stitch plan:** 487s → **20 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 45s → 30+15; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 75s → 30+30+15; #8 75s → 30+30+15. Hard cuts: 4→5 (thunder), 6→7, 8→9.

**Cinematography:** Paper texture waves, cool dawn; 24mm epic.

**Characters:** Full cast, paper whale · **Music/SFX:** Sea-shanty motif orchestral; paper crinkle surf, whale song synth.

**Thumbnail:** Boat on a breaching paper whale. Text: "HOLD ON".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Whale breach (15s) · (b) Seasick Pip gag (20s) · (c) Eraser storm (45s)

#### L23 · The Split
**Alt title:** Four Ways Apart · **Tag:** S3·E03 · **Runtime:** ~8:08 (465s generated + 23s ident/outro)

**Hook (0–5s):** Bolt and Nova shout at each other, and the ground between them literally tears in two.

**Logline:** An argument over whether to save Smudge splits the team, and a tear in the page separates them into four paths.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: ground tears between them | 10 | 1 | SDi wide, paper tear |
| 2 | Argument escalates at camp | 75 | 3 (30+30+15) | SDi 2-shot, handheld feel |
| 3 | Pip tries to mediate (gag) | 20 | 1 | SDi locked-off |
| 4 | The tear widens; team separated | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic]; boundary on leap apex |
| 5 | Bolt alone: stubborn march | 75 | 3 (30+30+15) | SDi wide |
| 6 | Nova alone: silence | 75 | 3 (30+30+15) | SDi wide |
| 7 | Brick and Pip together: brave-ish | 75 | 3 (30+30+15) | SDi 2-shot comedic |
| 8 | Smudge watches the split, satisfied | 25 | 1 | SDi Dutch |
| 9 | Four paths converge? Not yet: cliffhanger fork | 20 | 1 | SDt overhead god-shot |

**Stitch plan:** 465s → **19 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 90s → 30+30+30; #5 75s → 30+30+15; #6 75s → 30+30+15; #7 75s → 30+30+15. Parallel editing, hard cuts between paths.

**Cinematography:** Color-separated paths by rim color; overhead god-shots.

**Characters:** Full cast; Smudge · **Music/SFX:** Fractured motifs, solo instruments per path.

**Thumbnail:** Bolt and Nova on opposite sides of a tear. Text: "SPLIT".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Tear hook (15s) · (b) Pip mediates gag (20s) · (c) Four paths overhead (20s)

#### L24 · Nova Alone
**Alt title:** The Trial of Stillness · **Tag:** S3·E04 · **Runtime:** ~8:53 (510s generated + 23s ident/outro)

**Hook (0–5s):** Nova stands on a pillar in a sea of clouds. A hundred ink warriors rise around her.

**Logline:** Alone, Nova faces the Author's trial of stillness, a fight she can win only by choosing not to strike.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: hundred warriors rise | 10 | 1 | CS4[epic/single-shot/anamorphic/the-crimson-ballet] |
| 2 | The trial's riddle | 75 | 3 (30+30+15) | SDi calm, narrator voice |
| 3 | Wave 1: pure combat | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic]; boundary on staff-sweep |
| 4 | Warriors multiply as she fights | 75 | 3 (30+30+15) | SDi wide |
| 5 | Master's echo appears | 75 | 3 (30+30+15) | SDi warm flashback-look |
| 6 | Nova lowers her staff | 20 | 1 | SDi slow push |
| 7 | Warriors dissolve into petals | 75 | 3 (30+30+15) | SDi wide, petal light |
| 8 | Revelation: Smudge was once a student too | 75 | 3 (30+30+15) | SDi close |
| 9 | Tag: path forward opens toward the others | 15 | 1 | SDt vista |

**Stitch plan:** 510s → **21 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #3 90s → 30+30+30; #4 75s → 30+30+15; #5 75s → 30+30+15; #7 75s → 30+30+15; #8 75s → 30+30+15. Boundary on sweep; hard cut 5→6 (silence).

**Cinematography:** Cloud sea, backlit; magenta vs grey.

**Characters:** Nova (solo), master echo · **Music/SFX:** Koto solo swelling, then silence; wind, petals.

**Thumbnail:** Nova on a pillar surrounded by ink warriors. Text: "DON'T STRIKE".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Hundred warriors hook (15s) · (b) Staff lowered (20s) · (c) Petal dissolve loop (20s)

#### L25 · Pip and the Blank
**Alt title:** Nothing to Draw · **Tag:** S3·E05 · **Runtime:** ~7:33 (430s generated + 23s ident/outro)

**Hook (0–5s):** Pip steps into pure white. His backpack is empty. Brick is gone. Even the floor is gone.

**Logline:** Lost in the Blank, a void where nothing exists yet, Pip must draw his way out with the Nib and his own imagination.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: pure white void | 10 | 1 | SDi minimal, amber rim only |
| 2 | Pip panics; tries gadgets that don't exist | 75 | 3 (30+30+15) | SDi locked-off gag |
| 3 | He draws a chair; it's wobbly (gag) | 20 | 1 | SDi close |
| 4 | Drawing a staircase upward | 75 | 3 (30+30+15) | SDi tracking, lines materializing |
| 5 | Blank-creatures (erased shapes) chase him | 90 | 3 (30+30+30) | CS4[action/dynamic/clean-sharp/static-noon]; boundary on stair gap jump |
| 6 | He draws Brick back; wobbly but real | 75 | 3 (30+30+15) | SDi heart |
| 7 | Together they draw a door | 75 | 3 (30+30+15) | SDi wide |
| 8 | Tag: a doodle Pip left behind waves goodbye | 10 | 1 | SDi gag |

**Stitch plan:** 430s → **18 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 75s → 30+30+15; #5 90s → 30+30+30; #6 75s → 30+30+15; #7 75s → 30+30+15. Line-drawing reveals; hard cut 5→6.

**Cinematography:** High-key white, amber glow; clean-sharp.

**Characters:** Pip (lead), Brick · **Music/SFX:** Marimba alone into full band; pencil scratch SFX.

**Thumbnail:** Pip alone in white holding a glowing Nib. Text: "DRAW IT".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) White void hook (15s) · (b) Wobbly chair gag (20s) · (c) Drawn staircase (30s)

#### L26 · Smudge's First Draft
**Alt title:** Before the Crown · **Tag:** S3·E06 · **Runtime:** ~8:40 (497s generated + 23s ident/outro)

**Hook (0–5s):** Grainy 8mm footage: a small ink figure with no crown, smiling eyes, drawing flowers.

**Logline:** The origin of Smudge: the Author's first character, erased for being imperfect, who swore to become the Author himself.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: young Smudge drawing flowers | 12 | 1 | CS4[drama/single-shot/warm-vintage/a-dream-in-color] camera_model=8mm-film |
| 2 | His world: a single perfect page | 75 | 3 (30+30+15) | SDi warm vintage |
| 3 | The Author sketches others, forgets him | 75 | 3 (30+30+15) | SDi wide, fading light |
| 4 | Erasure begins | 75 | 3 (30+30+15) | SDi close, crumbling lines |
| 5 | He survives as a smudge | 75 | 3 (30+30+15) | SDi dark |
| 6 | Crown forms from his rage | 20 | 1 | SDi crimson flare |
| 7 | Back to present: team reads it together | 75 | 3 (30+30+15) | SDi warm 4-shot |
| 8 | Bolt changes his mind about saving him | 75 | 3 (30+30+15) | SDi close |
| 9 | Tag: Smudge feels the book being read | 15 | 1 | SDi Dutch |

**Stitch plan:** 497s → **21 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #3 75s → 30+30+15; #4 75s → 30+30+15; #5 75s → 30+30+15; #7 75s → 30+30+15; #8 75s → 30+30+15. Film grain to modern clean cut at scene 7.

**Cinematography:** 8mm-film grain, warm-vintage lens; then modern.

**Characters:** Smudge (lead), full cast · **Music/SFX:** Music box undetuned (innocence) then detuned; projector hum.

**Thumbnail:** Split: little smiling Smudge vs crowned Smudge. Text: "BEFORE".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) 8mm origin hook (15s) · (b) Crown forms (20s) · (c) Bolt's change of heart (30s)

#### L27 · Brick Carries Everyone
**Alt title:** The Storm Bridge · **Tag:** S3·E07 · **Runtime:** ~7:33 (430s generated + 23s ident/outro)

**Hook (0–5s):** Brick walks through a lightning storm with three friends on his back and doesn't slow down.

**Logline:** Reunited but exhausted, the team must cross the storm bridge to the Author's room, and only Brick can carry them.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: Brick in the storm with three on his back | 10 | 1 | CS4[epic/single-shot/anamorphic] |
| 2 | Reunion scene, awkward then warm | 75 | 3 (30+30+15) | SDi warm 4-shot |
| 3 | Gag: everyone apologizes at once | 20 | 1 | SDi locked-off |
| 4 | Storm bridge reveal | 45 | 2 (30+15) | SDt vista |
| 5 | The crossing, part 1 | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic]; boundary on plank snap |
| 6 | Lightning eraser strikes | 90 | 3 (30+30+30) | CS4[action/chaotic]; boundary on dodge |
| 7 | Brick falters; the team cheers him on | 75 | 3 (30+30+15) | SDi close |
| 8 | Hero moment: final step | 15 | 1 | CS4[epic/single-shot] slow-mo |
| 9 | Tag: Brick asks for a snack | 10 | 1 | SDi gag |

**Stitch plan:** 430s → **18 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 45s → 30+15; #5 90s → 30+30+30; #6 90s → 30+30+30; #7 75s → 30+30+15. Boundaries on plank snap and dodge; hard cut 7→8.

**Cinematography:** Lightning key light, lime rim; 24mm.

**Characters:** Brick (lead), full cast · **Music/SFX:** Tuba to choir; thunder, planks.

**Thumbnail:** Brick carrying three friends through lightning. Text: "I GOT YOU".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Storm-walk hook (15s) · (b) Apology gag (20s) · (c) Final step (20s)

#### L28 · The Eraser Army
**Alt title:** Battle of the Blank Plains · **Tag:** S3·E08 · **Runtime:** ~8:10 (467s generated + 23s ident/outro)

**Hook (0–5s):** A horizon of pink erasers marches in unison, the ground behind them wiped white.

**Logline:** Smudge unleashes an eraser army to wipe the Last Page clean, and the team rallies every friend from both seasons.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: eraser horizon | 12 | 1 | CS4[epic/single-shot/anamorphic/the-crimson-ballet] |
| 2 | Rally: the robot, Static, the whale, the mole return | 75 | 3 (30+30+15) | SDi wide heroic |
| 3 | Gag: the ink-mole leads the charge | 20 | 1 | SDi locked-off |
| 4 | Battle wave 1 | 90 | 3 (30+30+30) | CS4[action/chaotic/anamorphic] refs ×6; boundaries on robot stomp (30s) and whale dive (60s) |
| 5 | Bolt and Nova tag-team | 90 | 3 (30+30+30) | CS4[action/dynamic]; boundary on staff-scarf swing |
| 6 | Pip's giant drawn shield | 75 | 3 (30+30+15) | SDi wide, amber |
| 7 | Hero moment: all rims flare together | 15 | 1 | CS4[epic/single-shot] |
| 8 | Erasers retreat; Smudge alone | 75 | 3 (30+30+15) | SDi wide |
| 9 | Cliffhanger: Smudge opens the Author's door | 15 | 1 | SDi close |

**Stitch plan:** 467s → **19 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 90s → 30+30+30; #5 90s → 30+30+30; #6 75s → 30+30+15; #8 75s → 30+30+15. Boundaries on stomp and dive; hard cuts 6→7, 8→9.

**Cinematography:** Epic wides 16mm; crimson sky; all four accent colors.

**Characters:** Full cast plus all guests · **Music/SFX:** Full orchestra with all motifs; eraser squeaks, stomps.

**Thumbnail:** Team front line vs a horizon of erasers. Text: "LAST STAND".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Eraser horizon hook (15s) · (b) Mole charge gag (20s) · (c) Rims flare hero moment (20s)

#### L29 · The Author's Room
**Alt title:** The Unfinished Notes · **Tag:** S3·E09 · **Runtime:** ~7:58 (455s generated + 23s ident/outro)

**Hook (0–5s):** A giant empty desk lamp switches on by itself. Dust falls through its light onto our tiny heroes.

**Logline:** Inside the Author's abandoned study, the team and Smudge find the unfinished notes that decide the ending, and it isn't written yet.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: lamp switches on | 10 | 1 | SDi low wide, dust |
| 2 | Exploring the giant desk | 75 | 3 (30+30+15) | SDi tracking, macro world |
| 3 | Gag: Brick stuck in a paperclip | 20 | 1 | SDi locked-off |
| 4 | Finding Smudge at the notebook | 75 | 3 (30+30+15) | SDi wide tension |
| 5 | Confrontation, words not fists | 75 | 3 (30+30+15) | SDi 2-shot, crimson and cyan |
| 6 | Smudge attacks in despair | 90 | 3 (30+30+30) | CS4[action/dynamic/anamorphic/the-crimson-ballet]; boundary on inkwell spill |
| 7 | Bolt stops fighting and offers the Nib | 75 | 3 (30+30+15) | SDi close |
| 8 | The notes: 'Ending: ???' | 20 | 1 | SDi macro |
| 9 | Cliffhanger: everyone reaches for the Nib | 15 | 1 | SDi overhead |

**Stitch plan:** 455s → **19 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 75s → 30+30+15; #5 75s → 30+30+15; #6 90s → 30+30+30; #7 75s → 30+30+15. Hard cuts: 5→6, 7→8.

**Cinematography:** Macro scale, warm tungsten lamp; halation.

**Characters:** Full cast, Smudge · **Music/SFX:** Minimal piano into tension; dust, lamp buzz, ink slosh.

**Thumbnail:** Tiny heroes under a massive lamp. Text: "THE AUTHOR".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Lamp hook (15s) · (b) Paperclip gag (20s) · (c) Words not fists (30s)

#### L30 · The Last Page
**Alt title:** Series Finale: We Draw Now · **Tag:** S3·E10 · **Runtime:** ~9:00 (517s generated + 23s ident/outro)

**Hook (0–5s):** Five hands (including Smudge's) hold the Nib together. The first line glows.

**Logline:** The team and Smudge write the ending together, a new world where no one is erased, at the cost of the Nib itself.

| # | Scene | Sec | Gens (split) | Model · camera / controls |
|---|---|---|---|---|
| 1 | Cold open: five hands on the Nib | 12 | 1 | CS4[drama/single-shot/warm-vintage/a-dream-in-color] |
| 2 | The erasure accelerates; the page fades | 75 | 3 (30+30+15) | SDi wide, whitening edges |
| 3 | Gag: arguing about the first line | 20 | 1 | SDi locked-off |
| 4 | Drawing the new world together | 90 | 3 (30+30+30) | CS4[epic/calm/anamorphic/a-dream-in-color]; boundary on horizon line completion |
| 5 | Last attack: Smudge's crown resists | 90 | 3 (30+30+30) | CS4[action/dynamic]; boundary on crown crack |
| 6 | Smudge breaks his crown | 20 | 1 | SDi close, crimson softens to warm |
| 7 | The Nib burns out | 75 | 3 (30+30+15) | SDi macro |
| 8 | New world: every character from the series | 45 | 2 (30+15) | SDt vista |
| 9 | Farewell and hope | 75 | 3 (30+30+15) | SDi calm |
| 10 | Post-credits: a new margin, a new ink drop | 15 | 1 | SDi macro |

**Stitch plan:** 517s → **21 generations** (≤30s each). Seamless multi-segment scenes: #2 75s → 30+30+15; #4 90s → 30+30+30; #5 90s → 30+30+30; #7 75s → 30+30+15; #8 45s → 30+15; #9 75s → 30+30+15. Hard cuts: 5→6, 7→8.

**Cinematography:** Full palette bloom; warm-vintage; golden hour.

**Characters:** Full cast, Smudge, all guests · **Music/SFX:** All motifs resolve; choir; final ink drip.

**Thumbnail:** Five figures on a glowing new horizon. Text: "WE DRAW NOW".

**Vertical cut-downs (native 9:16 regenerations from the same keyframe prompts):** (a) Five hands hook (15s) · (b) Crown break (20s) · (c) Post-credits drop (loop 15s)

---

## Part B: Short-Form Vertical (S01–S30, 9:16)

All shorts are **native 9:16** (SOUL 9:16 keyframes → SDi 9:16). Whether Cinema Studio 4.0 supports 9:16 in the app integration is unverified **[U]**, so every CS4 beat names an SDi fallback. Burned-in captions (Inter, lower-middle, above the UI safe zone). Card beats are Remotion-only (0 gens). Entries over 180s exceed the YouTube Shorts 3-min cap **[U: cap per Oct-2024 change]** and are routed to TikTok/Reels or posted to YouTube as vertical long-form.

#### S01 · Do Not Press (Gag)
**Runtime:** 1:08 (68s) · **Hook:** Pip alone with a giant red button labeled DO NOT PRESS. His finger hovers.

**Beats:** 0–10s Pip discovers the button · 10–30s Temptation: he circles it, whistles · 30–40s Brick walks in and presses it without looking · 40–60s Chain reaction: alarms, confetti, a trapdoor · 60–68s Pip, alone again, a new button appears

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off 9:16 wide, button bottom third, Pip centered; snap-zoom (Remotion) on Pip's eyes. SDi all beats, bubblegum-boulevard grade via prompt.

**On-screen text:** "DO NOT PRESS" → "he pressed it" · **Ending/loop:** Loop: the final new button matches the opening frame (end_image_url = opening keyframe). · **Cover text:** DON'T.

#### S02 · Brick vs. One Spider (Gag)
**Runtime:** 1:05 (65s) · **Hook:** Brick, three times normal size, standing on a chair screaming at a spider the size of a coin.

**Beats:** 0–8s Brick on the chair, frozen · 8–23s Nova calmly offers a cup · 23–38s Spider jumps; Brick jumps higher onto the ceiling · 38–53s Pip befriends the spider; it wears goggles · 53–65s Brick peeks down, waves, the spider waves back

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Low-angle vertical for Brick's size vs a macro insert for the spider. SDi; lime rim flickers with fear.

**On-screen text:** "the strongest one" / "..." · **Ending/loop:** Ends on a wave. Hard cut to Brick back on the chair (loop). · **Cover text:** HE'S SCARED

#### S03 · Nova's One-Staff Warmup (Fight)
**Runtime:** 1:15 (75s) · **Hook:** Nova flicks her staff and ten grey ink dummies explode into sparks, and she hasn't turned around yet.

**Beats:** 0–8s Standoff: back turned to 10 dummies · 8–38s Exchange: spins through the ring of dummies · 38–53s Reversal: a dummy grabs the staff · 53–63s Finisher: slow-mo backflip strike · 63–75s Nova sips tea; one dummy wobbles and falls

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Vertical orbit (CS4 action/dynamic, anamorphic; aspect 9:16 [U]; fallback SDi 9:16). Staff trails magenta; boundary on the grab.

**On-screen text:** "warmup" (one word, top) · **Ending/loop:** The tea sip matches the opening pose, a seamless loop. · **Cover text:** WARMUP

#### S04 · The Scarf Has Opinions (Gag)
**Runtime:** 1:03 (63s) · **Hook:** Bolt's scarf slaps him in the face.

**Beats:** 0–10s Bolt strikes a hero pose; the scarf droops · 10–25s Scarf points toward snacks; Bolt refuses · 25–45s Scarf drags him across a rooftop · 45–55s Scarf saves him from a fall, smug · 55–63s Bolt hugs the scarf; it slaps him again

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical rooftop, sunset. Scarf leads the frame, cyan trails.

**On-screen text:** "his scarf is alive?" · **Ending/loop:** The slap mirrors the opening slap (loop). · **Cover text:** IT'S ALIVE

#### S05 · Elevator Standoff (Fight)
**Runtime:** 1:00 (60s) · **Hook:** Elevator doors open on Nova. Twelve goons inside. Doors close.

**Beats:** 0–6s Doors open, 12 goons stare · 6–26s Doors close: muffled chaos (exterior shot, lights flicker) · 26–36s Ding: doors open on floor 2, all goons down, Nova fixing her topknot · 36–44s Bolt steps in: 'Going up?' · 44–60s Doors close; muffled chaos again

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off symmetrical vertical frame on elevator doors (comedy grammar). SDi; no fight shown, it's all implied.

**On-screen text:** floor numbers "1 → 2" · **Ending/loop:** Doors closing = opening frame (loop). · **Cover text:** GOING UP?

#### S06 · Pip's Snack Drone (Gag)
**Runtime:** 1:00 (60s) · **Hook:** A tiny drone carries a sandwich through a war zone of flying food.

**Beats:** 0–10s Pip launches the drone · 10–30s Brick and Bolt race for it · 30–45s Drone dodges, loops, crashes into Nova · 45–55s Nova eats the sandwich · 55–60s Pip launches drone #2

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical tracking along the drone's path, amber light trail.

**On-screen text:** "delivery for Brick" · **Ending/loop:** Drone #2 launches = opening. · **Cover text:** DELIVERY

#### S07 · Smudge Tries Stand-Up (Gag)
**Runtime:** 1:15 (75s) · **Hook:** Smudge at a mic under a spotlight: "So... erasers, am I right?" Crickets.

**Beats:** 0–15s Joke 1 bombs · 15–30s Joke 2: he ink-splats the front row · 30–45s A heckler: Brick laughing too loud · 45–60s Smudge warms to the laugh, tries again · 60–75s Tomato (paper) to the face

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off vertical stage shot, crimson spotlight, SDi; static-noon deadpan grade.

**On-screen text:** "villain open mic night" · **Ending/loop:** Tomato splat → cut to crickets (loop). · **Cover text:** OPEN MIC

#### S08 · Rooftop Parkour Race: Bolt vs. Nova (Fight)
**Runtime:** 1:30 (90s) · **Hook:** Two light trails, cyan and magenta, rip across a neon skyline.

**Beats:** 0–6s Countdown on a ledge · 6–36s Race leg 1 over rooftops · 36–66s Race leg 2 down a billboard · 66–80s Photo finish: Brick is already there eating · 80–90s Rematch pose

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** CS4 action/dynamic, neon-rain-at-midnight, vertical side-tracking [U 9:16]; fallback SDi. Boundary on leg-1 leap apex.

**On-screen text:** "who's faster?" + poll sticker · **Ending/loop:** Rematch countdown = opening. · **Cover text:** WHO WINS?

#### S09 · Teaser: The Door Between Pages (Teaser)
**Runtime:** 1:00 (60s) · **Hook:** A door of light is drawn in the air. Something crimson knocks from the other side.

**Beats:** 0–10s Nib shard glow · 10–25s Door drawn · 25–45s Montage-in-motion of S1 set-pieces · 45–55s Smudge's hand through the door · 55–60s Card: 'Friday'

**Stitch plan:** 5 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical; pull from L10 keyframes in 9:16 variants.

**On-screen text:** "S1 FINALE · FRIDAY" · **Ending/loop:** Hard cut to black, no loop (drives to the Premiere). · **Cover text:** FRIDAY

#### S10 · Brick Learns to Whisper (Gag)
**Runtime:** 1:00 (60s) · **Hook:** Brick whispers so loudly the windows shatter.

**Beats:** 0–10s Library setting, Pip shushes · 10–25s Whisper attempt 1: shelves rattle · 25–40s Attempt 2: windows shatter · 40–50s Attempt 3: silent; everyone leans in · 50–60s A tiny squeak; a book falls on Pip

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off vertical library; SDi; paper-cream grade.

**On-screen text:** "shh" · **Ending/loop:** Pip's shush repeats (loop). · **Cover text:** SHHH

#### S11 · The Longest Staircase (Gag)
**Runtime:** 1:00 (60s) · **Hook:** Bolt sprints up a spiral staircase. We pull back. And back. And back.

**Beats:** 0–15s Sprinting up · 15–30s Pull-back reveals infinite stairs · 30–40s Pip passes him in an elevator · 40–60s Bolt reaches top: it's the bottom

**Stitch plan:** 4 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical pull-back continuous; top = bottom for a seamless loop.

**On-screen text:** "almost there" · **Ending/loop:** True seamless loop: final frame = first frame. · **Cover text:** ALMOST

#### S12 · 1 vs. 20 Grey Inklings (Fight)
**Runtime:** 2:00 (120s) · **Hook:** Twenty grey ink figures circle Bolt in an arena. He cracks his neck.

**Beats:** 0–10s Circle standoff · 10–40s Wave 1: five attackers · 40–70s Wave 2: ten attackers, scarf-whip combos · 70–90s Reversal: pinned under a pile · 90–105s Pile explodes into sparks; hero landing · 105–120s Last grey Inkling offers a handshake

**Stitch plan:** 6 sections → **6 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** CS4 action/chaotic, the-crimson-ballet, overhead-to-low; boundaries on dodge apexes. Vertical fallback SDi.

**On-screen text:** "1 vs 20" · **Ending/loop:** Handshake → the circle re-forms (loop). · **Cover text:** 1 VS 20

#### S13 · Pip Explains the Plan (Badly) (Gag)
**Runtime:** 1:15 (75s) · **Hook:** Pip at a whiteboard covered in scribbles: "Simple!"

**Beats:** 0–15s Pip's diagram, frantic · 15–25s Bolt nods, clearly lost · 25–55s Plan in action: every step goes wrong · 55–65s It works anyway · 65–75s Pip: 'Exactly as planned'

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi; whiteboard locked-off, then vertical action. Remotion doodle overlay.

**On-screen text:** "the plan:" / "the reality:" · **Ending/loop:** Back to the whiteboard (loop). · **Cover text:** THE PLAN

#### S14 · Nova Meditates; Everything Explodes (Gag)
**Runtime:** 1:00 (60s) · **Hook:** Nova meditates, perfectly still. Behind her, a building explodes.

**Beats:** 0–10s Stillness · 10–35s Chaos behind: Bolt and Brick fighting a robot · 35–50s Debris flies; Nova tilts her head, dodges without looking · 50–60s Silence; one eye opens

**Stitch plan:** 4 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off vertical; foreground calm, background chaos. SDi (background action) with static camera.

**On-screen text:** "inner peace" · **Ending/loop:** Eye closes = opening. · **Cover text:** PEACE

#### S15 · Smudge's Evil Morning Routine (Gag)
**Runtime:** 1:20 (80s) · **Hook:** An alarm clock screams. Smudge rises from an ink puddle, stretching.

**Beats:** 0–10s Alarm and rise · 10–25s Crown polishing · 25–40s Evil breakfast (ink cereal) · 40–60s Monologue rehearsal to a mirror · 60–70s Trips on his own ink puddle · 70–80s Back to bed

**Stitch plan:** 6 sections → **6 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical interior, crimson practicals; Dutch angles.

**On-screen text:** "villain morning routine" · **Ending/loop:** Alarm again (loop). · **Cover text:** 5AM VILLAIN

#### S16 · Train Roof Duel (Full Fight) (Fight)
**Runtime:** 2:10 (130s) · **Hook:** A train roof, a crimson sunset, Nova vs. Static.

**Beats:** 0–8s Standoff · 8–38s Exchange A · 38–50s Tunnel duck · 50–80s Exchange B in strobe · 80–100s Reversal at the edge · 100–110s Hero moment slow-mo · 110–130s Aftermath: truce

**Stitch plan:** 7 sections → **7 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** CS4 action/dynamic, highway-standoff, vertical tracking [U 9:16]; boundaries on binds.

**On-screen text:** "full fight" · **Ending/loop:** Train enters a new tunnel: dark to the opening frame. · **Cover text:** FULL FIGHT

#### S17 · Teaser: Rift City (Teaser)
**Runtime:** 1:00 (60s) · **Hook:** Neon rain. A billboard of Pip. "Where's Pip?"

**Beats:** 0–10s Rain alley rim lights · 10–25s City vista · 25–40s Billboard reveal · 40–55s Drone chase glimpse · 55–60s Card: 'Season 2'

**Stitch plan:** 5 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi/SDt vertical; neon-rain look.

**On-screen text:** "SEASON 2" · **Ending/loop:** Cut to black, card. · **Cover text:** SEASON 2

#### S18 · Brick's Paper Bird (Heart)
**Runtime:** 1:30 (90s) · **Hook:** Brick cups a hurt paper bird in his huge hands.

**Beats:** 0–15s Finding the bird · 15–35s Trying to fold its wing back · 35–50s Pip helps with tape · 50–60s Test flight fails · 60–80s Second flight soars · 80–90s Bird returns to perch on his head

**Stitch plan:** 6 sections → **6 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical, warm golden hour, 85mm feel close-ups.

**On-screen text:** "he tried so hard" · **Ending/loop:** Bird perches = a still hold. · **Cover text:** FLY!

#### S19 · Rock, Paper, Staff (Gag)
**Runtime:** 1:00 (60s) · **Hook:** Bolt: rock. Pip: paper. Nova: staff. Everyone looks at Nova.

**Beats:** 0–15s Round 1 · 15–30s Round 2: Brick plays 'boulder' · 30–50s Round 3: Smudge plays 'eraser', wipes the scene · 50–60s Everyone redrawn, confused

**Stitch plan:** 4 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off vertical 4-shot, SDi; static-noon.

**On-screen text:** "rock paper... staff?" · **Ending/loop:** Round 1 restarts (loop). · **Cover text:** STAFF WINS?

#### S20 · Hover-Bike Crash Replay (Gag)
**Runtime:** 1:05 (65s) · **Hook:** Instant replay graphics over Bolt's crash: "Let's see that again."

**Beats:** 0–10s The crash · 10–25s Replay 1 slow-mo · 25–40s Replay 2 from Brick's cam · 40–55s Replay 3: it gets worse · 55–65s Bolt, bandaged: 'Nailed it'

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical; sports-broadcast Remotion overlay.

**On-screen text:** "REPLAY" · **Ending/loop:** "Let's see that again" (loop). · **Cover text:** REPLAY

#### S21 · Bolt Tries Stealth (Gag)
**Runtime:** 1:10 (70s) · **Hook:** Bolt tiptoes. His scarf glows like a lighthouse.

**Beats:** 0–15s Sneaking into a vault · 15–30s Scarf lights every shadow · 30–45s Guards applaud his confidence · 45–60s Nova slips past unnoticed and takes the prize · 60–70s Bolt still sneaking

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** after-dark low key vertical; SDi; cyan scarf as the only light.

**On-screen text:** "stealth mission" · **Ending/loop:** Still sneaking = opening. · **Cover text:** STEALTH?

#### S22 · Hide and Seek (Nova Wins Forever) (Gag)
**Runtime:** 1:00 (60s) · **Hook:** Pip counts to ten. Nova is gone. We are three days later.

**Beats:** 0–10s Counting · 10–35s Search montage-in-motion · 35–50s Days pass, seasons change · 50–60s Reveal: Nova was on the ceiling the whole time

**Stitch plan:** 4 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical; time-lapse lighting shift through prompt.

**On-screen text:** "day 1 / day 3 / day 90" · **Ending/loop:** Reveal → counting again. · **Cover text:** DAY 90

#### S23 · The Bell Tower, Part 1/3 (Mini-series)
**Runtime:** 1:15 (75s) · **Hook:** A bell tower bell rings by itself at midnight. Rim lights turn to look.

**Beats:** 0–15s Bell rings; team wakes · 15–45s Climb the tower · 45–65s Something inside the bell · 65–75s Cliffhanger: bell falls

**Stitch plan:** 4 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical, moonlit fog; ends on falling-bell keyframe as end_image_url.

**On-screen text:** "Part 1/3" · **Ending/loop:** Freeze on the falling bell. "Part 2 →" · **Cover text:** PART 1

#### S24 · The Bell Tower, Part 2/3 (Mini-series)
**Runtime:** 1:30 (90s) · **Hook:** Recap in 3 seconds; the bell is still falling.

**Beats:** 0–5s Recap freeze · 5–25s Brick catches the bell · 25–50s A tiny ink-bat colony pours out · 50–80s Chase down the tower · 80–90s Cliffhanger: Pip is taken by bats

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** CS4 action/dynamic, after-dark; SDi fallback, vertical.

**On-screen text:** "Part 2/3" · **Ending/loop:** Freeze on Pip carried away. · **Cover text:** PART 2

#### S25 · The Bell Tower, Part 3/3 (Mini-series)
**Runtime:** 1:15 (75s) · **Hook:** Pip dangling upside down among bats: "...hi?"

**Beats:** 0–15s Pip with bats · 15–35s They just want the bell to stop ringing · 35–55s Team fixes the bell with a pillow · 55–70s Bats sleep; team tiptoes out · 70–75s Brick sneezes

**Stitch plan:** 5 sections → **5 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical, warm dawn light.

**On-screen text:** "Part 3/3" · **Ending/loop:** Sneeze → the bell rings (callback to Part 1, loop). · **Cover text:** PART 3

#### S26 · Nova vs. Smudge (Uncut) (Fight)
**Runtime:** 3:10 (190s) · **Hook:** A ballroom floor. A single crimson petal falls. Staff meets ink blade.

**Beats:** 0–10s Standoff · 10–40s Exchange A · 40–70s Chandelier fight · 70–100s Reversal: disarmed · 100–130s Staircase exchange · 130–145s Hero moment slow-mo · 145–165s Finisher · 165–190s Smudge escapes into ink

**Stitch plan:** 8 sections → **8 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** CS4 action/dynamic, the-crimson-ballet; vertical [U]; boundaries mapped to binds. At 190s this exceeds the 3-min Shorts cap: post to TikTok/Reels, or to YouTube as vertical long-form.

**On-screen text:** "UNCUT" · **Ending/loop:** Petal falls again (loop). · **Cover text:** UNCUT

#### S27 · Teaser: The Last Page (Teaser)
**Runtime:** 1:00 (60s) · **Hook:** A white horizon. Five rim lights walk toward it.

**Beats:** 0–15s White horizon · 15–30s Library shelves · 30–45s Eraser army glimpse · 45–55s Smudge without his crown · 55–60s Card: 'Final Season'

**Stitch plan:** 5 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi/SDt vertical, a-dream-in-color.

**On-screen text:** "FINAL SEASON" · **Ending/loop:** Card holds. · **Cover text:** FINAL SEASON

#### S28 · Pip's Gadget Tier List (Gag)
**Runtime:** 2:00 (120s) · **Hook:** Pip wheels in a tier-list board: "S-tier: me."

**Beats:** 0–10s Intro · 10–30s Gadget 1 demo: jetpack (F-tier) · 30–50s Gadget 2: snack drone (A) · 50–70s Gadget 3: grapple (fails, B) · 70–90s Gadget 4: copy-machine (banned) · 90–105s Brick votes S for Pip · 105–120s Outro

**Stitch plan:** 7 sections → **7 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** Locked-off vertical board plus SDi demo cutaways; Remotion tier graphics.

**On-screen text:** tier-list graphics · **Ending/loop:** Tier list resets (loop). · **Cover text:** TIER LIST

#### S29 · Brick Carries Pip Up a Mountain (Heart)
**Runtime:** 1:00 (60s) · **Hook:** Pip, exhausted, collapses. Brick silently lifts him onto his shoulders.

**Beats:** 0–10s Collapse · 10–20s The lift · 20–45s Long climb in snow · 45–60s Sunrise summit

**Stitch plan:** 4 sections → **4 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical, cold blue to gold.

**On-screen text:** "friends carry friends" · **Ending/loop:** Sunrise hold. · **Cover text:** I GOT YOU

#### S30 · The Lost Kite (Vertical Mini-Movie) (Mini-movie)
**Runtime:** 4:00 (240s) · **Hook:** A cyan kite tears free and flies toward a storm. Bolt runs after it.

**Beats:** 0–15s Kite escapes · 15–45s Chase across a meadow · 45–75s Into the forest: Nova's shortcut · 75–105s River crossing: Brick's bridge · 105–135s Cliff edge: Pip's grapple · 135–165s Storm: kite snagged in lightning tree · 165–180s Hero moment: scarf whip catch · 180–210s Heart: the kite was Brick's gift · 210–240s Sunset flying together

**Stitch plan:** 9 sections → **9 gens**; all single-gen beats, hard cuts between beats.

**Vertical cinematography:** SDi vertical with CS4 action/dynamic for the storm (vertical [U]). At 240s it goes to TikTok/Reels, or to YouTube as vertical long-form, since it exceeds the 3-min Shorts cap.

**On-screen text:** chapter tags "1–5" · **Ending/loop:** Final kite in sky = opening kite (loop). · **Cover text:** THE KITE

---

**Totals (checked by script):** 30 long-form = 650 generations; 30 shorts = 155 generations. At ≤30s × $0.2057/s list, the long-form season budget is ≈ $4,011 per clean pass (upper bound; final segments are shorter), ~1.6× with re-rolls.
