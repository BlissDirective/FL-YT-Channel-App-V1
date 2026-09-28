-- Seed the five channel projects (operator decision, 2026-09-27) and put
-- The Silicon Layer on hold. Idempotent: each project is inserted only when no
-- project with that name exists, so a re-run (or a manual create) never dupes.
--
-- Full research, name shortlists, style bibles and 60 video ideas per channel:
--   docs/channels/{future-cities,tiny-worlds,what-if-earth,stick-adventures}/
-- Names are the working concept names; rename in Settings once final names are
-- chosen (recommended: Blueprint Tomorrow, Thimble Town, Earthlines, INKLIGHT).
--
-- Safety: every gate starts on "assist" (nothing publishes without approval)
-- and no Auto Pilot run is started — production begins only when the
-- operator starts it. Budgets only matter if SPEND_CAPS_ENABLED=true.

-- The Silicon Layer: on hold (paused; nothing deleted).
update projects
   set status = 'paused', updated_at = now()
 where name = 'The Silicon Layer' and status <> 'paused';

-- 1) Future Cities → recommended brand "Blueprint Tomorrow"
insert into projects (name, niche, audience, angle, tone, brand_kit, autonomy, budget,
                      max_video_usd, library_size_limit, visual_style, pipeline_mode,
                      preferred_video_model, instructions)
select 'Future Cities',
       'Megaprojects and the future of cities: new cities, supertall towers, floating cities, transport moonshots, climate-adapted infrastructure',
       'Tech- and engineering-curious viewers 18-50 who follow megaproject news and want honest, visual explainers',
       'The render vs. the reality: every megaproject shown as its promise (photoreal architectural visualization) and its real status (built, building, delayed, cancelled), fact-checked',
       'aspirational',
       $j${"primary":"#F5A524","secondary":"#0B1F3A","thumbnailStyle":"cinematic","font":"bold-sans",
           "cinemaControls":{"genre":"epic","pacing":"calm","camera_model":"modern","camera_lens":"clean-sharp","era":"2020s","color_palette":"twilight-fable"}}$j$::jsonb,
       '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}'::jsonb,
       '{"perVideoUsd":200,"monthlyUsd":10000}'::jsonb,
       200, 60, 'footage', 'autonomous', 'hf-cinema-studio-4',
       $txt$Channel bible: docs/channels/future-cities/Channel-Bible.md.
LOOK: architectural-visualization cinematography. Drone reveals, slow dolly pushes, locked before/after time-jumps, human-scale street-level shots for scale. Signature device: blueprint linework (cyan on navy) dissolving into the photoreal render. Twilight and golden hour for hero shots, noon for clarity. Palette: Blueprint Navy #0B1F3A, Blueprint Cyan #3FA9F5, Solar Amber #F5A524, Paper White #F4F6F8. No real people's faces or likenesses.
STRUCTURE: cold-open hook (the most striking render plus one surprising number) → the promise → how it would work → the reality check (status stamp: BUILT / BUILDING / DELAYED / CANCELLED) → what it means for real cities → forward-looking close. A pattern interrupt every 45-60s.
NARRATION: warm, resonant baritone documentary narrator, neutral transatlantic accent, about 150 WPM, awe held in restraint, dry wit (about one wry line per 90s). Banned words: insane, mind-blowing, crazy.
ACCURACY: verify every project's status, cost, height and dates. Clearly label renders as concepts, never as real footage of a site. Include sources in the description.
SHOTS: write each section as continuous camera motion that can span 30s generations (seamless stitching).$txt$
where not exists (select 1 from projects where name = 'Future Cities');

-- 2) Tiny Worlds → recommended brand "Thimble Town"
insert into projects (name, niche, audience, angle, tone, brand_kit, autonomy, budget,
                      max_video_usd, library_size_limit, visual_style, pipeline_mode,
                      preferred_video_model, instructions)
select 'Tiny Worlds',
       'Cozy miniature diorama worlds: tiny shops, tiny towns and tiny seasons, with tilt-shift macro cinematography and ASMR foley',
       'Global, all-ages cozy/comfort viewers; relaxation, study and sleep audiences; miniature and diorama fans',
       'A living miniature town with recurring tiny residents and gentle story arcs (not repetitive loops). Mostly wordless, with a soft-narrated storybook series',
       'calm',
       $j${"primary":"#F2B35E","secondary":"#2E3A55","thumbnailStyle":"cinematic","font":"bold-sans",
           "cinemaControls":{"genre":"drama","pacing":"calm","camera_model":"35mm-film","camera_lens":"warm-vintage","color_palette":"a-dream-in-color"}}$j$::jsonb,
       '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}'::jsonb,
       '{"perVideoUsd":200,"monthlyUsd":10000}'::jsonb,
       200, 60, 'footage', 'autonomous', 'hf-seedance-2-5',
       $txt$Channel bible: docs/channels/tiny-worlds/Channel-Bible.md.
LOOK: tilt-shift macro miniatures with shallow depth of field and handmade figurine textures (needle-felt, painted resin, clay). Warm practical lamps glow inside tiny buildings. Golden hour is the default for exteriors. Palette: Lantern Amber #F2B35E, Honey #E8A94B, Terracotta #C8643B, Cream Linen #F6EAD3, Sage Moss #9DB28A, Night Ink #2E3A55 (never pure black). Slow macro dollies, gentle push-ins, top-down builds. Never fast or shaky.
RECURRING RESIDENTS (paste descriptors verbatim; outfits never change except additive seasonal layers):
- MISO: field-mouse ramen cook, fawn-cream felt fur, pale pink round ears, navy headband, rust-terracotta half apron over a cream linen shirt, about 3 cm.
- BRAMBLE: elderly hedgehog baker, brown-grey quills with cream tips, round gold spectacles, sage-green knit cardigan, flour-dusted cream apron.
- LUMEN: snail lamplighter, honey-amber clay shell with a cream spiral, sage-grey body, tiny brass lantern on the shell, navy peaked cap; lights the street lamps at dusk.
- WREN: wren postbird courier, chestnut felted feathers with cream barring, terracotta leather satchel, often carrying an envelope.
Residents never speak; they act through posture and props. Walk-on characters rotate.
STORY: every episode has its own small arc (an order, a problem, a visitor, a season change). No repetitive loops.
AUDIO: ASMR foley first (sizzle, pour, rain on tin roofs, clockwork). Lo-fi, music box or acoustic beds. Optional narrator: a warm, unhurried bedtime storyteller in their 60s, soft close-mic, about 120 WPM.
PRODUCTION: animate a keyframe still per section (Seedance image-to-video). Keep sets and characters identical across stitched 30s segments.$txt$
where not exists (select 1 from projects where name = 'Tiny Worlds');

-- 3) What If Earth → recommended brand "Earthlines"
insert into projects (name, niche, audience, angle, tone, brand_kit, autonomy, budget,
                      max_video_usd, library_size_limit, visual_style, pipeline_mode,
                      preferred_video_model, instructions)
select 'What If Earth',
       'Planet-scale "what if" simulations: altered orbits, climate extremes, lost Moons, alternate and future Earths, told as scientific timelines',
       'Broad, curious viewers 12-40 who search science questions; education and space/earth-science fans',
       'Our planet, altered: every episode escalates along a T+ timeline (seconds to millions of years) with defensible science and cited sources',
       'curious',
       $j${"primary":"#FFB547","secondary":"#05070D","thumbnailStyle":"cinematic","font":"bold-sans",
           "cinemaControls":{"genre":"epic","pacing":"calm","camera_model":"modern","camera_lens":"anamorphic","era":"2020s","color_palette":"static-noon"}}$j$::jsonb,
       '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}'::jsonb,
       '{"perVideoUsd":200,"monthlyUsd":10000}'::jsonb,
       200, 60, 'footage', 'autonomous', 'hf-cinema-studio-4',
       $txt$Channel bible: docs/channels/what-if-earth/Channel-Bible.md.
LOOK: photoreal planetary cinematography. NASA-style orbital views with the limb in frame, IMAX landscape scale, and a physically plausible single-sun key. The day/night terminator line is the signature light. Beat grammar: orbital establishing (locked or ultra-slow push), ground-level human-scale wide (tiny figure, no face close-ups), macro evidence details, locked time-lapses, at most 1-2 disaster peaks per episode, and a slow crane-up aftermath reveal. Palette: space-black #05070D, orbit-navy #0B1B2E, limb-cyan #4FD1FF, t-plus-amber #FFB547, magma-red #FF4A2E, biome-green #3FD98A.
STRUCTURE: cold-open question plus the most striking image → the trigger event → a T+ clock escalation (T+1 second, 1 day, 1 year, 1,000 years, 1M years) → the new equilibrium → a closing "next question". Keep the planet's state consistent within each timeline stage.
NARRATION: mid-range warm baritone or alto, neutral mid-Atlantic accent, close-mic documentary intimacy, about 150 WPM, gentle upward curiosity on questions, restrained awe on big numbers. No hype.
ACCURACY: speculative framing always explicit. Verify key science facts and cite sources in the description. Label realistic depictions of real places or disasters as altered/synthetic.
SHOTS: write continuous camera motion that spans 30s generations (seamless stitching).$txt$
where not exists (select 1 from projects where name = 'What If Earth');

-- 4) Stick Adventures → recommended brand "INKLIGHT"
insert into projects (name, niche, audience, angle, tone, brand_kit, autonomy, budget,
                      max_video_usd, library_size_limit, visual_style, pipeline_mode,
                      preferred_video_model, instructions)
select 'Stick Adventures',
       'Hyper-detailed cinematic stick-figure mini-movies: action, comedy and heart in rich 3D worlds, with a recurring original cast',
       'Animation, gaming-adjacent and adventure fans 8-35 who love stick-fight action, episodic stories and characters',
       'Episodic mini-movies (seasons and arcs) starring an original ink-and-light stick cast inside cinematic 3D worlds. Every episode is a distinct story',
       'aspirational',
       $j${"primary":"#22D3EE","secondary":"#0B0B0F","thumbnailStyle":"dramatic","font":"bold-sans",
           "cinemaControls":{"genre":"action","pacing":"dynamic","camera_model":"modern","camera_lens":"anamorphic","color_palette":"neon-rain-at-midnight"}}$j$::jsonb,
       '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}'::jsonb,
       '{"perVideoUsd":200,"monthlyUsd":10000}'::jsonb,
       200, 60, 'footage', 'autonomous', 'hf-seedance-2-5',
       $txt$Channel bible: docs/channels/stick-adventures/Channel-Bible.md. Rendered with AI video (NOT the programmatic stick renderer).
LOOK: glossy black ink stick figures with round heads, glowing eyes and colored emissive rim light, inside hyper-detailed cinematic 3D environments with volumetric light. Impact frames and speed lines rendered as light trails. Palette: Ink Black #0B0B0F plus each character's glow color.
CAST (paste descriptors verbatim in every prompt that features them):
- BOLT: average-height black ink stick figure, round glossy head, electric cyan (#22D3EE) glowing eyes and rim light, long flowing cyan scarf that trails light. Brave, impulsive hero.
- PIP: short black ink stick figure (half Bolt's height), round glossy head, amber (#FFB020) glowing eyes and rim light, oversized brass aviator goggles on the forehead, boxy amber backpack with antennae. Anxious gadget genius.
- NOVA: tall slender black ink stick figure, round glossy head, magenta (#FF3DA5) glowing eyes and rim light, a curved topknot line, glowing magenta bo staff. Calm, deadpan fighter.
- BRICK: large black ink stick figure with thick heavy limbs, round glossy head, lime green (#7CFF4F) glowing eyes and rim light, lime visor band. Gentle giant.
- SMUDGE (villain): tall black ink stick figure whose body constantly drips and smears ink, jagged three-point crown spike, crimson (#FF2E3A) glowing eyes and rim light, smeared ink footprints. Theatrical, redeemable.
CAMERA: action uses tracking shots, whip pans, low angles and slow-motion hero beats. Comedy uses locked-off wides and snap zooms. Plan fights in 30s beats so segment boundaries land on natural motion beats.
VOICE: mostly wordless action with a narrator, "The Author" (warm, wry storybook-meets-trailer voice, 140-150 WPM). Characters speak at most 1-2 lines per scene of 8 words or fewer (no mouths, so no lip-sync).
CONTENT: original characters only; cartoon violence only (ink and light sparks, no blood, no real weapons). Every episode has a distinct storyline.$txt$
where not exists (select 1 from projects where name = 'Stick Adventures');

-- 5) App Testing Lab: personal experimentation channel (no seeded ideas).
insert into projects (name, niche, audience, angle, tone, autonomy, budget,
                      max_video_usd, library_size_limit, visual_style, pipeline_mode,
                      preferred_video_model, instructions)
select 'App Testing Lab',
       'Experimentation channel for in-development apps and side projects',
       'Internal: the operator testing new ideas, formats and apps',
       'Sandbox. Ideas are fed in manually; nothing is planned or auto-seeded',
       'authoritative',
       '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}'::jsonb,
       '{"perVideoUsd":200,"monthlyUsd":10000}'::jsonb,
       200, 100, 'footage', 'autonomous', 'hf-cinema-studio-4',
       $txt$Personal experimentation channel for in-development apps and side projects. The operator supplies every idea manually. Do not auto-generate topics or calendars for this channel.$txt$
where not exists (select 1 from projects where name = 'App Testing Lab');
