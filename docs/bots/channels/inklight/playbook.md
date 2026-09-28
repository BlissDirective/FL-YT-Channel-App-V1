# INKLIGHT: Channel Playbook

**Channel:** INKLIGHT (working title "Stick Adventures"). Tagline: **"INKLIGHT · Stick-Figure Mini-Movies."**
**What it is:** episodic, cinematic stick-figure mini-movies with action, comedy and heart. A recurring original cast of glossy ink stick figures lives inside hyper-detailed, volumetrically lit 3D worlds.
**Default model:** Seedance 2.5 i2v (`hf-seedance-2-5`) for any shot with cast. Cinema Studio 4.0 (`hf-cinema-studio-4`) for action set-pieces and 4–5-character shots.
**Voices:** all six are saved: `N` (narrator, "The Author"), `Pip`, `Brick`, `Bolt`, `Nova`, `Smudge`.

This playbook holds the channel-specific knowledge. The shared operating rules win on any conflict.

---

## 1. Channel identity

**Promise to the viewer:** a real cast you get to know (Bolt, Pip, Nova, Brick, and the villain Smudge) in big, beautifully lit worlds, with readable fights, well-timed gags and one lore thread per video. Every video is a distinct, authored story that also works on its own.

**Audience:** core 13–35, gaming-adjacent (Minecraft, Roblox, fighting games, anime). Teens and young adults come for fights and lore; younger viewers for gags and characters. Channel designation: **not made for kids** (PG peril, villain menace, teen/adult humour). Wordless-leaning action travels globally.

**Tone:** PG action-comedy with heart. Storybook-meets-trailer narration, sparse character lines, comedic timing with beats of silence.

**INKLIGHT individualization layer (every format):**
1. **Ink and light only.** Glossy black tube bodies with emissive rims in hyper-real lit worlds; tiny heroes against huge sets (scale is the thumbnail). **Rim brightness is the emotion meter:** dim = hurt or scared, flare = inspired. Every fight and gag states its rim cue.
2. **Recurring cast, each format owned by a lead:** pilot/ensemble = Bolt · action = Nova · escalation comedy = Pip · heart/horror-lite = Brick. A name tag (accent colour) at each character's first appearance per video.
3. **Lore:** every video drops exactly **one** lore beat (the First Draft, the Nib shards, Smudge watching) and stays watchable standalone. **No episode numbers on screen** (canon order is fixed after the test batch).
4. **Sound identity:** the signature **drip-tink** (ink drip + glass tink) on the ident, on every Nib or shard appearance, and as the **first sound of every Short**. Leitmotifs: Bolt = rising brass 4-note, Pip = marimba, Nova = koto-synth, Brick = tuba, Smudge = detuned music box. Hits are glassy tinks, never flesh.
5. **Editing signature:** rim flares land on music downbeats; hard cut to black on cliffhangers, then the drip-tink.

**What we never do:**
- Imitate Alan Becker's cast or premise (colour-named stick groups with a cursor antagonist, animator-vs-creation, desktop world), Henry Stickmin, Minecraft/Roblox/Nintendo assets, franchise crossovers ("X vs Goku"). Never name a franchise, studio or artist style in a prompt. Avoid "Animator vs", "Animation vs", "Stickmin", "Henry", "Stick Fight" in titles.
- Faces, mouths, noses, teeth, skin, hair, fingers (except three rounded nubs in close-ups).
- Blood, gore, dismemberment, realistic weapons or guns, weapons aimed at camera, suffering close-ups. Ink splashes turn into light sparks; knockouts are comedic.
- Flat, white or empty backgrounds (reads as slop). A "montage of only hits" Short: every fight has setup and a punchline or cliffhanger.
- Deepfake-style real actors or IP (the Seedance-era viral trend we must never emulate).
- Kid-bait titles, nursery music, "for kids" framing.
- Swapped accessories, shared accent colours, or two characters looking alike.

---

## 2. Look & sound bible

### 2.1 Locked prompt blocks (paste verbatim, never paraphrase)

**STYLE_LOCK** (starts every video and keyframe prompt):
> Cinematic 3D animated film. The characters are stylized stick figures: glossy matte-black ink bodies with uniform thin cylindrical limbs, perfectly round glossy black heads with no facial features except two small glowing oval eyes, and a thin emissive rim light in each character's signature color. They are set inside a hyper-detailed, physically lit 3D environment with volumetric light shafts, atmospheric haze, real materials, shallow depth of field and film-grade color grading.

**NEG** (ends every video prompt):
> Avoid: text, letters, numbers, logos, mouths, noses, teeth, human faces, skin, hair, clothing beyond the listed accessories, extra limbs, fingers except three rounded nubs in close-ups, blood, gore, flat or empty backgrounds.

**SOUL_GUARD** (appended to every keyframe prompt, after NEG; SOUL is portrait-trained):
> stick figure, NOT a human, no face, no skin, no clothing except listed accessory

For Shorts the produced keyframes end with `Vertical 9:16 frame.` and the prompts say `Vertical frame.` before the scene.

Cast descriptors (DESC_*) are in §3. **Prompt assembly order:** `STYLE_LOCK + DESC_<each on-screen character> + SCENE + ACTION + CAMERA + LIGHT + NEG`. Name only characters who are in frame. Restate held props every prompt ("holding the glowing magenta bo staff in her right hand").

### 2.2 Palette and typography
| Token | Hex | Use |
|---|---|---|
| Ink Black | `#0B0B0F` | Bodies, logo |
| Bolt Cyan | `#22D3EE` | Bolt, brand primary |
| Pip Amber | `#FFB020` | Pip |
| Nova Magenta | `#FF3DA5` | Nova |
| Brick Lime | `#7CFF4F` | Brick |
| Smudge Crimson | `#FF2E3A` | Villain, danger (also the "DO NOT PRESS" label) |
| Deep Night | `#0E1630` | Backgrounds, end screens |
| Paper Cream | `#F3E9D2` | Sketchbook/lore motifs, title cards |
| Volumetric Gold | `#FFD27A` | Light shafts, hero moments |
| Grey extras | `#9AA4B2` | Goons, grey Inklings, guests' rims |

Fonts (render side): Bungee (logo/episode cards), Anton (thumbnails, ≤3 words, white with 8px Ink Black stroke and accent glow), Inter SemiBold (captions and name tags).

### 2.3 World rules
- The heroes are **Inklings**, figures that escaped the margins of a lost sketchbook called the **First Draft**. Each world ("Page") renders more real than the last. **Smudge** is the eraser-born rival who wants to be the Draft's only author.
- **Season 1 "The Margin Lands":** canyon, jungle temple, sky-rail, desert, frozen peak; MacGuffin = the **Nib**, a glowing pen-tip that can draw doors between Pages (found as shards). Season 2 "Neon Rift": vertical cyber-megacity. Season 3 "The Last Page": mythic finale.
- Inklings can't bleed: hits make ink splashes that evaporate into light sparks. Rim light dims when hurt or sad, flares when inspired.
- Environments are photoreal-adjacent, never flat ("Pixar lighting on a Blade Runner or Zelda set"). Scale contrast: tiny heroes, enormous worlds.

### 2.4 Camera grammar
- **Action:** side-scrolling tracking at hero speed (21:9 feel for chases); whip pans between attacker and target; low angles (knee height, 24mm) for entrances; one slow-motion hero moment per episode ("slow-motion speed ramp, 120fps feel"); orbit / 180° arc around a clash; overhead god shot for geography. Fight rhythm: wide for geography → close for impact → wide for consequence; attack → counter → reversal every 3–6s.
- **Comedy:** locked-off wide (setup and punchline in one frame), snap-zoom onto the reaction, hard cut to aftermath, beat of silence (0.5–1s) before the punch, rule of three. Dutch tilt only for Smudge.
- **Always:** one clear action per shot (multiple actions warp limbs); cut on motion, never mid-still; keep screen direction constant (hero moves left→right unless a reversal flips it).

### 2.5 Model choice per shot type
| Use | Model | Settings |
|---|---|---|
| Any shot with 1–3 cast (dialogue, comedy, heart) | Seedance 2.5 i2v | `keyframePrompt` = literal first frame; optional `endFrame` landing pose; `generateAudio` false for dialogue scenes |
| Environment-only establishing | Seedance 2.5 (t2v or i2v) | `generateAudio: true` allowed for ambience-only shots |
| Action set-pieces, 4–5 cast, crowds | Cinema Studio 4.0 with `refs` | `genre: action` (`comedy` for gag set-pieces), `pacing: dynamic` (`chaotic` only for melee peaks, `single-shot` for slow-mo hero moments), `camera_model: modern`, `camera_lens: anamorphic` |

- **Max 3 named cast per Seedance shot.** 4–5 cast → Cinema with refs. Identical grey extras count as a "crowd prop" but flag the shot as higher risk.
- **Cinema refs order is fixed:** 1 Bolt, 2 Pip, 3 Nova, 4 Brick, 5 Smudge, then environment/guest refs as 6+. Always pass all five cast refs so indices never shift, and use `<<<image_N>>>` only for on-screen characters, followed by their DESC text. Batch-01 scripts used `refs/inklight/ref-bolt.png`, `ref-pip.png`, `ref-nova.png`, `ref-brick.png`, `ref-smudge.png`, plus `env-*.png`, `ref-grey.png`; reuse existing ref paths, don't regenerate them.
- **Cinema at 9:16 is unverified.** Every Cinema beat in a Short needs a Seedance 9:16 fallback plan (a keyframe prompt ready).
- Cinema cannot chain from the previous clip's last frame. Seedance sections >30s chain automatically.

**Cinema palette mapping:** `the-emerald-ambush` jungle/ambush · `highway-standoff` desert, sky-rail, train, canyon · `neon-rain-at-midnight` Season 2 city · `after-dark` night, stealth · `bubblegum-boulevard` comedy, Pip Shorts · `a-dream-in-color` dream/flashback, warm campfire · `the-crimson-ballet` Smudge showdowns, arena fights · `static-noon` deadpan comedy. On Seedance, put the grade in the prompt's light words ("bright candy lighting").

### 2.6 Audio
- **Native audio:** off for dialogue scenes (voices are laid on top); on only for ambience-only establishing shots.
- **Music:** hybrid orchestral-electronic for action (taiko, brass stabs, synth arps); pizzicato plus clarinet for comedy; leitmotifs per character (above). When music must stop dead on a cue (the CLICK in S01), don't use `music`: place timed SFX music cues (S01 used a 20s "playful noodling solo clarinet" SFX cue). Use `music` only for a continuous bed.
- **SFX:** ink drips and splashes (signature), light-trail "vwoom" whooshes, glassy impact tinks (never flesh), sub-drops for power-ups, cartoon boing and record-scratch for comedy. Proven prompts: drip-tink `"a single glossy ink drip falling and landing, followed by one bright crisp glass tink, clean and close"` (batch standard) or S01's `"a single tiny water drip tink, crisp and bright"`; fights `"stick-figure fight: fast whooshes, scarf whips, bright glassy impact tinks, no flesh hits"`. Reuse the exact same prompt string so the signature sounds stay identical.
- **Mix targets (Bible):** music ducked −10 dB under voice; −16 LUFS integrated.

### 2.7 Labels, captions, FX
- **Name tags:** first appearance per video, character name in caps in its accent colour, ~2s (e.g. `BOLT` `#22D3EE`).
- **Gag labels** tracked to props: `DO NOT PRESS` (lower-third, `#FF2E3A`); counters (`1 vs 20`, `20→15`), floor indicators, `PART 1/3`, `PART 2 →`. Narrative asides as `caption-bold` in the speaker's colour ("he's fine." amber, "he pressed it" lime). A `…` title beat after a punchline.
- **Snap-zooms** replace cuts in locked-off gags: `toScale 1.35, overSec 0.2, holdSec 0.6–1.2` on reactions (Pip's eyes).
- **Captions:** Shorts burned-in (`captions: true`), highlight words in the speaker's colour (`cast` colours). Long-form: `captions: false` (SRT uploaded instead).
- **Impact frames, ink-bloom wipes, record-scratch freezes** are brief/Remotion devices the directed pipeline doesn't render. Approximate them with a hard cut on the hit, a short snap-zoom, a glassy SFX, and `whip` transitions. Don't write them into prompts.

### 2.8 Sting / ident / outro / watermark
- **Shorts:** frame 1 is the hook; the first sound is the drip-tink. `sting` 0.5s after the hook (S01: `at 5.4`). Watermark on for the whole Short. Loop Shorts: `outro {mode: "overlay", sec: 2.5, cta: "Full episode: <long-form title>"}` plus `endFrame {fromSection: 0}` on the last section. Cliffhanger Parts: end on the freeze-frame beat with a `PART 2 →` label and a `card` outro pointing to the related long-form.
- **Long-form:** cold open first, then the **ident (5s)**, never at 0:00. Ident prompt (Seedance t2v, 16:9): `Macro shot, a single glossy black ink drop falls onto dark wet glass and splashes; the splash rebounds into bold thick letter shapes; cyan, amber, magenta and lime emissive light trails race around the edges; volumetric haze; black background.` The real INKLIGHT logotype is a label; the plate's letter shapes must not read as letters. **Outro 18s:** 0–6s "NEXT TIME" teaser (3s of the next episode's best frame) with `NEXT: <TITLE>`, then a 6–18s end screen on Deep Night with cast silhouettes; narrator: *"The page isn't finished. Neither are we."* Generate the ident and end plate once and `reuse` them.

---

## 3. Cast & voices

### 3.1 Locked cast descriptors (verbatim)
| Character | DESC (paste verbatim) | Personality / role |
|---|---|---|
| **BOLT** | `BOLT: an average-height black ink stick figure with a round glossy head, electric cyan (#22D3EE) glowing eyes and rim light, a long flowing cyan scarf that trails light when moving` | Brave, impulsive, big-hearted, bad at plans. Hero and leader. |
| **PIP** | `PIP: a short, small black ink stick figure (half BOLT's height) with a round glossy head, amber (#FFB020) glowing eyes and rim light, oversized brass aviator goggles on the forehead, a boxy amber backpack with antennae` | Anxious genius, gadget inventor, pure heart. Comic relief; most merchable. |
| **NOVA** | `NOVA: a tall slender black ink stick figure with a round glossy head, magenta (#FF3DA5) glowing eyes and rim light, a single curved topknot line rising from the head, carrying a glowing magenta bo staff` | Calm, dry wit, disciplined martial artist. Straight man to Bolt. |
| **BRICK** | `BRICK: a large black ink stick figure with thick heavy limbs (three times normal thickness) and a round glossy head, lime green (#7CFF4F) glowing eyes and rim light, a lime visor band across the eyes` | Gentle giant; loves snacks and small animals; scared of the dark. |
| **SMUDGE** | `SMUDGE: a tall black ink stick figure whose body constantly drips and smears ink, a round head with a jagged three-point crown spike, crimson (#FF2E3A) glowing eyes and rim light, leaving smeared ink footprints` | Theatrical, jealous, funny-scary; wants to "redraw" the world. Recurring villain. |

**Extras (batch locks, per-episode only):**
- `GOON: a grey ink extra, a plain black ink stick figure with a round glossy head, steel-grey (#9AA4B2) glowing eyes and rim light, crimson ink smears on the shoulders, no accessories` (Smudge's henchmen)
- `GREY INKLING: a plain black ink stick figure with a round glossy head, steel-grey (#9AA4B2) glowing eyes and rim light, no accessories` (neutral crowd/sparring)
- `PEBBLE: a baby ink-mole about the size of PIP, a round velvety matte-black ink body, broad spade-shaped digging paws, a small pointed snout with no mouth, two tiny soft pearl-white glowing eyes and a faint pearl-grey (#9AA4B2) rim light` (L04 guest; locked for that episode, not recurring unless the director promotes it)

**Silhouette test:** each character reads as a pure black shape: scarf / goggles + backpack / topknot + staff / thick limbs / crown spike. Never give two characters the same accent colour; never swap accessories; Pip ≤ half Bolt's height; Brick's limbs 3× thick; Bolt is the only scarf.

### 3.2 Voices
| Speaker key | Persona | Pace | Voice direction | Status |
|---|---|---|---|---|
| `N` | "The Author": warm, wry adult storyteller who secretly wrote the First Draft | 140–150 (160 in action) | "Mid-40s male or female, rich mid-low timbre, intimate storybook warmth with trailer gravitas, dry comedic asides, clean studio, no reverb." | Saved |
| `Pip` | Nervous genius | 185 | "Small, quick, higher pitch, rapid technical mumbling, gasps, adorable panic." | Saved |
| `Brick` | Gentle giant | 110 | Bible: "Deep, slow, soft, childlike wonder, whispers when scared." (Voice Design blocks "childlike"; the working phrasing is "gentle giant, innocent sense of wonder".) | Saved |
| `Bolt` | Eager hero | 170 | "Young adult, bright, breathless, earnest, voice cracks when excited." | Saved |
| `Nova` | Cool fighter | 130 | "Low, controlled, deadpan, economical, a faint smile in the voice." | Saved |
| `Smudge` | Theatrical villain | 125 | "Velvety, operatic, sing-song menace, stretched vowels, sudden snarls." | Saved |

- All six speakers have saved voices (brand-locked). Keep character lines sparse; the narrator carries exposition.
- `cast` colours in the script: `{"Pip": {"color": "#FFB020"}, "Brick": {"color": "#7CFF4F"}}` (add `"N"` when narrated; the batch left N uncoloured).
- **Dialogue rules:** mostly wordless action; characters speak sparingly: **1–2 lines per scene, each ≤ 8 words.** No lip-sync (no mouths): emotion comes from eyes (squash to lines for blinks, arcs for joy, wide circles for shock), head tilt and posture. The narrator frames acts; keep narration light (~200 words in a pilot; sparse elsewhere).
- **Timing:** the estimate checks lines at **169 wpm**. Budget Brick's lines at his real 110 wpm (8 words ≈ 4.4s) so the next line doesn't collide; Pip at 185 wpm. The brief's delivery notes ("whisper", "muffled", "falling") have no script field, and `text` is spoken verbatim, so never write stage directions into `text`; carry the delivery with the words themselves and the SFX.

---

## 4. Formats that work

Cut rates are the brief's targets (not measured frame-by-frame).

### Long-form (16:9, 7–10 min; test-batch episodes trimmed to 7–8.5 min)
| Format | Reference | Hook (first 1–3s) | Structure / pacing | Payoff / ending | Our layer |
|---|---|---|---|---|---|
| **F3 Indie pilot / lore drop** | *Amazing Digital Circus* pilot (400M+), *Murder Drones* pilot (83M+) | Cold open mid-threat + one narrated premise line | Premise → world breaks → cast forced together → first villain glimpse; 10–18 cuts/min dialogue, 25+ in action | Climax ~80%; **cliffhanger in the last 20s**; end screen to next episode | Bolt-led ensemble; name tags at first appearance; Smudge glimpse |
| **F1 Escalating rules** | *Animation vs. Math* (14 min, 26M in month 1) | Protagonist touches the "rule object" in frame 1; first consequence by 2s | Rule scales up every 60–90s; 12–20 cuts/min with long single-take gags; ~1 new idea/min | Biggest escalation ~80%; callback in last 10%; final image re-uses the opening object | Pip-led comedy (e.g. "Ding. Nine Bolts.") |
| **F2 Gauntlet / ride chaos** | *Cave Spider Roller Coaster* (8 min, ~522M) | Already moving at speed in frame 1 | Chain of worsening obstacles; mishap flips advantage every 20–40s; 20–30 cuts/min | Set-piece peak at 75–85%; comedic tag | Nova-led action; constant forward motion; a gag after every scare |
| **F7 Authored AI mini-film / heart** | *Neural Viz* | Spectacle plus a character beat | Standard 3-act, recurring lore, hand-cut timing | Standard | Brick-led heart / horror-lite; low light hides artifacts |

Long-form rules: set-piece every 2–3 min with a comedic breather after each; climax at 75–85%; exactly one slow-mo hero moment; ends on an open question (villain reveal, a door opening, someone missing). Fight beats ≤30s each: standoff (4–8s) → exchange A (20–30s, ends on a bind) → reversal (15–30s, ends on a fall/jump apex) → hero moment (6–10s, Cinema `single-shot`) → finisher + aftermath (8–15s).

### Shorts (9:16 native; 20–45s loop best, standalone 60–90s, full fights up to 3 min)
| Format | Hook | Pacing / escalation | Ending | Title/cover |
|---|---|---|---|---|
| **F6 Gag loop** (Pencilmation, brainrot completion) | Temptation or absurd premise with a clear rule ("DO NOT") in frame 1 | Locked-off; snap-zooms as cuts; rule of three (setup, repeat, subvert); beat of silence before the punch | Punchline at 55–85%; last frame = first frame + verbal callback | Rule-as-title; cover = the forbidden object |
| **F5 Stick-fight "1 vs N"** | Hero surrounded, first strike ≤2s, number on screen | 40–60 visual changes/min; waves grow (5 → 10 → pile); reversal ~65% | Finisher ~80%, then a gag; last enemy resets the circle → frame 1 | "1 vs 20"; hero centred in a ring |
| **F4 Micro-drama Part N** | Conflict or shock ≤3s; recap ≤3s on Part 2+ | 30–40 cuts/min; 2–3 tension beats in 40–50s; open question every 10–15s | Cliffhanger at 90–95%, freeze-frame, "Part 2 →" | "(Part 1)" in title; cover = frozen peril |
| **F6×F5 implied fight** | Symmetrical frame, the fight is heard, not shown | Static frame; comedy lives in the holds | Loop on the closed doors | "She Took the Elevator With 12 Bad Guys" |

Proven in batch 01: **S01 "The Button Said DO NOT PRESS"** (F6, Pip + Brick, 68s, Seedance only, 5 sections, loop). Shorts mechanics: swipe decided in 1–3s (targets ≥80% held at 3s, ≥60% at midpoint, ≥70% APV); change something every 1–2s; a micro-loop every 5–8s; verbal callback + visual match cut is the strongest loop.

**Titles:** `[stakes verb / object] + [twist]`, ≤60 chars ("The Stick Figures Found a Door to Another World"). Add "| Stick Figure Mini-Movie" on 1 in 3 uploads (A/B). Thumbnails: one hero mid-action, one huge threat/object, ≤3 words.

---

## 5. Script-writing recipe

1. **Pick the idea, the format card and the lead.** Check the cast against available voices (§3.2). Write the ending first (loop frame or cliffhanger).
2. **Beat sheet.** Shorts: 4–6 sections of **8–30s** (S01: 10, 20, 10, 20, 8). Long-form: sections of 15–90s (≈11 sections for ~8 min), split into `segments` of 15–30s. Put every segment boundary on a natural motion beat (a leap apex, a staff lock, a landing, a whip pan), never mid-punch.
3. **One prompt per segment.** Sections >30s must use `segments`: a list of {sec 4–30, prompt} that adds up to the section's seconds. Each segment gets its own verbatim prompt and starts from the previous segment's last frame (Cinema Studio can't truly continue a frame, so its segment prompts must each stand alone). Put every segment boundary on a natural motion beat. `estimate_directed` warns about any >30s section without segments. Landed segments are saved, so a retry never pays for them twice.
4. **videoPrompt:** `STYLE_LOCK` + DESC of each on-screen character (Cinema: `<<<image_N>>>` before each DESC) + `Vertical frame.` (Shorts) + one scene sentence with ONE clear action + camera + light + `NEG`. Cinema sections add `controls` (genre / pacing / camera_model / camera_lens / color_palette) and `refs`.
5. **keyframePrompt** (Seedance sections): the section's first-frame composition = same blocks + `SOUL_GUARD` (+ `Vertical 9:16 frame.` for Shorts). `endFrame {fromSection: 0}` for a loop; `endFrame {prompt}` for a landing pose that the next section starts from.
6. **Lines:** N/Pip/Brick only, ≤8 words each, `at` placed on the beat (a punchline after a 0.5–1s silence). Check fit at 169 wpm and at the speaker's real pace.
7. **SFX:** drip-tink at 0.0 of every Short; ambience beds; comedic hits; if music must stop on a cue, use SFX music cues (not `music`).
8. **Labels:** rule/prop labels, name tags, counters, asides. **Zooms:** reaction snap-zooms that end ≥0.1s before the section ends (S01's first draft lost a 19s zoom in a 20s section).
9. **Top level:** `cast` colours, `sting` (0.5s after the hook), `outro`, `watermark: true`, `captions` (true Shorts / false long-form), `qc` (global gate + this video's risks), `altTitles` ×2, description, tags.

**Example excerpt (S01, produced and approved):**
```json
{
  "label": "S1 Just a look", "sec": 10, "model": "hf-seedance-2-5",
  "lines": [{ "speaker": "Pip", "text": "...Just a little look.", "at": 1.5 }],
  "videoPrompt": "<STYLE_LOCK> <DESC_PIP>. Vertical frame. In a bright pastel-colored room with a polished floor, Pip stands before a huge glossy blank red button on a pedestal, his hand hovering just above it; he leans closer, his goggles reflecting the red. Locked-off vertical wide shot, static camera, button in the lower third, bright candy lighting. <NEG>",
  "keyframePrompt": "<same as videoPrompt> stick figure, NOT a human, no face, no skin, no clothing except listed accessory. Vertical 9:16 frame.",
  "sfx": [
    { "at": 0, "prompt": "a single tiny water drip tink, crisp and bright", "durationSec": 1, "gainDb": -6 },
    { "at": 0, "prompt": "low steady electrical hum of a big machine, cartoon lab ambience, seamless", "durationSec": 10, "gainDb": -18 }
  ],
  "labels": [{ "at": 0.5, "durationSec": 9.5, "text": "DO NOT PRESS", "position": "lower-third", "style": "label", "color": "#FF2E3A" }],
  "zooms": [{ "at": 4.5, "toScale": 1.35, "overSec": 0.2, "holdSec": 1.2 }]
}
```
(`<STYLE_LOCK>`, `<DESC_PIP>`, `<NEG>` stand for the full verbatim blocks; the real script pastes them in full.) S3 puts the CLICK SFX at 7.2s and a centred `…` title at 8.2s; S4 carries Pip's "BRIIIICK!" with klaxon, confetti, falling-whistle and kazoo SFX cues; S5 (8s) ends with `endFrame {fromSection: 0}` and the hum returning to bridge the loop. Top level: `sting {at: 5.4, sec: 0.5}`, `outro {mode: "overlay", sec: 2.5, cta: "Full episode: Pip Built a Copy Machine. Now There Are Nine Bolts."}`, `watermark: true`, `captions: true`, no `music` (SFX cues instead).

---

## 6. QC gate

**Global gate (verbatim from the brief):**
| Check | Reject if | Fix path |
|---|---|---|
| Character drift | Accent color shifts hue for > 6 frames; an accessory is missing or swapped (scarf, goggles/backpack, topknot/staff, visor, crown); a size swap (Pip ≥ Bolt's shoulder, Brick thinner than Bolt) | Re-roll the segment from the same keyframe; if it repeats, regenerate the keyframe |
| Extra limbs | A 3rd arm/leg, a fused limb, or a limb passing through the body visible ≥ 3 frames (1–2 frames may be hidden under an impact frame or cut) | Re-roll; shorten the action to "one clear action per shot" |
| Faces appearing | Any mouth, nose, teeth, brows, skin tone or human face, even for 1 frame (zero tolerance) | Re-roll; strengthen NEG; eyes-only close-ups |
| Style break | Flat/white/empty background, a 2D-cartoon look, a photoreal human, a lost rim light, blood instead of ink sparks | Re-roll; restate STYLE_LOCK in full |
| Stitch-seam continuity | At a 30s boundary: a position jump > 5% of frame width, a lighting-direction flip, a prop changing hands, a screen-direction reversal, a visible "reset" of motion | Regenerate only the later segment from the prior segment's last frame; or hide the seam with a whip-pan/impact frame in edit |
| Text artifacts | Any legible or pseudo-letter glyphs in the generated plate (signs, buttons, screens) | Mask/blur, or re-roll with "blank unmarked surfaces"; all real text is composited |

**Recurring per-video checks (from the batch briefs):**
- Loop match: last frame = first frame within **3%** position (S01), or door/ring framing matches (S05/S12).
- Munching, whispering or "talking" never shows a mouth (S01: the snack vanishes in crumbs).
- Carrying, sitting-on-hands and crowd heaps are limb-merge risks: step through frame by frame; a heap passes only if no stray limb points out > 3 frames.
- Crowd fights: grey figures never merge into heroes; Bolt stays the only cyan and the only scarf; grey figures get no accessories.
- Paper and signage surfaces spawn fake handwriting: "blank paper, pencil texture only", "blank unmarked brass".
- Night scenes must not crush to black: rims stay visible. Fog must not flatten into a grey wash.
- Creature "eyes" stay eye-dots only; any creature face or mouth = reject.
- Cinema 9:16 output: check the aspect and look; if it fails, redo that section on Seedance 9:16 from a keyframe.

**Highest-risk sections to watch first:** crowd/4-cast Cinema set-pieces (bridge runs, goon fights, campfire close-ups under firelight), multi-state reveal shots (three states in one shot), carry poses. Revise only the failing section; prefer regenerating the later segment of a chain from the last good frame.

---

## 7. Spend guidance

**Resolution policy:** Shorts **720p**. Long-form **720p** unless the budget is tight, then 480p.

| Item | Seconds | 480p ($0.2056/s) | 720p ($0.4622/s) |
|---|---:|---:|---:|
| Gag/loop Short (S01-size) | 68 | $13.98 | $31.43 |
| Fight Short (S12-size) | 105 | $21.59 | $48.53 |
| Long-form (L01-size) | 485 | $99.72 | $224.17 |
| Ident (5s) + end plate (12s), once, then `reuse` | 17 | $3.50 | $7.86 |
| A 20s Short revision | 20 | $4.11 | $9.24 |
| A 60s long-form revision | 60 | $12.34 | $27.73 |

Stills ~$0.09 each (one keyframe per Seedance section, plus landing poses). Reference sheets are used only by Cinema: reuse the existing batch refs.

**Fitting 4+ videos in $600/month:**
- **Plan A (default):** 1 long-form at 720p with one 60s revision ($251.90) + 6–7 Shorts at 720p (~70s + 20s revision ≈ $41.60 each; 7 = $291.20) ≈ **$543**, leaving ~$57 for stills and a spare re-roll.
- **Plan B (tight month):** 2 long-forms at 480p with 60s revisions (2 × $112.06) + 7 Shorts at 720p ($291.20) ≈ $515.
- Fight Shorts (100s+, Cinema-heavy, highest re-roll risk) cost ~1.5× a gag Short; schedule at most one per month.
- Batch-01 revision reserves (e.g. 225s for the pilot) are far above what a $600 month allows. Revise one section at a time, highest-risk first.

**When a revision is worth it:** any zero-tolerance failure (face, mouth, blood, text), character drift or extra limbs that are visible at normal speed, a broken loop, a seam jump, or any problem in the first 5 seconds. Everything else becomes a lesson. Seedance sections with keyframes let you regenerate one segment instead of a whole section: use that.

---

## 8. Idea queue

**Done in test batch 01 (don't repeat):** S01 Do Not Press (produced, approved) · S05 Elevator Standoff · S12 1 vs 20 Grey Inklings · S23 Bell Tower Part 1/3 · L01 The Page That Fell (pilot) · L06 Pip's Very Bad Invention (merged with "Too Many Bolts") · L04 Brick Is Afraid of the Dark (guest Pebble) · L03 Sky-Rail Showdown. **Gated:** S24/S25 (Bell Tower Parts 2–3) only if S23 hits ≥70% viewed-vs-swiped **and** "part 2" comments ≥1% of engaged views **and** APV ≥80%.

Priority favours ideas the saved voices (N, Pip, Brick) can carry. Re-rank with batch results: the top 2 long-form formats get 70% of slots, the top lead gets the next Short series, and the winning Shorts format sets 50% of Shorts output.

| # | Idea | Format · lead | Hook (idea card) |
|---|---|---|---|
| 1 | S10 Brick Learns to Whisper (60s) | F6 gag loop · Brick, Pip | "Brick whispers so loudly the windows shatter." |
| 2 | S13 Pip Explains the Plan (Badly) (75s) | F6 gag · Pip (Bolt silent) | "Pip at a whiteboard covered in scribbles: 'Simple!'" (whiteboard must stay blank of real letters; doodles via labels) |
| 3 | S02 Brick vs. One Spider (65s) | F6 gag, loop back to the chair · Brick, Pip (Nova silent) | "Brick, three times normal size, standing on a chair screaming at a spider the size of a coin." |
| 4 | S06 Pip's Snack Drone (60s) | F6 gag, ends on drone #2 · Pip | "A tiny drone carries a sandwich through a war zone of flying food." |
| 5 | S04 The Scarf Has Opinions (63s) | F6 gag, wordless · Bolt | "Bolt's scarf slaps him in the face." |
| 6 | S03 Nova's One-Staff Warmup (75s) | F5 fight, wordless; tea sip matches opening pose (loop) · Nova | "Nova flicks her staff and ten grey ink dummies explode into sparks, and she hasn't turned around yet." |
| 7 | S18 Brick's Paper Bird (90s) | Heart · Brick, Pip | "Brick cups a hurt paper bird in his huge hands." |
| 8 | L02 Temple of a Thousand Traps | F1 escalating rules / puzzle · Pip | "A stone blade whooshes an inch over Pip's head. He freezes. Every trap in the hall clicks at once." |
| 9 | S14 Nova Meditates; Everything Explodes (60s) | F6 locked-off gag · Nova | "Nova meditates, perfectly still. Behind her, a building explodes." |
| 10 | S29 Brick Carries Pip Up a Mountain (60s) | Heart, cold blue → gold · Brick, Pip | "Pip, exhausted, collapses. Brick silently lifts him onto his shoulders." |
| 11 | S21 Bolt Tries Stealth (70s) | F6 gag, after-dark · Bolt (Nova silent) | "Bolt tiptoes. His scarf glows like a lighthouse." |
| 12 | L05 The Desert Sail Race | F2 gauntlet · Bolt vs Smudge's sled | "A sand-sail skims a dune crest, airborne, and lands inches from a crimson-sailed rival." |
| 13 | S22 Hide and Seek (Nova Wins Forever) (60s) | F6 gag, time-lapse light · Pip counts | "Pip counts to ten. Nova is gone. We are three days later." |
| 14 | L07 The Frozen Peak | F7 heart + action · Nova | "An avalanche fills the frame, and a magenta staff punches out through the snow." |
| 15 | L08 The Floating Ink Market | F2 rooftop chase comedy · Bolt | "Bolt proudly holds up a 'shard.' It's a painted rock. A merchant is already sprinting away." |

Hold for later: L09–L10 and Seasons 2–3 need lore a new viewer lacks; S26 (190s) and S30 (240s) exceed the 3-min Shorts cap; S07/S15 are Smudge-led and need his voice. Lines for Bolt, Nova or Smudge in any of these wait for their voices.

---

## 9. Research focus

**Channels and formats to study:** Alan Becker / Animator vs. Animation (escalating-rules episodes, Shorts like *Cave Spider Roller Coaster*; study structure only, never the look or premise) · Glitch Productions (*Amazing Digital Circus*, *Murder Drones* pilots: cold opens, lore drops, cliffhangers) · Pencilmation (gag density) · Cyanide & Happiness (setup/turn/punch timing) · Hyun's Dojo and "legendary stick fight" Shorts (choreography, impact frames) · Neural Viz (authored AI universe) · ReelShort/DramaBox-style micro-drama Parts · the "AI stickman storytelling" wave (what slop looks like, to stay clear of it).

**Queries (YouTube, X, TikTok, last 90 days):** "stick figure animation" · "stickman fight" · "1 vs 100 stick figure" · "stick figure mini movie" · "animation vs" (structure only) · "do not press the button animation" · "3D stick figure short" · "micro drama part 1 animation" · "AI animated series episode 1".

**Extract per video:** frame-1 action and whether it is already mid-motion; seconds to first conflict; cuts or visual changes per 10s; runtime; gag structure (rule of three? beat of silence?); loop device (match cut + verbal callback) or cliffhanger; how many characters and whether they are recognisable by silhouette; sound identity (signature sting, hit sounds); title length and word pattern; thumbnail (one hero mid-action, ≤3 words, contrast); views relative to subscribers.

**Our own metrics to read:** viewed vs swiped (target ≥70%), retention at 3s (≥80%) and midpoint (≥60%), APV (loops >100%), engaged views, subs per 1K views, related-video clicks to the long-form, "part 2" comment rate for serial Parts; long-form CTR (first 7 days, browse), 30s intro retention, retention at 2:00 and 5:00 (cut-density test), returning viewers, and comment language spread (narration-density test).
