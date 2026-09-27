# INKLIGHT (working title "Stick Adventures"): Channel Bible

**Concept:** Episodic, cinematic stick-figure mini-movies with action, comedy and heart. A
recurring cast of glossy ink stick figures lives inside hyper-detailed, volumetrically lit
3D worlds. Every clip is AI-generated with **Higgsfield Seedance 2.5** (default, image-to-video)
and **Cinema Studio 4.0** (action set-pieces). Episodes are narrated and voiced with
ElevenLabs and assembled in Remotion.

**Research date:** 2026-09-27. Sources are listed at the bottom as numbered URLs, and inline
references look like [S1]. **[U]** marks a claim that is unverified or estimated.

> **App note (read first):** set the project to `visual_style: "footage"` (AI clips). Do
> **not** use `"stick"`, which is the programmatic stick-figure renderer (`src/lib/db/types.ts`).
> The look described here exists only in generated footage.

---

## 1. Niche breakdown and 2026 market trends

### 1.1 Why stick figures endure
- **Alan Becker / Animator vs. Animation (AvA).** Started in 2006. The channel passed 34M
  subscribers on 2026-08-29 and reads about 34.1M in late September 2026 [S1][S2]. *Animation vs.
  Minecraft* (from 2017) took him to 1M subscribers in under a month. It follows five stick
  figures, and episodes average about 10 minutes [S3]. Two lessons follow: a recurring cast
  plus a "world" premise scales, and around 10 minutes is the native episode length.
- **Henry Stickmin.** PuffballsUnited's Flash series was remastered as *The Henry Stickmin
  Collection* (Innersloth, 2020). It has 98% positive of about 40K Steam reviews, and gross
  revenue is estimated at about $15M [S4][S5] [U: third-party estimate]. Its lesson is that
  choose-your-fail comedy and "wrong answer" gags are beloved. **This is IP to avoid copying**
  (see §3 and §9).
- **Stick-fight culture.** Hyun's Dojo is the long-running stick-animator forum and
  collab community, with about 2.5M subscribers [S6]. Landfall's *Stick Fight: The Game*
  (2017) shows that stick combat sells as a game genre too [S7]. The audience knows
  choreography well and rewards readable, weighty fights.
- **Stick figures are universal.** They are language-agnostic, faces are optional, and a
  silhouette reads at thumbnail size. A 2026 wave of *AI stickman storytelling* channels
  (narrator plus simple stick visuals) is being pushed hard by tutorial creators [S8][S9]. That
  makes this a **crowded low end**. We win on the high end: cinematic worlds and a real cast.

### 1.2 The mini-movie and micro-drama boom
- Global micro-drama revenue is tracking toward about **$14B in 2026** [S10]. Outside China it
  was forecast at **$3.6B in 2026, growing to $9.5B by 2031** (Screen/Omdia) [S11]. Deloitte's 2026
  TMT predictions frame short-form serials as a growth line that empowers independent studios [S12].
- The format playbook fits us: 60–90s vertical episodes, a hook in the first seconds, a
  cliffhanger at every break, and serialized arcs [S13]. **We transpose it into animation:** long-form
  mini-movies on YouTube and Part 1/2/3 cliffhanger cuts on Shorts and TikTok.
- **Indie animated series are proven on YouTube.** Glitch Productions (*Murder Drones*, *The
  Amazing Digital Circus*) has about 18M subscribers and runs an audience-funded studio model
  [S14][S15]. Its lesson is that original characters and lore produce merch, cafés and streaming
  deals.

### 1.3 AI animation growth and "AI slop" risk
- **Tools matured in 2026.** Seedance 2.5 on Higgsfield does up to 30s per generation with
  audio in the same pass [S16], and Cinema Studio 4.0 (August 2026) adds genre, tempo, camera body,
  lens and palette controls [S17].
- **Backlash is real and enforced.** YouTube renamed "repetitious content" to **"inauthentic
  content"** on 2025-07-15, targeting mass-produced, templated videos with only superficial
  differences [S18][S19]. In **January 2026** YouTube terminated 16 AI-slop channels with 4.7B
  lifetime views, the largest a roughly 6M-subscriber Dragon Ball-themed AI animation channel
  [S20][S21]. Faceless creators report collateral damage because detection leans on proxy signals
  [S22][S23].
- **How we mitigate it (non-negotiable):**
  1. **Named, locked, original cast** with arcs and relationships. Episodes are *about*
     characters, not visuals.
  2. **Distinct storyline per episode**, with a unique premise, location, set-piece and
     resolution. No reskinned templates.
  3. **Authored craft signals:** written scripts, fight choreography, comedic timing, a
     composed score, consistent lore, and credits that name the human showrunner.
  4. **No mass cadence.** One flagship long-form a week at most, plus Shorts that are
     *authored* cut-downs or standalone gags.
  5. **Quality gate:** re-roll any clip showing melted limbs, extra heads or morphing
     accents. Never publish "good enough" warps.
  6. **Model precedent:** Neural Viz (Monoverse) shows a one-person, AI-made, lore-driven
     series can build a loyal audience, with about 238K subscribers in July 2026 [S24][S25].

### 1.4 Audience
- **Core:** 8–35, gaming-adjacent (Minecraft, Roblox, fighting games, anime), male-skewed
  but broadening through comedy and heart [U: inferred from AvA/Glitch audiences].
- **Two tiers:** teens and young adults watch for fights and lore, and the 8–12 group watches
  for gags and the characters. This matters for the made-for-kids decision (§9.3).
- **Global:** the wordless-leaning action travels well. Captions and a narrator carry the story.

### 1.5 Money (honest numbers)
| Stream | Expectation | Notes |
|---|---|---|
| Long-form AdSense RPM | **~$1.50–4.00** [U] | Gaming, entertainment and kids content often sits **below $1.50 RPM** in AIR's 2025–26 panel of 300 channels [S26]. Some blogs quote $9–13 for "animated storytelling" [S27], which is optimistic and skewed to tier-1 narrated niches. Plan on the low band. |
| Shorts RPM | ~$0.03–0.10 [U] | Shorts are for discovery, not revenue. |
| Production cost | ~$0.2057/s Seedance list | A 10-min episode is 600s, about $123 per clean pass. With a 1.6× re-roll factor that is **~$200/episode** plus stills, voice and music. Break-even needs sponsors or merch. |
| Sponsors | **Strong fit** | Mobile and PC games (action, roguelike, gacha), game-adjacent apps, toy and collectible brands, snack brands. Stick action is a natural fit for a "game sponsor integration" where the cast plays a stylized version. |
| Merch / IP | **Highest ceiling** | Vinyl figures of the cast (silhouettes are toy-ready), glow-in-the-dark prints (rim-light brand), plushies of Pip, and the "Smudge" villain hoodie. Glitch and AvA prove the IP path [S14]. |

---

## 2. YouTube competitor research

| # | Channel | Subs (approx.) | Format / length | What works | Gap we exploit |
|---|---|---|---|---|---|
| 1 | **Alan Becker** (@alanbecker) | ~34.1M [S1] | 2D stick figures, AvA / AvM episodes of 5–15 min, some Shorts | Wordless physical comedy, escalating powers, the "desktop" meta world, clear silhouettes, famous color-coded cast | 2D and flat only. No cinematic 3D lighting, no narrated mini-movie drama. **We must avoid AvA's "animator fights creation" premise and color-coded-duo look-alike naming.** |
| 2 | **Pencilmation** | ~20.4M [S28] | Pencil-drawn gag shorts of 1–7 min, plus compilations | Relentless gag density, the "hand of the animator" joke, kid-friendly | No stakes and no serialized arcs. Tone is purely gag. |
| 3 | **GLITCH** (Glitch Productions) | ~18M [S14] | 3D indie series: pilots of 20–30 min, episodes of 15–25 min | Lore, characters and music. Pilots go viral. Merch and streaming deals. | Human studio budgets and long gaps between episodes. We can ship an 8–12 min episode **every 1–2 weeks**. |
| 4 | **ExplosmEntertainment** (Cyanide & Happiness) | ~3.6M [S29] [U: may be stale] | Stick-ish comedy shorts of 1–3 min, weekly Thursday drops | Punchline economy, a 3-beat setup/turn/punch, reliable schedule | Adult/dark humor, 2D. There is room for **PG action-comedy** with the same timing discipline. |
| 5 | **Hyun's Dojo Community** | ~2.5M [S6] | Curated stick-fight collabs, 1–10 min | Choreography, impact frames, community collabs | No recurring story or characters, 2D. We bring *story* to stick fights. |
| 6 | **Neural Viz** | ~238K (July 2026) [S24] | AI-generated mockumentary series (Monoverse), 3–15 min | Proves AI plus authored writing, a shared universe and recurring characters equals a fandom | Not action, not stick figures. It is the *production* model to emulate, not the genre. |
| 7 | **StickVerse** (@StickVerse) | small [U] | "Epic stick figure battles, funny skits, animated stories" [S30] | Same premise words | Also a **name-conflict warning** (§3). |
| 8 | **AI stickman storytelling wave** (many channels, unnamed [U]) | 10K–500K [U] | Narrator plus simple stick visuals, crime/history stories, 10–30 min [S8][S9] | Cheap, fast, narration-led | Visually flat and templated, the **highest slop risk**. We are the premium opposite. |

### 2.1 Best video styles (what to steal structurally, not visually)
- **Cold-open action (0–5s):** start *mid-motion*, such as a fall, a punch or an explosion, with no
  logo first. AvA and micro-dramas both front-load the conflict [S13].
- **Fight choreography:** readable *wide* for geography, then *close* for impact, then *wide*
  for consequence. Use a clear attack → counter → reversal rhythm every 3–6s. Use impact frames on
  hits and hold 2–4 frames of stillness before a big blow (anticipation).
- **Comedic timing:** a locked-off wide shot, the gag, then a *beat of silence* (0.5–1s) and a
  reaction snap-zoom. Use the Rule of Three (setup, repeat, subvert). Let the joke land before cutting.
- **Cliffhangers:** every episode ends on an open question (a new villain reveal, a door opening,
  a character missing). Every Short Part ends mid-action.
- **Episodic arcs:** 10-episode seasons, each with a macro goal (a MacGuffin, a rescue,
  escaping a world). Each episode is self-contained with its own set-piece plus one arc thread.
- **Length sweet spots:**
  - **Long-form:** 8–15 min, ideally 9–12 (AvM's roughly 10-min norm [S3]). Put a set-piece every
    2–3 min, a comedic breather after each, and the climax at 75–85% of runtime.
  - **Shorts:** cut-downs from episodes at 20–45s loop best. Standalone originals and "Part N"
    episodes run 60–90s, following the micro-drama cadence [S13]. Use up to 3 min only for full-fight Shorts [U: Shorts allow up to
    3 min since Oct 2024]. Vertical mini-movies over 3 min go to TikTok/Reels.
- **Thumbnails and titles:** one hero silhouette mid-action, a single huge threat, and ≤3 words.
  AvA titles are nearly bare ("Animation vs. X"). Glitch uses the episode name plus character art.

---

## 3. Name assessment

| Name | Meaning | Memorability | Brandability | @handle risk | Trademark / conflict risk | Score |
|---|---|---|---|---|---|---|
| **Stick Adventures** (working) | Literal | Medium | Low (generic) | Likely taken or variant [U] | Many "Stick Adventure(s)" mobile games on Play [S31]. Generic and hard to protect. | **5/10** |
| **INKLIGHT** | Ink figures plus emissive light, which is exactly our look | High (2 syllables, a visual promise) | High: logo, glow merch, "Inklight Originals" | @Inklight [U]; fallback @InklightTV / @InklightStudios [U] | No channel or game found in search [S32] [U: run a USPTO/EUIPO TESS check]. Distinct from "Animator vs" and "Stickmin". | **9/10** |
| **Linebound** | Heroes bound to (made of) lines | Medium-high | Good, a bit abstract | @Linebound [U] | No hits found [S33] [U] | **7.5/10** |
| **Glowstick Saga** | Pun: glowing stick figures | High | Fun but pun-limited | [U] | **Conflict:** Glowstick Entertainment (a games studio) [S33] | **5.5/10** |
| **StickVerse** | Stick universe | High | Decent | Taken [S30] | Existing same-niche channel. Reject. | **2/10** |

**Recommendation: INKLIGHT.** It names the aesthetic (ink bodies, light rims), is short,
ownable and merch-ready, and has no discovered conflicts. For search, keep "stick figure" in
titles and the channel tagline: **"INKLIGHT · Stick-Figure Mini-Movies."** Avoid anything
containing "Animator vs", "Animation vs", "Stickmin", "Henry" or "Stick Fight".

---

## 4. Unified style bible

### 4.1 The look (lock this sentence; it prefixes every prompt)
> **STYLE_LOCK:** "Cinematic 3D animated film. The characters are stylized stick figures: glossy
> matte-black ink bodies with uniform thin cylindrical limbs, perfectly round glossy black heads with
> no facial features except two small glowing oval eyes, and a thin emissive rim light in each
> character's signature color. They are set inside a hyper-detailed, physically lit 3D environment
> with volumetric light shafts, atmospheric haze, real materials, shallow depth of field and
> film-grade color grading."

- **Bodies:** a single-line-weight *tube* body (about the thickness of the head's radius × 0.18),
  ball joints implied but unseen, and a rounded end on hands and feet (no fingers except in
  close-ups, where there are three nub fingers).
- **Heads:** perfect spheres with a satin-gloss black finish. **Eyes** are two small emissive ovals
  in the character color that squash into lines for blinks and arcs for joy. There is no mouth. Emotion
  comes from eyes, head tilt and posture.
- **Rim light:** a 1–2px emissive edge on the silhouette in the character color. It flares brighter
  during power moments.
- **Environments:** photoreal-adjacent, *never* flat. Think Pixar lighting on a Blade Runner or Zelda
  set. Scale contrast is a signature: tiny stick heroes against enormous detailed worlds.

### 4.2 Recurring cast (locked descriptors, copied verbatim into prompts)

| Character | Locked visual descriptor (DESC_*) | Personality | Role |
|---|---|---|---|
| **BOLT** | "BOLT: an average-height black ink stick figure with a round glossy head, **electric cyan (#22D3EE)** glowing eyes and rim light, a long flowing **cyan scarf** that trails light when moving" | Brave, impulsive, big-hearted, bad at plans | Hero and leader. The heart of the action. |
| **PIP** | "PIP: a short, small black ink stick figure (half BOLT's height) with a round glossy head, **amber (#FFB020)** glowing eyes and rim light, oversized **brass aviator goggles** on the forehead, a boxy **amber backpack** with antennae" | Anxious genius, gadget inventor, pure heart | Tinkerer and comic relief. Solves puzzles. Most merchable. |
| **NOVA** | "NOVA: a tall slender black ink stick figure with a round glossy head, **magenta (#FF3DA5)** glowing eyes and rim light, a single **curved topknot line** rising from the head, carrying a **glowing magenta bo staff**" | Calm, dry wit, disciplined martial artist | Strategist and best fighter. The straight man to Bolt. |
| **BRICK** | "BRICK: a large black ink stick figure with **thick heavy limbs** (three times normal thickness) and a round glossy head, **lime green (#7CFF4F)** glowing eyes and rim light, a **lime visor band** across the eyes" | Gentle giant, loves snacks and small animals, scared of the dark | Muscle. Comedic contrast. Emotional beats. |
| **SMUDGE** (antagonist) | "SMUDGE: a tall black ink stick figure whose body **constantly drips and smears ink**, a round head with a **jagged three-point crown spike**, **crimson (#FF2E3A)** glowing eyes and rim light, leaving smeared ink footprints" | Theatrical, jealous, funny-scary, wants to "redraw" the world as his own | Recurring villain. Redeemable by Season 3. |

**Silhouette test:** each character must be identifiable as a pure black shape (scarf / goggles
and backpack / topknot and staff / thick limbs / crown spike). Never give two characters the
same accent color, and never swap accessories.

**Supporting (per-episode only, never recurring unless promoted):** "grey ink extras" (neutral
rim light #9AA4B2), creatures (ink-dragons, paper-birds) and robots (Season 2).

### 4.3 World and lore
- **The premise:** the heroes are **Inklings**, figures that escaped the margins of a lost
  sketchbook called the **First Draft**. Each world ("Page") they reach renders more real than
  the last. Smudge is the eraser-born rival who wants to become the Draft's only author.
- **Season 1, "The Margin Lands":** frontier worlds such as a canyon, a jungle temple, a sky-rail,
  a desert and a frozen peak. The MacGuffin is the **Nib**, a glowing pen-tip that can draw doors between Pages.
- **Season 2, "Neon Rift":** a vertical cyber-megacity (Seoul/Tokyo neon, rain). Robots, heists,
  a hover-racing league. Smudge runs the city's ad screens.
- **Season 3, "The Last Page":** a mythic finale of cathedral libraries, a paper ocean, the Blank.
  Smudge's origin is revealed, the team is split and reunited, and the ending is bittersweet.
- **Rules:** Inklings can't bleed; hits cause **ink splashes** that evaporate into light
  sparks (cartoon-safe). Rim light dims when a character is hurt or sad and flares when inspired.

### 4.4 Color palette
| Token | Hex | Use |
|---|---|---|
| Ink Black | `#0B0B0F` | Character bodies, logo |
| Bolt Cyan | `#22D3EE` | Bolt, brand primary accent |
| Pip Amber | `#FFB020` | Pip, warm UI highlights |
| Nova Magenta | `#FF3DA5` | Nova |
| Brick Lime | `#7CFF4F` | Brick |
| Smudge Crimson | `#FF2E3A` | Villain, danger, "LIVE" badges |
| Deep Night | `#0E1630` | Backgrounds, banner, end screens |
| Paper Cream | `#F3E9D2` | Sketchbook/lore motifs, title cards |
| Volumetric Gold | `#FFD27A` | Light shafts, sunrise, hero moments |

### 4.5 Typography
- **Display / logo:** *Bungee* (Google Fonts), all caps, tracking +40.
- **Thumbnails:** *Anton* in ≤3 words, white (#FFFFFF) with an 8px Ink Black stroke and a character-color glow.
- **Captions / UI:** *Inter* SemiBold. Burned-in captions are white with a 60% black pill.
- **Episode cards:** *Bungee* title over *Inter* "S1 · E04" on Paper Cream with an ink-splatter mask.

### 4.6 FX language
- **Impact frames:** on a big hit, 2–3 frames invert to a white/Ink-Black silhouette with a colored
  shock ring (Remotion overlay, not generated). Put at most 3 per fight.
- **Speed lines are light trails** in the mover's color. Bolt's scarf leaves a cyan ribbon.
- **Ink splashes into sparks** replace all blood. Knockouts spray ink that vaporizes to glowing motes.
- **Power-up:** the rim light intensifies, the environment desaturates briefly, and there is a lens flare in the character color.
- **Comedy FX:** a squash-and-stretch pop, a "record-scratch" freeze-frame with character-name
  text (Remotion), and a sweat-drop ink bead.

### 4.7 Camera grammar
**Action**
- **Tracking shots:** side-scrolling trucks at hero speed. Use a 21:9 feel inside a 16:9 frame for chases.
- **Whip pans** to connect attacker and target. Put a hard cut *inside* the whip blur to hide the seam.
- **Low angles** (knee height, 24mm) for hero entrances. Tiny figures read as giants.
- **Slow-motion hero moments:** one per episode, at the climax. Use 120fps-feel "speed ramp" language in the prompt.
- **Orbit / 180° arc** around a clash. Use an overhead "god shot" for geography.

**Comedy**
- **Locked-off wide shots** for gags, so the audience sees the setup and punchline in one frame.
- **Snap zooms** onto a reaction (Pip's eyes).
- **Hard cut to aftermath**, where the gap *is* the joke.
- **Dutch tilt** only for Smudge scenes.

| Do | Don't |
|---|---|
| Keep the four accent colors visible in every group shot | Show faces, mouths, noses or fingers (except 3-nub close-ups) |
| Restate the full DESC_* every prompt | Rely on "same as before" or names alone |
| Use the environment for scale and awe | Use flat, white or empty backgrounds (reads as cheap, "slop") |
| Use light/ink sparks for damage | Use blood, gore, dismemberment, weapons aimed at camera, or real guns |
| Plan cuts on motion | Cut mid-still (reveals AI seams) |
| Give one clear action per shot | Cram multiple actions (warps limbs) |

---

## 5. Higgsfield production spec

### 5.1 Model choice
| Use | Model | Settings |
|---|---|---|
| **Default: any shot with cast members** | **Seedance 2.5 i2v**: `bytedance/seedance-2.5/image-to-video` | `image_url` = keyframe still (the literal first frame), optional `end_image_url` = landing pose, `prompt`, 4–30s, **720p**, `generate_audio: false` for dialogue scenes (we lay ElevenLabs over them); `true` for ambience-only establishing shots |
| Establishing / environment-only | Seedance 2.5 t2v | 4–30s, 16:9 (long) or 9:16 (Shorts); 21:9 only for letterboxed "movie" moments |
| **Action set-pieces** (chases, battles, big FX) | **Cinema Studio 4.0** reference-to-video | `image_urls` ≤30 (character sheets plus environment still), `<<<image_1>>>` tokens in the prompt, 4–30s, 720p, `genre: action` (comedy for gag set-pieces), `pacing: dynamic` (chaotic only for melee peaks), `camera_model: modern`, `camera_lens: anamorphic` (default) |
| Keyframe stills | Higgsfield **SOUL Standard** | 1080p, 16:9 or 9:16. **It is portrait-trained**, so always state "stick figure, NOT a human, no face, no skin, no clothing except listed accessory" |

Cost reference: Seedance about **$0.2057/s** list. A 30s gen costs about $6.17. A 10-min episode takes about 21–24 gens,
about $123 per pass, and **~$200 with re-rolls**.

Note: Higgsfield marketing lists Cinema Studio 4.0 up to 1080p and 50 references [S17]. **This
app's integration is capped at 720p and ≤30 `image_urls`**, so plan to those limits.

### 5.2 Character consistency protocol
1. **Master reference sheets (one-time, SOUL):** each character gets a turnaround (front, 3/4, side,
   back) on a neutral Deep Night background plus 3 action poses. Store them as `ref_bolt_*.png`, etc.
   Upload the best 2 per character to the project character library.
2. **Descriptor discipline:** prompts are assembled as `STYLE_LOCK + DESC_<each character in shot>
   + SCENE + ACTION + CAMERA + LIGHT`. Paste descriptors **verbatim** with no paraphrase. Never
   mention a character who is not in the frame.
3. **Keyframe per section:** before animating, generate one SOUL still per scene/section
   showing the exact first frame (composition, poses, environment). This becomes `image_url`.
4. **Land the pose:** when the next scene must start from a specific pose, generate that still
   and pass it as `end_image_url` so the cut is match-ready.
5. **Cinema refs:** `image_urls` order is fixed. `image_1` = Bolt, `image_2` = Pip, `image_3` = Nova,
   `image_4` = Brick, `image_5` = Smudge, `image_6`+ = environment/prop stills. Reference with
   `<<<image_N>>>` in the prompt *and* restate DESC_* text.
6. **QC re-roll triggers:** accent-color drift, a missing accessory, a face or mouth appearing, extra
   limbs, merged characters, or size swaps (Pip taller than Bolt). Auto-reject.
7. **Max 3 characters per shot** in Seedance. Use Cinema with refs for 4–5.

### 5.3 Stitching rules (how the app actually builds a scene)
- Each scene/section is its own clip. If a section is over 30s, the app makes **ceil(sec/30)** generations,
  front-loaded: **30 + 30 + remainder** (the remainder is bumped to at least 4s)
  (`packages/clips/src/clip-queue.ts`, `makeStitch`).
- **Seamless chaining:** segment N's last frame becomes segment N+1's `image_url`.
- **The same prompt drives every segment of a section.** So write *continuous-action* prompts
  whose motion makes sense from any midpoint ("the chase continues along the rail, sparks
  streaming"). Don't write sequential "first... then..." lists, which would replay in each segment.
- **Avoid remainders of 1–3s** (61–63s, 91–93s), which waste padding. Prefer section lengths
  like 30, 45 (30+15), 50 (30+20), 60 (30+30) or 75 (30+30+15).
- **Plan the 30s boundary on a natural motion beat:** a leap apex, a blade/staff lock, a
  landing, a whip-pan. Never put it mid-punch.
- **Hard cuts (new section) are deliberate:** use them for action cuts, reactions and time skips. New section,
  new keyframe.

### 5.4 Fight choreography in ≤30s beats
Break fights into **beats of ≤30s**, each one section or one segment:
1. **Standoff (4–8s):** wide, low angle, wind, rim lights flare. The boundary lands on the first lunge.
2. **Exchange A (20–30s):** 3–4 attack/parry pairs, tracking shot. It ends on a **bind** (staff lock).
3. **Reversal (15–30s):** a disadvantage and an environmental hazard. It ends on a **fall or jump apex**.
4. **Hero moment (6–10s):** a slow-mo power-up. Cinema `pacing: single-shot`.
5. **Finisher plus aftermath (8–15s):** the hit, an impact frame (Remotion), an ink-spark burst, then a wide consequence shot.

**Continuity across stitched segments:** keep screen direction constant (hero moves left→right
unless a reversal beat flips it deliberately). Hold the lighting direction. Restate held props
("NOVA holds the magenta bo staff in her right hand") in every prompt.

### 5.5 Prompt templates

**Establishing (Seedance t2v or i2v, 8–15s):**
```
{STYLE_LOCK} Establishing shot: {LOCATION, 3 concrete details}, {TIME/WEATHER}. Tiny in frame,
{DESC_BOLT} stands on {VANTAGE}, scarf rippling. Slow crane up and push in, 24mm wide lens,
volumetric {COLOR} light shafts through haze, deep focus, epic scale. No text.
```

**Action (Cinema Studio 4.0, refs):**
```
{STYLE_LOCK} <<<image_1>>> {DESC_BOLT} and <<<image_3>>> {DESC_NOVA} fight <<<image_5>>> {DESC_SMUDGE}
across {SET}. Continuous choreography: fast strikes and parries, staff spins leaving magenta light
trails, scarf leaving cyan light trails, ink splashes that burst into glowing sparks on impact.
Camera tracks laterally at hero speed with a whip pan between attackers, low angle.
genre=action pacing=dynamic camera_model=modern camera_lens=anamorphic color_palette={PRESET}
```

**Dialogue / comedy (Seedance i2v, 6–15s):**
```
{STYLE_LOCK} Locked-off wide shot, static camera. {DESC_PIP} and {DESC_BRICK} stand in {SET}.
{GAG ACTION in one sentence}. Characters gesture expressively with head tilts and arm movements;
glowing eyes blink and squash. Beat of stillness at the end. Soft key light, warm practicals.
```
(Dialogue is ElevenLabs voice over the top. There are no mouths, so emotion is carried by gestures and eye shapes.)

### 5.6 Cinema color-palette mapping
| Palette preset | Use |
|---|---|
| `the-emerald-ambush` | Jungle and ambush episodes (S1) |
| `highway-standoff` | Desert, sky-rail and train standoffs |
| `neon-rain-at-midnight` | Season 2 city |
| `after-dark` | Night heists, stealth |
| `bubblegum-boulevard` | Comedy episodes, Pip-centric Shorts |
| `a-dream-in-color` | Dream and flashback sequences, S3 library |
| `the-crimson-ballet` | Smudge showdowns |
| `static-noon` | Deadpan comedy, "boring day" gags |

### 5.7 Pipeline (near-autonomous)
Script (with scene seconds) → ElevenLabs narration and voices (timings drive section length) →
SOUL keyframes (auto from descriptors) → Seedance/Cinema clips (stitched per §5.3) → QC re-roll →
Remotion assembly (impact frames, captions, ident, outro, music bed) → upload. The human
showrunner approves the script, keyframes and final cut (the authenticity checkpoint).

---

## 6. Intro, outro and branding

### 6.1 Ident (5s, every long-form, placed *after* the cold open)
Black. An ink drop falls, splashes, and the splash lines draw the **INKLIGHT** wordmark. The four rim
colors race around the letters and flare. Two cyan eyes open and blink
above the dot of the "I". SFX: a drip, a whoosh and a bass "thoom."
- Prompt (Seedance t2v 5s, 16:9): *"Macro shot, a single glossy black ink drop falls onto dark
  wet glass and splashes; the splash rebounds into bold thick letter shapes; cyan, amber,
  magenta and lime emissive light trails race around the edges; volumetric haze; black
  background."* Composite the actual logotype in Remotion (never trust AI text).

### 6.2 Intro sting (2s, Shorts and mid-roll returns)
A cyan scarf whips across the frame and wipes to the scene. Use it as a Remotion transition.

### 6.3 Outro (18s)
- 0–6s: the **"NEXT TIME" cliffhanger card**. It shows a 3s teaser clip of the next episode's most
  dramatic frame, freezes, inks over to Paper Cream, and reads "S1·E05 — THE SKY-RAIL" in Bungee.
- 6–18s: the **end screen**. Deep Night background, the cast silhouettes lined up with rim lights on,
  two video slots (next episode plus a "best fight" playlist) and a subscribe circle (Bolt's head).
  Narrator: *"The page isn't finished. Neither are we."*

### 6.4 Logo concepts
1. **Primary: the "Ink Drop Eye".** A glossy black droplet whose inner highlight forms two cyan
   glowing eyes, with the wordmark INKLIGHT in Bungee beneath.
   *Prompt (SOUL 1:1-ish, crop):* "Minimal logo icon, a single glossy black ink droplet shape on
   deep navy #0E1630, two small glowing cyan oval eyes inside the droplet, thin cyan rim light,
   vector-clean, centered, no text."
2. **Alt A: "Stick Monogram".** The "I" of INKLIGHT is a stick figure mid-leap with a cyan scarf.
   *Prompt:* "Flat bold emblem, a black stick figure with round head leaping upward, cyan scarf
   trailing light, forming a capital letter I, circular badge, deep navy background, no text."
3. **Alt B: "Four Rims".** A black circle (head) with four quadrant rim lights (cyan, amber, magenta, lime).
   It works as the avatar at 98px. *Prompt:* "Glossy black sphere on navy, rim light split into four
   colored quadrants cyan amber magenta lime, soft glow, icon, centered, no text."

### 6.5 Banner (2560×1440, safe area 1546×423)
The whole cast in silhouette on a cliff edge overlooking a vast volumetric sunrise valley with
Smudge's crimson eyes in the clouds. Center safe text: "INKLIGHT · Stick-Figure Mini-Movies · New
episode every other Friday". Generate the plate with SOUL 16:9 and set type in Remotion or Figma.

### 6.6 Thumbnail system
- **Rules:** one expressive hero *mid-action* (never standing), 60%+ contrast against the background, a
  big threat or object, **≤3 words** in Anton, the character's accent glow on the text, and a Smudge-crimson
  element for danger. Eyes squashed into expressive shapes (shock = wide circles). Test at 168px.
- **Brief 1 (L01):** Bolt leaping off a collapsing canyon bridge, scarf a cyan comet, a giant
  ink-dragon mouth below. Text: "DON'T LOOK DOWN".
- **Brief 2 (comedy):** Pip, tiny, holding a massive red button, eyes as two panicked circles, Brick
  behind in a sweat-drop. Text: "DO NOT PRESS".
- **Brief 3 (S2 heist):** Nova upside-down on a wire in a neon vault, magenta staff glowing, crimson laser grid.
  Text: "ONE SHOT".

### 6.7 Title formula
`[Stakes-verb/Object] + [twist]` in ≤60 chars, with the tag in the description, not the title.
- "The Stick Figures Found a Door to Another World"
- "We Stole the Sun (Stick Figure Heist)"
- For search, append "| Stick Figure Mini-Movie" on 1 in 3 uploads (A/B test).

---

## 7. Narration and voice style

**Decision: mostly wordless action with a narrator plus short character "voice" lines** (ElevenLabs).
The narrator frames each act like a storybook-meets-trailer voice. Characters speak *sparingly*
(1–2 lines per scene, ≤8 words), so there are no lip-sync needs (no mouths) and the channel travels internationally.

| Voice | Persona | WPM | Direction (for ElevenLabs voice design) |
|---|---|---|---|
| **Narrator, "The Author"** | Warm, wry adult storyteller who secretly wrote the First Draft | 140–150 (160 in action) | "Mid-40s male or female, rich mid-low timbre, intimate storybook warmth with trailer gravitas, dry comedic asides, clean studio, no reverb." |
| **Bolt** | Eager hero | 170 | "Young adult, bright, breathless, earnest, voice cracks when excited." |
| **Pip** | Nervous genius | 185 | "Small, quick, higher pitch, rapid technical mumbling, gasps, adorable panic." |
| **Nova** | Cool fighter | 130 | "Low, controlled, deadpan, economical, a faint smile in the voice." |
| **Brick** | Gentle giant | 110 | "Deep, slow, soft, childlike wonder, whispers when scared." |
| **Smudge** | Theatrical villain | 125 | "Velvety, operatic, sing-song menace, stretched vowels, sudden snarls." |

**Sample narration (40 words):**
> "Every page has a margin, a place the author forgets. That's where they were born: four
> figures of ink and light. Tonight, the margin is burning. And somewhere in the dark,
> something with a crown is learning to draw."

**Music:** a hybrid orchestral-electronic score (taiko, brass stabs, synth arps) for action, and
pizzicato plus clarinet for comedy. Each character has a **leitmotif** (Bolt = rising brass 4-note,
Pip = marimba, Nova = koto/synth, Brick = tuba/bass, Smudge = detuned music box). Source it from a licensed
library or an AI music tool with commercial rights; save stems for Shorts.

**SFX:** ink drips and splashes (signature), light-trail "vwoom" whooshes, glassy impact "tinks" on
hits (not flesh), deep sub-drops for power-ups, a cartoon boing and record-scratch for comedy.
Mix narration at −16 LUFS integrated, with music ducked −10 dB under voice.

---

## 8. Cross-platform plan
| Platform | Format | Cadence | Notes |
|---|---|---|---|
| **YouTube long-form** | 8–15 min episode, 16:9 | Every other Friday (week A), then weekly by month 4 once reserves exist | Premiere with the teaser Short 24h before |
| **YouTube Shorts** | 9:16. Standalone gags (25–45s), fights (45–90s), teasers | 4–5 per week | 2–3 cut-downs per episode plus standalone originals (S01–S30) |
| **TikTok** | "Part 1/2/3" episodic splits, 60–90s each, cliffhanger at every break | Daily | Pin Part 1. The caption says "Part 2 at 1K comments" or links the playlist. |
| **Instagram Reels** | Same as TikTok, plus character-sheet carousels | 3–4 per week | Merch teasers |

- **Vertical re-framing:** generate *native 9:16* for Shorts (SOUL 9:16 keyframes, Seedance 9:16).
  Don't crop 16:9 action, because the heroes are tiny in wide frames.
- **Captions:** burned-in word-level captions (Inter, 2 lines max, center-lower third, above the
  UI safe zone). Put character-name tags in accent color the first time each appears.
- **Loops:** the end frame matches the first frame (use `end_image_url` = the opening keyframe).

---

## 9. Compliance

### 9.1 Original IP only
- All characters, names, lore and designs are original. **Never** reference or imitate Alan
  Becker's cast (e.g., color-named stick-figure groups with a cursor antagonist), the desktop/
  animator-vs-creation premise, Henry Stickmin, or Minecraft/Roblox/Nintendo assets. No franchise
  crossovers, no "X vs Goku" (the January 2026 purge took down a Dragon Ball-themed AI channel [S20]).
- Prompts must not name any franchise, studio or artist style.

### 9.2 Violence and ad-friendliness
- YouTube's advertiser guidelines limit ads when **gratuitous violence, blood or injury is the
  focal point** without context [S34][S35]. Our rules: no blood (ink turns to sparks), no gore, no
  realistic weapons or guns (staffs, gadgets and energy only), no suffering close-ups, knockouts are comedic,
  and every fight has story stakes and a resolution.
- Avoid "montage of only hits" Shorts. Every fight Short has a setup and a punchline or a cliffhanger.

### 9.3 Made for kids
**Designation: "Not made for kids"** (channel default), set per video with review.
Reasoning: the FTC/YouTube factors include subject matter, animated characters, music and
audience evidence, but **animation is not automatically kid-directed** [S36][S37]. Our primary
audience is 13–35. Content features cinematic action-peril, villain menace, teen/adult
humor and sponsor integrations for games. We do **not** use nursery music, kid-targeted
language, toy-unboxing or "for kids" titles. **Guardrails:** keep peril PG, avoid
kid-bait titles, and review any Pip-centric cute Short individually. If a video is clearly
aimed at young children, mark it MFK (accepting reduced ads and features). Revisit after 90 days of
audience-age analytics. [U: the MFK decision is ultimately the creator's legal call.]

### 9.4 AI labeling
- YouTube requires disclosure for *realistic* synthetic content. **Clearly unrealistic
  animation does not require the altered/synthetic label** [S38][S39]. Stylized stick figures
  qualify. Still: (a) if any episode includes photoreal humans, real places shown in fake events,
  or realistic news-like footage, toggle the label; (b) state in the channel About and in descriptions
  "Animated with AI tools; written and directed by [showrunner]" (transparency builds trust
  against slop suspicion [S22]).
- Keep project files, scripts and keyframes as **proof of human authorship** for any
  inauthentic-content review appeal [S18].

---

## Sources
- [S1] https://animatorvsanimation.fandom.com/wiki/Alan_Becker_(YouTube_channel)
- [S2] https://en.wikipedia.org/wiki/Alan_Becker
- [S3] https://en.wikipedia.org/wiki/Animator_vs._Animation
- [S4] https://store.steampowered.com/app/1089980/The_Henry_Stickmin_Collection/
- [S5] https://games-stats.com/steam/game/the-henry-stickmin-collection/
- [S6] https://www.hyunsdojo.com/
- [S7] https://en.wikipedia.org/wiki/Stick_Fight:_The_Game
- [S8] https://medium.com/no-time/how-to-build-a-profitable-stickman-animation-channel-using-ai-5fb2a48595d7
- [S9] https://randomprompts.org/blog/how-to-make-animation-stickman-ai-guide
- [S10] https://powerdrill.ai/blog/the-global-short-drama-economy-is-booming
- [S11] https://www.screendaily.com/news/microdrama-revenue-outside-china-to-hit-36bn-in-2026-says-report/5219165.article
- [S12] https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions/2026/short-form-video-series.html
- [S13] https://digitalcontentnext.org/blog/2026/03/05/how-microdramas-hook-viewers-and-drive-revenue/
- [S14] https://recognizingpatterns.substack.com/p/glitch-productions-is-building-games
- [S15] https://en.wikipedia.org/wiki/Glitch_Productions
- [S16] https://higgsfield.ai/blog/seedance-2-5-on-higgsfield-2026
- [S17] https://higgsfield.ai/blog/cinema-studio-4-0
- [S18] https://support.google.com/youtube/answer/1311392?hl=en
- [S19] https://www.socialmediatoday.com/news/youtube-clarifies-monetization-update-inauthentic-repeated-content/752892/
- [S20] https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/
- [S21] https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/
- [S22] https://thenextweb.com/news/youtube-ai-slop-crackdown-faceless-creators-collateral-damage
- [S23] https://hackernoon.com/youtubes-ai-slop-crackdown-cant-tell-a-directed-ai-film-from-a-bot-farm
- [S24] https://takehomehub.com/creator-money/channel-breakdowns/neural-viz
- [S25] https://www.thedaringcreatives.com/the-showrunner-how-neural-viz-makes-an-entire-tv-universe-with-ai/
- [S26] https://air.io/en/air-data-findings/which-youtube-niche-makes-the-most-money-in-2026-ranked-by-real-rpm-and-cpm
- [S27] https://outlierkit.com/blog/most-profitable-youtube-niches
- [S28] https://vidiq.com/youtube-stats/channel/@pencilmation/
- [S29] https://youtube.fandom.com/wiki/ExplosmEntertainment
- [S30] https://www.youtube.com/channel/UCSC5szeDyNjVCE9Z5GfP4EA
- [S31] https://play.google.com/store/apps/details?id=com.redandblue.stickman.animation.parkour&hl=en_US
- [S32] Web search "Inklight YouTube animation channel OR game", 2026-09-27: no matching channel or game [U]
- [S33] https://www.youtube.com/@GlowstickEntertainment (Glowstick conflict); "Linebound" search returned no matches [U]
- [S34] https://support.google.com/youtube/answer/6162278?hl=en
- [S35] https://support.google.com/youtube/answer/10291745?hl=en
- [S36] https://support.google.com/youtube/answer/9528076?hl=en
- [S37] https://www.cartoonbrew.com/business/a-new-youtube-rule-is-threatening-animation-content-creators-heres-what-you-need-to-know-about-coppa-182883.html
- [S38] https://blog.youtube/news-and-events/disclosing-ai-generated-content/
- [S39] https://support.google.com/youtube/answer/14328491
