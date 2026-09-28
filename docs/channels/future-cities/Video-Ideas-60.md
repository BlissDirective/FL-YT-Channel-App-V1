# Tomorrowscape: 60 Video Ideas (30 long-form + 30 short-form)

> Companion to [Channel-Bible.md](./Channel-Bible.md) and [Project-Settings.json](./Project-Settings.json). Research date 2026-09-28. **[U]** = unverified.
> Every idea is **speculative worldbuilding** with a "how it could work" layer; real science is a grounding reference only (Bible §9). Numbers marked [U] are order-of-magnitude estimates to re-check in the script's source table.

**Conventions (apply to every entry):**

- **Default controls** = Bible §5.2 `TS_DEFAULT`: Cinema Studio 4.0, 720p, 16:9, genre epic · pacing calm · camera_model modern · camera_lens anamorphic · era 2020s · color_palette twilight-fable. Entries list only the controls that differ.
- **Stitching:** every section is its own clip. Sections over 30 s are split into `ceil(sec/30)` generations (greedy 30 s chunks, remainder last, never under 4 s), chained seamlessly: the last frame of segment N becomes the keyframe of N+1. Prompts describe one continuous camera move with continuous secondary motion across boundaries (Bible §5.5).
- **Hard cuts** occur only at section boundaries. Each entry lists the deliberate ones; all other boundaries use a scan-line wipe or a dip to Deep Void.
- **Totals** are generated seconds. The 5 s ident and 20 s outro are pre-rendered and reused, so they are not counted. Runtime includes them. Cost = seconds × $0.2057.
- **Shorts** are 9:16 with `pacing: dynamic`. Each beat is one clip, and beats over 30 s split by the same rule. YouTube Shorts are ≤180 s; longer masters are marked **TikTok/Reels** and come with a 180 s YouTube cut.
- **On-screen** every city beat carries the `YEAR xxxx · SPECULATIVE` tag, and captions use Bible §8 style.

**Series key:** How It Could Work (HICW) · Worlds Beyond (WB) · Citizen's Walk (CW) · Build It From Zero (BFZ) · Physics Check (PC) · Machines of Tomorrow (MT) · Shorts: Scale Shock · 60-Second City · Would You Live Here?

---

## Long-form (L01–L30)

### L01. How a Floating City Survives a Category 5 Storm
*Alt:* Meridian: The Ocean City That Refuses to Sink · **Series:** How It Could Work · **Runtime:** ~11:10 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Two hundred kilometre-per-hour winds. Twelve-metre waves. And forty thousand people asleep on the water."
- **Logline:** Meridian, a 2160 floating hex-city, is walked through the physics of buoyancy, tethers, breakwaters and flexible joints, then hit with a Category 5 storm to show which systems save it.
- **Sections:** 1) Cold open: storm wall around a calm hex city **20s** · 2) Why build on water at all **60s** · 3) Buoyancy: concrete hulls that float **90s** · 4) Tethers and the flexible joint grid **90s** · 5) The breakwater ring and wave energy **75s** · 6) Life on a platform: food, water, power **85s** · 7) Storm arrives: the stress test **120s** · 8) What breaks first **60s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 645s generated → **23 generations** (≈$132.68). 9 section clips; seamless multi-segment splits: §2 Why build on water at all (60s → 30+30); §3 Buoyancy (90s → 30+30+30); §4 Tethers and the flexible joint grid (90s → 30+30+30); §5 The breakwater ring and wave energy (75s → 30+30+15); §6 Life on a platform (85s → 30+30+25); §7 Storm arrives (120s → 30+30+30+30); §8 What breaks first (60s → 30+30); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from calm lagoon (§6) into the storm (§7) with palette flip; scan-line wipe into §3 (schematic hull cutaway); dip-to-void before the verdict.
- **Cinematography:** 24mm anamorphic aerial push over hexes; underwater 35mm glide down a taut tether; top-down locked cutaway of a hull (schematic A → living B via Seedance); eye-level boardwalk walk with teal-scarf Citizen from behind; storm: low wide on breakwater with spray, slow crane up to the eye. **Controls vs default:** §3–4: color_palette ghost-in-the-code, camera_lens clean-sharp (schematic); §6: the-morning-after-rain; §7: genre action, pacing dynamic, color_palette after-dark; rest default (twilight-fable).
- **Science grounding:** Displacement: a 1 m draft over a 100 m hex displaces ~8,000 t of seawater; hollow post-tensioned concrete hulls (as in real floating piers/bridges) carry low-rise buildings. Tethers + low centre of gravity limit heave/roll; flexible joints stop wave loads concentrating. A submerged breakwater dissipates wave energy (wave power ∝ H²·T). Grounding: OCEANIX Busan design (BIG/UN-Habitat), Dogen City ring. Tier: STRETCH.
- **Music/SFX:** Airy pads and marimba for daily life; storm: taiko-like pulses, wind roar, hull creaks, rope-tension groans; verdict returns to the motif.
- **Thumbnail:** Top-down hex city in the storm's calm eye, cyan-glowing tethers into dark water. Text: 'IT DOESN'T SINK' (SINK gold). Chip STRETCH.
- **Vertical cut-downs:** Why concrete floats (60s) · The tether trick: top-down wave test (45s) · Storm vs floating home POV (60s)

### L02. Inside a City Built in a Moon Lava Tube
*Alt:* Selene Deep: The Hidden City Under the Moon · **Series:** Worlds Beyond · **Runtime:** ~10:05 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "In 2024, radar confirmed a cave under the Moon. This is what could live inside it."
- **Logline:** From the real Mare Tranquillitatis pit to Selene Deep, a terraced city sealed inside a lava tube: radiation shielding, pressurisation, sunlight pipes and 1/6 g life.
- **Sections:** 1) Cold open: descending through the skylight pit **25s** · 2) The discovery: radar under the pit **55s** · 3) Why go underground on the Moon **70s** · 4) Sealing the tube: inflatable liners and regolith plugs **90s** · 5) Light: heliostats and light pipes **60s** · 6) Citizen's walk through the terraces **100s** · 7) Farming, water ice and air **75s** · 8) Living at one-sixth gravity **60s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 580s generated → **22 generations** (≈$119.31). 9 section clips; seamless multi-segment splits: §2 The discovery (55s → 30+25); §3 Why go underground on the Moon (70s → 30+30+10); §4 Sealing the tube (90s → 30+30+30); §5 Light (60s → 30+30); §6 Citizen's walk through the terraces (100s → 30+30+30+10); §7 Farming, water ice and air (75s → 30+30+15); §8 Living at one-sixth gravity (60s → 30+30); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from the grey real-science diagram (§2) into the living city (§6); scan-line reveal inside §4; dip-to-void before verdict.
- **Cinematography:** Vertical crane-down 24mm through the pit with hard sunlight shaft; schematic cutaway of the tube (locked, 50mm); eye-level gimbal walk along terraces with low-g bounding figures; macro of regolith bricks; slow orbit of heliostat mirrors on the rim. **Controls vs default:** §1–2, §4: color_palette static-noon, camera_lens clean-sharp; §6–7: the-emerald-ambush (farms); §8: default.
- **Science grounding:** Mini-RF radar (LRO) data show a conduit beneath a ~100 m pit (Nature Astronomy 2024). Several metres of basalt roof block most cosmic rays and micrometeorites; tube interiors hold near-stable temperatures (about -20 °C estimates [U]). Sealed via inflatable liners at 0.5–1 atm; heliostats reflect sunlight during the 14-day lunar day, with stored power for night. Tier: STRETCH.
- **Music/SFX:** Sparse sub-bass and glassy pads; footfalls muffled; light-pipe shimmer SFX; airlock hiss.
- **Thumbnail:** Lit terraced city inside a vast cave, sunlight shaft from a pit, tiny astronaut. Text: 'UNDER THE MOON'. Chip STRETCH.
- **Vertical cut-downs:** The real Moon cave in 45s · Bounding at 1/6 g (POV) · How to bring sunlight 100 m underground

### L03. How a Walking City Could Actually Work
*Alt:* Strider: 40,000 People on Eight Legs · **Series:** How It Could Work · **Runtime:** ~10:15 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Forty thousand people live on this city, and every few minutes it takes a step."
- **Logline:** Strider, a desert city on eight legs, from Archigram's 1964 sketch to real walking-machine engineering: ground pressure, gait, power, and why it walks at 2 km/h.
- **Sections:** 1) Cold open: a leg lands in the dunes **20s** · 2) 1964: the Walking City sketch **50s** · 3) Why walk? Following water and seasons **60s** · 4) Ground pressure and the giant feet **90s** · 5) Gait: always six legs down **90s** · 6) Power: solar skin and a stored-heat core **75s** · 7) A day aboard while it walks **100s** · 8) Stopping, turning, and storms **60s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 590s generated → **22 generations** (≈$121.36). 9 section clips; seamless multi-segment splits: §2 1964 (50s → 30+20); §3 Why walk? Following water and seasons (60s → 30+30); §4 Ground pressure and the giant feet (90s → 30+30+30); §5 Gait (90s → 30+30+30); §6 Power (75s → 30+30+15); §7 A day aboard while it walks (100s → 30+30+30+10); §8 Stopping, turning, and storms (60s → 30+30); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from retro 1964 flashback (§2) to photoreal (§3); scan-line wipe into gait schematic (§5); hard cut into verdict.
- **Cinematography:** Low 35mm tracking shot beside a leg as it lifts and plants (dust plume); retro 35mm-film look for 1964 drawings; side-on locked wide for gait with overlay counting legs; top-down drone following the city's trail of footprints; interior gimbal walk on decks with gentle sway. **Controls vs default:** §2: camera_model 35mm-film, camera_lens warm-vintage, era 1960s; §3–6: color_palette mirage-at-noon; §5: ghost-in-the-code for schematic A; §7: twilight-fable default.
- **Science grounding:** Ground pressure: a 500,000 t city on 6 planted feet of 40 m diameter is ~660 kPa per foot [U: rough calc, same order as heavy mining crawlers ~250–400 kPa], so feet widen or sand is compacted. Statically stable gait keeps the centre of mass inside the support polygon; hydraulics or electric winches move at ~2 km/h. Square-cube law makes legs mass-limited, hence slow, short steps. Tier: STRETCH/FRONTIER.
- **Music/SFX:** Deep rhythmic footfall thuds as tempo; low brass; wind across dunes; hydraulic sighs.
- **Thumbnail:** Low-angle eight-legged city mid-stride over dunes, tiny caravan below. Text: '8 LEGS. 40,000 PEOPLE' (40,000 gold). Chip STRETCH.
- **Vertical cut-downs:** One step of Strider in 30s (loop) · Why giant feet (ground pressure) · Archigram 1964 vs 2190

### L04. The Underground City Powered by Energy Crystals
*Alt:* Lumen Vault: Could Crystals Really Power a City? · **Series:** How It Could Work · **Runtime:** ~10:05 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Two kilometres under the rock, a city glows. The light comes from crystals that never go out."
- **Logline:** Lumen Vault, a geothermal cavern city, tests the 'energy crystal' trope against real crystalline tech: diamond betavoltaics, piezoelectric quartz, thermal salt storage and geothermal heat.
- **Sections:** 1) Cold open: descent into a glowing cavern **25s** · 2) The trope: magic energy crystals **45s** · 3) Real crystal #1: the diamond battery **80s** · 4) Real crystal #2: piezo and thermal-salt storage **75s** · 5) The real power plant: geothermal heat **80s** · 6) Building the cavern: tunnel boring and rock bolts **75s** · 7) Citizen's walk: light, air and farms underground **95s** · 8) Scaling up: how many crystals per home? **60s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 580s generated → **23 generations** (≈$119.31). 9 section clips; seamless multi-segment splits: §2 The trope (45s → 30+15); §3 Real crystal #1 (80s → 30+30+20); §4 Real crystal #2 (75s → 30+30+15); §5 The real power plant (80s → 30+30+20); §6 Building the cavern (75s → 30+30+15); §7 Citizen's walk (95s → 30+30+30+5); §8 Scaling up (60s → 30+30); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from fantasy glow (§2) to lab-clean diamond cutaway (§3); scan-line reveal at §6; palette flip to warm in §7.
- **Cinematography:** Vertical descent 24mm down a shaft into a cavern; macro 85mm crystal lattice with glow; locked schematic of betavoltaic layers; wide gimbal walk along crystal-lit terraces; slow orbit of a geothermal turbine hall. **Controls vs default:** §2: a-dream-in-color; §3–4: ghost-in-the-code, clean-sharp; §5–6: the-iron-borough; §7: the-emerald-ambush; §8: static-noon.
- **Science grounding:** The C-14 diamond battery (Bristol/UKAEA 2024) is real but microwatt-scale; to power a home (~1 kW) you'd need ~billions of cells, so it's a sensor/pacemaker technology. Piezo quartz converts pressure to tiny currents. Molten-salt/crystalline phase-change storage is grid-scale. The real power: geothermal gradient ~25–30 °C/km; at 2 km, 60–80 °C heat for district heating, deeper for electricity. Verdict: crystals as light and storage (STRETCH); crystals as the power source (FICTION).
- **Music/SFX:** Crystal hum (sine clusters), drips, low turbine drone; warm pads in the farm section.
- **Thumbnail:** Vast cavern city lit by cyan-violet crystal pillars, tiny figures on a bridge. Text: 'CRYSTAL POWER?' (CRYSTAL gold). Chip FRONTIER.
- **Vertical cut-downs:** The real 5,700-year battery · Why energy crystals don't work (Physics Check) · Underground farm tour

### L05. Teleportation Stations: Physics Says Almost
*Alt:* How a Teleport Network Could Actually Work · **Series:** Physics Check · **Runtime:** ~10:00 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Step into the gate in London. Step out in Tokyo. Physics allows half of that."
- **Logline:** Waystation, a speculative teleport hub, is tested against quantum teleportation, the no-cloning theorem, data rates and energy, then redesigned as something that could actually work.
- **Sections:** 1) Cold open: a gate charges and fires **20s** · 2) What teleportation means in physics **60s** · 3) Oxford 2025: teleporting logic gates **70s** · 4) Problem 1: scanning a human (the data) **80s** · 5) Problem 2: no-cloning and the 'copy' paradox **75s** · 6) Problem 3: energy of rebuilding matter **60s** · 7) The plausible version: telepresence + hyperloop **90s** · 8) Touring the Waystation hub **75s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 575s generated → **22 generations** (≈$118.28). 9 section clips; seamless multi-segment splits: §2 What teleportation means in physics (60s → 30+30); §3 Oxford 2025 (70s → 30+30+10); §4 Problem 1 (80s → 30+30+20); §5 Problem 2 (75s → 30+30+15); §6 Problem 3 (60s → 30+30); §7 The plausible version (90s → 30+30+30); §8 Touring the Waystation hub (75s → 30+30+15); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from glossy gate (§1) to schematic void (§2); hard cut into the redesign (§7) with warm palette; verdict locked shot.
- **Cinematography:** Symmetrical 24mm push toward a ring gate with charging light; schematic ion-trap macro; top-down data-stream visual (cyan particles); wide atrium orbit of Waystation hub; gimbal walk behind Citizen to a capsule platform. **Controls vs default:** §1: pacing single-shot, a-dream-in-color; §2–6: ghost-in-the-code, clean-sharp; §7–8: the-morning-after-rain; §9: default.
- **Science grounding:** Quantum teleportation transfers a quantum state using entanglement plus a classical signal (no faster-than-light); Oxford (Nature, 2025) teleported gates between trapped-ion modules. A human has ~7×10^27 atoms; even a coarse description is ~10^28+ bits [U: order of magnitude], impossible to store or send. No-cloning means a 'copy' must destroy the original. E=mc² rebuilding energy is astronomical. Plausible alternative: a hyperloop-plus-VR 'Waystation'. Tier: matter teleport FICTION; info teleport PROVEN.
- **Music/SFX:** Rising charge whine then silence then air-pop; glitchy granular textures in the data section; hopeful synth in the redesign.
- **Thumbnail:** Person-shaped silhouette dissolving into cyan particles inside a ring gate. Text: 'ALMOST POSSIBLE' (ALMOST gold). Chip FICTION/PROVEN split.
- **Vertical cut-downs:** Why a teleporter would kill you (no-cloning) · How much data is a human? · The Waystation you could actually build

### L06. Could You Live Inside an O'Neill Cylinder?
*Alt:* Axis Ring: A World That Spins in Space · **Series:** Worlds Beyond · **Runtime:** ~9:45 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "The ground curves up behind you and becomes the sky. You're standing inside a spinning world."
- **Logline:** Inside Axis Ring, a 6.4 km-diameter rotating habitat, based on O'Neill's Island Three and the 1975 NASA study: spin gravity, mirrors, weather, and what a Sunday looks like.
- **Sections:** 1) Cold open: looking up at land overhead **20s** · 2) 1975: NASA's summer of space colonies **55s** · 3) Spin gravity: how fast it turns **75s** · 4) Mirrors, windows and day-night **75s** · 5) Shielding and structure **70s** · 6) Citizen's walk: a Sunday in the valley **110s** · 7) Weather inside a cylinder **60s** · 8) Coriolis: why balls curve **50s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 560s generated → **22 generations** (≈$115.19). 9 section clips; seamless multi-segment splits: §2 1975 (55s → 30+25); §3 Spin gravity (75s → 30+30+15); §4 Mirrors, windows and day-night (75s → 30+30+15); §5 Shielding and structure (70s → 30+30+10); §6 Citizen's walk (110s → 30+30+30+20); §7 Weather inside a cylinder (60s → 30+30); §8 Coriolis (50s → 30+20); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Retro-to-photoreal hard cut after §2; scan-line reveal at §3; hard cut into verdict.
- **Cinematography:** Upward-looking 24mm tilt revealing land overhead; exterior slow orbit 24mm clean-sharp of counter-rotating pair; schematic spin vectors overlay; eye-level walk through green valley with cyclists from behind; ball-throw locked shot showing curve. **Controls vs default:** §2: 35mm-film, warm-vintage, era 1960s; §3–5: static-noon, clean-sharp (exterior); §6–7: the-morning-after-rain; §8: default.
- **Science grounding:** For 1 g at radius r: ω = √(g/r); r = 3.2 km → ~0.53 rpm (one turn ~1.9 min), comfortable (<2 rpm). Counter-rotating pair cancels gyroscopic torque. Mirrors reflect sunlight through window strips; shielding needs ~several t/m² of mass (e.g. slag). Coriolis deflection is small but visible on long throws. Sources: O'Neill (1976), NASA SP-413. Tier: STRETCH.
- **Music/SFX:** Pastoral strings and felt piano inside; exterior silence with low hum; birdsong.
- **Thumbnail:** Inside a cylinder: fields and lakes curving overhead, a tiny cyclist. Text: 'THE SKY IS LAND' (LAND gold). Chip STRETCH.
- **Vertical cut-downs:** How fast it spins for 1 g · Why your ball curves · Sunrise by mirror (loop)

### L07. A City 3 Kilometres Under the Ocean
*Alt:* Abyssal Spiral: The Deep-Sea Megacity · **Series:** How It Could Work · **Runtime:** ~8:35 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "At this depth, the ocean pushes on every square metre with the weight of three hundred cars."
- **Logline:** Abyssal Spiral, inspired by Shimizu's Ocean Spiral concept: a 500 m buoyant sphere city linked by a helix to the seafloor, powered by ocean thermal energy.
- **Sections:** 1) Cold open: descending past the sphere **25s** · 2) Pressure: why depth is brutal **65s** · 3) Why a sphere floats near the surface **75s** · 4) The spiral: a 4 km helix to the seafloor **85s** · 5) Power from temperature: OTEC **75s** · 6) Food and water from the deep **65s** · 7) Evacuation and storms **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 490s generated → **20 generations** (≈$100.79). 8 section clips; seamless multi-segment splits: §2 Pressure (65s → 30+30+5); §3 Why a sphere floats near the surface (75s → 30+30+15); §4 The spiral (85s → 30+30+25); §5 Power from temperature (75s → 30+30+15); §6 Food and water from the deep (65s → 30+30+5); §7 Evacuation and storms (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut at §2 to schematic pressure diagram; scan-line wipe into §4; dip-to-void into verdict.
- **Cinematography:** Slow descent 24mm through light falloff (turquoise → black); locked schematic sphere cutaway; gliding 35mm along the helix with bioluminescent accents; macro of pressure-hull window; wide of OTEC plant pipes. **Controls vs default:** §1, §3: turquoise-mirage; §2, §4: ghost-in-the-code/clean-sharp for schematic, after-dark for photoreal deep; §5–6: after-dark; §7: genre drama.
- **Science grounding:** Pressure rises ~1 atm per 10 m: at 3,000 m, ~300 atm (~30 MPa). Shimizu's concept keeps the habitable sphere near the surface (buoyant, ballast-adjusted) and descends only for resources. OTEC uses a ~20 °C difference between surface and deep water; efficiency ~3%, needs huge flows. Tier: STRETCH.
- **Music/SFX:** Low drones, sonar pings, whale-like swells, hull creaks.
- **Thumbnail:** Glowing sphere city in blue water with a helix vanishing into black. Text: '3 KM DOWN'. Chip STRETCH.
- **Vertical cut-downs:** 300 cars on every square metre (pressure) · OTEC: power from cold water · Descent: 0 to 3,000 m in 60s

### L08. Cloud City Above Venus: NASA's Wildest Plan
*Alt:* Living 50 km Above the Hottest Planet · **Series:** Worlds Beyond · **Runtime:** ~8:45 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "On the surface, it's 460 degrees. Fifty kilometres up, the air pressure is just like home."
- **Logline:** Based on NASA's HAVOC study: a floating aerostat city in Venus's clouds, where breathable air is a lifting gas and sulphuric acid is the enemy.
- **Sections:** 1) Cold open: city above a sea of clouds **20s** · 2) Venus: the surface is hell **55s** · 3) The 50 km sweet spot **65s** · 4) Why breathable air floats on Venus **75s** · 5) Building an aerostat city **80s** · 6) Acid, wind and 4-day super-rotation **70s** · 7) Citizen's walk on the gondola decks **90s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 500s generated → **20 generations** (≈$102.85). 8 section clips; seamless multi-segment splits: §2 Venus (55s → 30+25); §3 The 50 km sweet spot (65s → 30+30+5); §4 Why breathable air floats on Venus (75s → 30+30+15); §5 Building an aerostat city (80s → 30+30+20); §6 Acid, wind and 4-day super-rotation (70s → 30+30+10); §7 Citizen's walk on the gondola decks (90s → 30+30+30); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from surface hellscape (§2) to cloud tops (§3); scan-line at §4; verdict locked.
- **Cinematography:** Wide 24mm glide over golden cloud tops with a huge envelope city; surface: low, heat-shimmer, dim orange; schematic buoyancy diagram; gimbal walk along glass gondola deck; slow orbit of envelope with acid-proof coating sheen. **Controls vs default:** §2: genre drama, color_palette industrial-fog; §3–5: mirage-at-noon; §4: ghost-in-the-code; §7: twilight-fable.
- **Science grounding:** Venus's CO₂ atmosphere (molar mass 44) is denser than N₂/O₂ air (29), so a breathable-air envelope lifts ~0.5 kg per m³ at 1 atm [U: approx]. HAVOC (NASA Langley) proposed staged airship missions at ~50 km (~1 atm, ~75 °C). Clouds contain sulphuric acid, requiring PTFE-type coatings; winds super-rotate the planet in ~4 days. Tier: STRETCH.
- **Music/SFX:** Warm, hazy synth pads; distant wind; fabric flutter; soft ship-bell motif.
- **Thumbnail:** Golden envelope city above orange clouds. Text: 'FLOATING ON VENUS' (VENUS gold). Chip STRETCH.
- **Vertical cut-downs:** Why air floats on Venus · Surface vs 50 km (split) · 4-day wind ride timelapse

### L09. An Arcology for 1 Million People in One Structure
*Alt:* The Tower-Forest: A Whole City Under One Roof · **Series:** How It Could Work · **Runtime:** ~9:50 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "One million people. One building. And you could walk from home to work without seeing a car."
- **Logline:** A 1.2 km arcology 'tower-forest': structure, vertical transit, heat, water, food, and the social physics of one million neighbours.
- **Sections:** 1) Cold open: reveal from cloud layer **20s** · 2) What is an arcology? **50s** · 3) Structure: a mega-frame of linked towers **85s** · 4) Vertical transit: ropeless lifts and sky lobbies **80s** · 5) Heat, air and water **75s** · 6) Food: vertical farm floors **60s** · 7) Citizen's walk: a commute that's all indoors **90s** · 8) The failure modes: fire and evacuation **60s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 565s generated → **21 generations** (≈$116.22). 9 section clips; seamless multi-segment splits: §2 What is an arcology? (50s → 30+20); §3 Structure (85s → 30+30+25); §4 Vertical transit (80s → 30+30+20); §5 Heat, air and water (75s → 30+30+15); §6 Food (60s → 30+30); §7 Citizen's walk (90s → 30+30+30); §8 The failure modes (60s → 30+30); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line reveal at §3; hard cut into §8 (fire drill, drama); verdict locked.
- **Cinematography:** 24mm push through clouds to reveal linked spires; lateral 35mm truck with scale ghost Burj Khalifa; schematic megaframe cutaway; vertical crane following a ropeless lift; interior atrium walk with trees. **Controls vs default:** §3: ghost-in-the-code; §5: static-noon; §6–7: the-emerald-ambush; §8: genre drama, industrial-fog.
- **Science grounding:** A megaframe (braced exoskeleton) spreads loads; for comparison Jeddah Tower targets ~1 km. Ropeless maglev lifts (e.g. thyssenkrupp MULTI prototype) move cabins sideways and share shafts. 1M people ≈ 1–2 GW of heat to reject; stack-effect ventilation plus heat pumps. Paolo Soleri coined 'arcology' (1969). Tier: STRETCH.
- **Music/SFX:** Pulsing minimalism; crowd murmur; lift whoosh; fire alarm tone in §8 (brief).
- **Thumbnail:** Forest of linked kilometre spires above clouds. Text: '1 MILLION. 1 BUILDING'. Chip STRETCH.
- **Vertical cut-downs:** Ropeless sideways lifts · How many Burjs is this? · Indoor commute POV

### L10. The Rolling City That Outruns the Sunrise
*Alt:* Terminus: A City on Rails Around Mercury · **Series:** Worlds Beyond · **Runtime:** ~8:35 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "If this city ever stops moving, the sunrise will kill everyone in it."
- **Logline:** A city on rails circling Mercury, rolling at walking pace to stay in the habitable twilight band, inspired by hard-sci-fi and thermal-expansion physics.
- **Sections:** 1) Cold open: the city rolls ahead of dawn **20s** · 2) Mercury: 430 °C by day, -180 °C by night **60s** · 3) The twilight band and its speed **65s** · 4) Rails that the sun pushes **80s** · 5) Power from the dayside **65s** · 6) Citizen's walk: life inside the moving city **95s** · 7) What if it breaks down? **60s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 490s generated → **20 generations** (≈$100.79). 8 section clips; seamless multi-segment splits: §2 Mercury (60s → 30+30); §3 The twilight band and its speed (65s → 30+30+5); §4 Rails that the sun pushes (80s → 30+30+20); §5 Power from the dayside (65s → 30+30+5); §6 Citizen's walk (95s → 30+30+30+5); §7 What if it breaks down? (60s → 30+30); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut dayside heat (§2); scan-line into rail schematic (§4); dip-to-void into verdict.
- **Cinematography:** Low 35mm track alongside wheel bogies on rails with a blazing horizon behind; wide 24mm from ahead showing the city dome and the dawn line; schematic thermal expansion overlay; interior walk down a promenade with a window on the terminator. **Controls vs default:** §1–3: static-noon, clean-sharp; §4: ghost-in-the-code; §6: twilight-fable; §7: genre drama, after-dark.
- **Science grounding:** Mercury's slow rotation (a solar day ≈176 Earth days) means the terminator moves ~3–4 km/h at the equator [U: approx]. The idea: rails expand on the hot side, pushing the city west. Solar power is abundant (~7× Earth's flux). Popularised in Kim Stanley Robinson's '2312' (named editorially only). Tier: STRETCH.
- **Music/SFX:** Rhythmic rail clacks as tempo; heat hiss; warm-cold dual pads.
- **Thumbnail:** Domed city on rails with a searing sunrise line behind. Text: 'NEVER STOP'. Chip STRETCH.
- **Vertical cut-downs:** How fast is sunrise on Mercury? · The rails the sun pushes · Breakdown: 60 seconds to dawn

### L11. Building a Sky City From Zero
*Alt:* Cloud Nine: The Floating Sphere City · **Series:** Build It From Zero · **Runtime:** ~9:20 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "A sphere a mile wide, floating because the sun warms the air inside it. Let's build one."
- **Logline:** Step by step, from Buckminster Fuller's 1960s 'Cloud Nine' idea to a sun-heated geodesic sky city: frame, envelope, lift budget, lift-off and life aloft.
- **Sections:** 1) Cold open: sphere lifts off a lake **20s** · 2) The idea: bigger spheres float easier **60s** · 3) Step 1: the geodesic frame **75s** · 4) Step 2: skin and solar heating **70s** · 5) Step 3: the lift budget **60s** · 6) Step 4: lift-off **60s** · 7) Step 5: life aloft and docking **90s** · 8) What breaks it: wind and lightning **55s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 535s generated → **20 generations** (≈$110.05). 9 section clips; seamless multi-segment splits: §2 The idea (60s → 30+30); §3 Step 1 (75s → 30+30+15); §4 Step 2 (70s → 30+30+10); §5 Step 3 (60s → 30+30); §6 Step 4 (60s → 30+30); §7 Step 5 (90s → 30+30+30); §8 What breaks it (55s → 30+25); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut per build step boundary (§3 → §4 → §5 → §6); stage stills chained with Seedance end_image_url; verdict locked.
- **Cinematography:** Locked 35mm timelapse of frame assembly (same camera every step); drone orbit 24mm at lift-off; interior walk on suspended decks; schematic square-cube overlay; storm wide from below. **Controls vs default:** §1–2: default; §3–5: pacing single-shot (timelapse), static-noon; §6: genre epic, anamorphic; §8: genre action, pacing dynamic, after-dark.
- **Science grounding:** Square-cube law: frame mass grows with r² while enclosed air grows with r³, so very large spheres have tiny structure-to-air ratios. Solar heating of ~1 °C across a 1.6 km sphere gives meaningful lift [U: Fuller's claim]. Lift of hot air vs ambient ~3–4 g/m³ per °C. Tier: FRONTIER.
- **Music/SFX:** Build montage: ticking percussion; lift-off: swelling brass; wind in the frame.
- **Thumbnail:** Mile-wide geodesic sphere floating above clouds, tiny houses on its skin. Text: 'IT FLOATS ON SUNLIGHT'. Chip FRONTIER.
- **Vertical cut-downs:** Square-cube law in 45s · Lift-off timelapse · Would you live in the sphere?

### L12. 24 Hours in a Solarpunk City of 2150
*Alt:* Verdance: One Day in a City That Grows · **Series:** Citizen's Walk · **Runtime:** ~9:25 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "It's 6 a.m. in 2150. The city is quiet, except for the sound of the trees drinking the rain."
- **Logline:** A dawn-to-night POV tour through Verdance, a solarpunk city, where every beautiful detail is paired with the technology that makes it work.
- **Sections:** 1) Dawn: rain gardens drinking **40s** · 2) Morning commute by tram and bike **70s** · 3) The market of rooftop farms **70s** · 4) Midday: the solar canopy **60s** · 5) The water loop: rain to tap to river **70s** · 6) Afternoon: the timber towers **65s** · 7) Evening: the city switches to storage **65s** · 8) Night: dark skies and fireflies **55s** · 9) What's real today **45s**
- **Stitch plan:** 540s generated → **23 generations** (≈$111.08). 9 section clips; seamless multi-segment splits: §1 Dawn (40s → 30+10); §2 Morning commute by tram and bike (70s → 30+30+10); §3 The market of rooftop farms (70s → 30+30+10); §4 Midday (60s → 30+30); §5 The water loop (70s → 30+30+10); §6 Afternoon (65s → 30+30+5); §7 Evening (65s → 30+30+5); §8 Night (55s → 30+25); §9 What's real today (45s → 30+15). Deliberate hard cuts: Time-of-day changes are the section boundaries (hard cuts with time stamp); scan-line overlay in §5; 'what's real' uses schematic.
- **Cinematography:** All eye-level gimbal walks behind the Citizen; 35mm; tram tracking; crane-up reveal over timber towers; locked dusk shot of lights switching to storage; night dark-sky wide. **Controls vs default:** §1–3: the-morning-after-rain; §4–6: the-emerald-ambush; §7: twilight-fable; §8: after-dark; §9: ghost-in-the-code.
- **Science grounding:** Mass-timber (CLT) towers exist (Ascent, Milwaukee ~87 m); rain gardens and sponge-city design reduce runoff; BIPV canopies; grid batteries and thermal storage cover evening demand. Tier: PROVEN/STRETCH.
- **Music/SFX:** Birdsong, marimba, bicycle bells, gentle strings; night: crickets and soft piano.
- **Thumbnail:** Lush timber towers with gardens, a tram crossing a green bridge at golden hour. Text: 'THE CITY GROWS'. Chip PROVEN.
- **Vertical cut-downs:** 6 a.m. rain garden (loop) · Where does the rain go? · Night city with no light pollution

### L13. Could a 1 km Cyberpunk Megablock Actually Stand?
*Alt:* The Neon Megablock: Density Taken to the Limit · **Series:** Physics Check · **Runtime:** ~9:00 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Ten million people, stacked a kilometre high in the rain. Physics has some notes."
- **Logline:** The cyberpunk megablock trope, tested: structure, rain and drainage, light, air, heat and fire, followed by the redesign that could actually stand.
- **Sections:** 1) Cold open: neon canyon in the rain **20s** · 2) The trope: infinite density **45s** · 3) Density reality check (Kowloon Walled City) **70s** · 4) Load: what the bottom floors carry **75s** · 5) Light and air in the canyons **65s** · 6) Rain: where a kilometre of water goes **60s** · 7) Heat: ten million people **60s** · 8) The redesign **75s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 515s generated → **21 generations** (≈$105.94). 9 section clips; seamless multi-segment splits: §2 The trope (45s → 30+15); §3 Density reality check (Kowloon Walled City) (70s → 30+30+10); §4 Load (75s → 30+30+15); §5 Light and air in the canyons (65s → 30+30+5); §6 Rain (60s → 30+30); §7 Heat (60s → 30+30); §8 The redesign (75s → 30+30+15); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut from neon (§1) to schematic (§2); hard cut to warm redesign (§8); verdict locked.
- **Cinematography:** Low-angle 24mm tilt up neon canyons with rain; top-down density grid; schematic load arrows down columns; slow push along a wet walkway; redesigned block with light wells in daylight. **Controls vs default:** §1–2: genre noir, neon-rain-at-midnight; §3–7: ghost-in-the-code for schematics, after-dark for photoreal; §8: the-morning-after-rain.
- **Science grounding:** Kowloon Walled City reached ~1.2–1.9M people/km² [U: range]; a 1 km block needs mega-columns and outrigger systems; light in narrow canyons falls to <1% daylight; roof rain on a 1 km² block in a 50 mm/h storm is ~14 m³/s; heat from 10M people ~1 GW+. Redesign adds light wells, sky gardens and a stepped profile. Tier: STRETCH (redesign) / FICTION (original).
- **Music/SFX:** Dark synth bass, rain hiss, crowd murmur, neon buzz; redesign: optimistic pads.
- **Thumbnail:** Neon megablock in rain vs clean redesigned block (split). Text: 'IT WOULD FALL?' Chip FICTION.
- **Vertical cut-downs:** Where does the rain go? · How dense is too dense? · Neon canyon light test

### L14. A Hyperloop Across the Continent: How It Would Work
*Alt:* Machines of Tomorrow: 1,000 km/h in a Tube · **Series:** Machines of Tomorrow · **Runtime:** ~8:50 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Paris to Moscow in two hours, in a tube with almost no air."
- **Logline:** A speculative 2090 continental vacuum-tube network: capsules, pumps, maglev, curves, stations, and why the tube, not the pod, is the hard part.
- **Sections:** 1) Cold open: capsule launches down a tube **20s** · 2) Why air is the enemy at speed **55s** · 3) Pumping a 3,000 km tube **70s** · 4) Maglev and linear motors **70s** · 5) Curves: why routes must be straight **60s** · 6) Stations: the Waystation portals **70s** · 7) Riding it: g-forces and windows **60s** · 8) Safety: a breach at 1,000 km/h **55s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 505s generated → **20 generations** (≈$103.88). 9 section clips; seamless multi-segment splits: §2 Why air is the enemy at speed (55s → 30+25); §3 Pumping a 3,000 km tube (70s → 30+30+10); §4 Maglev and linear motors (70s → 30+30+10); §5 Curves (60s → 30+30); §6 Stations (70s → 30+30+10); §7 Riding it (60s → 30+30); §8 Safety (55s → 30+25); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut at §2 into schematic; scan-line into station reveal §6; §8 hard cut with drama palette.
- **Cinematography:** Low 35mm chase alongside capsule in transparent tube section; schematic pressure overlay; long lateral truck along tube pylons across plains; station atrium crane-down; interior POV of seats with virtual windows. **Controls vs default:** §1: genre action, pacing dynamic; §2–5: ghost-in-the-code/clean-sharp; §6–7: default; §8: genre drama, industrial-fog.
- **Science grounding:** Aerodynamic drag ∝ ρv²; at ~100 Pa (1/1000 atm) drag falls ~1000×. Kantrowitz limit forces bypass fans or larger tubes. Lateral comfort (~0.1 g) at 1,000 km/h needs curve radii of tens of km. Hardt reached 85 km/h with lane switching in Veendam (test track); China's T-Flight reported ~623 km/h [U]. Tier: STRETCH.
- **Music/SFX:** Driving arpeggios; pneumatic whoosh; tube hum; alarm tones in §8.
- **Thumbnail:** Capsule streaking through a transparent tube over a canyon. Text: '1,000 KM/H'. Chip STRETCH.
- **Vertical cut-downs:** Why the curves are 40 km wide · Tube breach: what happens · Inside the capsule POV

### L15. The City at the Foot of a Space Elevator
*Alt:* Anchor City: Where the Road to Orbit Begins · **Series:** Worlds Beyond · **Runtime:** ~8:20 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "At the equator, a ribbon rises from the sea and never stops, all the way to orbit."
- **Logline:** An equatorial ocean anchor city grows around a space elevator: the tether, climbers, counterweight, and the city economy of a cheap road to space.
- **Sections:** 1) Cold open: tilt up the ribbon **20s** · 2) Why the equator and why the sea **55s** · 3) The tether: carbon nanotubes and taper **80s** · 4) Climbers: a 7-day ride **70s** · 5) The counterweight and geostationary station **65s** · 6) The anchor city: port, launchpad, market **80s** · 7) Hazards: storms, debris, snapped tethers **60s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 475s generated → **19 generations** (≈$97.71). 8 section clips; seamless multi-segment splits: §2 Why the equator and why the sea (55s → 30+25); §3 The tether (80s → 30+30+20); §4 Climbers (70s → 30+30+10); §5 The counterweight and geostationary station (65s → 30+30+5); §6 The anchor city (80s → 30+30+20); §7 Hazards (60s → 30+30); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line into tether schematic §3; hard cut to anchor city §6; drama palette at §7.
- **Cinematography:** Endless vertical tilt-up 24mm (split across chained segments continuing upward); schematic taper overlay; tracking beside climber at altitude with Earth curvature; ocean-level wide of floating anchor platform and city. **Controls vs default:** §1: pacing single-shot; §3: ghost-in-the-code; §4–5: static-noon, clean-sharp; §6: turquoise-mirage; §7: genre drama.
- **Science grounding:** Geostationary orbit is ~35,786 km; the tether extends beyond to a counterweight. Required specific strength exceeds steel by ~50×; CNT/graphene in theory, not yet at length. Obayashi's concept: 96,000 km cable, ~7-day climb (~150 km/h), target 2050. Ocean anchor lets the base move to dodge storms/debris. Tier: FRONTIER.
- **Music/SFX:** Endless rising Shepard-tone-like motif; wind fading to silence at altitude; port bustle.
- **Thumbnail:** Ribbon rising from an ocean city into space, tiny climber. Text: 'ELEVATOR TO SPACE'. Chip FRONTIER.
- **Vertical cut-downs:** 7 days to orbit in 60s · Why the sea, not land · How strong is the ribbon?

### L16. The 1,000-Passenger Sea Glider
*Alt:* Machines of Tomorrow: Flying Just Above the Waves · **Series:** Machines of Tomorrow · **Runtime:** ~8:25 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "It's not a plane and it's not a ship. It flies four metres above the waves at 500 km/h."
- **Logline:** A wing-in-ground-effect liner linking the floating cities: ground effect physics, the Soviet 'Caspian Sea Monster' ancestor, electric propulsion and wave limits.
- **Sections:** 1) Cold open: glider skimming waves at dawn **20s** · 2) Ground effect: the air cushion **65s** · 3) The ancestor: 1960s ekranoplans **55s** · 4) Design: wing, hull and hydrofoils **75s** · 5) Power: hydrogen and electric fans **60s** · 6) Riding it: cabin and view **65s** · 7) Limits: waves and storms **55s** · 8) Arriving at Meridian **40s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 480s generated → **20 generations** (≈$98.74). 9 section clips; seamless multi-segment splits: §2 Ground effect (65s → 30+30+5); §3 The ancestor (55s → 30+25); §4 Design (75s → 30+30+15); §5 Power (60s → 30+30); §6 Riding it (65s → 30+30+5); §7 Limits (55s → 30+25); §8 Arriving at Meridian (40s → 30+10); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Retro hard cut §3; scan-line §4; hard cut to arrival §8 (atlas continuity).
- **Cinematography:** Low 35mm chase just above the water at speed; side-on locked wide with air-cushion overlay; retro 35mm-film archival-style look; cabin gimbal walk to window; arrival crane over Meridian (reuse atlas ref). **Controls vs default:** §1, §6: genre action, pacing dynamic, turquoise-mirage; §3: 35mm-film, warm-vintage, era 1960s; §4–5: ghost-in-the-code; §8: default.
- **Science grounding:** Wing-in-ground effect reduces induced drag when flying within ~½ wingspan of the surface, boosting lift/drag. Soviet KM ekranoplan (1966) flew at ~500 km/h [U]. Sea state limits operations (waves > ~2–3 m). Tier: PROVEN (physics) / STRETCH (1,000-seat liner).
- **Music/SFX:** Engine drone, sea spray, driving strings.
- **Thumbnail:** Huge glider skimming waves, wing tip spray. Text: '4 M ABOVE THE SEA'. Chip STRETCH.
- **Vertical cut-downs:** Ground effect in 45s · The 1966 monster · Cabin view at 500 km/h

### L17. Building a Moon City From Zero
*Alt:* Robots First: How a Lunar City Gets Built · **Series:** Build It From Zero · **Runtime:** ~9:25 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "The first builders on the Moon won't be people. They'll be robots printing with dust."
- **Logline:** Step by step from a landing site to a city of 10,000: robotic prospecting, sintered regolith, ice mining, domes, and the first families.
- **Sections:** 1) Cold open: printer arm lays a regolith course **20s** · 2) Step 0: pick the site (ice at the pole) **60s** · 3) Step 1: robot swarm arrives **60s** · 4) Step 2: sintering roads and pads **70s** · 5) Step 3: mining ice for water, air and fuel **75s** · 6) Step 4: printed domes under regolith **75s** · 7) Step 5: the first crews **60s** · 8) Year 30: the city **75s** · 9) Plausibility verdict **45s**
- **Stitch plan:** 540s generated → **21 generations** (≈$111.08). 9 section clips; seamless multi-segment splits: §2 Step 0 (60s → 30+30); §3 Step 1 (60s → 30+30); §4 Step 2 (70s → 30+30+10); §5 Step 3 (75s → 30+30+15); §6 Step 4 (75s → 30+30+15); §7 Step 5 (60s → 30+30); §8 Year 30 (75s → 30+30+15); §9 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut at every build step (§2–§7) with year stamp; Seedance end_image_url for before/after stills; dip-to-void at verdict.
- **Cinematography:** Locked 35mm wide at the same pad across all steps (timelapse continuity via image refs); low tracking beside rovers; macro sintered texture; final crane-up over city at earthrise. **Controls vs default:** §1–7: static-noon, clean-sharp; §8: twilight-fable (earthshine + lit domes).
- **Science grounding:** Water ice is confirmed in permanently shadowed polar craters; regolith can be sintered by microwaves/solar concentrators into bricks; ~2–3 m of regolith cover shields radiation. Oxygen can be extracted from regolith oxides. Tier: STRETCH.
- **Music/SFX:** Ticking build percussion; servo whirrs; triumphant motif at Year 30.
- **Thumbnail:** Robot arms printing a dome under Earthrise. Text: 'ROBOTS BUILD FIRST'. Chip STRETCH.
- **Vertical cut-downs:** Printing a brick from Moon dust · Year 0 → Year 30 in 45s · Ice to rocket fuel

### L18. The Ice City on Mars
*Alt:* Why Martians Would Live Under Ice · **Series:** Worlds Beyond · **Runtime:** ~8:25 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "On Mars, the best building material might be the one that melts."
- **Logline:** A Martian city built under shells of water ice: radiation shielding that lets in light, pressurised ice domes, and what a Martian morning feels like.
- **Sections:** 1) Cold open: blue-lit ice dome at sunrise **20s** · 2) Mars' three killers: cold, thin air, radiation **60s** · 3) Why ice: shielding you can see through **70s** · 4) Building an ice shell **75s** · 5) Pressure: holding air in a thin world **65s** · 6) Citizen's walk: under the blue dome **90s** · 7) Dust storms and resupply **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 480s generated → **19 generations** (≈$98.74). 8 section clips; seamless multi-segment splits: §2 Mars' three killers (60s → 30+30); §3 Why ice (70s → 30+30+10); §4 Building an ice shell (75s → 30+30+15); §5 Pressure (65s → 30+30+5); §6 Citizen's walk (90s → 30+30+30); §7 Dust storms and resupply (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line §3; hard cut into dust storm (§7); verdict locked.
- **Cinematography:** Low wide 24mm of dome glowing against rust plains; interior blue diffused light gimbal walk; schematic dose-comparison overlay; dust storm rolling in, wide locked. **Controls vs default:** §2: static-noon; §3–5: ghost-in-the-code/clean-sharp; §6: a-dream-in-color (soft blue); §7: genre drama, industrial-fog.
- **Science grounding:** Hydrogen-rich water ice is an effective radiation shield; NASA Langley's 'Mars Ice Home' concept (2016) proposed an inflatable ice-shell habitat. Mars' surface pressure ~0.6 kPa (0.6% of Earth); internal pressure of ~50 kPa pushes outward, so ice domes act in tension with a membrane. Tier: STRETCH.
- **Music/SFX:** Crystalline pads, wind at 0.6% pressure (thin, high), storm rumble.
- **Thumbnail:** Glowing blue ice dome on red plain at dawn. Text: 'HOMES MADE OF ICE'. Chip STRETCH.
- **Vertical cut-downs:** Why ice blocks radiation · Inside the blue dome · Dust storm vs ice city

### L19. The City Inside a Volcano
*Alt:* Caldera: A City Powered by the Earth Itself · **Series:** How It Could Work · **Runtime:** ~8:30 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Most people run from volcanoes. This city was built inside one, on purpose."
- **Logline:** A terraced city in a dormant caldera: geothermal power, magma monitoring, earthquake engineering, and the evacuation plan.
- **Sections:** 1) Cold open: city lights in a crater at dusk **20s** · 2) Why a caldera: heat, shelter, minerals **60s** · 3) Geothermal: drilling toward magma **80s** · 4) Monitoring: listening to the mountain **65s** · 5) Engineering for earthquakes **70s** · 6) Citizen's walk: hot springs to terraces **90s** · 7) The evacuation plan **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 485s generated → **19 generations** (≈$99.76). 8 section clips; seamless multi-segment splits: §2 Why a caldera (60s → 30+30); §3 Geothermal (80s → 30+30+20); §4 Monitoring (65s → 30+30+5); §5 Engineering for earthquakes (70s → 30+30+10); §6 Citizen's walk (90s → 30+30+30); §7 The evacuation plan (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line §3; hard cut into evacuation drill §7 (drama); verdict locked.
- **Cinematography:** Aerial 24mm push over the crater rim revealing terraces; vertical drill-string schematic; seismograph overlay on locked wide; gimbal walk through steaming streets; base-isolated building cutaway. **Controls vs default:** §1, §6: twilight-fable; §3: the-iron-borough; §4–5: ghost-in-the-code; §7: genre drama, industrial-fog.
- **Science grounding:** Iceland's Krafla Magma Testbed aims to drill into magma; the 2009 IDDP-1 accidentally hit magma at ~2 km and produced superheated steam [U: output figures]. Base isolators and damped frames cut seismic loads. Real monitoring uses seismometers, GPS uplift and gas sensors. Tier: STRETCH.
- **Music/SFX:** Low rumbles, steam hiss, warm cello; drill grind.
- **Thumbnail:** Terraced city glowing inside a caldera, steam rising. Text: 'BUILT IN A VOLCANO'. Chip STRETCH.
- **Vertical cut-downs:** Drilling into magma · How a building rides an earthquake · Hot-spring street POV

### L20. 24 Hours Inside an Underwater City
*Alt:* Citizen's Walk: A Day 40 Metres Down · **Series:** Citizen's Walk · **Runtime:** ~7:55 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Your alarm is a humpback whale. Your window faces a kelp forest. Welcome to 2190."
- **Logline:** A day in a shallow-shelf underwater district (40 m): mornings in kelp light, pressure-lock commutes, fish-farm lunch and bioluminescent nights.
- **Sections:** 1) Dawn: kelp light through the window **40s** · 2) Morning: the pressure-lock commute **65s** · 3) Work: the seafloor lab **60s** · 4) Lunch: fish farms and seaweed **55s** · 5) Afternoon: the dive school **60s** · 6) How air and power reach you **70s** · 7) Night: bioluminescence **55s** · 8) What's real today **45s**
- **Stitch plan:** 450s generated → **18 generations** (≈$92.56). 8 section clips; seamless multi-segment splits: §1 Dawn (40s → 30+10); §2 Morning (65s → 30+30+5); §3 Work (60s → 30+30); §4 Lunch (55s → 30+25); §5 Afternoon (60s → 30+30); §6 How air and power reach you (70s → 30+30+10); §7 Night (55s → 30+25); §8 What's real today (45s → 30+15). Deliberate hard cuts: Time-stamp hard cuts per section; scan-line overlay in §6; 'what's real' uses schematic.
- **Cinematography:** All eye-level 35mm gimbal walks behind the Citizen; window POV of kelp; tram-pod gliding through acrylic tunnel; night wide with glowing plankton. **Controls vs default:** §1–5: turquoise-mirage; §6: ghost-in-the-code; §7: after-dark; §8: static-noon.
- **Science grounding:** At 40 m, ambient pressure ~5 atm; habitats can be kept at 1 atm (like submarines) to avoid decompression. DEEP's Vanguard/Sentinel (Sentinel planned 2027, up to 50 people, 225 m) and Aquarius reef base are real precedents. Kelp grows up to ~0.5 m/day. Tier: STRETCH.
- **Music/SFX:** Whale song, bubbles, soft marimba; night: glassy chimes.
- **Thumbnail:** Bedroom window framing a kelp forest and a whale. Text: 'MY WINDOW IS THE SEA'. Chip STRETCH.
- **Vertical cut-downs:** Whale alarm clock (loop) · Why you don't get the bends at home · Bioluminescent night walk

### L21. Flying Cars That Actually Make Sense
*Alt:* Skyports: How 3D Traffic Would Really Work · **Series:** Machines of Tomorrow · **Runtime:** ~7:55 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Every sci-fi city has flying cars. None of them explain where they land."
- **Logline:** eVTOL physics, noise, energy, air lanes and skyports, and why the future sky looks like organised corridors, not chaos.
- **Sections:** 1) Cold open: sky lanes over a city at dusk **20s** · 2) The sci-fi myth vs physics **55s** · 3) Hovering is expensive: the energy math **70s** · 4) Noise and downwash **60s** · 5) Air lanes: 3D traffic control **70s** · 6) Skyports: where they land **70s** · 7) A ride from roof to roof **60s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 450s generated → **18 generations** (≈$92.56). 8 section clips; seamless multi-segment splits: §2 The sci-fi myth vs physics (55s → 30+25); §3 Hovering is expensive (70s → 30+30+10); §4 Noise and downwash (60s → 30+30); §5 Air lanes (70s → 30+30+10); §6 Skyports (70s → 30+30+10); §7 A ride from roof to roof (60s → 30+30); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut myth (§2 neon) to physics schematic (§3); scan-line into skyport reveal (§6); verdict locked.
- **Cinematography:** Wide 24mm dusk with lane-lights ribbons; schematic rotor downwash; top-down lane grid; skyport crane-down with craft landing; cabin POV. **Controls vs default:** §2: neon-rain-at-midnight, genre noir; §3–5: ghost-in-the-code; §6–7: twilight-fable; §8: default.
- **Science grounding:** Hover power scales with weight^1.5/√(disk area); eVTOLs use large rotor area and wing-borne cruise. Battery energy density (~250–300 Wh/kg) limits range to ~100–250 km [U]. Downwash and noise dictate vertiports. Tier: PROVEN (eVTOL) / STRETCH (dense 3D traffic).
- **Music/SFX:** Soft rotor hums, ATC-style blips, optimistic synth.
- **Thumbnail:** Organised light-ribbon air lanes over a city. Text: 'WHERE DO THEY LAND?'. Chip STRETCH.
- **Vertical cut-downs:** Why flying cars are loud · Air lanes explained · Roof-to-roof ride POV

### L22. 5 Sci-Fi City Tropes, Physics-Checked
*Alt:* Which Movie Cities Could Actually Stand? · **Series:** Physics Check · **Runtime:** ~8:30 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Five famous kinds of sci-fi city. Only one survives the physics."
- **Logline:** Planet-wide cities, floating rock islands, desert domes, underwater bubbles and ring worlds, each rated on the Plausibility Meter (tropes only, no franchise visuals).
- **Sections:** 1) Cold open: five cities flash by **20s** · 2) Trope 1: the planet-wide city **90s** · 3) Trope 2: floating rock islands **80s** · 4) Trope 3: the glass dome in the desert **80s** · 5) Trope 4: the underwater bubble **80s** · 6) Trope 5: the ring world **90s** · 7) Final ranking **45s**
- **Stitch plan:** 485s generated → **18 generations** (≈$99.76). 7 section clips; seamless multi-segment splits: §2 Trope 1 (90s → 30+30+30); §3 Trope 2 (80s → 30+30+20); §4 Trope 3 (80s → 30+30+20); §5 Trope 4 (80s → 30+30+20); §6 Trope 5 (90s → 30+30+30); §7 Final ranking (45s → 30+15). Deliberate hard cuts: Hard cut between every trope (palette flip per trope); Plausibility needle at each section end; ranking locked.
- **Cinematography:** Each trope: one establishing 24mm reveal + schematic breakdown; ranking on locked void with five miniatures. **Controls vs default:** §2: neon-rain-at-midnight; §3: a-dream-in-color; §4: mirage-at-noon; §5: turquoise-mirage; §6: static-noon; §7: ghost-in-the-code.
- **Science grounding:** Planet city: waste heat — 1 trillion people × 100 W = 10^14 W, several % of absorbed sunlight [U: calc]. Floating rocks need magnetic levitation (diamagnetic levitation only works at tiny scale). Glass dome: thermal greenhouse and pressure fine on Earth. Underwater bubble: pressure hull shape. Ringworld: material strength far beyond known (Niven's; FRONTIER). Ranking: dome > bubble > planet city > ring > floating rocks.
- **Music/SFX:** Each trope gets a mini-motif; drumroll-free ranking with needle clacks.
- **Thumbnail:** Five miniature cities on a meter. Text: 'ONLY 1 WORKS'. Chip mixed.
- **Vertical cut-downs:** Floating islands: why not · Planet city heat problem · The ranking in 60s

### L23. The Bishop Ring: A World 1,000 km Wide
*Alt:* The Habitat Big Enough to Have Its Own Sky · **Series:** Worlds Beyond · **Runtime:** ~8:20 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "This ring is so big it doesn't need a roof. The spin holds the air in."
- **Logline:** Forrest Bishop's roofless ring habitat: 1,000 km radius, 500 km-wide land strip, 200 km walls, and the materials science that makes it barely conceivable.
- **Sections:** 1) Cold open: sunrise over a ring landscape **20s** · 2) From cylinders to rings **55s** · 3) No roof: walls hold the air **70s** · 4) Spin and gravity at 1,000 km **65s** · 5) Materials: carbon nanotubes **70s** · 6) Citizen's walk: continents on a ring **90s** · 7) Building it: asteroid mining **60s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 475s generated → **19 generations** (≈$97.71). 8 section clips; seamless multi-segment splits: §2 From cylinders to rings (55s → 30+25); §3 No roof (70s → 30+30+10); §4 Spin and gravity at 1,000 km (65s → 30+30+5); §5 Materials (70s → 30+30+10); §6 Citizen's walk (90s → 30+30+30); §7 Building it (60s → 30+30); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line §3; hard cut into exterior scale §4; verdict locked.
- **Cinematography:** Ultra-wide 24mm vista with the ring arcing into the sky; exterior slow orbit showing Earth for scale; schematic atmosphere-wall overlay; walk through forests with the far arc overhead. **Controls vs default:** §1, §6: the-morning-after-rain; §2–5: static-noon, clean-sharp; §7: the-iron-borough.
- **Science grounding:** 1 g at r = 1,000 km: ω = √(g/r) ≈ 0.003 rad/s → one turn ~35 min; rim speed ~3 km/s. Walls ~200 km tall retain air because pressure scale height is ~8 km. Hoop stress requires tensile strength only CNT-class materials approach. Tier: FRONTIER.
- **Music/SFX:** Grand, slow strings; wind; wide reverb.
- **Thumbnail:** Landscape curving upward into the sky as a ring. Text: 'NO ROOF NEEDED'. Chip FRONTIER.
- **Vertical cut-downs:** Why the air doesn't escape · Ring vs Earth scale · Sunrise on a ring (loop)

### L24. Hollowing Out an Asteroid to Build a City
*Alt:* Spinning Rock: The Asteroid Habitat · **Series:** Worlds Beyond · **Runtime:** ~8:15 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Take a mountain-sized rock, hollow it out and spin it. You've built a planet."
- **Logline:** Converting a metallic or rubble-pile asteroid into a spinning habitat: mining, bagging rubble, spin-up, interior design and life inside the rock.
- **Sections:** 1) Cold open: lights inside a spinning rock **20s** · 2) Choosing the rock **60s** · 3) Rubble piles: why they fly apart **65s** · 4) The bag trick: wrapping a rubble pile **75s** · 5) Spin-up and gravity **60s** · 6) Citizen's walk: inside the rock **90s** · 7) Mining economy **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 470s generated → **18 generations** (≈$96.68). 8 section clips; seamless multi-segment splits: §2 Choosing the rock (60s → 30+30); §3 Rubble piles (65s → 30+30+5); §4 The bag trick (75s → 30+30+15); §5 Spin-up and gravity (60s → 30+30); §6 Citizen's walk (90s → 30+30+30); §7 Mining economy (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line into §4; hard cut into interior §6; verdict locked.
- **Cinematography:** Exterior slow 24mm orbit around the asteroid with hard sunlight; schematic of rubble-pile layers; mesh-bag deployment wide; interior gimbal walk along curved streets with rock ceiling overhead. **Controls vs default:** §1–5: static-noon, clean-sharp; §4: ghost-in-the-code; §6: twilight-fable; §7: the-iron-borough.
- **Science grounding:** Many asteroids are rubble piles bound by weak gravity; spinning them for 1 g would fling them apart. Proposals (e.g. arXiv 2302.12353 'Autonomous Restructuring of Asteroids into Rotating Space Stations') wrap rubble in a bag or tether. Gravity at r = 500 m needs ~1.3 rpm. Tier: FRONTIER.
- **Music/SFX:** Metallic resonances, mining thuds, warm interior pads.
- **Thumbnail:** Asteroid split open showing a city inside. Text: 'A CITY IN A ROCK'. Chip FRONTIER.
- **Vertical cut-downs:** Why asteroids fall apart · The bag trick · Inside the rock POV

### L25. The City Grown From Sand
*Alt:* Build It From Zero: Bacteria That Make Concrete · **Series:** Build It From Zero · **Runtime:** ~8:15 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "What if you could build a city by pouring bacteria onto the desert?"
- **Logline:** Building a desert city with biocement (microbially induced calcite precipitation), solar farms and dew catchers: from bare dunes to shaded streets.
- **Sections:** 1) Cold open: sand hardening into walls **20s** · 2) The problem: desert sand is useless for concrete **55s** · 3) Step 1: bacteria that make stone **75s** · 4) Step 2: printing walls with biocement **70s** · 5) Step 3: shade, wind towers and cool streets **70s** · 6) Step 4: water from air and sea **65s** · 7) Year 20: the city lives **70s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 470s generated → **20 generations** (≈$96.68). 8 section clips; seamless multi-segment splits: §2 The problem (55s → 30+25); §3 Step 1 (75s → 30+30+15); §4 Step 2 (70s → 30+30+10); §5 Step 3 (70s → 30+30+10); §6 Step 4 (65s → 30+30+5); §7 Year 20 (70s → 30+30+10); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut per build step with year stamp; Seedance stage-to-stage chaining; verdict locked.
- **Cinematography:** Macro 85mm of grains cementing (schematic → photoreal); locked 35mm wide of the same dune across steps; low tracking along shaded streets; top-down of solar and dew fields. **Controls vs default:** §1–6: mirage-at-noon; §3: ghost-in-the-code for micro schematic; §7: twilight-fable.
- **Science grounding:** Desert sand grains are too smooth and rounded for concrete aggregate. MICP: bacteria (e.g. Sporosarcina pasteurii) hydrolyse urea and precipitate calcium carbonate, binding sand (bioMASON-type bricks). Traditional wind towers (barjeel) cool streets passively. Tier: PROVEN (bricks) / STRETCH (city).
- **Music/SFX:** Hot wind, sparse oud-like plucks (library), gentle percussion build.
- **Thumbnail:** Sandstone-coloured city emerging from dunes. Text: 'GROWN, NOT BUILT'. Chip STRETCH.
- **Vertical cut-downs:** Why desert sand can't make concrete · Bacteria make a brick · Wind tower cooling

### L26. The Launch Loop: A City That Throws Ships Into Orbit
*Alt:* Machines of Tomorrow: The 2,000 km Track to Space · **Series:** Machines of Tomorrow · **Runtime:** ~7:45 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "A steel belt racing at fourteen kilometres a second, held eighty kilometres in the sky by its own speed."
- **Logline:** Keith Lofstrom's launch loop, a dynamic structure that could launch payloads without rockets, and the spaceport city built around it.
- **Sections:** 1) Cold open: a vehicle rockets along the track **20s** · 2) Rockets are wasteful **55s** · 3) Dynamic structures: speed holds it up **75s** · 4) Riding the loop: acceleration **65s** · 5) The spaceport city **70s** · 6) Energy: where the power comes from **55s** · 7) Failure: if the belt breaks **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 440s generated → **18 generations** (≈$90.51). 8 section clips; seamless multi-segment splits: §2 Rockets are wasteful (55s → 30+25); §3 Dynamic structures (75s → 30+30+15); §4 Riding the loop (65s → 30+30+5); §5 The spaceport city (70s → 30+30+10); §6 Energy (55s → 30+25); §7 Failure (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line into §3; hard cut into city §5; drama at §7.
- **Cinematography:** Long lateral 24mm truck along an elevated track receding into the sky; schematic belt and deflectors; chase of vehicle; spaceport-city aerial at dusk. **Controls vs default:** §1, §4: genre action, pacing dynamic; §3: ghost-in-the-code; §5: twilight-fable; §7: genre drama, industrial-fog.
- **Science grounding:** Launch loop (Lofstrom, 1980s): an iron rotor ~14 km/s in a vacuum sheath, deflected magnetically to hold an 80 km-high, ~2,000 km track; vehicles accelerate at ~3 g to orbital speeds. Stored energy is enormous (~terajoules), so failure is catastrophic. Tier: FRONTIER.
- **Music/SFX:** Driving ostinato; magnetic hum; sonic cracks.
- **Thumbnail:** Glowing track arching into the upper atmosphere. Text: 'NO ROCKETS'. Chip FRONTIER.
- **Vertical cut-downs:** How speed holds up a track · 3 g ride to orbit POV · If it breaks

### L27. A Floating Tunnel Under the Atlantic
*Alt:* The Submerged Train Across an Ocean · **Series:** Machines of Tomorrow · **Runtime:** ~7:55 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Not on the seabed. Not on the surface. A tunnel floating 50 metres down, from London to New York."
- **Logline:** Submerged floating tunnels (Archimedes bridges): buoyancy, tethers, currents and vacuum trains, grounded in Norway's real E39 studies.
- **Sections:** 1) Cold open: train inside a floating tube **20s** · 2) Why not a bridge or seabed tunnel **60s** · 3) Archimedes' bridge: floating at 50 m **75s** · 4) Tethers vs pontoons **65s** · 5) Currents, ships and earthquakes **65s** · 6) A vacuum train inside **65s** · 7) 5,000 km: the scale problem **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 450s generated → **19 generations** (≈$92.56). 8 section clips; seamless multi-segment splits: §2 Why not a bridge or seabed tunnel (60s → 30+30); §3 Archimedes' bridge (75s → 30+30+15); §4 Tethers vs pontoons (65s → 30+30+5); §5 Currents, ships and earthquakes (65s → 30+30+5); §6 A vacuum train inside (65s → 30+30+5); §7 5,000 km (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Scan-line §3; hard cut §6 to interior ride; verdict locked.
- **Cinematography:** Underwater 35mm glide alongside the tube with sun shafts; schematic tether patterns; train interior POV; scale overlay across the Atlantic map. **Controls vs default:** §1, §3–4: turquoise-mirage; §3: ghost-in-the-code for schematic; §5: genre drama, after-dark; §6: default.
- **Science grounding:** Submerged floating tunnels balance buoyancy against weight with tethers; Norway studied them for E39 fjord crossings (Bjørnafjorden). Depth ~20–50 m avoids ships and waves. The Atlantic (~5,000 km, deep abyss) makes tethers impractical, so it would need dynamic positioning. Tier: STRETCH (fjord) / FRONTIER (Atlantic).
- **Music/SFX:** Submarine drones, rail hum, current wash.
- **Thumbnail:** Glowing tube suspended in blue water with a train inside. Text: 'FLOATING TUNNEL'. Chip STRETCH.
- **Vertical cut-downs:** How a tunnel floats · Norway's real plan · London to New York?

### L28. Could We Build a City on Titan?
*Alt:* The Only Moon Where You Could Fly With Wings · **Series:** Worlds Beyond · **Runtime:** ~8:00 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "On Titan, you could strap wings to your arms and fly."
- **Logline:** A settlement on Saturn's moon Titan: thick air, methane lakes, -180 °C cold, energy from ... what? And why Titan might be the best place in the outer solar system.
- **Sections:** 1) Cold open: a person flying over methane lakes **20s** · 2) Titan: thicker air than Earth **55s** · 3) Human-powered flight **60s** · 4) The cold: -180 °C **60s** · 5) Energy: the hard problem **75s** · 6) The city: domes by the shore of a methane sea **85s** · 7) Resources: hydrocarbons everywhere **55s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 455s generated → **17 generations** (≈$93.59). 8 section clips; seamless multi-segment splits: §2 Titan (55s → 30+25); §3 Human-powered flight (60s → 30+30); §4 The cold (60s → 30+30); §5 Energy (75s → 30+30+15); §6 The city (85s → 30+30+25); §7 Resources (55s → 30+25); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut after §1; scan-line at §5; verdict locked.
- **Cinematography:** Wide 24mm glide over orange haze and dark lakes, flyer silhouette; schematic energy flow overlay; insulated dome city by shore at dim orange noon; Saturn barely visible through haze. **Controls vs default:** §1, §3: a-dream-in-color; §2, §4–5: industrial-fog, clean-sharp; §6: twilight-fable; §8: default.
- **Science grounding:** Titan surface pressure ~1.5 atm, gravity ~0.14 g, so human-powered flight is plausible (a classic Zubrin/NASA observation). Temperature ~94 K; sunlight is ~1% of Earth's, so power needs fission; burning methane needs imported oxygen. NASA's Dragonfly rotorcraft is due to launch in 2028 [U: date]. Tier: STRETCH.
- **Music/SFX:** Hazy, slow synth; wing flaps; gentle methane rain.
- **Thumbnail:** Winged human silhouette over orange lakes with a dome city. Text: 'YOU CAN FLY HERE'. Chip STRETCH.
- **Vertical cut-downs:** Why you could fly on Titan · -180 °C: what freezes · Methane rain in 30s

### L29. Commute Through a Megacity of 2200
*Alt:* Citizen's Walk: Home to Work in the Tomorrowscape · **Series:** Citizen's Walk · **Runtime:** ~7:50 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "In 2200, your commute crosses three cities, and takes eleven minutes."
- **Logline:** A single commute linking atlas worlds: a sky-lane shuttle, a hyperloop Waystation, a floating district and a tower-forest office, with the physics of each leg.
- **Sections:** 1) Morning in the tower-forest apartment **35s** · 2) Skyport shuttle across the bay **65s** · 3) Waystation: the hyperloop hop **70s** · 4) Arrival at Meridian's docks **60s** · 5) The walking market **55s** · 6) Lift to the 400th floor office **55s** · 7) Evening: the ride home at dusk **60s** · 8) How the network fits together **45s**
- **Stitch plan:** 445s generated → **18 generations** (≈$91.54). 8 section clips; seamless multi-segment splits: §1 Morning in the tower-forest apartment (35s → 30+5); §2 Skyport shuttle across the bay (65s → 30+30+5); §3 Waystation (70s → 30+30+10); §4 Arrival at Meridian's docks (60s → 30+30); §5 The walking market (55s → 30+25); §6 Lift to the 400th floor office (55s → 30+25); §7 Evening (60s → 30+30); §8 How the network fits together (45s → 30+15). Deliberate hard cuts: Hard cuts at each mode change with a time stamp; atlas continuity refs; final schematic map.
- **Cinematography:** All POV/over-shoulder 35mm behind the Citizen; each mode's signature move (shuttle bank, capsule launch, dock walk, ropeless lift); closing atlas-map schematic. **Controls vs default:** §1: the-morning-after-rain; §2: twilight-fable; §3: ghost-in-the-code/clean-sharp; §4–5: turquoise-mirage; §6: static-noon; §7: twilight-fable; §8: ghost-in-the-code.
- **Science grounding:** Reuses validated numbers from L01 (Meridian), L09 (arcology lifts), L14 (hyperloop), L21 (eVTOL). Ties the atlas together; each leg gets a one-line physics overlay. Tier mix, labelled per leg.
- **Music/SFX:** Continuous travelling motif that changes instrumentation per mode.
- **Thumbnail:** Split quad: shuttle, capsule, floating dock, sky office. Text: '11-MINUTE COMMUTE'. Chip mixed.
- **Vertical cut-downs:** Shuttle bank over the bay · Hyperloop hop in 30s · 400 floors in 40 seconds

### L30. How Big Can a City Actually Get?
*Alt:* Physics Check: The Hard Limits of Megacities · **Series:** Physics Check · **Runtime:** ~8:20 (incl. 5 s ident + 20 s outro)

- **Hook (0–5 s, verbatim):** "Tokyo holds thirty-seven million people. Is there a number where a city simply stops working?"
- **Logline:** The physics and maths that cap cities: travel time (Marchetti's constant), heat, water, food footprint and energy, and a 1-billion-person design that bends the limits.
- **Sections:** 1) Cold open: zoom-out over endless lights **20s** · 2) Today's giants **50s** · 3) Limit 1: the one-hour commute **75s** · 4) Limit 2: waste heat **65s** · 5) Limit 3: water and food **70s** · 6) Limit 4: energy **60s** · 7) Designing a billion-person city **90s** · 8) Plausibility verdict **45s**
- **Stitch plan:** 475s generated → **19 generations** (≈$97.71). 8 section clips; seamless multi-segment splits: §2 Today's giants (50s → 30+20); §3 Limit 1 (75s → 30+30+15); §4 Limit 2 (65s → 30+30+5); §5 Limit 3 (70s → 30+30+10); §6 Limit 4 (60s → 30+30); §7 Designing a billion-person city (90s → 30+30+30); §8 Plausibility verdict (45s → 30+15). Deliberate hard cuts: Hard cut per limit with a counter HUD; scan-line into design §7; verdict locked.
- **Cinematography:** Continuous orbital zoom-out (chained segments) over a night megacity; schematic isochrone rings; heat-map overlay; final design: multi-level network of arcologies linked by vacuum trains. **Controls vs default:** §1–2: after-dark; §3–6: ghost-in-the-code; §7: twilight-fable; §8: default.
- **Science grounding:** Marchetti's constant: people accept ~1 h/day travel; city radius scales with transport speed. Urban heat islands add 1–3 °C+; a billion people at ~2 kW each = 2 TW. Tokyo metro ~37M (UN). Water footprint ~100–300 L/person/day domestic. Tier: STRETCH.
- **Music/SFX:** Minimal pulses rising with each limit; resolving chord at design reveal.
- **Thumbnail:** Earth-at-night-style city sprawling to the horizon. Text: 'THE LIMIT?'. Chip STRETCH.
- **Vertical cut-downs:** Marchetti's constant in 45s · How hot can a city get? · A billion-person city

---

## Short-form (S01–S30, vertical 9:16)

### S01. How a Floating City Stays Put
- **Hook (verbatim):** "Why doesn't a floating city just drift away?" · **Runtime:** 60s · **Series:** 60-Second City · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: top-down hex city drifting shadow 5s · Tethers revealed underwater 15s · Wave arrives, joints flex 15s · Physics overlay: tension arrows 15s · Loop back to top-down 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Top-down 24mm drift; underwater vertical tilt down a tether; locked wave test. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'NOT ANCHORED. TETHERED.' · 'TENSION 12 MN' [illustrative] · YEAR 2160 · SPECULATIVE; word-by-word captions at 62–70% height.
- **Loop/ending:** Final top-down frame matches first (Seedance end_image_url). · **Cover text:** IT CAN'T DRIFT

### S02. Scale Shock: O'Neill Cylinder vs Manhattan
- **Hook (verbatim):** "This space habitat is longer than Manhattan." · **Runtime:** 60s · **Series:** Scale Shock · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: cylinder in space 5s · Manhattan ghost slides beside 15s · Zoom inside: valleys 20s · Spin number 10s · Zoom-out loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical exterior tilt along cylinder length; ghost overlay; interior tilt-up to overhead land. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '32 KM LONG' · '0.53 RPM = 1 g' · Manhattan outline; word-by-word captions at 62–70% height.
- **Loop/ending:** Zoom-out ends on the opening frame. · **Cover text:** BIGGER THAN MANHATTAN

### S03. Would You Live Here? A Moon Cave Apartment
- **Hook (verbatim):** "Your apartment is 100 metres under the Moon." · **Runtime:** 60s · **Series:** Would You Live Here? · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: window onto lava-tube terraces 6s · Room tour: regolith walls 18s · Light pipe sunbeam 14s · Low-g jump 12s · Question to camera (text) 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical gimbal POV through a small apartment; tilt-up to light pipe; side low-g jump. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '100 M UNDER THE MOON' · 'RADAR-CONFIRMED CAVE (2024)' · 'WOULD YOU?'; word-by-word captions at 62–70% height.
- **Loop/ending:** Ends back at the window framing. · **Cover text:** MOON CAVE HOME?

### S04. One Step of a Walking City
- **Hook (verbatim):** "Watch a city take one step." · **Runtime:** 60s · **Series:** 60-Second City · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: leg lifting 5s · Leg swing 12s · Foot plants, sand ripples 10s · Ground-pressure overlay 15s · Deck POV: a cup ripples with each step 10s · Next leg starts (loop) 8s
- **Stitch plan:** 60s → **6 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical low-angle beside one leg; locked; dust plume. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '500,000 TONNES' · 'FOOT 40 M WIDE' · '6 LEGS ALWAYS DOWN'; word-by-word captions at 62–70% height.
- **Loop/ending:** Next leg starts lifting = opening frame. · **Cover text:** IT WALKS

### S05. The 5,700-Year Battery Is Real
- **Hook (verbatim):** "This battery could outlast human civilisation." · **Runtime:** 60s · **Series:** Physics Check · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: glowing diamond sliver 5s · Carbon-14 explained 15s · Half-life counter 15s · Power reality: microwatts 15s · Crystal city verdict 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical macro orbit of a diamond wafer; schematic layers; cavern city tilt-up at end. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'CARBON-14 DIAMOND' · 'HALF-LIFE 5,700 YRS' · 'POWERS A PACEMAKER, NOT A CITY' · Source: Univ. of Bristol 2024; word-by-word captions at 62–70% height.
- **Loop/ending:** Ends on the same glowing sliver. · **Cover text:** 5,700-YEAR BATTERY

### S06. Why a Teleporter Would Kill You
- **Hook (verbatim):** "Every teleporter in sci-fi is a murder machine. Here's why." · **Runtime:** 65s · **Series:** Physics Check · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: person steps in gate 5s · Scan: dissolving to particles 15s · No-cloning theorem 20s · The copy walks out 15s · Question 10s
- **Stitch plan:** 65s → **5 generations** (≈$13.37). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical symmetrical gate push; particle dissolve; second gate exit. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'NO-CLONING THEOREM' · 'ORIGINAL DESTROYED' · 'IS IT STILL YOU?'; word-by-word captions at 62–70% height.
- **Loop/ending:** Copy steps into the first gate again. · **Cover text:** IS IT STILL YOU?

### S07. Sunrise Inside a Space Habitat
- **Hook (verbatim):** "Inside a space colony, sunrise is a mirror opening." · **Runtime:** 65s · **Series:** 60-Second City · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: dark valley 5s · Mirrors rotate outside 15s · Light sweeps the valley 20s · Overlay: mirror geometry 15s · Mirrors close (loop) 10s
- **Stitch plan:** 65s → **5 generations** (≈$13.37). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical interior tilt from valley floor to overhead land; exterior mirror shot. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'DAY = MIRRORS OPEN' · YEAR 2240 · SPECULATIVE; word-by-word captions at 62–70% height.
- **Loop/ending:** Mirrors close back to darkness = first frame. · **Cover text:** SUNRISE BY MIRROR

### S08. On Venus, Air Is a Lifting Gas
- **Hook (verbatim):** "On Venus, the air you breathe would make you float." · **Runtime:** 60s · **Series:** Physics Check · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: balloon of air rising in orange clouds 6s · Density comparison overlay 16s · City envelope reveal 16s · Acid warning 12s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical rise through clouds; schematic density bars; envelope tilt-up. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'CO₂ = 44 · AIR = 29' · '50 KM UP = 1 ATM' · Source: NASA HAVOC; word-by-word captions at 62–70% height.
- **Loop/ending:** Balloon rises out of frame, next rises in. · **Cover text:** AIR FLOATS HERE

### S09. Scale Shock: A Kilometre Megatower
- **Hook (verbatim):** "This tower is taller than the Burj Khalifa, and it's a whole city." · **Runtime:** 60s · **Series:** Scale Shock · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: base with tiny people 5s · Tilt up floors counter 20s · Burj ghost 15s · Population number 10s · Tilt down loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical tilt-up 24mm continuous (chained in two beats). 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '1,200 M' · 'BURJ 828 M' · '1,000,000 PEOPLE'; word-by-word captions at 62–70% height.
- **Loop/ending:** Tilt down returns to the base. · **Cover text:** 1 BUILDING. 1 CITY.

### S10. Why Deep-Sea Cities Are Spheres
- **Hook (verbatim):** "Three kilometres down, cubes crush. Spheres survive." · **Runtime:** 60s · **Series:** 60-Second City · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: cube hull crumples (schematic) 6s · Pressure number 14s · Sphere hull holds 15s · City sphere reveal 15s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical locked schematic compression; descent to glowing sphere. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '300 ATM' · 'EVEN STRESS = SPHERE'; word-by-word captions at 62–70% height.
- **Loop/ending:** Descent restarts at the surface. · **Cover text:** SPHERES SURVIVE

### S11. The City That Outruns the Sunrise
- **Hook (verbatim):** "This city moves at walking pace, or the sun kills everyone." · **Runtime:** 60s · **Series:** Scale Shock · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: dawn line behind city 6s · Speed number 14s · Rails expanding 15s · Interior calm 15s · Dawn catches up? (loop) 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical low tracking beside wheels; dawn glare. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '430 °C DAYSIDE' · '~3 KM/H' [U] · MERCURY · SPECULATIVE; word-by-word captions at 62–70% height.
- **Loop/ending:** Ends as the dawn line nears = first frame. · **Cover text:** NEVER STOP

### S12. Solarpunk Street: What's Already Real
- **Hook (verbatim):** "Everything on this street exists today, except one thing." · **Runtime:** 60s · **Series:** 60-Second City · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: lush street 5s · Rain garden tag PROVEN 12s · Timber tower tag PROVEN 12s · Solar canopy tag PROVEN 12s · The one fiction reveal 12s · Loop 7s
- **Stitch plan:** 60s → **6 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical gimbal walk along the street; tags pop in. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** Tier chips per object · 'SPOT THE FICTION'; word-by-word captions at 62–70% height.
- **Loop/ending:** Walk ends where it began. · **Cover text:** 1 THING IS FAKE

### S13. Where a Megacity's Rain Goes
- **Hook (verbatim):** "A kilometre-tall city in a storm. Where does the water go?" · **Runtime:** 60s · **Series:** Physics Check · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: neon rain canyon 5s · Roof catchment schematic 15s · Flow number 15s · Cisterns and turbines 15s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical tilt down from rooftop to street; schematic flow overlay. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '14 M³ EVERY SECOND' · 'STORED, NOT DUMPED'; word-by-word captions at 62–70% height.
- **Loop/ending:** Drop falls from roof again. · **Cover text:** 14 TONNES/SECOND

### S14. What 1,000 km/h Feels Like in a Tube
- **Hook (verbatim):** "You're doing a thousand kilometres an hour, and your coffee doesn't spill." · **Runtime:** 60s · **Series:** Machines of Tomorrow · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: coffee cup still 5s · Launch acceleration 15s · Cruise overlay: 0.1 g limits 15s · Curve radius map 15s · Arrival (loop) 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical cabin POV; exterior tube chase. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '1,000 KM/H' · 'MAX 0.1 g SIDEWAYS'; word-by-word captions at 62–70% height.
- **Loop/ending:** Arrival settles to still cup. · **Cover text:** COFFEE STAYS PUT

### S15. 7 Days to Orbit on a Space Elevator
- **Hook (verbatim):** "The slowest, safest ride to space: one week in an elevator." · **Runtime:** 210s · **Series:** Scale Shock · **Platform:** TikTok/Reels master (>180 s). YouTube 180s cut: trim Day 2–3 to 20s, Day 4–5 to 25s, Day 6 to 30s, Day 7 to 30s, loop to 20s → 165s.
- **Beats:** Hook: climber leaves ocean platform 10s · Day 1: above the clouds 30s · Day 2–3: blackness 35s · Day 4–5: Earth shrinks 35s · Day 6: GEO station 35s · Day 7: counterweight view 35s · Loop to ocean 30s
- **Stitch plan:** 210s → **11 generations** (≈$43.20). Seamless splits: Day 2–3: blackness (35s → 30+5); Day 4–5: Earth shrinks (35s → 30+5); Day 6: GEO station (35s → 30+5); Day 7: counterweight view (35s → 30+5). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical continuous tilt-up following the ribbon; chained segments across long beats. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** Day counter · Altitude counter to 35,786 km · Source: Obayashi concept; word-by-word captions at 62–70% height.
- **Loop/ending:** Final beat drops back to ocean platform. · **Cover text:** 7 DAYS UP

### S16. Building a Moon Dome in 90 Seconds
- **Hook (verbatim):** "Watch robots build a Moon home out of dust." · **Runtime:** 90s · **Series:** Build It From Zero · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: empty crater 5s · Rovers arrive 15s · Sintering pad 20s · Printing dome courses 25s · Regolith cover 15s · Lights on 10s
- **Stitch plan:** 90s → **6 generations** (≈$18.51). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical locked wide (same camera across beats via image refs). 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** Step counter · 'MICROWAVE-SINTERED REGOLITH'; word-by-word captions at 62–70% height.
- **Loop/ending:** Final lights-on frame dissolves back to empty crater. · **Cover text:** BUILT BY ROBOTS

### S17. Would You Live in a House of Ice on Mars?
- **Hook (verbatim):** "This Martian house is made of ice, and it's warm inside." · **Runtime:** 60s · **Series:** Would You Live Here? · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: blue-lit interior 6s · Exterior ice shell 14s · Radiation overlay 15s · Morning routine 15s · Question 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical interior gimbal; exterior dome tilt. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'ICE BLOCKS RADIATION' · Source: NASA Mars Ice Home (2016); word-by-word captions at 62–70% height.
- **Loop/ending:** Back to blue interior. · **Cover text:** ICE HOUSE ON MARS

### S18. Drilling Into a Volcano for Power
- **Hook (verbatim):** "Scientists have already hit magma by accident." · **Runtime:** 60s · **Series:** Physics Check · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: drill rig at caldera 5s · Drill descends schematic 20s · Magma contact 15s · Superheated steam city 15s · Loop 5s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical drill-string descent; tilt-up to city. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'MAGMA AT 2 KM' · Iceland IDDP-1, 2009; word-by-word captions at 62–70% height.
- **Loop/ending:** Tilt back to rig. · **Cover text:** POWER FROM MAGMA

### S19. The Sphere City That Floats on Sunlight
- **Hook (verbatim):** "Big enough, and sunlight alone could float a city." · **Runtime:** 60s · **Series:** 60-Second City · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: sphere rising 6s · Square-cube overlay 18s · Sun warms interior 14s · City aloft 12s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical tilt-up tracking the rising sphere. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '1.6 KM WIDE' · '+1 °C = LIFT'; word-by-word captions at 62–70% height.
- **Loop/ending:** Sphere drifts out top, re-enters bottom. · **Cover text:** FLOATS ON SUNLIGHT

### S20. How Flying Cars Would Actually Queue
- **Hook (verbatim):** "Flying cars won't be chaos. They'll be lanes." · **Runtime:** 60s · **Series:** Machines of Tomorrow · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: chaos swarm (myth) 5s · Snap to lanes 15s · Layer altitudes 15s · Skyport landing 15s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical top-down then tilt to horizon. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'MYTH' → 'LANES' · altitude layers; word-by-word captions at 62–70% height.
- **Loop/ending:** Craft takes off back into lane. · **Cover text:** NOT CHAOS

### S21. How Fast an Asteroid Must Spin for Gravity
- **Hook (verbatim):** "Spin this rock fast enough and you can walk inside it." · **Runtime:** 60s · **Series:** Physics Check · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: asteroid spin 5s · Radius and rpm overlay 15s · Rubble flying off 15s · Bag wrap 15s · Interior walk 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical exterior orbit; interior tilt. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'R 500 M → 1.3 RPM' · 'RUBBLE FLIES APART'; word-by-word captions at 62–70% height.
- **Loop/ending:** Walk exits to the exterior spin. · **Cover text:** SPIN = GRAVITY

### S22. Titan: The Moon Where You Could Fly
- **Hook (verbatim):** "Thick air. Weak gravity. Strap on wings." · **Runtime:** 60s · **Series:** Worlds Beyond · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: flyer launch 5s · Pressure + gravity numbers 15s · Glide over lakes 20s · Cold warning 10s · Landing loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical chase behind the flyer; tilt down to methane lake. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '1.5 ATM' · '0.14 g' · '-180 °C'; word-by-word captions at 62–70% height.
- **Loop/ending:** Lands and relaunches. · **Cover text:** YOU CAN FLY HERE

### S23. A Tunnel That Floats Underwater
- **Hook (verbatim):** "Not on the seabed. This tunnel floats." · **Runtime:** 60s · **Series:** Machines of Tomorrow · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: tube in blue water 5s · Buoyancy vs weight 15s · Tethers 15s · Train passes 15s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical underwater tilt from surface to tube. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '30 M DEEP' · Norway E39 studies; word-by-word captions at 62–70% height.
- **Loop/ending:** Train exits, next enters. · **Cover text:** IT FLOATS

### S24. Bacteria That Turn Sand Into Stone
- **Hook (verbatim):** "These bacteria can turn sand into stone." · **Runtime:** 60s · **Series:** Build It From Zero · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: sand pour 5s · Microbe schematic 15s · Crystals bind grains 15s · Wall rises 15s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical macro to wide pull-back. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'MICP' · 'CALCITE GLUE'; word-by-word captions at 62–70% height.
- **Loop/ending:** Wall crumbles back to sand (reverse). · **Cover text:** SAND → STONE

### S25. The Track That Throws Ships to Orbit
- **Hook (verbatim):** "No rockets. Just a belt moving at 14 kilometres a second." · **Runtime:** 60s · **Series:** Machines of Tomorrow · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: vehicle on track 5s · Belt speed overlay 15s · Track rises to 80 km 20s · Launch 10s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical tilt-up along an arching track. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '14 KM/S' · '80 KM HIGH' · FRONTIER; word-by-word captions at 62–70% height.
- **Loop/ending:** Next vehicle enters bottom. · **Cover text:** NO ROCKETS

### S26. How Many People Fit in One Arcology?
- **Hook (verbatim):** "How many people can one building hold?" · **Runtime:** 60s · **Series:** Scale Shock · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: tower in clouds 5s · Floor count 15s · Density per floor 15s · Stadium equivalents 15s · Loop 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical tilt-up with counters. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** '1,000,000' · '= 10 FULL STADIUMS'; word-by-word captions at 62–70% height.
- **Loop/ending:** Tilt down to base. · **Cover text:** 10 STADIUMS

### S27. Farming Fish and Kelp 40 Metres Down
- **Hook (verbatim):** "Lunch in the underwater city grows outside your window." · **Runtime:** 60s · **Series:** Would You Live Here? · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: kelp window 5s · Kelp growth speed 15s · Fish pens 15s · Kitchen 15s · Question 10s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical window POV; tilt through kelp. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'KELP: 0.5 M/DAY' · YEAR 2190 · SPECULATIVE; word-by-word captions at 62–70% height.
- **Loop/ending:** Back to window. · **Cover text:** LUNCH GROWS OUTSIDE

### S28. Tour the Teleport Station That Could Exist
- **Hook (verbatim):** "This is the only teleport station physics would allow." · **Runtime:** 203s · **Series:** Machines of Tomorrow · **Platform:** TikTok/Reels master (>180 s). YouTube 180s cut: hook 8, matter 22, info 30, hub 40, hyperloop 40, board 25, loop 15 → 180s.
- **Beats:** Hook: gate glowing 8s · Why matter can't go 30s · What can: quantum info 35s · The hub: telepresence rooms 40s · Hyperloop platforms 40s · Departure board of cities 30s · Loop 20s
- **Stitch plan:** 203s → **10 generations** (≈$41.76). Seamless splits: What can: quantum info (35s → 30+5); The hub: telepresence rooms (40s → 30+10); Hyperloop platforms (40s → 30+10). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical gimbal walk through the Waystation hub; chained long beats. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** 'MATTER: FICTION' · 'INFORMATION: PROVEN' · Source: Oxford 2025; word-by-word captions at 62–70% height.
- **Loop/ending:** Walk exits through the same gate. · **Cover text:** REAL TELEPORT STATION

### S29. 5 Impossible Cities Ranked by Physics
- **Hook (verbatim):** "Five sci-fi cities. Ranked from 'buildable' to 'never'." · **Runtime:** 220s · **Series:** Physics Check · **Platform:** TikTok/Reels master (>180 s). YouTube 180s cut: hook 5, each rank 32s (160), loop 15 → 180s.
- **Beats:** Hook: five cities flash 8s · #5 Floating rock islands 40s · #4 Ring world 40s · #3 Planet city 40s · #2 Undersea bubble 40s · #1 Desert dome 40s · Loop 12s
- **Stitch plan:** 220s → **12 generations** (≈$45.25). Seamless splits: #5 Floating rock islands (40s → 30+10); #4 Ring world (40s → 30+10); #3 Planet city (40s → 30+10); #2 Undersea bubble (40s → 30+10); #1 Desert dome (40s → 30+10). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical reveal per city; meter overlay. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** Plausibility meter per city · rank numbers; word-by-word captions at 62–70% height.
- **Loop/ending:** Rank 1 dissolves to rank 5 opening. · **Cover text:** ONLY 1 IS REAL

### S30. Morning in a Solarpunk Megacity
- **Hook (verbatim):** "6 a.m., 2150. Listen." · **Runtime:** 60s · **Series:** Would You Live Here? · **Platform:** YouTube Shorts / TikTok / Reels
- **Beats:** Hook: balcony view 6s · Trams begin 14s · Rooftop farm 14s · Birds and bikes 14s · Question 12s
- **Stitch plan:** 60s → **5 generations** (≈$12.34). All beats ≤30 s (single generations). Hard cuts on beat changes, except continuous moves chained last-frame→keyframe where noted in cinematography.
- **Vertical cinematography:** Vertical balcony POV; tilt down to street. 9:16, subject in the middle 60%, HUD top-left.
- **On-screen text:** YEAR 2150 · SPECULATIVE · 'WOULD YOU?'; word-by-word captions at 62–70% height.
- **Loop/ending:** Back to balcony dawn. · **Cover text:** WAKE UP HERE

---

## Budget summary

- Long-form: 30 ideas, 15195s generated, ≈$3,125.61 (avg ≈$104.19/video).
- Short-form: 30 ideas, 2293s generated, ≈$471.67 (avg ≈$15.72/Short).
- Harvested vertical cut-downs from long-form reuse existing clips (recropped only where the subject is vertical) or add ≤20 s of native 9:16 generation each.
