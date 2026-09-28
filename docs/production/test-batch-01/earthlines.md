# Earthlines — Test Batch 01: Director Briefs

**Channel:** Earthlines (working name *What If Earth*) · **Batch:** TEST-01, 4 long-form + 4 Shorts · **Prepared:** 2026-09-28 · **Status:** ready for generation, not yet committed.

**Companion docs:** `docs/channels/what-if-earth/Channel-Bible.md` (the Bible) and `docs/channels/what-if-earth/Video-Ideas-60.md` (the 60 ideas).

**Conventions in this document:**
- `[U]` marks a claim that is unverified or an estimate. Check it live before you rely on it.
- `‖` marks a deliberate hard cut. Every other section boundary uses the Earth-globe transition (the Turn, Bible §4.3).
- Seconds are *generated* seconds per section.
- Cost is **$0.2057/s** for every generated second, Seedance included. Seedance pricing is assumed equal to Cinema [U].
- VO word targets assume **~2.3 words/s** in long-form (≈150 WPM with pauses after each T+ slam) and **~2.7 words/s** in Shorts (≈165 WPM).
- **Dev note.** Bible §5.1 says `color_palette` is not exposed yet. That note is out of date: `CinemaStudioControls` in `src/lib/adapters/higgsfield.ts:229-237` now has `color_palette?: string`, and `sanitizeCinemaControls` accepts any slug. Palette presets can be passed as written below.

---

## Part 1 — Viral format study (2024–2026)

### 1.1 What the research says (sourced)

| # | Finding | Source |
|---|---|---|
| R1 | Shorts can run **up to 3 minutes** for square or vertical uploads made on or after 2024-10-15. | https://9to5google.com/2024/10/03/youtube-shorts-3-minutes/ · https://support.google.com/youtube/answer/15424877 |
| R2 | Since **2025-03-31**, a Shorts "view" counts every start or replay with no minimum watch time. Monetization still uses "engaged views." So replays (loops) inflate views but not revenue. | https://www.shortimize.com/blog/youtube-shorts-retention-rate · https://emarketer.com/content/youtube-shorts-changes-view-count-rules-match-tiktok--instagram |
| R3 | **"Viewed vs. swiped away"** in YouTube Studio is the hook-health metric. Guides cite roughly 70–80% viewed as a strong target [U; practitioner benchmark, not a YouTube number]. | https://reelrise.app/guide/viewed-vs-swiped-away-the-only-youtube-shorts-metric-that-matters/ · https://vidiq.com/blog/post/youtube-shorts-algorithm/ |
| R4 | Most early drop-off happens in **seconds 1–3**. Practitioners give a "cliff" of 30–50% between s1 and s3 as the failure signature, and blame intro cards and logos. Fix it by opening on a dense frame with 2–4 words of on-screen text. | https://aibrify.com/blog/youtube-shorts-retention-curve-playbook · https://www.opus.pro/blog/youtube-shorts-hook-formulas |
| R5 | A hook should land in **~2–2.5 s**. Over 60% of Shorts are watched on mute [U; vendor stat], so every hook must work without sound. | https://www.opus.pro/blog/youtube-shorts-hook-formulas |
| R6 | Pacing heuristic for Shorts: **one visual change every ~1.5–2.5 s**. Faster reads as noise; slower dips retention [U; vendor heuristic]. | https://aibrify.com/blog/youtube-shorts-retention-curve-playbook |
| R7 | **Loops.** Two kinds: a *narrative* loop, where the last line re-opens the first, and a *visual* loop, where the last frame matches the first. The best Shorts combine both. Retention spiking over 100% at second 1 means the loop worked. | https://virvid.ai/blog/looping-structure-shorts-retention-2026 · https://aibrify.com/blog/youtube-shorts-retention-curve-playbook |
| R8 | **Zack D. Films.** The hook is always *visual* in the first 3 s: an impossible or microscopic view. Narration is calm and steady against intense visuals. Videos run under 60 s, have no intro, end abruptly and loop back to the start. The logo is placed *inside* the 3D world. The channel posts 4–5 Shorts a day, has about 26M+ subscribers, and "How Stitches Work" has about 250M views [U; blog figures]. | https://ivideonow.com/blog/why-zack-d-films-dominates-youtube-shorts-with-unsettling-3d-animation-content-en |
| R9 | **melodysheep, *Timelapse of the Future*.** A 29:21 film at 88M views as of Dec 2022 (110M+ by late 2025 per the Bible). The on-screen counter's *lapse rate doubles every 5 s* (logarithmic time), and the opening music is written to the counter at 120 BPM. Each era has its own mood and palette. The film uses deliberate "breathing" silences and short scientist voice samples, with density limited so the viewer isn't overloaded. It won the Webby in 2020. | https://en.wikipedia.org/wiki/Timelapse_of_the_Future · https://www.asoundeffect.com/timelapse-of-the-future-sound/ |
| R10 | **Kurzgesagt.** About a dozen script drafts per video. Deep research with expert review, and published sources. Structure is a *cascading paradox*: each answer opens a bigger question, carried by an extended analogy, and ends by reframing the viewer's place in it. Every video has an original score cued to the pacing. | https://kurzgesagt.org/what-we-do?visit=videos · https://medium.com/@prismiqpro/creative-spotlight-how-kurzgesagt-transforms-disorienting-science-youtube-analysis-video-editing-tips-e83f3373d600 |
| R11 | **What If (Underknown).** The series started as a living-room science explainer. It is built on hypothetical questions and survival scenarios, and won a Webby People's Voice (2020) and a Shorty Award. About 8.9M subscribers per the Bible. Format specifics (8–15 min, single narrator, stylized CG) come from Bible §2 [U; not re-verified here]. | https://en.wikipedia.org/wiki/Underknown · Bible §2 |
| R12 | **Title and thumbnail A/B.** YouTube "Test & Compare" now tests **up to 3 titles and/or thumbnails** (title testing reached all creators on 2025-12-09). The winner is picked by **watch time per impression, not CTR**. It works on long-form only, not Shorts. | https://www.searchenginejournal.com/youtube-title-a-b-testing-rolls-out-globally-to-creators/562571/ · https://gyre.pro/blog/youtubes-new-title-ab-testing-tool-everything-creators-need-to-know |
| R13 | Longer Shorts (61–180 s) are recommended differently from ≤60 s ones, and YouTube was still tuning distribution for them at launch. Test the length bucket rather than assume it works. | https://1of10.com/blog/three-minute-shorts-need-know/ · https://www.shortimize.com/blog/youtube-shorts-retention-rate |
| R14 | **SEA-style ambient space docs.** 20–60 min, calm narrator, dark planets, sleep-friendly watch time. I could not verify the channel's identity, size or metrics in 2026 searches, so treat all of it as [U] and rely on Bible §2 only. | Bible §2 (unverified) |
| R15 | **Viral "What if the Moon disappeared / Earth stopped spinning" Shorts.** Many channels posted these in 2025–26. They share the literal query as the title, a 1-shot premise visual and 3–5 consequences in a list. No per-video view counts could be verified [U]. | https://www.youtube.com/shorts/EU99xyUuCFc · https://www.youtube.com/shorts/Sn3PloeYfR8 |

### 1.2 The reusable formats, deconstructed

Each format keeps close to what already works. The **Earthlines layer** says how we make it ours.

#### F1 — The Timeline Ladder (What If / Underknown; "minute-by-minute")
- **Hook, 0–3 s:** state the premise as happening *now*, with a time stamp ("At 9:41 tonight…"). The premise visual is on screen in frame 1.
- **Escalation:** fixed rungs, T+seconds → hours → days → years → deep time. Each rung raises the scale by an order of magnitude, and each ends on a question that opens the next rung.
- **Pacing:** one premise, 8–15 min, a steady VO cadence and a new rung every ~45–75 s [U].
- **Payoff / loop:** the "new equilibrium" rung, then the twist ("this already happened once").
- **Title / thumbnail:** "What If {premise}?" with one bold object and a saturated contrast [U].
- **Retention tricks:** every rung is a re-hook, and stakes rise in a way the viewer can predict.
- **Earthlines layer:** the rungs *are* the **T+ clock slams** (Bible §4.3), and the clock is visible the whole time. Each rung has a `REAL SCIENCE` / `SPECULATIVE` chip. We use photoreal orbital cinematography instead of stylized CG.

#### F2 — The Visual-First 3D Short (Zack D. Films)
- **Hook, 0–1.5 s:** an impossible *visual* explains the premise before any word does (a Moon filling the sky, an Earth falling into a Sun). Text is ≤4 words.
- **Escalation:** 3–4 beats of cause → consequence, with each beat showing a bigger version of the same object.
- **Pacing:** 45–75 s, a visual change every ~2 s (R6), no intro and no logo at 0:00.
- **Payoff / loop:** an abrupt ending on a line that sends the viewer back to the first frame (R7, R8).
- **Title / cover:** the literal question.
- **Retention tricks:** calm VO over an extreme image, which creates tension through contrast. The brand lives *inside* the frame (R8).
- **Earthlines layer:** the "calm VO over extreme visual" contrast *is* our Observer voice. Our in-world brand is the **T+ clock** at top-centre plus the **terminator line** splitting the frame; we don't use a logo. Every Short ends on a physically plausible frame that matches frame 1.

#### F3 — The Cascading Paradox (Kurzgesagt)
- **Hook:** a counterintuitive consequence goes first ("the first thing you'd notice isn't the dark, it's the tides").
- **Escalation:** each answer raises a bigger "but then…". One analogy is extended across the video.
- **Pacing:** dense but measured, with an original score that follows the arc (R10).
- **Payoff:** the viewer's place in the system gets reframed, with a hopeful or awe-driven ending.
- **Title / thumbnail:** a clean illustration and a curiosity title.
- **Retention tricks:** trust earned through sources, so viewers stay to *learn* and not just to see.
- **Earthlines layer:** we borrow the **"scientists disagree, here are both"** beat (for example Laskar 1993 vs Lissauer 2012 in L01), the pinned source list, and the Readout's `src:` tags. The reframing twist sits at ‖ near the end of every long-form.

#### F4 — The Accelerating Counter (melodysheep)
- **Hook:** the counter starts and the music locks to its rhythm (R9).
- **Escalation:** logarithmic time (the lapse rate doubles on a fixed beat). Every era gets its own palette and sonic identity.
- **Pacing:** slow and musical, with breathing silences.
- **Payoff:** scale awe at the far end of time.
- **Title / thumbnail:** minimal, and the awe carries it.
- **Retention tricks:** the viewer watches the number, and "how far will it go?" becomes the hook.
- **Earthlines layer:** our T+ progress bar is already on a log axis (`SEC · HR · DAY · YR · 1K · 1M`). Music changes key per stage, and every **T+ slam lands on a downbeat**. Silence is used at the premise moment (L01 vanish, S07 day 64).

#### F5 — The Ambient Cinematic Doc (SEA-style [U])
- **Hook:** a slow, gorgeous reveal.
- **Escalation:** mood rather than stakes.
- **Pacing:** long takes, a calm narrator, low music.
- **Payoff:** a meditative ending.
- **Title / thumbnail:** dark, mysterious planets.
- **Retention tricks:** high watch time from background or sleep viewing.
- **Earthlines layer:** we take **only the texture** (long orbital pushes, the terminator at dusk, restrained score) for aftermath and awe stages. We reject the slow opening, because we hook in 5 s.

#### F6 — The Scale-Anchor Number (the viral "what if the Earth…" Short)
- **Hook:** a single number, spoken and shown ("Seventy meters." "Sixty-five days.").
- **Escalation:** the number is converted into things the viewer knows (a building, a walk, a day count).
- **Pacing:** the list form is fast.
- **Payoff:** the number re-appears, changed.
- **Title / thumbnail:** the number as cover text.
- **Retention tricks:** plateau-shaped retention, because each point is a mini-payoff (R4).
- **Earthlines layer:** the number lives in the **Readout** (JetBrains Mono, ease-out count-up, `src:` tag). Speculative numbers carry the `MODEL EST.` badge.

### 1.3 The Earthlines signature, applied to every video in this batch (non-negotiable)

1. **T+ clock.** It is visible from the intro sting to the CTA and slams at every stage. In Shorts it sits top-centre. The clock is the in-world brand.
2. **Terminator-light signature.** Every video's **hero shot and final frame sit on a day/night terminator**, either from orbit or as dusk/dawn light on the ground. The thumbnail seam *is* a terminator. Orbital key light always comes from **frame-left**, with the night side and city lights on the right. The surface drifts **left→right** (west→east with north up).
3. **Calm-authority narration.** This is The Observer (Bible §7). There is no hype, and the extreme visuals are paired with a steady voice (the F2 contrast).
4. **Cited science.** Each stage has a `REAL SCIENCE` or `SPECULATIVE` chip. Each Readout metric has a `src:` tag. The description carries 3–6 primary sources, and there is at least one "scientists disagree" or "here's the real number" beat per video.
5. **"Our planet, altered."** Every premise changes *Earth* rather than some other world. The left half of the thumbnail shows normal Earth and the right half shows the changed Earth. Each video has one hero colour.

---

## Part 2 — The picks

### 2.1 Long-form (TOP 4)

| Pick | Final title | Why it's a top first impression | Test role |
|---|---|---|---|
| **L01** | What If the Moon Disappeared? | This is the #1 evergreen seed query (Bible §1.5). The premise is instantly visual: the Moon, then no Moon. It lets us show the **terminator** and a moonless night sky, both flagship looks. The science is rich and citable (NOAA tides, coral spawning, the Laskar vs Lissauer disagreement). Label can stay OFF (no real place is damaged), so it's the cleanest compliance case. | *Removal* premise; the channel flagship |
| **L02** | What If Earth Stopped Spinning? | A top-3 seed query. It makes **two** scenarios (instant vs slow) into a narrative twist. It has a unique, verifiable "wow" in the sun rising in the **west** with a year-long day, plus a terminator that moves at walking pace. Esri's megacontinent model makes a strong image for the thumbnail. | *Physics catastrophe* premise |
| **L03** | What If All the Ice Melted? | High search volume, and it's the **cited-science showcase**: a hard "reality check" separates IPCC 2100 numbers from the millennia-scale scenario. That positions the channel as trustworthy on day one. The map-morph spectacle suits Seedance. Tweak: the stage clock runs T+1K→T+10K yrs using Winkelmann 2015. The CTA hands off to S04, which is its inverse (−120 m). | *Real-science / climate* premise; label ON |
| **L06** | What If Earth Had Rings? | The most beautiful premise in the set, and it's the **"awe" arm**. It carries a real 2024 hypothesis twist (Monash: an Ordovician ring 466 Ma). It has correct but under-shown details (a rocky grey ring, not white ice; Earth's shadow gliding across the arch at midnight). Label OFF, since this is a clearly impossible cosmic scene. S01's ending (the Moon becomes a ring) feeds straight into it. | *Alternate-Earth / beauty* premise |

**Considered and deferred:**
- **L10** Sun disappeared: strong, but it overlaps L01 as a second "removal" premise.
- **L05** Earth in 1M yrs: a tour with no single premise, which is weaker for a new channel's CTR.
- **L19** Humans vanished: crowded (*Life After People*) and needs heavy city imagery.
- **L08** Yellowstone: a real-hazard fear risk for a first impression.

### 2.2 Short-form (TOP 4, 60–180 s)

| Pick | Final title | Runtime | Why | Funnel → long-form |
|---|---|---|---|---|
| **S01** (tweaked) | What If the Moon Were at the ISS's Height? | 70 s | Pure F2: an impossible Moon filling the sky in frame 1. The physics was corrected: the idea card's "8,000,000× tides" and "a minute to look" are wrong. Recomputed: **~92,000× tidal stretch** and a **~2.2 h orbit**, deep inside the Roche limit. The payoff is the Moon turning into a ring, which makes a perfect narrative loop. | L06 Rings (and L01) |
| **S07** | What If Earth Stopped Orbiting the Sun? | 75 s | F6 (the number: 65 days) plus the **T+ clock as hero** (day counter). The physics is fully REAL (Kepler free-fall = P/(4√2) ≈ 64.6 d). The milestones are sourced: Venus's orbit on day ~41, Mercury's on day ~57. | L02 |
| **S22** (tweaked) | What If Earth Spun Backwards? | 70 s | F3-style counterintuitive hook ("the Sun rises in the west"). It rests on a **real peer-reviewed simulation** (Mikolajewicz et al. 2018, *Earth System Dynamics*), so its "cited science" identity is strong. Tweak: the idea card's "deserts become green" is sharpened to the paper's actual findings (Sahara greens, the Americas dry out, AMOC collapses, the Pacific overturns). Production trick: the retrograde globe is a *time-reversed* prograde clip, so continents stay correct. | L02 |
| **S04** (tweaked) | What If Sea Level Dropped 120 Meters? | 150 s | The **mini-sim length test** (61–180 s bucket), REWIND EARTH series, all REAL science. Its hook is unusually concrete ("walk from England to France"). Tweak: the ice-age landscape is shown as tundra (the LGM North Sea was cold and partly ice-covered), and the depth is sourced to Lambeck 2014 (~−134 m at LGM, written as "120–130 m"). | L03 (the inverse) |

**Considered and deferred:**
- **S05** Jupiter as the Moon: great, but a third "giant object in the sky" hook alongside S01 and S07.
- **S06** 1 km asteroid: a realistic disaster, so label ON, and it drifts from "our planet, altered."
- **S19** lightning: a strong vertical, but its science hook is weaker.

---

## Part 3 — Shared production rules for all 8 briefs

### 3.1 Default controls
Unless a section says otherwise:
- **Model:** Higgsfield Cinema Studio 4.0 (`higgsfield/cinema-studio/4.0`)
- **Controls:** genre `epic`, pacing `calm`, camera_model `modern`, camera_lens `anamorphic`, era `2020s`, color_palette `static-noon`
- **Output:** `16:9` long-form or `9:16` Shorts, `720p`, audio **off**

Each section's "Controls" line lists the full set it uses. **Seedance 2.5 i2v** takes `image_url` as the literal first frame and an optional `end_image_url`, runs 4–30 s at 720p, and is used only where a designed still must be exact.

### 3.2 The prompt suffix (append to *every* Cinema prompt; do not repeat it in section prompts)
> `Photoreal, physically plausible single-sun lighting, NASA ISS photography realism, IMAX scale. No text, no letters, no numbers, no logos, no watermarks, no human faces, no lens flare in space.`

### 3.3 Stitching
These follow Bible §5.3:
- A section over 30 s splits into ceil(s/30) **balanced** segments. The last frame of segment N becomes `image_1` of segment N+1.
- Segment prompts describe **motion already in progress** and never use begin/end verbs.
- Every segment in a stage uses the **identical Stage Card text**. It is pasted verbatim after the shot description.
- Segment IDs look like `L01-S3b` (video, section, segment).

### 3.4 Shared QC acceptance criteria (every video, every clip)
A clip **fails** if any of these is true:
1. **Planet state.** The Stage Card is violated: a Moon where there shouldn't be one, wrong ice or ocean extent, or a later stage that looks *less* changed than an earlier one without a script reason.
2. **Physics.** Sun direction differs from the Stage Card. Orbital shots must be lit from frame-left. On the ground, shadow direction must match between chained segments. Other failures: Earth rotating right→left (except S22's reversed stage), a lens flare or atmosphere glow in open space, a Moon phase that doesn't match the sun direction, stars visible in a sunlit daytime sky, or a night side without its terminator gradient.
3. **Text artifacts.** Any generated letters, numbers, signage, fake UI or logos. Text belongs only to the HUD (Remotion).
4. **Human faces.** Any recognizable face, any face in close-up, crowds in panic, bodies or gore. Figures are small, seen from behind, and used for scale only.
5. **Seams.** Colour, exposure, camera speed or direction jumps at a chained seam. Allowed drift is ≤ one step of perceived camera speed and no visible palette shift. A seam that fails gets masked with a T+ slam or a Readout update only if it lands on a narration beat; otherwise it is re-generated.
6. **Morphing.** Continents or coastlines that "breathe" or melt in Cinema orbital shots. Accept small drift, and reject any recognizable shape change that the script doesn't call for.
7. **Real places.** Any identifiable skyline or landmark in a Cinema shot. Real coastlines appear only in designed Seedance maps.

**Sign-off:** a human reviewer marks each clip PASS / FIX / REGEN in the production log (Bible §9.2.7).

### 3.5 Revision protocol (operator-authorized: 2 targeted revisions per video)
1. **Rough cut v1** is assembled with all first-pass clips.
2. **Revision 1** re-generates only the sections the QC flags, starting with that video's "highest-risk" list. It is capped at 60 s for long-form and 20 s for Shorts (30 s for S04). Then re-edit.
3. **Revision 2** is a final pass on anything still failing, capped at 40 s for long-form and 10 s for Shorts (15 s for S04). Then re-edit, then lock.
4. If a section still fails after revision 2, use the documented **fallback** for that section: a Seedance i2v from a designed still, a Remotion hold/zoom on the best frame, or covering it with the globe Turn. **Do not** open a third revision.

### 3.6 Shared edit spec (Remotion)
- **HUD:** follows Bible §4.3.
  - T+ clock top-left (long-form) or top-centre (Shorts), amber `#FFB547`, JetBrains Mono 700. Each slam is 1.3→1.0 over 6 frames, with a 2-frame white flash, a metallic tick and a sub-thump.
  - Log progress bar under the clock.
  - The Readout is the right-edge panel (long-form) or a rotating pill (Shorts). Every metric carries a `src:` tag.
  - A `REAL SCIENCE` (cyan) or `SPECULATIVE` (amber) chip sits bottom-left every time a stage opens.
- **Captions:** word-by-word, Space Grotesk 700 in `#EEF3F8` with a 6 px `#05070D` stroke. The active word is amber. The block sits at 62% height in Shorts; the long-form lower third is optional (on by default for the test).
- **Highlight words** (listed per video) get amber plus a +8% scale pop.
- **Music** is ducked −14 dB under VO. VO sits at −14 LUFS integrated for YouTube and peaks at −1 dBTP.
- **Ident** (5 s): long-form only, at ~0:20. It is **never** used in Shorts.
- **Outro** (18 s): end screen at 16 s, with the VO "Every change has consequences. Pick your next timeline."
- **Altered-content label:** set per video; see each brief.

---

## Part 4 — Long-form director briefs

---

### L01 — What If the Moon Disappeared?

**Series:** WHAT IF · **Format:** F1 Timeline Ladder + F3 "scientists disagree" beat · **Runtime:** 8:28 (485 s generated + 5 s ident + 18 s outro). Clears the 8:00 mid-roll threshold.
**Hero colour:** starfield indigo, the empty night. **Altered-content label:** OFF (no real place is altered; this is a cosmic hypothetical). Keep the `SPECULATIVE` chip on S7–S8.

**Titles**
- **Final:** What If the Moon Disappeared? (29 chars)
- **Alt A:** The Night the Moon Vanished: Hour by Hour
- **Alt B:** What If the Moon Disappeared Tonight? (Minute by Minute)
- Test & Compare runs Final vs Alt A vs Alt B.

**Thumbnail brief (`ThumbSplit`)**
- **Left:** a normal moonlit coast. A full Moon sits upper-left, silver moon-path on the sea, cyan rim light.
- **Right:** the *same* coast, pitch-dark, Milky Way blazing, flat black sea with no moon-path.
- **Seam:** a thin white diagonal that doubles as a terminator.
- **Text:** **"NO MOON?"** in Anton amber, top third.
- **Chip:** `T+1 HR`.
- **Test variants:** (B) no text; (C) an orbital version, Earth with a Moon on the left and Earth alone on the right.
- **Sources:** frames S1a and S1b (these frames are designed for the thumbnail).

**Hook, verbatim, 0:00–0:05:** "At nine forty-one tonight, the Moon is gone. No explosion. No flash."

**Stage Cards** (paste verbatim into every prompt of that stage)
- **SC-A BASELINE:**
  ```
  STAGE: present-day Earth. Moon present: full Moon, bright, correct size. Ice extent today. Deep-blue oceans with sun glint. Normal clouds. City lights on night side. Sun from frame-left in orbital views.
  ```
- **SC-B MOONLESS:**
  ```
  STAGE: Earth with NO MOON anywhere — no Moon in any sky, no moonlight, no moon-path on water. Night skies dense with stars and a bright Milky Way away from cities. Ice, oceans, clouds, vegetation and city lights exactly as today. Sun from frame-left in orbital views.
  ```
- **SC-C DEEP TIME:**
  ```
  STAGE: far-future Earth with NO MOON; seasons exaggerated; winter snow and frost reaching unusually low latitudes, reduced summer polar ice; no cities, no artificial lights; wild vegetation. Sun from frame-left in orbital views.
  ```

**Controls key.** Controls are written genre / pacing / camera_model / camera_lens / era / color_palette. "Default" means epic / calm / modern / anamorphic / 2020s / static-noon.

#### §1 · Cold open: the empty sky · `T−0 → T+0` · 20s (0:00–0:20)
- **VO (39 w):** "At nine forty-one tonight, the Moon is gone. No explosion. No flash. Just an empty patch of sky. Most people won't notice for hours. But the ocean notices immediately — and by morning, every coastline on Earth is behaving strangely."
- **Visual prompt, S1a (Cinema, 10 s):**
  ```
  Low-angle wide night shot of a generic rocky Atlantic coastline with no landmarks, a full Moon in the upper-left third casting a silver moon-path across gentle waves, a lone small figure standing on a rock at lower right seen from behind for scale, faint stars. Camera: extremely slow push-in at 1.6 m eye height, continuous. {SC-A}
  ```
- **S1b (Seedance 2.5 i2v, 10 s):**
  - `image_url` is the last frame of S1a, retouched in an image editor so the Moon and moon-path are removed and stars are added in the Moon's place.
  - The prompt carries the same push-in, continuing: "the sea darker and flat, only starlight, the figure motionless." Use {SC-B}.
- **Model / controls:** S1a Cinema: epic / single-shot / modern / anamorphic / 2020s / after-dark. S1b Seedance 2.5 i2v, 16:9, 720p.
- **Camera / lens / light:** a 1.6 m tripod-height slow dolly on an anamorphic 40 mm equivalent. Moonlight key comes from upper-left and is then gone, leaving starlight only.
- **Stitch:** ‖ the premise cut happens *between* S1a and S1b, at 0:03 on "the Moon is gone." Two single gens, with no chain needed because S1b starts from S1a's edited last frame.
- **SFX / music:** surf. On the cut: total silence for 0.6 s, then a single high glassy tone. Felt piano enters at 0:08.
- **HUD:** clock `T−00:00:03` → slam `T+00:00:00` on the cut. Chip `SPECULATIVE`. Readout is hidden.
- **Ident** follows at 0:20–0:25.

#### §2 · ‖ Premise + what the Moon does for us · `T−0` · 45s (0:25–1:10)
- **VO (97 w):** "What if the Moon disappeared? To answer that, we need to know what it's been doing for us. The Moon orbits about three hundred eighty-four thousand kilometers away, and it pulls on Earth's oceans harder than the Sun does — about twice as hard. It lights our nights. It sets the rhythm of the tides that shape every coastline. It even helps steady the tilt of the planet itself. And it's slowly drifting away — three point eight centimeters a year, about as fast as your fingernails grow. Tonight, it doesn't drift. It's simply gone. Let's start the clock."
- **Visual prompt:**
  ```
  Photoreal deep-space wide shot: Earth in the right half of frame, day side lit from frame-left, the Moon small and crisp in the far left background, both in the same sunlight, thin blue atmospheric limb, city lights on Earth's night side. Camera: continuous very slow lateral dolly left-to-right that gradually brings Earth to center. {SC-A}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** a slow lateral truck on a clean-sharp 50 mm equivalent, with hard sunlight from frame-left.
- **Stitch:** 45 s → **23 + 22**.
  - S2a: the truck is in progress; Earth moves from right third toward centre and the Moon holds at left.
  - S2b: the truck continues; Earth settles at centre and the Moon sits at the far-left edge of frame.
- **SFX / music:** low string pad. On "Let's start the clock," a reversed whoosh.
- **HUD:**
  - Premise card "WHAT IF THE MOON DISAPPEARED?" at 0:25–0:28.
  - Readout: `MOON DIST 384,400 km · src: NASA` · `LUNAR vs SOLAR TIDE 1 : 0.46 · src: NOAA` · `RECESSION 3.8 cm/yr · src: JPL`.
  - Chip `REAL SCIENCE`.
  - Intro sting at 1:08, with the clock resetting to `T+00:00:00`.

#### §3 · ‖ First night: the stars come out · `T+1 HR` · 65s (1:10–2:15)
- **VO (138 w):** "T plus one hour. The first thing you notice isn't darkness — it's the stars. Away from city lights, a moonless night reveals the full Milky Way, every night of the month, not just the few dark nights around a new moon. For astronomers, it's a gift. For animals, it's a problem. Many nocturnal hunters use moonlight to see. Many of their prey use moonless nights to hide. For millions of years, that rhythm — bright weeks, dark weeks — has shaped when animals hunt, feed and hide. It just stopped. On the beach, the tide is still coming in. For now, nothing looks wrong. The water that was already moving keeps moving. But the force that was doing most of the pulling has vanished. And over the next hours, the ocean settles into a new, smaller rhythm. So how small?"
- **Visual prompt:**
  ```
  Photoreal wide night beach under a brilliant Milky Way arching from lower-left to upper-right, no Moon, dark flat sea with small waves catching starlight, a single small figure seen from behind at the waterline for scale, distant faint coastal glow on the far horizon at right. Camera: continuous slow crane-up from sand level toward the sky. {SC-B}
  ```
- **Model / controls:** Cinema: drama / calm / modern / anamorphic / 2020s / after-dark.
- **Camera / light:** a slow crane from 0.5 m to 6 m on an anamorphic 24 mm equivalent. Light is starlight plus faint airglow.
- **Stitch:** ‖ hard cut in (the darkness drop). 65 s → **22 + 22 + 21**.
  - S3a: the crane rises from wet sand past the figure's shoulders.
  - S3b: the crane continues rising; the Milky Way fills the upper frame and waves wash in slowly.
  - S3c: the crane continues to its high position; the beach is small below and the Milky Way dominant. Hold the drift.
- **SFX / music:** crickets; surf with no swell change; felt piano in a new key (A minor).
- **HUD:** clock slam `T+01:00:00`. Readout: `NIGHT SKY BRIGHTNESS: no full-Moon nights · MODEL EST.`. Chip `REAL SCIENCE`.

#### §4 · Tides shrink · `T+1 DAY` · 70s (2:15–3:25)
- **VO (153 w):** "T plus one day. Tides are the ocean being stretched by gravity, and the Moon's stretch was the big one. According to NOAA, the Sun's tide-generating force is only about forty-six percent of the Moon's. So with only the Sun left, tides shrink to roughly a third to a half of what coasts are used to. And spring and neap tides — the monthly swing between big and small tides — disappear entirely. Every day's tide now looks like every other day's. Harbors dredged for deep tidal ranges have mud where they need water. Tidal flats that flooded twice a day sit exposed, drying in the sun. The crabs, mussels and shorebirds that live between the tides are living on a shoreline that just shrank. Tidal power stations, built to harvest the Moon's pull, lose most of their output. None of this is a catastrophe. It's something stranger: a planet whose heartbeat just got weaker."
- **Visual prompt:**
  ```
  Photoreal aerial drone shot at golden hour over a vast generic tidal mudflat with meandering channels, the water line far out and not returning, drying rippled sand, small wading birds in the distance, a lone wooden jetty ending on dry mud for scale, long shadows cast toward frame-right from a low sun at frame-left. Camera: continuous slow forward glide at 60 m altitude. {SC-B}
  ```
- **Model / controls:** Cinema: epic / calm / modern / anamorphic / 2020s / the-morning-after-rain.
- **Camera / light:** a steady glide on an anamorphic 35 mm equivalent. Low sun from frame-left, with shadows falling to frame-right. **Lock that direction for all three segments.**
- **Stitch:** 70 s → **24 + 23 + 23**.
  - S4a: the glide passes over the jetty.
  - S4b: the glide continues over the channels, with birds lifting in the distance.
  - S4c: the glide continues toward the far waterline; the sea is a thin line at the horizon.
  - Keep the sun height constant (no time-of-day drift).
- **SFX / music:** wind over mud, distant gulls, a slow water trickle. Strings rise gently.
- **HUD:** clock slam `T+1 DAY`. Readout: `TIDAL RANGE → ~⅓–½ · src: NOAA (0.46 ratio) · MODEL EST.` · `SPRING/NEAP CYCLE: GONE`. Chip `REAL SCIENCE`.

#### §5 · Lost signals: corals, beetles, the dark window · `T+1 MONTH` · 65s (3:25–4:30)
- **VO (149 w):** "T plus one month. On Australia's Great Barrier Reef, over a hundred coral species spawn together — on a few nights each year, within the same hour. Their cue comes from the Moon. Research suggests the trigger is the window of darkness between sunset and moonrise in the nights after a full moon. Without a Moon, that window never opens. The signal that synchronized a reef the size of a country is gone — and eggs released out of step are less likely to meet. That matters far beyond the reef: coral reefs cover less than one percent of the ocean floor, yet they support around a quarter of all marine species. Not everything loses. Some dung beetles steer by the glow of the Milky Way itself — and that sky just got brighter. But in oceans and forests, creatures that timed their lives to a thirty-day light cycle are now guessing."
- **Visual prompt:**
  - S5a–b:
    ```
    Photoreal underwater night macro of a healthy branching coral reef lit only by faint blue ambient light, a few pinkish egg-sperm bundles drifting upward out of sync, small fish sheltering, particles floating. Camera: continuous slow macro slider move left-to-right. {SC-B}
    ```
  - S5c:
    ```
    Photoreal low macro at night on desert sand, a single dung beetle rolling a ball in a straight line away from camera beneath a brilliant Milky Way, starlight only. Camera: continuous slow low tracking behind it. {SC-B}
    ```
- **Model / controls:** Cinema: epic / calm / modern / clean-sharp / 2020s / after-dark.
- **Camera / light:** a macro slider at 100 mm-equivalent macro with shallow depth of field. Ambient blue underwater; starlight on land.
- **Stitch:** 65 s → **22 + 22 + 21**.
  - S5a and S5b chain seamlessly: the slider move continues across the reef.
  - S5a→b→c: **S5c is a new shot.** Join it with a soft match-dissolve from the reef's upward-drifting bundles to the beetle's stars; this is not a hard cut. S5c is a single gen (21 s).
- **SFX / music:** underwater muffle, a soft sonar-like pad, then a desert night wind. A glassy chime on each Readout change.
- **HUD:** clock slam `T+1 MONTH`. Readout: `CORAL SPECIES SPAWNING TOGETHER 130+ · src: eLife 2015` · `CUE: POST-FULL-MOON DARK WINDOW · src: [U verify]`. Chip `REAL SCIENCE` → `SPECULATIVE` from "eggs released out of step."

#### §6 · No more eclipses · `T+1 YR` · 45s (4:30–5:15)
- **VO (96 w):** "T plus one year. The sky has lost more than light. There will never be another solar eclipse — there's no Moon to cross the Sun. And never another lunar eclipse — there's no Moon to fall into Earth's shadow. Calendars built on the lunar month, still used to set holidays around the world, now count a Moon that isn't there. From orbit, Earth looks the same. But its ocean bulges now follow only the Sun: the same small tide, twice a day, every day. So far, this is a quieter planet. The real consequences take much longer."
- **Visual prompt:**
  ```
  Photoreal orbital view of Earth from 2,000 km altitude, the day-night terminator running vertically through center-right, day side lit from frame-left with ocean sun glint, night side with city lights, no Moon anywhere in the black sky. Earth rotates slowly west to east (surface drifting left to right). Camera: continuous very slow push toward the terminator. {SC-B}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / after-dark.
- **Camera / light:** an orbital push on a clean-sharp 35 mm equivalent, with hard sun from frame-left. **This is the video's terminator hero shot.**
- **Stitch:** 45 s → **23 + 22**. S6a: push in progress. S6b: the push continues until the terminator fills the centre third.
- **SFX / music:** stylized orbital room-tone. Music thins to one sustained note.
- **HUD:** clock slam `T+1 YR`. Readout: `SOLAR ECLIPSES: 0` · `LUNAR ECLIPSES: 0` · `TIDE: SOLAR ONLY`. Chip `REAL SCIENCE`.

#### §7 · The tilt starts to wander (scientists disagree) · `T+1M YRS` · 50s (5:15–6:05)
- **VO (113 w):** "T plus one million years. Earth spins tilted about twenty-three and a half degrees — that tilt is why we have seasons. The Moon helps hold it steady, like a hand on a spinning top. Today, the tilt only nods between about twenty-two and twenty-four and a half degrees. Remove the hand, and the tilt is free to drift. How far? Here, scientists genuinely disagree. A famous 1993 study led by Jacques Laskar found that without the Moon, the tilt could wander chaotically from nearly zero to more than eighty-five degrees. A 2012 study using direct simulations found something much gentler: swings of about ten degrees over billions of years. We'll show you both."
- **Visual:** a **Seedance 2.5 i2v diagram**, two segments.
  - **Designed stills:** Earth on black at 23.4° tilt, with a thin cyan axis line and orbit-plane line. The mild (±10°) state is an amber ghost axis at 33.4°. The wild state is a magma-red ghost axis at 85°. The designer adds **no text in the still**; labels are Remotion.
  - S7a: `image_url` 23.4° → `end_image_url` 33° (mild).
  - S7b: `image_url` 33° → `end_image_url` 85° (wild).
  - Prompt: "Photoreal Earth on black space slowly and smoothly tilting its rotation axis while continuing to rotate west to east, sunlight from frame-left, no Moon, continuous motion."
- **Model / controls:** Seedance 2.5 i2v, 16:9, 720p.
- **Camera / light:** locked-off diagram framing, hard sun from frame-left.
- **Stitch:** 50 s → **25 + 25**. S7a's end frame is S7b's start frame, so the seam is exact.
- **SFX / music:** a slow mechanical creak (gyroscope) and dissonant strings.
- **HUD:**
  - Clock slam `T+1M YRS`.
  - Remotion angle arc and label `23.4°` → `±10° (Lissauer 2012)` → `0–85° (Laskar 1993)`.
  - Readout: `OBLIQUITY TODAY 23.4° (22.1–24.5° cycle) · src: NASA` · two rows tagged `src: Laskar 1993` / `src: Lissauer 2012`.
  - Chip `SPECULATIVE` with the badge "SCIENTISTS DISAGREE".

#### §8 · Climate swings: ice where it shouldn't be · `T+10M YRS` · 60s (6:05–7:05)
- **VO (129 w):** "T plus ten million years. Even the gentle case matters. Earth's ice ages are paced by tilt changes of just a degree or two. Add ten degrees of drift, and seasons stretch toward extremes: hotter summers, harsher winters, ice sheets advancing and retreating on new schedules. Crops, forests and migrations tuned to today's seasons would have to shift — or disappear. In the wild case, the planet could tip so far that the poles receive more sunlight over a year than the equator. Studies of highly tilted planets suggest ice could then build up at low latitudes — frost on coastlines that once grew palms. None of this is certain. It's model territory, and we've marked it that way. But it shows what the Moon really was. Not decoration. A stabilizer."
- **Visual prompt:**
  ```
  Photoreal ground-level wide shot of a wild tropical coastline with palm silhouettes covered in white frost and thin snow, grey winter light, a pale low sun at frame-left behind thin cloud, dark calm sea, drifting snow flurries, no people, no buildings. Camera: continuous slow dolly right along the shoreline. {SC-C}
  ```
- **Model / controls:** Cinema: drama / calm / modern / vintage-anamorphic / 2020s / the-grey-channel.
- **Camera / light:** a lateral dolly on a vintage-anamorphic 32 mm equivalent. A low, weak sun from frame-left behind cloud, casting soft shadows to the right.
- **Stitch:** 60 s → **30 + 30**. S8a: the dolly moves past frosted palms. S8b: the dolly continues; snow thickens slightly, which is the monotonic change.
- **SFX / music:** cold wind, frozen palm fronds creaking. Taiko enters low; this is the video's single orchestral swell.
- **HUD:** clock slam `T+10M YRS`. Readout: `SEASONAL EXTREMES ↑ · MODEL EST.` · `HIGH-TILT WORLDS: LOW-LATITUDE ICE POSSIBLE · src: Williams & Kasting 1997`. Chip `SPECULATIVE`.

#### §9 · ‖ Twist: the Moon was our brake · `REFLECTION` · 45s (7:05–7:50)
- **VO (97 w):** "Here's the strange part. The Moon has been slowing Earth's spin for billions of years. Its tides act like a brake, and ancient eclipse records show that over the last few thousand years, the day has lengthened by nearly two milliseconds per century. About six hundred million years ago, a day lasted only around twenty-two hours. Without the Moon, only the Sun's weaker tides are left on that brake. Our days would stop lengthening at anything like the old rate. The Moon didn't just light our nights. It has been quietly setting the length of our days."
- **Visual prompt:**
  ```
  Locked-off photoreal time-lapse from a high desert ridge: the sun arcing across the sky from left to right repeatedly, day and night flickering in steady rhythm, star trails at night with no Moon, cloud shadows racing over the plain, continuous and steady from start to end. Single-shot, no camera movement. {SC-B}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / twilight-fable.
- **Camera / light:** a locked 24 mm equivalent. The sun cycles; the frame is locked.
- **Stitch:** ‖ hard cut in. 45 s → **23 + 22**, with the time-lapse continuing at the same rhythm (no speed change).
- **SFX / music:** a clock-like pulse locked to the day flicker (the F4 counter-music), resolving to a major chord.
- **HUD:** clock changes to `REFLECTION`. Readout: `LOD +1.8 ms/century (observed) · src: Stephenson 2016` · `DAY ~620 Myr AGO ≈ 21.9 h · src: Williams 2000 [U verify]`. Chip `REAL SCIENCE`.

#### §10 · CTA + next timeline · `END` · 20s (7:50–8:10)
- **VO (39 w):** "So: a world without the Moon. Brighter stars, weaker tides, lost signals — and a planet no longer sure of its own tilt. But what if Earth didn't lose a moon… and gained a ring instead? That timeline is next."
- **Visual prompt:**
  ```
  Photoreal orbital view of Earth centered, slowly rotating west to east, terminator vertical through center, city lights on the right night side, no Moon, a faint thin grey arc of a ring barely visible at the very edge of frame as a teaser. Camera: continuous slow pull-back. {SC-B}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / after-dark.
- **Camera / light:** orbital pull-back, sun from frame-left.
- **Stitch:** single gen of 20 s.
- **SFX / music:** a sustained major chord.
- **HUD:** the clock freezes. An end card teases L06 with a thumbnail tile. The outro follows at 8:10.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Mean Earth–Moon distance ≈ 384,400 km | REAL | https://science.nasa.gov/moon/facts/ [U URL path] |
| 2 | The Sun's tide-generating force is 0.46× the Moon's | REAL | https://oceanservice.noaa.gov/education/tutorial_tides/tides02_cause.html |
| 3 | Solar-only tides ≈ ⅓–½ of today's range; spring/neap cycle vanishes | MODEL EST. (derived from #2: 0.46/1.46 ≈ 0.32 of spring range; ≈0.46 of mean lunar tide) | derived from NOAA |
| 4 | Moon recedes 3.8 cm/yr (lunar laser ranging) | REAL | https://www.jpl.nasa.gov/news/apollo-11-experiment-continues-to-return-valuable-data/ |
| 5 | 130+ coral species spawn in a 30–60 min window; moonlight is a key synchrony cue | REAL | https://elifesciences.org/articles/09991 · https://pmc.ncbi.nlm.nih.gov/articles/PMC4721961/ |
| 6 | Specific cue = dark interval between sunset and moonrise after full moon | REAL, secondary summary [U verify the primary paper, Lin et al. 2021 PNAS] | https://lab.bluehub.jp/en/coral-mass-spawning/ |
| 7 | Out-of-sync spawning lowers fertilization | SPECULATIVE (reasonable inference) | — |
| 8 | Dung beetles orient using the Milky Way | REAL | Dacke et al. 2013, *Current Biology*, https://doi.org/10.1016/j.cub.2012.12.034 [U verify DOI] |
| 9 | No Moon means no solar or lunar eclipses | REAL (geometry) | — |
| 10 | Obliquity 23.4°, cycling 22.1–24.5° over ~41 kyr | REAL | https://science.nasa.gov/science-research/earth-science/milankovitch-orbital-cycles-and-their-role-in-earths-climate/ [U URL] |
| 11 | Without the Moon, obliquity could wander 0–85° chaotically | REAL study; SPECULATIVE outcome | Laskar et al. 1993, https://ui.adsabs.harvard.edu/abs/1993Natur.361..615L · https://perso.imcce.fr/jacques-laskar/en/general-audience/earth-without-the-moon/ |
| 12 | Direct integration: moonless obliquity varies about ±10° over Gyr | REAL study; SPECULATIVE outcome | Lissauer et al. 2012, *Icarus*, https://ui.adsabs.harvard.edu/abs/2012Icar..217...77L/abstract |
| 13 | High-obliquity planets can have low-latitude ice / poles receiving more annual sunlight | SPECULATIVE (model studies) | Williams & Kasting 1997, https://pubmed.ncbi.nlm.nih.gov/11541242/ |
| 14 | Observed LOD increase +1.8 ms/century (tidal prediction +2.3) | REAL | Stephenson et al. 2016, https://royalsocietypublishing.org/rspa/article/472/2196/20160404/57288/ |
| 15 | Day ≈ 21.9 h at ~620 Ma | REAL [U verify] | Williams 2000, *Rev. Geophys.*, https://doi.org/10.1029/1999RG900016 |
| 16 | Without the Moon, tidal braking would drop to the weaker solar share | MODEL EST. | derived from #2 |
| 17 | Coral reefs cover <1% of the ocean floor but support ~25% of marine species | REAL | https://oceanservice.noaa.gov/facts/coralreef-climate.html [U URL] |

**Edit notes**
- **Pacing:**
  - The vanish cut is at 0:03.
  - The ident sits at 0:20.
  - T+ slams fall at 1:10, 2:15, 3:25, 4:30, 5:15 and 6:05, a re-hook every ~55–70 s.
  - After each slam, leave 0.6 s of VO pause (Bible §7).
  - Keep §6 the slowest: breathing room before the deep-time half.
- **HUD overlays:** the S7 angle arc is animated in Remotion over the Seedance clip. The Readout updates on the exact VO word the number is spoken.
- **Captions:** long-form lower third, on.
- **Highlight words:** *gone, stars, forty-six percent, a third, heartbeat, window of darkness, never, disagree, eighty-five, ten degrees, palms, stabilizer, brake, twenty-two hours, ring*.
- **Chapters:** 0:00 The Moon vanishes · 1:10 First night · 2:15 Tides · 3:25 Lost signals · 4:30 No eclipses · 5:15 The tilt · 6:05 Climate · 7:05 The twist.
- **Ident / outro:** the ident runs 0:20–0:25, after "…behaving strangely." The outro runs 8:10–8:28. End-screen tiles are L06 (left) and S01 (right), with subscribe at centre.

**QC acceptance criteria (L01-specific, on top of §3.4)**
- **No Moon** may appear in any SC-B or SC-C clip. Check every sky pixel-peep, including reflections on water. This is the #1 risk: models "helpfully" add a Moon to night skies.
- S1b must match S1a's framing within 2% (horizon line, figure position); only the Moon and moon-path differ.
- S4 shadows fall to frame-right in all 3 segments.
- In S3, the Milky Way keeps the same orientation across segments, with no rotation jumps.
- S7: the axis tilts smoothly while Earth keeps rotating left→right, with no reversal.
- S8 shows no people and no buildings. Frost stays monotonic (it never decreases across a seam).

**Revision plan (2 targeted revisions)**
- **Highest-risk sections:**
  1. **§1b** (Moon-removal continuity).
  2. **§3** (a spurious Moon or a Milky Way that warps).
  3. **§8** (frost-on-palms can look fake or pick up a building).
  4. **§5a–b** (coral macro plausibility).
- **Revision 1:** ≤60 s. §1b (10 s) plus the worst two §3/§8 segments (≤50 s).
- **Revision 2:** ≤40 s. Any remaining single segment.
- **Fallbacks:**
  - §1b: pure Remotion, a still of the edited frame with a slow digital push.
  - §8: swap to a frosted-grass ground shot.

**Estimated generation**

| Item | Seconds | Cost |
|---|---|---|
| Base: 22 generations (19 Cinema; 3 Seedance: S1b, S7a, S7b) | 485 s | $99.76 |
| Revision cap | 100 s | $20.57 |
| **Total** | **585 s** | **≤ $120.33** |

Designed stills (S1b edit, S7 ×3) are image-generation or design costs, not included [U].

---

### L02 — What If Earth Stopped Spinning?

**Series:** WHAT IF · **Format:** F1 Timeline Ladder with a two-scenario fork (instant ↔ slow) · **Runtime:** 8:58 (515 s generated + 5 s ident + 18 s outro).
**Hero colour:** scorched amber (day side) against ice-white (night side), split on the terminator. **Altered-content label:** **ON**. §3 depicts a realistic wind-disaster type, and §5 shows real coastlines altered in maps.

**Titles**
- **Final:** What If Earth Stopped Spinning? (30 chars)
- **Alt A:** Earth Stops Spinning: The First Second, and the Next Million Years
- **Alt B:** What If Earth Stopped Spinning? (The Sun Would Rise in the West)
- Test & Compare runs all three.

**Thumbnail brief**
- **Left:** a normal Earth, blue and cyan-rimmed.
- **Right:** the stopped Earth. The day half is a scorched amber-brown equatorial belt; the night half is frozen white, with two blue polar oceans visible.
- **Seam:** the terminator seam runs down the right-hand globe.
- **Text:** **"IT STOPPED."**
- **Chip:** `SPIN 0%`.
- **Variants:** (B) the ground-level "sunrise in the west" frame from §6, with a compass `W` HUD glyph; (C) no text.

**Hook, verbatim, 0:00–0:05:** "The ground under your feet is moving — at the equator, about one thousand six hundred seventy kilometers an hour."

**Stage Cards**
- **SC-A SPINNING TODAY:**
  ```
  STAGE: present-day Earth rotating normally west to east (surface drifting left to right in orbital views); today's oceans, continents, ice and clouds; city lights on night side; sun from frame-left.
  ```
- **SC-I INSTANT STOP:**
  ```
  STAGE: the instant the ground stopped — the atmosphere still moving eastward at supersonic speed; everything loose (dust, water, vegetation) streaming violently from frame-left to frame-right; daylight, sun high at frame-left; no people, no buildings.
  ```
- **SC-M MIGRATING** (Seedance designed stills only):
  ```
  STAGE: Earth's spin slowing; ocean water draining away from the equator and pooling toward both poles; tropical seafloor emerging as pale land; northern continents flooding from the Arctic side.
  ```
- **SC-Z ZERO SPIN:**
  ```
  STAGE: Earth that does not rotate relative to the stars — NO surface drift in orbital views; two great polar oceans covering the far north and far south; a continuous brown, white-salt and tan equatorial megacontinent of exposed seabed; the sunlit hemisphere scorched and hazy, the dark hemisphere frozen white; storm bands along the terminator; no city lights; sun from frame-left.
  ```

#### §1 · Hook: how fast you're moving · `T−0` · 20s (0:00–0:20)
- **VO (37 w):** "The ground under your feet is moving — at the equator, about one thousand six hundred seventy kilometers an hour. You don't feel it, because everything moves with you. The air. The oceans. You. Now imagine it stops."
- **Visual prompt:**
  ```
  Photoreal low-orbit view along the equator at 400 km altitude, clouds and rainforest drifting quickly left to right beneath the camera in accelerated motion, the dawn terminator glowing ahead at frame-right, thin blue limb curving across the top third. Camera: continuous forward glide. {SC-A}
  ```
- **Model / controls:** Cinema: epic / dynamic / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** orbital glide on a clean-sharp 24 mm equivalent, sun from frame-left behind camera.
- **Stitch:** single gen, 20 s. On "Now imagine it stops," Remotion **freeze-frames** the last 0.8 s and drops the audio; this is the ‖ into §2.
- **SFX / music:** a rising rotating hum (a turbine-like drone), cut dead on "stops."
- **HUD:** Readout: `EQUATOR SPEED 1,670 km/h · src: NASA/IERS` · `YOUR LATITUDE → cos(lat)` (an animated slider). Clock `T−0`. Chip `REAL SCIENCE`.
- **Ident** follows at 0:20.

#### §2 · ‖ Two ways to stop · `T−0` · 40s (0:25–1:05)
- **VO (82 w):** "What if Earth stopped spinning? There are two ways to answer that — and they end very differently. Stop the planet instantly, and everything not bolted to the bedrock keeps going. Stop it slowly, over thousands of years, and nothing gets thrown anywhere — but the oceans, the air and the calendar rearrange themselves completely. In both versions, the planet itself stays in one piece. This isn't about breaking Earth. It's about everything riding on it. Let's run the fast version first. It's short."
- **Visual prompt:**
  ```
  Photoreal Earth centered on deep black space, rotating slowly west to east, sunlight from frame-left, night side with city lights, clean and stable. Camera: continuous slow orbit around the planet from left to right, keeping it centered. {SC-A}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** a slow orbit on a 50 mm equivalent.
- **Stitch:** 40 s → **20 + 20**.
  - S2a: the orbit is in progress.
  - S2b: the orbit continues at the same speed.
  - **Remotion** duplicates the footage into a two-panel split. The left panel is tinted magma and labelled "INSTANT"; the right is tinted cyan and labelled "SLOW".
- **SFX / music:** a low drone and a two-note motif (left and right).
- **HUD:** premise card "WHAT IF EARTH STOPPED SPINNING?"; split labels; intro sting at 1:03. Chip `SPECULATIVE`.

#### §3 · ‖ The instant stop · `T+1 SEC` · 45s (1:05–1:50)
- **VO (95 w):** "T plus one second. The rock stops. The atmosphere doesn't. At the equator, air keeps moving east at about one thousand six hundred seventy kilometers an hour — faster than the speed of sound at sea level. That's a wind stronger than any hurricane ever measured, scouring the surface from the tropics toward the mid-latitudes. The oceans surge east the same way, climbing over coastlines. Anything loose — soil, trees, water — is carried along. The one relief: near the poles, the ground was barely moving to begin with. That's the instant stop. And fortunately, it's physically impossible."
- **Visual prompt:**
  ```
  Photoreal aerial long-lens view over a generic open prairie with scattered trees and a dirt track, a colossal horizontal wall of dust and debris sweeping from frame-left to frame-right, grass flattened toward the right, trees stripped and bending right, a pond's water torn into sheets of spray streaming right, sky churning, harsh high sun at frame-left. No people, no buildings, no vehicles. Camera: continuous shaky long-lens tracking to the right from a distance. {SC-I}
  ```
- **Model / controls:** Cinema: **action / chaotic** / modern / anamorphic / 2020s / industrial-fog. This is the video's single `chaotic` use.
- **Camera / light:** tracking on a long-lens 200 mm equivalent with shake. Harsh noon light, dust diffusing it.
- **Stitch:** 45 s → **23 + 22**. S3a: the debris wall crosses frame. S3b: the tracking continues; the dust thickens and visibility falls. Monotonic.
- **SFX / music:** a wall of wind, sub-bass rumble, taiko hits. **Cut to total silence** on "physically impossible."
- **HUD:** clock slam `T+00:00:01`. Readout: `WIND ~1,670 km/h (equator)` · `SPEED OF SOUND ~1,235 km/h · src: NASA GRC`. Chip `SPECULATIVE`.

#### §4 · Pivot: why it can't happen, and the slow version · `PIVOT` · 30s (1:50–2:20)
- **VO (59 w):** "Nothing in the solar system can grab Earth and stop it in a second. Physics needs time — and an enormous twisting force. So let's slow Earth down the way nature slows planets: gradually. It happens. Venus turns so slowly that its day is longer than its year. So let's give Earth a gentle brake… all the way to zero."
- **Visual prompt:**
  ```
  Photoreal Earth on black space rotating west to east, the rotation visibly and smoothly slowing over the shot, clouds drifting less and less, sunlight from frame-left, the terminator steady, city lights on night side. Camera: continuous very slow push-in. {SC-A}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / after-dark.
- **Camera / light:** push-in on a 50 mm equivalent.
- **Stitch:** single gen, 30 s. Fallback: Remotion slows the playback speed of an S2 clip.
- **SFX / music:** the rotating hum winds down in pitch (a musical ritardando).
- **HUD:** Readout: `VENUS DAY 243 d > YEAR 225 d · src: NASA` · `ROTATION 100% → …`. Chip `REAL SCIENCE`.

#### §5 · ‖ The slowdown: oceans run to the poles · `T+100 YRS → T+10K YRS` · 75s (2:20–3:35)
- **VO (144 w):** "T plus one hundred years. The slow version: a hypothetical brake that takes ten thousand years to bring Earth's spin to zero. Nothing gets thrown anywhere. But spin does something we rarely notice — it flings the planet outward at the equator. Earth is about forty-three kilometers wider across the equator than from pole to pole, and the oceans bulge along with it. GIS analyst Witold Fraczek at Esri modeled what happens when that spin fades. In his model, the rock holds its shape — it responds far more slowly. The water doesn't. The ocean's equatorial bulge — about eight kilometers high — drains toward where gravity now pulls hardest: the poles. The tropics empty. The far north floods: Canada, Siberia and northern Europe sink beneath a new northern ocean. In the south, a second polar ocean forms. Every coastline on the planet redraws itself — slowly, but completely."
- **Visual:** a **Seedance 2.5 i2v map morph** from designed stills.
  - **Stills:** a photoreal globe centred on 30°N 20°W, lit from frame-left so ~85% is lit with a thin terminator at the right edge. There are 4 keyframes:
    - K0: today.
    - K1: 33% migrated (shallow tropical shelves exposed, Hudson Bay/Baltic expanding).
    - K2: 66% migrated.
    - K3: the Esri end-state (equatorial megacontinent, northern ocean over Canada, Siberia and northern Europe).
  - **Designer's note:** redraw from NOAA ETOPO bathymetry using the Esri published maps as a **reference only**; do not copy Esri artwork [U licensing]. Stills have no labels.
  - **Prompt, each segment:** "Photoreal Earth globe from orbit, sunlight from frame-left, ocean water steadily and smoothly retreating from the equator and spreading toward the poles, pale seafloor emerging, continuous gradual change, no rotation, no camera movement."
- **Model / controls:** Seedance 2.5 i2v, 16:9, 720p.
- **Camera / light:** locked orbital framing, sun from frame-left.
- **Stitch:** ‖ hard cut in (back to calm). 75 s → **25 + 25 + 25**: S5a K0→K1, S5b K1→K2, S5c K2→K3. The end frame equals the next start frame, so the seams are exact.
- **SFX / music:** a deep ocean-draining gurgle, rising strings. The key shifts to D minor.
- **HUD:**
  - Clock slam `T+100 YRS`, then the clock counts continuously to `T+10,000 YRS`.
  - Readout `ROTATION 100% → 0%` animates.
  - `EQUATORIAL BULGE 42.8 km (solid Earth) · src: NASA fact sheet` · `OCEAN BULGE ~8 km · src: Esri (Fraczek) · MODEL EST.`
  - Chip `SPECULATIVE`.

#### §6 · The year-long day: the Sun rises in the west · `T+10K YRS · SPIN 0%` · 60s (3:35–4:35)
- **VO (133 w):** "T plus ten thousand years. Earth has stopped turning relative to the stars. And here's the first surprise: there's still a sunrise, because Earth still orbits the Sun. But now one full day lasts one full year. And because of that orbital motion, the Sun no longer rises in the east. It creeps up over the western horizon, crawls across the sky for six months, and sets in the east. Earth's tilt still stretches and squeezes those seasons by latitude, but the rhythm is the same everywhere: one sunrise a year. The line between day and night now crosses the equator at about a hundred and ten kilometers a day — around four and a half kilometers an hour. A walking pace. If you never stopped walking, you could keep up with the sunset."
- **Visual prompt:**
  ```
  Locked-off photoreal time-lapse of a vast flat pale plain of dried seabed with scattered salt crust and a lone weathered rock pillar for scale, the sun sitting just above the horizon at frame-left and rising almost imperceptibly over the whole shot, clouds racing overhead while the sun barely moves, very long shadows stretching to frame-right. Single-shot, no camera movement. {SC-Z}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / twilight-fable.
- **Camera / light:** a locked wide 24 mm equivalent. Dawn light from frame-left, moving only a little.
- **Stitch:** 60 s → **30 + 30**. S6a: clouds racing, sun near the horizon. S6b: continues; the sun is a hair higher. Monotonic, with no jump in sun height.
- **SFX / music:** wind; a single sustained cello note that never resolves (the "endless dawn").
- **HUD:**
  - Clock slam `T+10K YRS`, with Readout `SPIN 0%`.
  - A Remotion **compass glyph** with `W` under the sun.
  - `SOLAR DAY = 1 YEAR` · `TERMINATOR SPEED (EQUATOR) ≈ 110 km/day ≈ 4.6 km/h · derived`.
  - Chip `REAL SCIENCE` (geometry).

#### §7 · The equatorial megacontinent · `T+11K YRS` · 60s (4:35–5:35)
- **VO (122 w):** "What rises from the old seas is a single belt of land wrapping the entire planet at the equator: a megacontinent. Ancient seafloor that never saw sunlight now bakes under it — salt flats, drained trenches, old reefs standing as white limestone hills. In Fraczek's model, the belt runs unbroken around the world, and the two new polar oceans never touch. Rivers have nowhere familiar to run; what little rain reaches the interior pools in salt lakes on the old ocean floor. The air redistributes too. The equatorial land ends up under thinner air, closer to a high plateau than a lowland. We're in model territory now — but the logic is simple: without spin, water and air settle where gravity alone sends them."
- **Visual prompt:**
  ```
  Photoreal high aerial over a vast exposed ancient seafloor: blinding white salt flats, a colossal dry canyon of a drained ocean trench in the middle distance, pale fossil reef ridges standing like hills, heat haze, sun high at frame-left casting short shadows to the right, dusty tan palette, no water, no people. Camera: continuous slow forward drone flight at 500 m altitude. {SC-Z}
  ```
- **Model / controls:** Cinema: epic / calm / modern / anamorphic / 2020s / mirage-at-noon.
- **Camera / light:** a forward flight on an anamorphic 35 mm equivalent, with hard high sun from frame-left.
- **Stitch:** 60 s → **30 + 30**. S7a: flight over the salt flats toward the trench. S7b: the flight continues over the trench rim.
- **SFX / music:** dry wind, heat-shimmer tone, low brass.
- **HUD:** clock slam `T+11K YRS`. Readout: `EQUATORIAL MEGACONTINENT: CONTINUOUS · src: Esri · MODEL EST.` · `EQUATORIAL AIR: THINNER · src: Esri [U verify] · MODEL EST.`. Chip `SPECULATIVE`.

#### §8 · ‖ Six months of day, six months of night · `T+12K YRS` · 70s (5:35–6:45)
- **VO (151 w):** "Now add the year-long day. Almost everywhere on Earth gets roughly six months of daylight, then six months of night. On the day side, the Sun hangs in the sky for weeks at a time. With no night to cool it, the ground heats into deserts beyond anything alive today. On today's Earth, a single night is too short for the ground to cool very far. Here, half a year of darkness is enough to freeze lakes solid and bury whole regions in snow. On the night side, heat radiates into space, and temperatures plunge. Winds pour from the cold side toward the hot side, and where they meet — along that slowly marching terminator — storms gather. Every place on the planet takes its turn in both. And between the scorched half and the frozen half, one narrow zone stays temperate: a ring of twilight that circles the planet once a year."
- **Visual prompt:**
  ```
  Photoreal orbital view of a non-rotating Earth: left hemisphere sunlit, scorched tan and hazy with a brown equatorial landmass, right hemisphere dark and frozen white under faint starlight, a sharp vertical terminator through center marked by a long chain of towering storm clouds, a deep blue polar ocean visible at the top. No surface drift. Camera: continuous very slow push toward the storm line. {SC-Z}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** orbital push on a 35 mm equivalent, with hard sun from frame-left. **This is the terminator hero shot and the thumbnail source.**
- **Stitch:** ‖ hard cut in (the reveal). 70 s → **24 + 23 + 23**. S8a–c: the push continues toward the storm line; the planet does not rotate; the storm chain grows larger in frame.
- **SFX / music:** thunder rolling at a distance, and a split stereo field (hot hiss on the left, icy crackle on the right).
- **HUD:** clock slam `T+12K YRS`. Readout: `DAY/NIGHT ≈ 6 MONTHS EACH` · `DAY SIDE: EXTREME HEAT · MODEL EST.` · `NIGHT SIDE: DEEP FREEZE · MODEL EST.`. Chip `SPECULATIVE`.

#### §9 · Life follows the twilight · `T+1M YRS` · 60s (6:45–7:45)
- **VO (127 w):** "T plus one million years. Where does life survive? Follow the twilight. On a world where sunset moves at walking pace, the best place to live is on the move. Plants rooted in place face half a year of scorching light and half a year of darkness, so only the toughest endure, sprouting and dying back like desert wildflowers, their seeds waiting out the night underground. Animals migrate, keeping pace with the terminator the way birds today chase the seasons. Whole ecosystems become nomads, circling the planet once a year. In the polar oceans, deep water holds its warmth far longer than land, offering refuge through the long night. This is speculation — but it's grounded in how life already handles extreme light, from Arctic summers to caves."
- **Visual prompt:**
  ```
  Photoreal wide golden-twilight plain on the day-night boundary: the sun resting on the horizon at frame-left, long warm light and long shadows to the right, hardy low shrubs in bloom on the left, frost-covered ground fading into blue dusk on the right, a long line of generic hoofed animals walking steadily from right to left toward the light in the far distance, no people. Camera: continuous slow crane-up revealing the line of animals and the frost boundary. {SC-Z}
  ```
- **Model / controls:** Cinema: drama / calm / modern / vintage-anamorphic / 2020s / twilight-fable.
- **Camera / light:** crane-up on a vintage-anamorphic 40 mm equivalent. Golden key from frame-left with blue fill from the right.
- **Stitch:** 60 s → **30 + 30**. S9a: the crane starts low, among the shrubs. S9b: the crane continues up; the herd line and frost boundary are fully revealed. Keep the sun height fixed.
- **SFX / music:** hooves at a distance, wind. Strings resolve toward major.
- **HUD:** clock slam `T+1M YRS`. Readout: `HABITABLE: TWILIGHT BELT · MODEL EST.`. Chip `SPECULATIVE`.

#### §10 · The magnetic field question · `SPECULATIVE` · 35s (7:45–8:20)
- **VO (69 w):** "One question we can't answer confidently: the magnetic field. Earth's field is generated by churning molten iron in the outer core, and rotation helps organize that churning. Slow the spin, and many researchers would expect the field to change — possibly weaken. By how much? Nobody knows. Venus barely spins and has no global magnetic field — but Venus differs in many other ways. So this one wears our speculative badge."
- **Visual prompt:**
  ```
  Photoreal orbital view over the frozen night hemisphere near the pole, a faint green aurora curtain rippling above the limb and slowly dimming over the shot, stars sharp, sunlight glow only at far left edge. No surface drift. Camera: continuous slow lateral drift to the right. {SC-Z}
  ```
- **Model / controls:** Cinema: epic / calm / modern / clean-sharp / 2020s / after-dark.
- **Camera / light:** a lateral drift on a 35 mm equivalent, with auroral green and faint sun rim from the left.
- **Stitch:** 35 s → **18 + 17**. S10a: the aurora is visible. S10b: the drift continues; the aurora dims further (monotonic).
- **SFX / music:** electric shimmer pad, radio hiss fading.
- **HUD:** Readout: `GEODYNAMO: CONVECTION + ROTATION` · `VENUS: NO GLOBAL FIELD · src: NASA`. Chip `SPECULATIVE`.

#### §11 · CTA + next timeline · `END` · 20s (8:20–8:40)
- **VO (42 w):** "A stopped Earth isn't a dead Earth. It's a stranger one: two polar oceans, one equatorial continent, and a sunset you could walk beside. Same rock, same air, same water — rearranged. So what if it spun faster instead? Pick your next timeline."
- **Visual prompt:**
  ```
  Photoreal non-rotating Earth centered on black, sunlit from frame-left, tan equatorial belt, blue polar oceans, frozen white night side at right, sharp vertical terminator. Absolutely no surface rotation. Camera: continuous slow pull-back. {SC-Z}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Stitch:** single gen, 20 s.
- **SFX / music:** a sustained chord.
- **HUD:** the clock freezes at `T+1M YRS`. End card teases S07 and S22. The outro follows at 8:40.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Equatorial surface speed ≈ 1,670 km/h | REAL | https://en.wikipedia.org/wiki/Earth%27s_rotation · https://www.space.com/33527-how-fast-is-earth-moving.html |
| 2 | Speed of sound at sea level ≈ 343 m/s ≈ 1,235 km/h | REAL | https://www.grc.nasa.gov/www/k-12/airplane/sound.html [U URL] |
| 3 | An instant stop would leave the atmosphere and oceans moving east at ~1,670 km/h at the equator | REAL physics; SPECULATIVE detail | derived (momentum) |
| 4 | Venus sidereal day ≈ 243 Earth days > its year ≈ 225 days | REAL | https://science.nasa.gov/venus/venus-facts/ [U URL] |
| 5 | Equatorial radius 6,378.1 km vs polar 6,356.8 km (≈42.8 km diameter difference) | REAL | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| 6 | Without spin, oceans migrate poleward and an equatorial megacontinent emerges; ocean bulge ~8 km | MODEL (Esri GIS model; assumes the solid Earth keeps its shape) | https://www.esri.com/news/arcuser/0610/nospin.html · https://bigthink.com/strange-maps/475-the-day-the-earth-stood-still/ |
| 7 | Equatorial land ends under thinner air | MODEL [U verify wording in Esri article] | Esri (as #6) |
| 8 | With zero sidereal spin, a solar day lasts a year and the Sun rises in the west (its apparent motion is then only the eastward annual drift along the ecliptic) | REAL geometry | https://en.wikipedia.org/wiki/Sidereal_time [U; add an astronomy-textbook cite] |
| 9 | Terminator speed at the equator ≈ 40,075 km / 365.25 d ≈ 110 km/day ≈ 4.6 km/h | REAL (derived) | circumference: NASA fact sheet (#5) |
| 10 | Roughly six months of daylight and six of night at most latitudes | REAL (approx.; tilt modifies it by latitude) | derived |
| 11 | Extreme day-side heat, night-side freeze, storms along the terminator | SPECULATIVE | — |
| 12 | Life migrating with the terminator; polar oceans as refuge | SPECULATIVE | — |
| 13 | The geodynamo is driven by outer-core convection organized by rotation; the effect of slower spin is unknown | REAL mechanism; SPECULATIVE outcome | https://science.nasa.gov/earth/ [U; replace with a USGS/BGS geomagnetism primer] |
| 14 | Venus has no intrinsic global magnetic field | REAL | NASA Venus facts (#4) |
| 15 | Without spin, rain pools in interior salt lakes; stranded reefs become limestone hills | SPECULATIVE | — |

**Edit notes**
- **Pacing:**
  - Freeze and silence at 0:18.
  - Ident at 0:20.
  - Slams at 1:05, 2:20, 3:35, 4:35, 5:35 and 6:45.
  - §3 is the only fast-cut section. Remotion adds 3 punch-ins (110%) on debris hits.
  - In §6, hold 1.2 s of silence after "sets in the east."
- **HUD:** in §5 the clock counts continuously (the F4 counter feel), and the `ROTATION %` bar drains in sync. In §6, the compass `W` glyph pulses once.
- **Captions:** on.
- **Highlight words:** *1,670, stops, instantly, slowly, impossible, Venus, forty-three, eight kilometers, poles, west, walking pace, megacontinent, six months, twilight, nobody knows*.
- **Chapters:** 0:00 How fast you're moving · 1:05 The instant stop · 1:50 The slow stop · 2:20 Oceans run to the poles · 3:35 A year-long day · 4:35 The megacontinent · 5:35 Day side / night side · 6:45 Life in the twilight · 7:45 The magnetic field.
- **Ident / outro:** ident 0:20–0:25. Outro 8:40–8:58. End-screen tiles are S07 (left) and L01 (right).

**QC acceptance criteria (L02-specific)**
- SC-A clips rotate left→right.
- **SC-Z orbital clips show no rotation.** A model defaulting to "spinning Earth" fails the clip. Check cloud positions at t=0 vs t=end: any drift over 2% of the globe's width is a REGEN.
- §3: all debris moves left→right, with no people, buildings or vehicles.
- §5: continent outlines stay fixed while only the water changes. The equatorial land never shrinks back (monotonic).
- §6: the sun height never *drops* across the seam.
- §8: the day side stays on the left and the terminator stays vertical.
- §9: animals move toward the light (right→left), and the frost stays on the right.

**Revision plan**
- **Highest-risk sections:**
  1. **§8** (the "no rotation" plus split-hemisphere composition is hard for Cinema).
  2. **§3** (chaotic wind can invent buildings or people).
  3. **§11** (no rotation).
  4. **§5** (Seedance morph "breathing" of the continents).
- **Revision 1:** ≤60 s. The worst two §8 segments (47 s) plus the §11 re-roll trimmed (≤13 s used).
- **Revision 2:** ≤40 s. Any §3 or §5 segment.
- **Fallbacks:**
  - §8/§11: Seedance i2v from a designed still of the SC-Z globe, with start = end frame for a "held" planet and only the camera push.
  - §3: Remotion speed-ramp of the best segment.

**Estimated generation**

| Item | Seconds | Cost |
|---|---|---|
| Base: 21 generations (18 Cinema, 3 Seedance) | 515 s | $105.94 |
| Revision cap | 100 s | $20.57 |
| **Total** | **615 s** | **≤ $126.51** |

---

### L03 — What If All the Ice Melted?

**Series:** WHAT IF · **Format:** F6 Scale-Anchor hook + F1 ladder + a hard reality-check beat (F3 trust) · **Runtime:** 8:38 (495 s generated + 5 s ident + 18 s outro).
**Hero colour:** turquoise shallows (new seas) against ice-white. **Altered-content label:** **ON**. Real coastlines are shown altered, and a drowned structure appears in §1.

**Framing (compliance-critical).** The scenario clock is **T+1,000 → T+10,000 YRS, MODEL EST.** The video opens with the IPCC 2100 range and the 2000-year commitments and says, in words, that this is **not** a lifetime forecast (Bible §9.2.2). The on-screen text carries the IPCC range whenever the scenario clock is visible for the first time.

**Titles**
- **Final:** What If All the Ice Melted? (27 chars)
- **Alt A:** Earth With 70 Meters of Sea Level Rise: Every Coast, Mapped
- **Alt B:** What If All the Ice on Earth Melted? (The Real Timeline)

**Thumbnail brief**
- **Left:** an orbital view of Florida and the Gulf today.
- **Right:** the same framing with the peninsula gone under turquoise shallows. Both are **designed Seedance stills** (§6 K0/K2).
- **Seam:** a white diagonal.
- **Text:** **"+70 METERS"**.
- **Chip:** `T+5,000 YRS · MODEL`.
- **Variants:** (B) the half-drowned lighthouse at golden hour (§1); (C) no text.

**Hook, verbatim, 0:00–0:05:** "Seventy meters. That's how much the sea would rise if every glacier and ice sheet on Earth melted."

**Stage Cards**
- **SC-R REAL TODAY:**
  ```
  STAGE: present-day Earth; Antarctic and Greenland ice sheets fully present, bright white; today's coastlines and sea level; sun from frame-left.
  ```
- **SC-G GREENLAND MELTING:**
  ```
  STAGE: Greenland ice sheet under intense surface melt — dense networks of brilliant blue meltwater rivers and lakes on the ice, darker dusty ice at lower elevations, calving glacier fronts; sun low at frame-left.
  ```
- **SC-F FULL MELT:**
  ```
  STAGE: Earth with no ice sheets and no mountain glaciers; sea level about 70 meters higher; vast new turquoise shallow seas over former lowlands; warmer greenhouse climate with more humid haze; Antarctica bare rock, tundra and moss; sun from frame-left.
  ```
- **SC-EO EOCENE:**
  ```
  STAGE: early Eocene Arctic, about 52 million years ago; no ice anywhere; warm swampy forest of tall conifers and broadleaf trees, still dark water, humid haze; low polar sun at frame-left; no humans.
  ```
- **Map stills** (§5–§7) follow one designed style: an orthographic orbital view lit from frame-left (~85% lit, thin terminator at the right edge), with photoreal land and water, no labels, and no borders. The designer builds them from NOAA ETOPO relief using the Columbia LDEO "no ice" and National Geographic 2013 maps as **reference only** [U licensing].

#### §1 · Hook: the 70-meter line · `T+10K YRS (MODEL)` · 20s (0:00–0:20)
- **VO (38 w):** "Seventy meters. That's how much the sea would rise if every glacier and ice sheet on Earth melted. Roughly a twenty-story building. Here's what's left of the map — and, just as important, how long it would really take."
- **Visual prompt:**
  ```
  Photoreal golden-hour wide shot of a lone generic stone lighthouse standing in open calm sea, water lapping just below its lantern gallery, the rest of its tower submerged and visible as a pale shape beneath clear turquoise water, a gull on the railing, low sun at frame-left, long warm light, no land in frame. Camera: continuous slow push-in at water level. {SC-F}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / anamorphic / 2020s / turquoise-mirage.
- **Camera / light:** water-level push on an anamorphic 40 mm equivalent, golden key from frame-left (terminator-hour light).
- **Stitch:** single gen, 20 s.
- **SFX / music:** water lapping on stone, one gull, a choir pad swelling.
- **HUD:**
  - Readout number `+70 m` counts up.
  - `src: USGS`.
  - The clock shows `T+10,000 YRS` with a `MODEL EST.` badge.
  - Chip `SPECULATIVE`.
- **Ident** follows at 0:20.

#### §2 · ‖ Reality check: this century vs. all the ice · `REAL` · 50s (0:25–1:15)
- **VO (102 w):** "First, a reality check, because it matters. That's not what's happening this century. The IPCC projects that by 2100, global sea level will likely be about thirty centimeters to one meter higher than recent levels, depending on how much we emit. Over the next two thousand years: two to three meters if warming is held to one and a half degrees — nineteen to twenty-two meters at five degrees. All of the ice? That takes many thousands of years. So in this video, we run the clock forward millennia — and everything you see is a model estimate, not a forecast for your lifetime."
- **Visual prompt:**
  ```
  Photoreal orbital view from 1,500 km over the Southern Ocean toward the bright white Antarctic ice sheet, sunlight from frame-left, sharp terminator curving along the right side, sea-ice fringe, cloud swirls. Earth rotates slowly west to east. Camera: continuous very slow push toward the ice edge. {SC-R}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** orbital push on a 35 mm equivalent.
- **Stitch:** ‖ hard cut in (the reality check). 50 s → **25 + 25**, with the push continuing.
- **SFX / music:** the music drops to a single low pad (a "sober" register) and a clock tick.
- **HUD:**
  - The clock *rewinds* to `TODAY` (an F4 counter spin-down).
  - Readout, big: `2100: +0.28 to 1.01 m · src: IPCC AR6`.
  - `2000 YRS @1.5°C: +2–3 m` · `@5°C: +19–22 m · src: IPCC AR6 WG1`.
  - `ALL ICE: MANY MILLENNIA`.
  - Chip `REAL SCIENCE`.

#### §3 · Where the water is locked up · `REAL` · 55s (1:15–2:10)
- **VO (110 w):** "So where is all that water? Nearly all of it sits in two places. Antarctica's ice sheet holds enough to raise the seas about fifty-eight meters. Greenland's, about seven. And the mountain glaciers — the Alps, the Himalaya, the Andes, Alaska — look enormous up close, but all of them combined would add only about a third of a meter. Add the fact that seawater expands as it warms, and you reach roughly seventy. In places, Antarctica's ice is nearly five kilometers thick — more than half the height of Mount Everest, made of ice. It's so heavy it presses the continent's bedrock down into the mantle. Remember that. It comes back later."
- **Visual prompt:**
  ```
  Photoreal low aerial flight along the towering vertical front of a vast Antarctic ice shelf, sheer white-blue ice cliff on the right side of frame, dark calm sea on the left with scattered small icebergs, low sun at frame-left raking across the cliff face, crisp polar air. Camera: continuous steady lateral flight parallel to the cliff. {SC-R}
  ```
- **Model / controls:** Cinema: epic / calm / modern / anamorphic / 2020s / the-grey-channel.
- **Camera / light:** a parallel flight on an anamorphic 35 mm equivalent, low raking sun from frame-left.
- **Stitch:** 55 s → **28 + 27**. The flight continues along the cliff at constant altitude and speed.
- **SFX / music:** deep ice groans, a distant calving boom at 1:50.
- **HUD:**
  - Readout, stacked bars:
    - `ANTARCTICA 58.3 m · src: Bedmap2/AntarcticGlaciers.org`
    - `GREENLAND 7.4 m · src: BedMachine`
    - `GLACIERS 0.32 m · src: Farinotti 2019`
    - `+ THERMAL EXPANSION → ≈70 m · src: USGS`
  - `MAX ICE THICKNESS ≈4.9 km · src: NSIDC [U]`.
  - Chip `REAL SCIENCE`.

#### §4 · Greenland goes first · `T+1,000 YRS` · 65s (2:10–3:15)
- **VO (129 w):** "T plus one thousand years. In our scenario, Greenland goes first. It's smaller, and it sits farther from the pole. Its surface melts into brilliant blue rivers that carve canyons in the ice and plunge into shafts called moulins, carrying meltwater to the bed. Meltwater also darkens the surface: wet ice and exposed dust absorb more sunlight, which drives more melting — a feedback loop. Glaciers speed up and calve into the sea, and fjords that held ice for thousands of years fill with icebergs. Under very high, sustained warming, models suggest much of Greenland's ice could be lost within a millennium or so — though the exact pace is still debated. Greenland alone is worth about seven meters. Enough to reshape every low-lying coast on Earth. And we've barely started."
- **Visual prompt:**
  ```
  Photoreal aerial over the Greenland ice sheet in summer: a brilliant turquoise meltwater river meandering across white ice in a deep carved channel, flowing from frame-left toward frame-right and plunging into a dark circular moulin, smaller blue lakes around it, low sun at frame-left. Camera: continuous slow descending drone glide following the river's flow. {SC-G}
  ```
- **Model / controls:** Cinema: epic / calm / modern / clean-sharp / 2020s / the-morning-after-rain.
- **Camera / light:** a descending glide on a clean-sharp 28 mm equivalent, low sun from frame-left.
- **Stitch:** 65 s → **22 + 22 + 21**.
  - S4a: the glide follows the river.
  - S4b: the glide continues, the moulin approaching.
  - S4c: the glide continues over the moulin, water plunging into it.
  - Flow direction stays left→right throughout.
- **SFX / music:** rushing water, the roar of the moulin. The key shifts; strings begin to build.
- **HUD:** clock slam `T+1,000 YRS` with `MODEL EST.`. Readout: `SEA LEVEL +~7 m (Greenland) · MODEL EST.` · `src: IPCC AR6 WG1 Ch.9`. Chip `SPECULATIVE`.

#### §5 · Europe's new coastline · `T+3,000 YRS` · 65s (3:15–4:20)
- **VO (101 w):** "T plus three thousand years. Antarctica is melting too, and in the models the seas climb as fast as a few meters per century. Watch Europe. The Netherlands — much of it already near or below sea level, protected by dikes — is gone. So are Belgium's coast, northern Germany's lowlands and much of Denmark. Venice, and the whole Po Valley behind it, become part of the Adriatic. The Baltic swells and spills across the lowlands toward the North Sea, and the Black Sea grows too. The Thames floods deep inland. At the full seventy meters, Europe is still recognizable — but only just."
- **Visual:** **Seedance 2.5 i2v** map morph, orthographic Europe centred on 50°N 10°E.
  - Keyframes: K0 today → K1 +25 m → K2 +50 m → K3 +70 m.
  - Prompt: "Photoreal Europe from orbit, sunlight from frame-left, sea level rising steadily and smoothly over low-lying coasts, turquoise shallows spreading inland, continuous gradual change, no camera movement."
- **Model / controls:** Seedance 2.5 i2v, 16:9, 720p.
- **Camera / light:** locked, sun from frame-left.
- **Stitch:** 65 s → **22 + 22 + 21** (K0→K1, K1→K2, K2→K3). The seams are exact.
- **SFX / music:** a water rush swelling under strings; a glassy chime per Readout tick.
- **HUD:**
  - Clock slam `T+3,000 YRS`.
  - Readout `SEA LEVEL +25 → +70 m · MODEL EST.` counts in sync.
  - Remotion place labels fade in as the water reaches each place: *Netherlands, Denmark, Venice, Po Valley, Baltic, London*.
  - `src: NatGeo 2013 / LDEO no-ice map`.
  - Chip `SPECULATIVE`.

#### §6 · The Americas: Florida, the Gulf, the Amazon Sea · `T+5,000 YRS` · 70s (4:20–5:30)
- **VO (114 w):** "T plus five thousand years. Florida — the entire peninsula — is gone, replaced by bright turquoise shallows. The Gulf Coast pushes far inland, up the Mississippi valley. Along the Atlantic seaboard, the great coastal cities are underwater, and much of the coastal plain becomes sea floor. In South America, the low, wide Amazon basin becomes a vast inland arm of the Atlantic, reaching far into the continent. Buenos Aires and Uruguay's coast disappear under the widening River Plate. From orbit, the difference is color: where there was green and grey, there's now the pale blue of new, shallow seas. It looks peaceful from up here. On the ground, it would mean moving entire nations inland."
- **Visual:**
  - **S6a–b: Seedance 2.5 i2v**, orthographic North America/Gulf centred on 28°N 85°W, from K0 today → K1 +35 m → K2 +70 m. Prompt as §5.
  - **S6c: Cinema**, joined by match-dissolve from turquoise map water to real water:
    ```
    Photoreal aerial over endless clear turquoise shallow sea with the faint pale outlines of submerged generic suburban rooftops and roads visible beneath the water, no identifiable buildings or skyline, scattered mangrove islands, sun high at frame-left, gentle ripples. Camera: continuous slow forward glide at 150 m altitude. {SC-F}
    ```
- **Model / controls:** S6a–b Seedance 2.5 i2v. S6c Cinema: epic / calm / modern / vintage-anamorphic / 2020s / turquoise-mirage.
- **Camera / light:** the maps are locked. S6c is a forward glide on a vintage-anamorphic 40 mm equivalent.
- **Stitch:** 70 s → **24 + 23 + 23**. S6a K0→K1 and S6b K1→K2 are exact seams. S6c is a single Cinema gen, joined by a 12-frame match-dissolve.
- **SFX / music:** ocean swell, choir. At S6c: warm, eerie calm, gentle lapping.
- **HUD:**
  - Clock slam `T+5,000 YRS`.
  - Readout `SEA LEVEL +70 m · MODEL EST.`.
  - Labels: *Florida, Gulf Coast, Amazon, Río de la Plata*.
  - Chip `SPECULATIVE`.

#### §7 · Asia: the deltas · `T+7,000 YRS` · 55s (5:30–6:25)
- **VO (92 w):** "In Asia, the change reaches the most people. Bangladesh, built on one of the world's great river deltas, is almost entirely underwater. So is much of eastern China's coastal plain, including Shanghai — and most of the Mekong Delta in Vietnam, one of the region's great rice bowls. Bangkok and the low coast around the Gulf of Thailand go under too. These are some of the most densely populated places on Earth. At seventy meters, land that hundreds of millions of people live on today becomes sea floor. Slowly, over millennia — but completely."
- **Visual:** **Seedance 2.5 i2v**, orthographic South and East Asia centred on 25°N 105°E, from K0 today → K1 +35 m → K2 +70 m. Prompt as §5.
- **Model / controls:** Seedance 2.5 i2v.
- **Stitch:** 55 s → **28 + 27** (exact seams).
- **SFX / music:** monsoon rain texture, a low cello line (restrained, not doom).
- **HUD:**
  - Clock slam `T+7,000 YRS`.
  - Labels: *Bangladesh, Ganges–Brahmaputra Delta, Shanghai, Yangtze Delta, Mekong Delta*.
  - Readout `POPULATION ON LAND BELOW +70 m: HUNDREDS OF MILLIONS · MODEL EST. [U]`.
  - Chip `SPECULATIVE`.

#### §8 · Antarctica, unveiled · `T+10,000 YRS` · 50s (6:25–7:15)
- **VO (101 w):** "T plus ten thousand years. The last of Antarctica's ice is gone — and underneath is a surprise. The continent isn't one solid landmass. Without its ice, much of West Antarctica is a scatter of islands, its bedrock far below sea level. East Antarctica stays a true continent, with mountain ranges that have been buried under ice for millions of years. And freed from kilometers of ice, the land begins to rise — rebounding upward for thousands of years, like a mattress after you stand up. Along its new coasts, in a warmer world, mosses and tundra plants take hold. A green Antarctica."
- **Visual prompt:**
  ```
  Photoreal aerial over a newly ice-free polar coastline: dark bare rock ridges and fjords, patches of bright green moss and low tundra on the slopes, meltwater streams, calm grey-blue sea with small islands, no ice anywhere, soft morning light after rain from a low sun at frame-left, mist in the valleys. Camera: continuous slow crane-up revealing the island-studded horizon. {SC-F}
  ```
- **Model / controls:** Cinema: epic / calm / modern / vintage-anamorphic / 2020s / the-emerald-ambush.
- **Camera / light:** crane-up on a vintage-anamorphic 32 mm equivalent, soft low sun from frame-left.
- **Stitch:** 50 s → **25 + 25**. The crane continues up; the islands are revealed.
- **SFX / music:** birds in the distance, streams. **Resolve to a hopeful major chord.**
- **HUD:** clock slam `T+10,000 YRS`. Readout: `WEST ANTARCTIC BED: LARGELY BELOW SEA LEVEL · src: BedMachine (Morlighem 2020)` · `ISOSTATIC REBOUND: ONGOING`. Chip `REAL SCIENCE` (bedrock) → `SPECULATIVE` (green coasts).

#### §9 · ‖ Twist: we've been here before · `REWIND −52M YRS` · 45s (7:15–8:00)
- **VO (77 w):** "Here's the part that sounds like fiction. Earth has been ice-free before. About fifty-two million years ago, in the early Eocene, there were no large ice sheets at all. Forests grew in the high Arctic. On Ellesmere Island, in Canada's far north, scientists have found fossils of alligators, giant tortoises, and early primate relatives — animals living through six months of polar darkness each year. An ice-free Earth isn't pure hypothesis. It's somewhere our planet has already been."
- **Visual prompt:**
  ```
  Photoreal wide shot of a warm swampy forest in the high Arctic of the early Eocene: tall conifers rising from still dark water, humid haze, a low polar sun at frame-left glowing through the mist, an alligator resting motionless on a half-submerged log in the foreground, a large tortoise at the water's edge, no humans. Camera: continuous slow dolly forward just above the water. {SC-EO}
  ```
- **Model / controls:** Cinema: epic / calm / **35mm-film** / vintage-anamorphic / 2020s / the-emerald-ambush.
- **Camera / light:** a low dolly on a vintage-anamorphic 35 mm equivalent, polar-sun backlight from frame-left.
- **Stitch:** ‖ hard cut in (the rewind twist). 45 s → **23 + 22**.
- **SFX / music:** swamp insects, dripping water. The music turns warm and wondrous.
- **HUD:** the clock spins backward to `−52M YRS` (REWIND styling). Readout: `EARLY EOCENE: NO ICE SHEETS · src: KU 2023 / CU Boulder 2010` · `PALEOLATITUDE ~77°N`. Chip `REAL SCIENCE`.

#### §10 · CTA + next timeline · `END` · 20s (8:00–8:20)
- **VO (41 w):** "Seventy meters: the full weight of the world's ice. It would take thousands of years — and it's worth knowing where every meter comes from. Next: what if the sea went the other way — and you could walk from England to France?"
- **Visual prompt:**
  ```
  Photoreal orbital view of Earth with no ice caps and wide turquoise shallow seas along the coasts, day side lit from frame-left, vertical terminator through center with sparse city lights on the right, slowly rotating west to east. Camera: continuous slow pull-back. {SC-F}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Stitch:** single gen, 20 s.
- **SFX / music:** a sustained chord.
- **HUD:** the clock freezes. An end card teases S04. The outro follows at 8:20.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | All glaciers and ice caps melting → ~70 m of sea level rise | REAL | https://www.usgs.gov/water-science-school/science/glaciers-and-icecaps |
| 2 | IPCC AR6 2100 likely range ~0.28–1.01 m (SSP1-1.9 to SSP5-8.5) | REAL | https://www.ipcc.ch/report/ar6/syr/figures/figure-3-4/ |
| 3 | Over 2000 years: 2–3 m at 1.5 °C; 19–22 m at 5 °C | REAL | https://iccinet.org/ipcc-sixth-assessment-report-ar6-release-of-wg1-report-the-physical-science-basis-of-climate-change/ · https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/ |
| 4 | Antarctica 58.3 m, Greenland 7.42 m, glaciers 0.32 m sea-level equivalent | REAL | https://www.antarcticglaciers.org/glaciers-and-climate/what-is-the-global-volume-of-land-ice-and-how-is-it-changing/ |
| 5 | Antarctic ice up to ~4.9 km thick; bedrock depressed | REAL [U exact max] | https://nsidc.org/learn/parts-cryosphere/ice-sheets/ice-sheet-quick-facts |
| 6 | Burning all fossil fuels could eliminate the Antarctic ice sheet over ~10,000 years (~3 m/century in the first millennium) | MODEL | Winkelmann et al. 2015, *Sci. Adv.*, https://www.science.org/doi/10.1126/sciadv.1500589 [U verify] |
| 7 | Greenland loss within ~a millennium under sustained high warming | MODEL (debated pace) | IPCC AR6 WG1 Ch.9 (#3) |
| 8 | Europe, Americas and Asia coastline changes at +70 m | MODEL (static inundation, no rebound) | https://ocp.ldeo.columbia.edu/flood/noice.html · National Geographic 2013 "If all the ice melted" [U URL] |
| 9 | Hundreds of millions of people live on land below +70 m | MODEL EST. [U; conservative; verify with Kulp & Strauss 2019] | — |
| 10 | Much of West Antarctica's bed lies below sea level | REAL | https://www.antarcticglaciers.org/question/much-antarctic-ice-sheet-sea-level/ · BedMachine (Morlighem et al. 2020, *Nat. Geosci.*) [U URL] |
| 11 | Ice-free land rebounds isostatically over millennia | REAL | https://www.antarcticglaciers.org/ (glacial isostasy primer) [U page] |
| 12 | Early Eocene (~52–53 Ma) Ellesmere Island fauna: alligators, tortoises, primatomorphs; ~77°N; 6 months dark | REAL | https://biodiversity.ku.edu/news/article/2023/01/25/52-million-year-old-fossils-high-arctic-show-near-primates-were-cool-colder-climate · https://www.colorado.edu/today/2010/08/24/new-study-shows-how-tortoises-alligators-thrived-high-arctic-some-50-million-years-ago |
| 13 | Green Antarctic coasts in a warm world | SPECULATIVE | — |
| 14 | East Antarctica hides buried mountain ranges (e.g. the Gamburtsev Mountains) | REAL | https://en.wikipedia.org/wiki/Gamburtsev_Mountain_Range [U; swap for a BAS/NSF primary] |
| 15 | The early-Eocene high Arctic was forested | REAL | CU Boulder 2010 (#12) |
| 16 | Ice-darkening (albedo) feedback on Greenland | REAL | IPCC AR6 WG1 Ch.9 (#3) |
| 17 | Mekong Delta, Bangkok and the Gulf of Thailand coast lie below +70 m | REAL (low elevation) / MODEL (inundation) | LDEO no-ice map (#8) |

**Edit notes**
- **Pacing:**
  - §2 is deliberately *slower* and plainer. The clock rewinding to TODAY is the signature "honesty" beat.
  - Map sections (§5–§7) put a label pop on each place name as the VO says it.
  - VO in §5–§7 is deliberately lighter (≈100 WPM) to leave room for the morph and the label pops. If the animatic feels slow, add Readout beats; do not add words.
  - Hold 0.8 s after "only just" and after "completely."
- **HUD:** keep the `MODEL EST.` badge persistent on the clock from §4 to §8. The IPCC range pill stays in the Readout's footer from §4 to §8 (small, `data-grey`).
- **Captions:** on.
- **Highlight words:** *Seventy meters, reality check, 2100, one meter, thousands of years, fifty-eight, seven, Greenland, gone, Florida, Amazon, Bangladesh, islands, rise, ice-free, alligators*.
- **Chapters:** 0:00 70 meters · 0:25 Reality check · 1:15 Where the ice is · 2:10 Greenland · 3:15 Europe · 4:20 The Americas · 5:30 Asia · 6:25 Antarctica · 7:15 We've been here before.
- **Description:** must include a "How we built this simulation" note: static inundation of NOAA ETOPO relief, no isostatic rebound or erosion modelled, timeline from Winkelmann 2015 and IPCC AR6.
- **Ident / outro:** ident 0:20–0:25. Outro 8:20–8:38. End screen shows S04 and L01.

**QC acceptance criteria (L03-specific)**
- **Map stills are fact-checked** against the LDEO and NatGeo references before generation: a designer plus a second reviewer sign off on each keyframe.
- Seedance output must not move coastlines that the step shouldn't flood, and water must only *advance* (monotonic).
- **No identifiable skyline or landmark** in any Cinema shot. The lighthouse (§1) must be generic, not a famous lighthouse. The drowned rooftops (§6c) must be generic.
- §3 and §4: the ice sheets are fully present (SC-R/SC-G). §8 and §10 show no ice at all.
- §9 has no humans. Animals are anatomically plausible (the alligator has no extra limbs).
- The IPCC numbers on screen must exactly match the fact list.

**Revision plan**
- **Highest-risk sections:**
  1. **§5–§7 Seedance maps** (coastline drift or melting outlines).
  2. **§1** (the lighthouse drowning scale can look like a toy).
  3. **§9** (animal anatomy).
  4. **§6c** (rooftops can resolve into a real skyline).
- **Revision 1:** ≤60 s. The worst map segment(s) (≤45 s) plus §1 (20 s, trimmed to budget).
- **Revision 2:** ≤40 s. §9 or §6c.
- **Fallbacks:**
  - Maps: a Remotion cross-fade between verified stills (a zero-risk morph).
  - §9: drop the animals and keep the forest (VO unchanged).

**Estimated generation**

| Item | Seconds | Cost |
|---|---|---|
| Base: 21 generations (14 Cinema, 7 Seedance) | 495 s | $101.82 |
| Revision cap | 100 s | $20.57 |
| **Total** | **595 s** | **≤ $122.39** |

The 10 designed map keyframes (Europe 4, Americas 3, Asia 3) are design time, not generation cost [U].

---

### L06 — What If Earth Had Rings?

**Series:** ALTERNATE EARTHS · **Format:** F4 awe texture + F1 ladder + F3 real-hypothesis twist · **Runtime:** 8:13 (470 s generated + 5 s ident + 18 s outro).
**Hero colour:** a rocky grey-gold ring against the deep-blue dusk. **Altered-content label:** OFF. This is a clearly impossible cosmic scene with no real location altered, carrying `SPECULATIVE` chips. Turn it **ON** if any shot resolves into an identifiable real town (the Bible's "if in doubt" rule).

**Titles**
- **Final:** What If Earth Had Rings? (24 chars)
- **Alt A:** What If Earth Had Rings Like Saturn?
- **Alt B:** Earth With Rings: What Your Sky Would Look Like

**Thumbnail brief**
- **Left:** a normal dusk sky over a generic meadow and hills, with a crescent Moon and cyan rim.
- **Right:** the same meadow under a colossal grey-gold ring arch spanning horizon to horizon, a dark shadow gap on its left portion, deep-blue twilight.
- **Seam:** diagonal.
- **Text:** **"EARTH'S RINGS"**.
- **Chip:** `ALT EARTH`.
- **Variants:** (B) the orbital ringed Earth on the terminator (§4); (C) no text.

**Hook, verbatim, 0:00–0:05:** "Imagine looking up from your backyard and seeing a bright arc slicing the whole sky in two."

**Stage Cards**
- **SC-A BASELINE:**
  ```
  STAGE: present-day Earth; no ring; normal sky; sun from frame-left in orbital views.
  ```
- **SC-X BREAKUP:**
  ```
  STAGE: present-day Earth; a small grey rocky moon, a few hundred kilometers across, being stretched and fractured into an arc of tumbling rubble in orbit about three Earth-radii from the planet's center; our Moon not in frame; sun from frame-left.
  ```
- **SC-R RINGED:**
  ```
  STAGE: Earth with a thin, perfectly flat ring lying in the equatorial plane, spanning roughly 2,000 to 12,000 km above the surface, made of grey-brown rock dust and rubble (not white ice), bright where sunlit, with a dark gap where Earth's shadow falls across it; the ring's shadow as a dark band across the winter hemisphere; continents, oceans, clouds and city lights exactly as today; sun from frame-left in orbital views.
  ```
- **SC-O ORDOVICIAN:**
  ```
  STAGE: Earth 466 million years ago; barren rocky land with no plants, only dark microbial crusts; warm shallow turquoise seas; a faint grey ring arch across the sky; occasional meteor streaks; no animals on land; no humans.
  ```

#### §1 · Hook: the arc over your backyard · `ALT EARTH` · 20s (0:00–0:20)
- **VO (40 w):** "Imagine looking up from your backyard and seeing a bright arc slicing the whole sky in two. Every night. Forever. That's Earth, with rings. It sounds like science fiction — but the physics is real, and the history might be too."
- **Visual prompt:**
  ```
  Photoreal low-angle wide shot at dusk over a generic grassy meadow with a wooden fence and rolling hills, a single small figure seen from behind standing in the grass for scale, an immense thin grey-gold ring arch spanning the southern sky from the left horizon to the right horizon, the sky deep blue above and warm afterglow low at right where the sun has set, a dark shadow gap cutting across the left portion of the arch, first stars appearing. Camera: continuous slow tilt-up from the figure to the top of the arch. {SC-R}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / anamorphic / 2020s / twilight-fable.
- **Camera / light:** a tilt-up on an anamorphic 24 mm equivalent. Afterglow at frame-right (west, the sun just set); the ring is sunlit from the right.
- **Stitch:** single gen, 20 s.
- **SFX / music:** evening crickets, a glassy shimmer on the arch reveal, an awe choir.
- **HUD:** clock `ALT EARTH`. Chip `SPECULATIVE`. Readout hidden.
- **Ident** follows at 0:20.

#### §2 · How rings form: the Roche limit · `REAL PHYSICS` · 50s (0:25–1:15)
- **VO (101 w):** "What if Earth had rings like Saturn? To make a ring, you first need to break something. Every planet has an invisible boundary called the Roche limit. Inside it, the planet's tidal pull on a moon or asteroid is stronger than the gravity holding that object together. For Earth and a rocky body like our Moon, that line sits a little under three Earth radii from the planet's center — roughly eighteen thousand kilometers. Cross it, and a moon doesn't crash. It comes apart. We've watched this happen: in 1992, Jupiter's tides tore comet Shoemaker–Levy 9 into more than twenty pieces."
- **Visual:** a **Seedance 2.5 i2v** diagram.
  - **Designed stills:**
    - K0: photoreal Earth at left-centre, lit from frame-left. A faint cyan dashed circle is drawn *as a glowing line in space* at 2.9 R⊕ (no text). A small grey moon sits outside it at the right.
    - K1: the moon has crossed just inside the circle, slightly elongated.
    - K2: the moon is stretched into a lumpy elongated body with cracks.
  - **Prompt:** "Photoreal Earth and a small grey rocky moon in space, sunlight from frame-left, the moon drifting slowly inward across a faint glowing circle and stretching smoothly, Earth rotating slowly west to east, continuous motion, no camera movement."
- **Model / controls:** Seedance 2.5 i2v, 16:9, 720p.
- **Stitch:** 50 s → **25 + 25** (K0→K1, K1→K2); the seams are exact.
- **SFX / music:** low tension pad, a rising tone as the moon crosses the line.
- **HUD:**
  - Premise card "WHAT IF EARTH HAD RINGS?".
  - Remotion labels `ROCHE LIMIT ≈ 2.9 R⊕ ≈ 18,000 km` with the formula ghosted: `d ≈ 2.44 R (ρ⊕/ρm)^⅓`.
  - `src: Roche limit (fluid body)`.
  - Chip `REAL SCIENCE`.
  - Intro sting at 1:13.

#### §3 · ‖ A small moon breaks apart · `T+1 DAY` · 55s (1:15–2:10)
- **VO (107 w):** "So let's send one in. A small rocky moon, a few hundred kilometers across, drifting inward. T plus one day. As it crosses the Roche limit, it stretches — then fractures along its weaknesses. The fragments don't fall straight down. They keep orbiting, each at its own speed: inner pieces faster, outer pieces slower. From the ground, the first sign is a new bright streak in the night sky, growing longer every night. Within days, the moon has become a curved stream of rubble wrapping part-way around the planet. Some of the smallest debris does rain into the atmosphere — meteor showers, night after night, for anyone watching below."
- **Visual prompt:**
  ```
  Photoreal orbital wide shot: a small grey rocky moon breaking apart into a long curved arc of tumbling boulders and dust sweeping around Earth, the inner fragments pulling ahead of the outer ones, fine dust glinting in sunlight from frame-left, Earth's day side lit on the left with night side and city lights on the right, a few bright meteor streaks entering the atmosphere on the night side. Camera: continuous slow lateral track following the debris arc. {SC-X}
  ```
- **Model / controls:** Cinema: epic / calm / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** a lateral track on a 35 mm equivalent, hard sun from frame-left.
- **Stitch:** ‖ hard cut in (the breakup). 55 s → **28 + 27**. S3a: fracturing in progress. S3b: the tracking continues; the arc lengthens (monotonic spreading).
- **SFX / music:** grinding rock rumble (stylized), crystalline debris tinkles. Taiko enters low.
- **HUD:** clock slam `T+1 DAY`. Readout: `MOONLET ⌀ ~300 km · MODEL EST.` · `ORBIT ≈ 3 R⊕`. Chip `SPECULATIVE`.

#### §4 · The ring settles · `T+1,000 YRS` · 55s (2:10–3:05)
- **VO (115 w):** "T plus a thousand years. Collisions grind the rubble finer and finer, and flatten the stream into a disk. Earth's equatorial bulge nudges the orbits until the ring lines up with the equator. Saturn's main rings are about two hundred eighty thousand kilometers across — yet in most places only about ten meters thick. Ours would be thin the same way: a sheet, not a doughnut. But not the same color. Saturn's rings are mostly water ice, bright white. A ring made from a rocky moon would be darker: grey and brown, like the rock it came from. And it wouldn't last forever. Some of it would keep leaking inward, raining into the atmosphere as meteors."
- **Visual prompt:**
  ```
  Photoreal orbital view of Earth with a thin, flat grey-brown rocky ring lying in its equatorial plane, seen from slightly above the ring plane, the ring bright where sunlit from frame-left and cut by a dark band where Earth's shadow falls across it on the right, the ring's thin shadow line visible on the planet's surface, city lights on the night side, Earth rotating slowly west to east. Camera: continuous slow arc upward over the ring plane. {SC-R}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Camera / light:** an arc-up on a clean-sharp 35 mm equivalent, sun from frame-left. **This is the terminator hero shot.**
- **Stitch:** 55 s → **28 + 27**. The arc continues; the ring opens from narrow to wider ellipse.
- **SFX / music:** harp glints, a sustained choir.
- **HUD:** clock slam `T+1,000 YRS`. Readout: `SATURN MAIN RINGS ~282,000 km wide, ~10 m thick · src: NASA/Caltech` · `SATURN RINGS: WATER ICE` · `OUR RING: ROCK · MODEL EST.`. Chip `SPECULATIVE`.

#### §5 · The view from the equator · `ALT EARTH · 0°` · 45s (3:05–3:50)
- **VO (85 w):** "Now the view from the ground — and it depends entirely on where you stand. At the equator, you're standing in the ring's plane. You see it edge-on: a razor-thin bright line running straight overhead, from the eastern horizon to the western one. Sunlight catches it most at dawn and dusk. By day, it's a pale thread across the blue, like a daytime Moon stretched into a line. The largest ring in the solar system could look this big — and from the equator, it's a thread."
- **Visual prompt:**
  ```
  Photoreal low-angle wide shot on a generic tropical beach at dusk, palm silhouettes at frame edges, a razor-thin bright line of light running vertically from the horizon straight up through the zenith, splitting the deep blue sky into left and right halves, warm afterglow at frame-right, calm sea. Camera: continuous slow tilt-up following the line to the zenith. {SC-R}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / anamorphic / 2020s / twilight-fable.
- **Camera / light:** a tilt-up on an anamorphic 24 mm equivalent, afterglow from the right.
- **Stitch:** 45 s → **23 + 22**. The tilt-up continues at constant speed.
- **SFX / music:** gentle surf, the choir thinning to one voice.
- **HUD:** Readout `LATITUDE 0°` · `RING: EDGE-ON`, plus a small Remotion globe inset marking the latitude. Chip `SPECULATIVE`.

#### §6 · The view from mid-latitudes: the great arch · `ALT EARTH · 40°N` · 65s (3:50–4:55)
- **VO (128 w):** "Travel north — to forty degrees, the latitude of Madrid, Beijing or Denver — and the ring opens up. It becomes a vast arch across the southern sky, from horizon to horizon. After sunset, the ring keeps shining, lit by a Sun that has already set for you. But look along it: a dark gap slides across the arch. That's Earth's own shadow falling on the ring, and it crosses the sky with the night. The arch never moves. The stars turn behind it. South of the equator, the view mirrors ours, with the arch hanging in the northern sky. People would navigate by it; every culture would tell stories about it. And the farther toward the poles you go, the lower it sinks, until it's hidden below the horizon."
- **Visual prompt:**
  ```
  Photoreal epic wide landscape at twilight looking south over a generic mountain valley with a winding river, an immense grey-gold ring arch spanning the whole southern sky from the left horizon to the right horizon, a dark shadow gap on the arch's left portion, warm afterglow low at frame-right, deep blue sky with the first stars, a tiny lone hiker on a ridge in the foreground seen from behind for scale. Camera: continuous slow crane-up and push forward over the ridge. {SC-R}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / anamorphic / 2020s / a-dream-in-color.
- **Camera / light:** crane-up plus push on an anamorphic 21 mm equivalent. Afterglow on the right (west); the shadow gap on the left (east); the ring lit from the right.
- **Stitch:** 65 s → **22 + 22 + 21**.
  - S6a: crane from the hiker.
  - S6b: the crane continues over the ridge; the full arch is revealed.
  - S6c: the push continues toward the valley. The sky darkens slightly (monotonic dusk) and the shadow gap drifts slowly rightward. Keep the gap on the left half throughout.
- **SFX / music:** mountain wind, the full choir swell. This is the video's emotional peak.
- **HUD:** Readout `LATITUDE 40°N` · `RING ARCH: SOUTHERN SKY` · `SHADOW GAP: EARTH'S SHADOW`, plus a globe inset. Chip `SPECULATIVE`.

#### §7 · The ring's shadow: colder winters · `MODEL EST.` · 55s (4:55–5:50)
- **VO (114 w):** "But a ring doesn't only reflect light. It blocks it. Because Earth is tilted, the ring's shadow falls on the winter hemisphere — right when those latitudes need sunlight most. Bands of the tropics and mid-latitudes would spend part of each year in its shade. On the ground, you'd see it as a season of dimmer days, with the Sun sliding behind the ring each afternoon and its light filtered to a copper glow. Researchers have proposed that a ring's shadow could cool a whole planet — we'll come back to that. How much colder depends on how dense the ring is, and nobody has built one to check. So this one wears our speculative badge."
- **Visual:** a **Seedance 2.5 i2v** geometry diagram.
  - **Designed stills:**
    - K0: an orbital Earth at northern summer. The Sun is at frame-left, above the ring plane; the ring's shadow lies across the *southern* subtropics.
    - K1: the equinox. The shadow is a thin line on the equator.
    - K2: northern winter. The shadow lies across the *northern* subtropics and mid-latitudes.
  - **Prompt:** "Photoreal Earth with a thin grey ring from orbit, sunlight from frame-left, the ring's dark shadow band sliding smoothly across the planet's surface from the southern to the northern hemisphere, Earth rotating slowly west to east, continuous motion, no camera movement."
- **Model / controls:** Seedance 2.5 i2v.
- **Stitch:** 55 s → **28 + 27** (K0→K1, K1→K2); the seams are exact.
- **SFX / music:** a cold wind swelling, strings in a minor key.
- **HUD:** clock slam `SEASONS`. A Remotion month ticker runs `JUN → SEP → DEC`. Readout: `RING SHADOW → WINTER HEMISPHERE · REAL geometry` · `COOLING: MAGNITUDE UNKNOWN · MODEL EST.`. Chip `SPECULATIVE`.

#### §8 · Satellites and rockets · `SPECULATIVE` · 45s (5:50–6:35)
- **VO (88 w):** "And modern life? A ring of rubble circling in low orbit would be the ultimate space-debris field. Launching from near the equator — today's favorite spot, because Earth's spin gives rockets a free boost — would mean flying straight through the ring plane. Rockets would launch from higher latitudes instead, arcing over the ring. Astronomers would struggle too: a bright band across the sky that never sets, washing out faint stars along its path. Geostationary satellites, about thirty-six thousand kilometers up, would orbit well beyond it — with a front-row view."
- **Visual prompt:**
  ```
  Photoreal wide shot at dusk of a generic unbranded rocket climbing from a remote northern launch site, its bright exhaust plume arcing upward and to the right, the vast grey-gold ring arch filling the southern sky behind it, deep blue sky, no logos, no text, no people visible. Camera: continuous slow tilt-up tracking the rocket's climb. {SC-R}
  ```
- **Model / controls:** Cinema: epic / dynamic / modern / anamorphic / 2020s / twilight-fable.
- **Camera / light:** a tracking tilt on an anamorphic 85 mm equivalent, the exhaust as a practical light, afterglow from the right.
- **Stitch:** 45 s → **23 + 22**. The rocket keeps climbing along one smooth trajectory, with no second rocket.
- **SFX / music:** a distant rocket rumble, crackle.
- **HUD:** Readout: `RING ≈ 2,000–12,000 km ALT · MODEL EST.` · `GEO 35,786 km ALT · src: NASA`. Chip `SPECULATIVE`.

#### §9 · ‖ Twist: Earth may really have had one · `REWIND −466M YRS` · 60s (6:35–7:35)
- **VO (119 w):** "Here's the twist. Earth may really have had one. In 2024, a team at Monash University studied twenty-one impact craters from a burst of impacts about four hundred sixty-six million years ago, in the Ordovician. When they reconstructed where the continents were back then, every one of those craters sat within about thirty degrees of the equator — even though most of the available continental crust lay outside that band. Their explanation: a large asteroid broke apart inside Earth's Roche limit, formed a ring, and rained down over millions of years. They even suggest its shadow helped chill the planet into one of the coldest periods of the last five hundred million years. It's a hypothesis — but a real one."
- **Visual prompt:**
  ```
  Photoreal wide shot of a barren Ordovician coastline 466 million years ago: bare dark rock with no plants, a warm shallow turquoise sea with gentle waves, a faint grey ring arch across the pale sky, two bright meteors streaking down toward the horizon, low sun at frame-left, no animals on land, no humans. Camera: continuous slow dolly along the shoreline to the right. {SC-O}
  ```
- **Model / controls:** Cinema: epic / calm / **35mm-film** / vintage-anamorphic / 2020s / turquoise-mirage.
- **Camera / light:** a dolly on a vintage-anamorphic 35 mm equivalent, low sun from frame-left.
- **Stitch:** ‖ hard cut in (the twist). 60 s → **30 + 30**. The dolly continues; the meteors are occasional. Keep the ring arch in the same sky position.
- **SFX / music:** surf on rock, sparse meteor whooshes. Music turns wondrous and resolves major.
- **HUD:**
  - The clock spins back to `−466M YRS`.
  - Readout: `21 CRATERS ≤30° FROM EQUATOR · src: Tomkins et al. 2024, EPSL` · `>70% CRUST OUTSIDE BAND` · `HIRNANTIAN ICEHOUSE LINK: PROPOSED`.
  - Chip `REAL SCIENCE` with a `HYPOTHESIS` badge.

#### §10 · CTA + next timeline · `END` · 20s (7:35–7:55)
- **VO (41 w):** "So look up tonight and picture it: a grey arch, a sliding shadow, a sky that's never quite empty. One ring, and every night would be different. Now flip it: what if Earth had two moons instead? Pick your next timeline."
- **Visual prompt:**
  ```
  Photoreal orbital view of Earth with its thin grey ring seen nearly edge-on, day side lit from frame-left, vertical terminator through center, city lights on the right, Earth rotating slowly west to east. Camera: continuous slow pull-back. {SC-R}
  ```
- **Model / controls:** Cinema: epic / single-shot / modern / clean-sharp / 2020s / after-dark.
- **Stitch:** single gen, 20 s.
- **HUD:** the clock freezes. The end card teases L01 ("what if we *lost* the Moon") with S01. The outro follows at 7:55.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | The fluid Roche limit is d ≈ 2.44 R (ρ_planet/ρ_sat)^⅓; for Earth and Moon-density rock it is ≈2.85–2.9 R⊕ (≈18,000 km) | REAL | https://en.wikipedia.org/wiki/Roche_limit |
| 2 | A body inside the Roche limit is tidally disrupted, and its fragments continue orbiting | REAL physics | #1 |
| 3 | A ~300 km moonlet as the progenitor; the timeline from breakup to ring | SPECULATIVE | — |
| 4 | Collisions flatten a debris ring into the equatorial plane (oblateness torque) | REAL (ring dynamics, general) [U cite: planetary-ring textbook] | — |
| 5 | Saturn's main rings are ~282,000 km wide and ~10 m thick in most places | REAL | https://coolcosmos.ipac.caltech.edu/ask/108-How-large-are-Saturn-s-rings- · https://slate.com/technology/2014/05/saturn-s-rings-to-scale-thinner-than-paper.html |
| 6 | Saturn's rings are mostly water ice | REAL | https://science.nasa.gov/saturn/ [U URL] |
| 7 | A rocky ring would be darker (grey-brown) | MODEL EST. | — |
| 8 | Edge-on view at the equator; an arch at mid-latitudes; below the horizon at high latitudes; Earth's shadow gap on the ring | REAL geometry | derived |
| 9 | The ring's shadow falls on the winter hemisphere | REAL geometry | derived (23.4° tilt) |
| 10 | Climate cooling from ring shade | HYPOTHESIS / SPECULATIVE | Tomkins et al. 2024 (see #13) |
| 11 | Geostationary altitude 35,786 km | REAL | https://en.wikipedia.org/wiki/Geostationary_orbit |
| 12 | Equatorial launch sites gain a boost from Earth's rotation (~465 m/s at the equator) | REAL | derived from 1,670 km/h (L02 #1) |
| 13 | 21 Ordovician impact-spike craters all within 30° of the equator (~466 Ma); >70% of continental crust lay outside that band; ring hypothesis; possible Hirnantian Icehouse link | REAL study; HYPOTHESIS | https://www.monash.edu/science/news-events/news/2024/earth-may-have-had-a-ring-system-466-million-years-ago · https://phys.org/news/2024-09-earth-million-years.html · https://eos.org/articles/a-close-asteroid-encounter-may-have-once-given-earth-a-ring |
| 14 | Ordovician land had no vascular plants (barren) | REAL [U: early land-plant spores exist from ~470 Ma; "barren" is a fair visual simplification] | — |
| 15 | Comet Shoemaker–Levy 9 was tidally broken into 20+ fragments by Jupiter in 1992 (impacted 1994) | REAL | https://science.nasa.gov/solar-system/comets/shoemaker-levy-9/ [U URL] |
| 16 | From mid-latitudes in winter, the low Sun would pass behind the ring arch | REAL geometry (derived) | — |

**Edit notes**
- **Pacing:** this is the calmest long-form (F4/F5 texture). §5–§6 run on long takes with *no* Readout changes mid-shot, letting the image breathe; the §6 choir swell is the video's peak.
- **HUD:** the latitude globe inset appears only in §5–§6. §7 uses the month ticker instead of T+.
- **Captions:** on.
- **Highlight words:** *arc, Roche limit, comes apart, rubble, ten meters, grey, edge-on, arch, shadow, winter, launch, Monash, twenty-one, thirty degrees, hypothesis*.
- **Chapters:** 0:00 The arc · 0:25 How rings form · 1:15 A moon breaks · 2:10 The ring settles · 3:05 From the equator · 3:50 From mid-latitudes · 4:55 The shadow · 5:50 Rockets · 6:35 Earth's real ring?
- **Ident / outro:** ident 0:20–0:25. Outro 7:55–8:13. End screen shows L01 and S01.

**QC acceptance criteria (L06-specific)**
- The ring is **always in the equatorial plane**, flat and thin. Reject any ring tilted relative to the equator, any Saturn-white ring, or multiple bright bands.
- Ground-view **geometry:**
  - §5: a vertical line through the zenith.
  - §6: the arch is in the southern sky, with its highest point due south.
  - The shadow gap sits on the **east (left) side after sunset**.
  - Afterglow is on the right (west).
- The sun direction in orbital shots is frame-left, and **the ring's shadow on Earth is consistent** with that light.
- No logos on the §8 rocket and no second rocket. Reject a Moon in §3 (SC-X says it's out of frame).
- §9 shows no plants or trees on land and no humans.

**Revision plan**
- **Highest-risk sections:**
  1. **§6** (arch geometry and shadow gap).
  2. **§4** (ring plane and shadow consistency).
  3. **§1** (same as §6; it's also the thumbnail source).
  4. **§8** (rocket logo or text).
- **Revision 1:** ≤60 s. The worst §6 segment(s) (≤44 s) plus §1 (20 s, trimmed to cap).
- **Revision 2:** ≤40 s. §4 or §8.
- **Fallback for §6 and §1:** composite. Generate the landscape plate without the ring (Cinema), then paint the ring arch as a designed overlay and animate it in Remotion with a parallax drift. This is zero-risk geometry.

**Estimated generation**

| Item | Seconds | Cost |
|---|---|---|
| Base: 19 generations (15 Cinema, 4 Seedance) | 470 s | $96.68 |
| Revision cap | 100 s | $20.57 |
| **Total** | **570 s** | **≤ $117.25** |

---

## Part 5 — Short-form director briefs (9:16)

**Shared Shorts rules**
- **No ident, no outro.**
- The T+ clock sits **top-centre**.
- The Readout becomes one rotating pill under the clock.
- Captions sit at 62% height, clear of the bottom 20% and the right 12%.
- **Every beat runs as several 4–8 s shots.** That gives a visual change about every 2–3 s: a cut, a HUD slam or a caption swap.
- Shots inside a beat are *cut on motion*, which counts as a deliberate Shorts cut. Chaining, where the last frame becomes the next keyframe, is used only where a beat says "chained."
- Frame 1 is the most spectacular frame, with 2–4 words of on-screen text from frame 1 so it works on mute (R4, R5).
- Every Short ends on a **narrative plus visual loop** (R7).
- **Related video** is set to the funnel long-form. The pinned comment carries sources plus "Full timeline →".

---

### S01 — What If the Moon Were at the ISS's Height? (70 s)

**Format:** F2 Visual-First (Zack D.-style contrast: calm VO, impossible image) with a loop.
**Hero colour:** grey Moon against the dusk blue. **Altered-content label:** **ON** (realistic ocean-surge shots in B3). **Funnel:** L06, then L01.

**Titles**
- **Final:** What If the Moon Were at the ISS's Height?
- **Alt A:** What If the Moon Orbited 400 km Above Us?
- **Alt B:** The Moon, 400 km Away (This Is What Happens)

**Cover / first-frame brief:**
- The frame is B1 frame 1: a gibbous Moon, lit from the left, fills the top 70% of the frame, with a dusk horizon and a tiny figure in the bottom 20%.
- Cover text: **"MOON AT 400 KM?"** in Anton amber, upper third, over the dark sky.

**Hook, verbatim, 0:00–0:05:** "The Moon. Four hundred kilometers above your head."

**Stage Cards**
- **SC-N NEAR MOON:**
  ```
  STAGE: the Moon impossibly close, its disc spanning almost half the sky, grey cratered surface in sharp detail, lit from frame-left with its terminator visible; Earth otherwise as today.
  ```
- **SC-R RING:**
  ```
  STAGE: no Moon; a broad grey-brown rocky ring arch across the sky, lit from frame-left; Earth otherwise as today.
  ```

**Controls key:** 9:16 · 720p · Cinema, unless noted.

#### B1 · Hook · `T+0` · 5s (0:00–0:05)
- **VO (8 w):** "The Moon. Four hundred kilometers above your head."
- **Visual prompt:**
  ```
  Vertical photoreal dusk shot: an enormous gibbous Moon filling the top seventy percent of the frame, craters razor-sharp, lit from the left with its terminator curving on the right, a flat dark horizon in the bottom fifth with one tiny human figure seen from behind for scale, deep blue sky. Camera: continuous slow push-in. {SC-N}
  ```
- **Controls:** epic / single-shot / modern / anamorphic / 2020s / twilight-fable.
- **Camera / light:** push on an anamorphic 24 mm equivalent, sun set at frame-left.
- **Stitch:** 1 gen, 5 s.
- **SFX:** a sub-boom on frame 1, then silence.
- **HUD:** clock `T+0`. Text pill **"400 KM"**. Chip `SPECULATIVE`.

#### B2 · How close is that? · `T+0` · 13s (0:05–0:18)
- **VO (32 w):** "That's the height of the Space Station. From here, the Moon would stretch across almost half the sky — and it wouldn't hang still. It would race around Earth in about two hours."
- **Visual:**
  - **B2a (7 s):**
    ```
    Vertical photoreal orbital view: Earth's curved limb across the bottom third, the Moon skimming impossibly low just above the atmosphere, both lit from frame-left. Camera: continuous slow rise.
    ```
  - **B2b (6 s):**
    ```
    Vertical locked-off time-lapse from the ground: the giant Moon sliding rapidly across the sky from left to right over a flat horizon, shadows swinging. Single-shot.
    ```
- **Controls:** B2a epic / single-shot / modern / clean-sharp / 2020s / static-noon. B2b epic / single-shot / modern / clean-sharp / 2020s / twilight-fable.
- **Stitch:** 2 gens, 7 + 6. Cut on motion.
- **SFX:** a whoosh on the Moon's pass.
- **HUD:** Readout pill `MOON ⌀ IN SKY ≈ 78° (today 0.5°)` → `ORBIT ≈ 2.2 h · derived`. Chip `SPECULATIVE`.

#### B3 · The tides · `T+1 HR` · 16s (0:18–0:34)
- **VO (42 w):** "Now the real problem: tides. Tidal pull grows with the cube of closeness. Bring the Moon forty-five times closer, and its tidal stretch on Earth grows about ninety thousand times. Oceans heave into a moving mountain of water. Even the crust flexes."
- **Visual:**
  - **B3a (8 s):**
    ```
    Vertical photoreal wide shot from high cliffs over a generic open ocean coast, the sea surface bulging upward into a colossal smooth dome of water rising toward the giant Moon above, no people, no buildings. Camera: continuous slow tilt-up from water to Moon. {SC-N}
    ```
  - **B3b (8 s):**
    ```
    Vertical photoreal aerial of a generic desert plain splitting along a long glowing fissure, dust rising, the giant Moon above. Camera: continuous slow descent. {SC-N}
    ```
- **Controls:** epic / dynamic / modern / anamorphic / 2020s / industrial-fog.
- **Stitch:** 2 gens, 8 + 8.
- **SFX:** a deep ocean roar, then a ground crack.
- **HUD:**
  - Clock slam `T+1 HR`.
  - Pill `TIDES ×~92,000 · (384,400 / 8,508 km)³`.
  - Chip `REAL SCIENCE` (the math) → `SPECULATIVE` (the imagery).

#### B4 · ‖ The Moon cracks · `T+1 DAY` · 16s (0:34–0:50)
- **VO (35 w):** "And it works both ways. At this distance, the Moon is deep inside Earth's Roche limit — where tides beat a moon's own gravity. So the Moon doesn't crash. It cracks. It stretches, splits, and shatters."
- **Visual:**
  - **B4a (8 s):**
    ```
    Vertical photoreal orbital view of the Moon, very close above Earth's limb, stretched slightly into an egg shape, long glowing fractures opening across its surface, lit from frame-left. Camera: continuous slow push. {SC-N}
    ```
  - **B4b (8 s), chained from B4a's last frame:**
    ```
    the fractured Moon continuing to separate into huge tumbling fragments drifting apart along its orbit, dust glittering. Camera: continuous slow push. {SC-N}
    ```
- **Controls:** epic / dynamic / modern / clean-sharp / 2020s / static-noon.
- **Stitch:** ‖ hard cut in. 2 gens, 8 + 8, **chained** (B4a's last frame is `image_1` of B4b).
- **SFX:** silence, then a single massive crack and rumble.
- **HUD:** clock slam `T+1 DAY`. Pill `ROCHE LIMIT ≈ 18,000 km` · `MOON AT ≈ 8,500 km`. Chip `REAL SCIENCE`.

#### B5 · A ring is born · `T+1,000 YRS` · 15s (0:50–1:05)
- **VO (37 w):** "The fragments keep orbiting — spreading out, colliding, flattening into a disk around the equator. Within centuries: a ring. Grey rock, catching the sunlight, arching over every horizon — and some of it raining down as meteors for ages."
- **Visual:**
  - **B5a (8 s):**
    ```
    Vertical photoreal orbital view of Earth with a thin, flat grey-brown ring in its equatorial plane, lit from frame-left, city lights on the night side. Camera: continuous slow arc upward. {SC-R}
    ```
  - **B5b (7 s):**
    ```
    Vertical photoreal dusk ground shot over the same flat horizon and tiny figure as the opening, a broad grey-gold ring arch spanning the sky above, deep blue sky. Camera: continuous slow tilt-down toward the figure. {SC-R}
    ```
- **Controls:** epic / single-shot / modern / clean-sharp (B5a) or anamorphic (B5b) / 2020s / twilight-fable.
- **Stitch:** 2 gens, 8 + 7.
- **SFX:** harp glint, choir swell.
- **HUD:** clock slam `T+1,000 YRS`. Pill `RING: GREY ROCK · MODEL EST.`.

#### B6 · Loop · `END` · 5s (1:05–1:10)
- **VO (13 w):** "That's why the Moon can never be four hundred kilometers above your head."
- **Visual:**
  ```
  Vertical photoreal dusk: the tiny figure on the flat horizon beneath the ring arch, framing identical to the opening shot's bottom fifth, sky above. Camera: continuous slow push-in. {SC-R}
  ```
- **Controls:** as B1.
- **Stitch:** 1 gen, 5 s. The **visual loop** is a horizon and figure framing identical to B1's. The **narrative loop** is that the last words, "…four hundred kilometers above your head," re-open "The Moon. Four hundred kilometers above your head."
- **SFX:** the choir tail cuts on the loop point. No music end-button.
- **HUD:** the clock resets to `T+0` on the final frame.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | ISS altitude ≈ 400 km | REAL | https://www.nasa.gov/international-space-station/ [U URL] |
| 2 | Moon radius 1,737 km; with its surface at 400 km altitude, its centre is ≈8,508 km from Earth's centre; angular diameter ≈ 2·atan(1737/2137) ≈ 78° | REAL (derived) | NASA Moon fact sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |
| 3 | Orbital period at 8,508 km ≈ 2.2 h | REAL (Kepler, derived) | — |
| 4 | Tidal acceleration ∝ M/r³, so (384,400/8,508)³ ≈ 92,000× (corrects the idea card's "8,000,000×") | REAL (derived) | https://oceanservice.noaa.gov/education/tutorial_tides/tides02_cause.html |
| 5 | Fluid Roche limit for Moon-density rock ≈ 2.85 R⊕ ≈ 18,000 km | REAL | https://en.wikipedia.org/wiki/Roche_limit |
| 6 | Disruption forms a ring that flattens to the equatorial plane | REAL physics; SPECULATIVE timeline | — |
| 7 | The ocean "dome" and crust fissure imagery | SPECULATIVE (illustrative) | — |

**Edit notes**
- **Pacing:** a cut or HUD event roughly every 2–3 s.
- B4 opens on 0.4 s of silence before the crack.
- **Highlight words:** *Four hundred, half the sky, two hours, ninety thousand, cracks, ring*.
- Caption the first 3 words on frame 1.
- **Pinned comment:** "The math: tides ∝ 1/r³ → (384,400 ÷ 8,508)³ ≈ 92,000×. Sources ↓. Full ring timeline: *What If Earth Had Rings?*"

**QC (S01-specific)**
- The Moon is lit from the left in every SC-N shot, with its terminator on the right.
- There is no second Moon.
- The B4 fragments separate monotonically.
- The B5b and B6 horizons match B1 (±3% frame height).
- No buildings or people in B3.

**Revision plan**
- **Highest-risk:** **B4** (fracture realism) and **B3a** (the water dome can look like a CG blob).
- **Revision 1:** ≤20 s, B4a + B4b (16 s).
- **Revision 2:** ≤10 s, B3a (8 s).
- **Fallback:** Seedance i2v from a designed "cracked Moon" still.

**Estimate**

| Item | Seconds | Cost |
|---|---|---|
| Base: 10 gens | 70 s | $14.40 |
| Revision cap | 30 s | $6.17 |
| **Total** | **100 s** | **≤ $20.57** |

---

### S07 — What If Earth Stopped Orbiting the Sun? (75 s)

**Format:** F6 Scale-Anchor ("65 days") + F4 counter (the day counter drives the music).
**Hero colour:** a white-gold Sun swelling. **Altered-content label:** **ON** (realistic heat and boiling-ocean ground shots). **Funnel:** L02.

**Titles**
- **Final:** What If Earth Stopped Orbiting the Sun?
- **Alt A:** Earth Would Fall Into the Sun in 65 Days
- **Alt B:** 65 Days to the Sun: What If Earth Stopped Moving?

**Cover / first-frame brief:**
- The frame shows a calm blue Earth in the lower half and a small, bright Sun at upper-left, with a faint cyan orbit trail behind Earth. The trail is a Remotion element, cut off abruptly.
- Cover text: **"65 DAYS"**.

**Hook, verbatim, 0:00–0:05:** "If Earth stopped moving around the Sun, we'd have sixty-five days."

**Stage Cards**
- **SC-0 NORMAL:**
  ```
  STAGE: present-day Earth, blue and white, normal climate; the Sun at normal apparent size.
  ```
- **SC-F FALLING:**
  ```
  STAGE: Earth falling straight toward the Sun; the Sun appearing progressively larger and brighter from day to day; rising heat, haze and steam; sunlit from frame-left/top-left.
  ```

#### B1 · Hook · `T+DAY 0` · 5s (0:00–0:05)
- **VO (11 w):** "If Earth stopped moving around the Sun, we'd have sixty-five days."
- **Visual:**
  ```
  Vertical photoreal space view: a calm blue Earth in the lower half, lit from the upper-left by a small brilliant Sun in the upper-left corner, black space, thin atmospheric limb. Camera: continuous very slow push-in. {SC-0}
  ```
- **Controls:** epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Stitch:** 1 gen, 5 s.
- **SFX:** the orbit-trail whoosh stops dead. A clock tick starts at 120 BPM (F4).
- **HUD:** clock `T+ DAY 0`. Big pill **"65 DAYS"**. Chip `REAL SCIENCE`.

#### B2 · Why Earth doesn't fall · `T+DAY 0` · 15s (0:05–0:20)
- **VO (35 w):** "Earth isn't held up. It's falling toward the Sun right now — but moving sideways at about thirty kilometers a second, so it keeps missing. Take away the sideways speed, and the fall goes straight in."
- **Visual:**
  - **B2a (8 s):** the same framing as B1, with the camera slowly orbiting to show Earth's side. Remotion draws the velocity arrow `30 km/s`, then deletes it.
  - **B2b (7 s):**
    ```
    Vertical photoreal ground shot of a generic green farm field on a calm summer day, normal sun high at frame-left, wind in the grass, no people. Camera: continuous slow push. {SC-0}
    ```
- **Controls:** B2a clean-sharp / static-noon. B2b anamorphic / static-noon.
- **Stitch:** 2 gens, 8 + 7.
- **HUD:** pill `ORBITAL SPEED ≈ 29.8 km/s · src: NASA`.

#### B3 · Days 1–30 · `T+DAY 1 → 30` · 16s (0:20–0:36)
- **VO (33 w):** "Day one to thirty: almost nothing seems to change. The fall starts slowly. By day thirty, we're only about fifteen percent closer. But the Sun already looks bigger — and it's getting noticeably hotter."
- **Visual:**
  - **B3a (8 s):**
    ```
    Vertical locked-off photoreal time-lapse of the same kind of generic farm field, days flickering, the sun disc slightly larger and whiter, heat haze growing, grass yellowing. Single-shot. {SC-F}
    ```
  - **B3b (8 s):**
    ```
    Vertical photoreal macro of cracked dry soil and wilting leaves under harsh white light from the upper-left. Camera: continuous slow slider. {SC-F}
    ```
- **Controls:** epic / single-shot / modern / clean-sharp / 2020s / mirage-at-noon.
- **Stitch:** 2 gens, 8 + 8.
- **SFX:** the tick continues; insect buzz thins.
- **HUD:**
  - The day counter runs continuously `DAY 1…30`.
  - Pill `DISTANCE −15% (day 30) · derived` → `SUNLIGHT ×1.4`.
  - Chip `REAL SCIENCE`.

#### B4 · Venus, then Mercury · `T+DAY 41 → 57` · 16s (0:36–0:52)
- **VO (34 w):** "Day forty-one: we cross Venus's orbit, with nearly twice the sunlight we evolved under. Day fifty-seven: Mercury's orbit. The Sun looks more than two and a half times wider. The oceans are boiling away."
- **Visual:**
  - **B4a (8 s):**
    ```
    Vertical photoreal wide shot of a generic open sea under a huge, blinding white sun at the upper-left, thick steam rising off the entire water surface, sky bleached white-orange, no land, no people. Camera: continuous slow push over the water. {SC-F}
    ```
  - **B4b (8 s):**
    ```
    Vertical photoreal space view: Earth in the lower third wrapped in a thick white-brown steam atmosphere, a vastly enlarged blazing Sun filling the upper-left, sharp terminator on Earth. Camera: continuous slow push. {SC-F}
    ```
- **Controls:** epic / dynamic / modern / anamorphic / 2020s / industrial-fog.
- **Stitch:** 2 gens, 8 + 8.
- **SFX:** a boiling hiss; the tick accelerates to 140 BPM.
- **HUD:**
  - Slams `DAY 41 · VENUS ORBIT` and `DAY 57 · MERCURY ORBIT`.
  - Pill `SUNLIGHT ×1.9 → ×6.7 · derived` · `OCEANS BOILING · MODEL EST.`.
  - Chip `REAL SCIENCE` (orbits) → `SPECULATIVE` (oceans).

#### B5 · ‖ The last day · `T+DAY 64` · 16s (0:52–1:08)
- **VO (39 w):** "Day sixty-four: the final day. The Sun fills the sky, and Earth is falling at hundreds of kilometers a second. In the last half hour, the Sun's tides pull Earth apart — minutes before it would have touched the surface."
- **Visual:**
  - **B5a (8 s):**
    ```
    Vertical photoreal view of an immense sun surface filling the entire frame, granulation, spicules and prominences in crisp detail, a tiny dark silhouette of Earth in the lower center. Camera: continuous slow push. {SC-F}
    ```
  - **B5b (8 s):**
    ```
    Vertical photoreal close view of a glowing, molten Earth silhouette stretching into an elongated teardrop against the blinding solar surface, streams of glowing material peeling away. Camera: continuous slow push. {SC-F}
    ```
- **Controls:** epic / dynamic / modern / clean-sharp / 2020s / industrial-fog.
- **Stitch:** ‖ **silence cut in**. 2 gens, 8 + 8.
- **SFX:** total silence for 0.8 s, then a low roar building. The tick stops.
- **HUD:** slam `DAY 64`. Pill `SUN'S ROCHE LIMIT FOR EARTH ≈ 1.1M km · derived`. Chip `SPECULATIVE`.

#### B6 · Loop · `END` · 7s (1:08–1:15)
- **VO (17 w):** "Luckily, Earth never stops moving sideways. So every year, it falls — and misses. Sixty-five days… or forever."
- **Visual:**
  ```
  Vertical photoreal space view identical in framing to the opening: calm blue Earth in the lower half, small brilliant Sun at upper-left, black space. Camera: continuous very slow push-in. {SC-0}
  ```
- **Controls:** as B1.
- **Stitch:** 1 gen, 7 s. A white flash (Remotion, 6 frames) bridges B5b → B6.
- **Loops:** the **visual loop** is that B6's last frame equals B1's first frame. The **narrative loop** runs "sixty-five days… or forever" → "If Earth stopped moving around the Sun, we'd have sixty-five days."
- **HUD:** the counter resets to `DAY 0`.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Radial free-fall time from 1 AU ≈ P/(4√2) ≈ 64.6 days ("about 65 days") | REAL | https://phys.org/news/2016-07-earth-orbiting-sun.html · https://en.wikipedia.org/wiki/Free-fall_time |
| 2 | Crosses Venus's orbit ~day 41, Mercury's ~day 57 | REAL | https://www.universetoday.com/articles/earth-stopped-orbiting-sun (Rothstein / Bhatia) |
| 3 | Day 30 ≈ 15% closer (x ≈ 0.85; sunlight ×1.4) | REAL (derived from the radial-Kepler solution) | — |
| 4 | Sunlight ×1.9 at Venus's orbit (0.72 AU), ×6.7 at Mercury's (0.39 AU); Sun ~2.6× wider at Mercury's orbit | REAL (inverse square, derived) | — |
| 5 | Oceans boiling by ~day 50–57 (temperature ~125 °C by day 50 in one estimate) | MODEL EST. | https://www.universetoday.com/articles/earth-stopped-orbiting-sun |
| 6 | Earth's orbital speed ≈ 29.8 km/s | REAL | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| 7 | The Sun's Roche limit for Earth ≈ 2.44 R☉ (ρ☉/ρ⊕)^⅓ ≈ 1.1 million km, crossed ≈ 25 min before the centre and ≈ 12 min before the surface | REAL physics (derived); SPECULATIVE outcome (Earth may vaporize first) | https://en.wikipedia.org/wiki/Roche_limit |
| 8 | Infall speed near the Sun ≈ 500 km/s (√(2GM☉/r)) | REAL (derived) | — |

**Edit notes**
- The **day counter runs continuously** and speeds up visually as the days compress (F4). The tick tempo rises with it (120 → 140 BPM), and the music locks to the counter.
- **Highlight words:** *sixty-five days, sideways, thirty, fifteen percent, Venus, Mercury, boiling, final day, apart, forever*.
- **Pinned comment:** "Math: a straight fall from 1 AU takes ¼√2 of a year ≈ 64.6 days. Sources ↓. Next timeline: *What If Earth Stopped Spinning?*"

**QC (S07-specific)**
- The Sun is **always upper-left**.
- Its apparent size is **monotonically larger** from B1 to B5 (B6 resets it).
- The Sun disc has no lens flare in space shots.
- No people, and no identifiable place.

**Revision plan**
- **Highest-risk:** **B5b** (the Earth-teardrop can look cartoonish) and **B4b** (the steam atmosphere).
- **Revision 1:** ≤20 s, B5b + B4b (16 s).
- **Revision 2:** ≤10 s, any one.
- **Fallback for B5b:** end on B5a with a Remotion white-out.

**Estimate**

| Item | Seconds | Cost |
|---|---|---|
| Base: 10 gens | 75 s | $15.43 |
| Revision cap | 30 s | $6.17 |
| **Total** | **105 s** | **≤ $21.60** |

---

### S22 — What If Earth Spun Backwards? (70 s)

**Format:** F3 counterintuitive hook plus a peer-reviewed payoff ("scientists actually ran this").
**Hero colour:** emerald green (the Sahara greening). **Altered-content label:** **ON** (the real Sahara and real regions shown altered). **Funnel:** L02.

**Titles**
- **Final:** What If Earth Spun Backwards?
- **Alt A:** Scientists Simulated Earth Spinning Backwards
- **Alt B:** If Earth Spun Backwards, the Sahara Would Turn Green

**Cover / first-frame brief:**
- The frame is a sunrise over a generic mountain ridge. A Remotion compass shows the Sun at **W** in amber.
- Cover text: **"SUNRISE… IN THE WEST?"**

**Hook, verbatim, 0:00–0:05:** "Reverse Earth's spin, and the Sun rises in the west."

**Stage Cards**
- **SC-P PROGRADE (generation reference):**
  ```
  STAGE: present-day Earth rotating west to east.
  ```
- **SC-RT RETROGRADE:**
  ```
  STAGE: Earth rotating east to west; Sahara and Arabian deserts green with savanna and seasonal lakes; parts of the Americas dry and desert-like; oceans with shifted currents and patches of green cyanobacteria blooms in the Indian Ocean; sun from frame-left.
  ```

**Production trick:** Cinema reliably renders *prograde* rotation. To get retrograde orbital shots, **generate prograde (SC-P plus the SC-RT surface state) and time-reverse the clip in Remotion**. Continents stay correct and rotation flips. Cloud motion also reverses, which reads naturally. **This is the only place in the batch where right→left rotation is correct.** QC checks it is reversed on export.

#### B1 · Hook · `RETRO · DAY 1` · 5s (0:00–0:05)
- **VO (10 w):** "Reverse Earth's spin, and the Sun rises in the west."
- **Visual:**
  ```
  Vertical photoreal dawn over a generic jagged mountain ridge, the sun's first sliver breaking the horizon at center, golden rays and long shadows, valley mist, no people. Camera: continuous slow push-in. {SC-RT}
  ```
- **Controls:** epic / single-shot / modern / anamorphic / 2020s / twilight-fable.
- **Stitch:** 1 gen, 5 s. This clip is **reused, reversed, as B6** (0 extra gen).
- **SFX:** a low rising tone and a compass "clack".
- **HUD:** the Remotion compass **W** is pinned under the sun. Clock `RETRO · DAY 1`. Chip `SPECULATIVE`.

#### B2 · Scientists actually ran this · `MODEL` · 13s (0:05–0:18)
- **VO (26 w):** "That's the least strange part. In 2018, climate scientists at the Max Planck Institute actually ran this — a full Earth-system model, with the planet spinning backwards."
- **Visual:**
  ```
  Vertical photoreal Earth from orbit, rotating slowly west to east, lit from frame-left, terminator on the right with city lights. Camera: continuous slow push. {SC-P}
  ```
  **Time-reverse the clip in post**, so the result rotates east→west.
- **Controls:** epic / single-shot / modern / clean-sharp / 2020s / static-noon.
- **Stitch:** 1 gen, 13 s, reversed.
- **HUD:** Remotion arrow `↺ RETROGRADE`. Pill `src: Mikolajewicz et al. 2018, Earth System Dynamics`. Chip `REAL SCIENCE` (the study) with a `MODEL` badge.

#### B3 · Winds flip; the Sahara greens · `MODEL` · 16s (0:18–0:34)
- **VO (32 w):** "Winds flip. The trade winds that blow from the east now blow from the west. That reshuffles where rain falls. And the Sahara — one of the driest places on Earth — turns green."
- **Visual:**
  - **B3a (8 s), Seedance 2.5 i2v:** designed stills, a vertical aerial of generic Saharan dunes (start) → the same terrain as green savanna with a seasonal lake (end). Prompt: "Photoreal aerial, desert dunes smoothly and continuously turning to green grassland and scattered trees, a shallow lake filling, sunlight from frame-left, no camera movement."
  - **B3b (8 s), Cinema:**
    ```
    Vertical photoreal ground shot of a green savanna with acacia-like trees under a passing rain shower, sun breaking through at frame-left, a distant rocky desert escarpment on the horizon, no people, no animals needed. Camera: continuous slow push. {SC-RT}
    ```
- **Controls:** B3b epic / calm / modern / anamorphic / 2020s / the-emerald-ambush.
- **Stitch:** 2 gens, 8 + 8.
- **SFX:** a wind-direction swoosh (panned R→L), rain.
- **HUD:** pill `SAHARA → GREEN · src: Mikolajewicz 2018 · MODEL`. Chip `SPECULATIVE`.

#### B4 · The Americas dry out; Europe flips · `MODEL` · 16s (0:34–0:50)
- **VO (36 w):** "Meanwhile, large parts of the Americas dry out into desert. And the temperature contrast across Eurasia reverses: western Europe loses its mild winters, while eastern Siberia turns milder. Same planet, same oceans — just a different spin."
- **Visual:**
  - **B4a (8 s):**
    ```
    Vertical photoreal aerial of a generic temperate plain turned to dry cracked desert scrub, dust devils, abandoned fence lines, harsh sun at frame-left, no people, no buildings. Camera: continuous slow forward drift. {SC-RT}
    ```
  - **B4b (8 s):**
    ```
    Vertical photoreal generic rocky North Atlantic coastline in hard winter frost, snow on the cliffs, grey sea with ice at the shoreline, low sun at frame-left, no people, no buildings. Camera: continuous slow lateral drift. {SC-RT}
    ```
- **Controls:** B4a mirage-at-noon. B4b the-grey-channel. Both epic / calm / modern / anamorphic / 2020s.
- **Stitch:** 2 gens, 8 + 8.
- **SFX:** dry wind, then an icy gust.
- **HUD:** pill `AMERICAS: DRIER · EUROPE ↔ SIBERIA GRADIENT REVERSED · MODEL`.

#### B5 · The oceans reorganize · `MODEL` · 14s (0:50–1:04)
- **VO (26 w):** "Even the oceans reorganize. The Atlantic's great overturning current collapses — and a new one starts up in the Pacific. Overall, the backwards world is actually greener."
- **Visual:**
  - **B5a (7 s):**
    ```
    Vertical photoreal orbital view over the Pacific, rotating west to east, sunlit from frame-left, vast swirling ocean current patterns visible in sunglint. Camera: slow push. {SC-P}
    ```
    **Time-reverse in post.**
  - **B5b (7 s):**
    ```
    Vertical photoreal aerial of a calm tropical ocean surface with vivid green swirls of a cyanobacteria bloom, sunlight from frame-left. Camera: continuous slow descent. {SC-RT}
    ```
- **Controls:** clean-sharp / static-noon (B5a). anamorphic / turquoise-mirage (B5b).
- **Stitch:** 2 gens, 7 + 7.
- **SFX:** a deep ocean hum, a chime on "greener".
- **HUD:** pill `AMOC: COLLAPSES · PACIFIC OVERTURNING: EMERGES · CYANOBACTERIA ↑ (Indian Ocean) · MODEL`.

#### B6 · Loop · `END` · 6s (1:04–1:10)
- **VO (17 w):** "The deserts, the rain, even Europe's winters — all set by which way Earth turns. Now flip it."
- **Visual:** **B1, reversed and slowed to 83%** (0 gen). The sun sinks back to the first sliver, so the last frame equals B1's first frame.
- **Loop:** "Now flip it." → "Reverse Earth's spin…"
- **HUD:** the compass swings from **W → E → W** on the loop cut.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | A 2018 MPI-M Earth-system-model study simulated retrograde rotation | REAL | https://esd.copernicus.org/articles/9/1191/2018/ |
| 2 | Retrograde spin → Sun rises in the west | REAL (geometry) | — |
| 3 | Sahara greens; large parts of the Americas become desert; global desert area shrinks ("greener") | MODEL (one study) | #1 |
| 4 | The Europe–eastern Siberia temperature gradient reverses | MODEL | #1 |
| 5 | AMOC collapses; a strong Pacific overturning cell emerges | MODEL | #1 |
| 6 | Cyanobacteria dominate over large areas of the Indian Ocean | MODEL | #1 |
| 7 | Trade winds reverse direction | MODEL / REAL physics (Coriolis sign flips) | #1 (mechanism) |

**Edit notes**
- Every claim is attributed to **one study**, and the pill reads `MODEL` throughout. This is the "cited science" identity in 70 s.
- **Highlight words:** *west, 2018, backwards, flip, Sahara, green, desert, reverses, collapses, Pacific, greener*.
- **Pinned comment:** paper link plus "Next: *What If Earth Stopped Spinning?*"

**QC (S22-specific)**
- **Every orbital clip rotates right→left after reversal.** Export-check it.
- No text on the Seedance map stills.
- B1 and B6 are frame-identical at the loop point.
- No identifiable towns in B4.

**Revision plan**
- **Highest-risk:** **B3a** (the dune→savanna morph can smear) and **B5b** (the bloom can look like paint).
- **Revision 1:** ≤20 s, B3a + B5b (15 s).
- **Revision 2:** ≤10 s, one re-roll.
- **Fallback:** a Remotion cross-fade between the two B3a stills.

**Estimate**

| Item | Seconds | Cost |
|---|---|---|
| Base: 8 gens (B6 reuses B1) | 64 s | $13.16 |
| Revision cap | 30 s | $6.17 |
| **Total** | **94 s** | **≤ $19.34** |

---

### S04 — What If Sea Level Dropped 120 Meters? (150 s mini-sim)

**Format:** F1 mini-ladder (REWIND) + F6 number. This is the batch's **61–180 s length test**.
**Hero colour:** ice-age steel blue against tundra ochre. **Altered-content label:** **ON** (real coastlines altered in maps; a real tsunami event dramatized). **Funnel:** L03, the inverse.

**Titles**
- **Final:** What If Sea Level Dropped 120 Meters?
- **Alt A:** You Could Once Walk From England to France
- **Alt B:** Earth's Lost Lands: The Ice Age Map, Explained

**Cover / first-frame brief:**
- The frame shows a lone figure seen from behind, walking across a windswept tundra valley, with pale chalk cliffs on the far horizon and a low sun at left.
- Cover text: **"WALK TO FRANCE?"**

**Hook, verbatim, 0:00–0:06:** "Twenty thousand years ago, you could walk from England to France."

**Stage Cards**
- **SC-L LAST GLACIAL MAXIMUM:**
  ```
  STAGE: Earth about 20,000 years ago; sea level about 120–130 m lower; broad exposed continental shelves; ice sheets over Canada, Scandinavia and northern Britain; cold windswept tundra and steppe; sun low at frame-left.
  ```
- **SC-D DEGLACIATION:**
  ```
  STAGE: Earth 14,000–7,000 years ago; sea rising across low green plains; shrinking islands in a grey North Sea; ice sheets retreating.
  ```
- **SC-T TODAY:**
  ```
  STAGE: present-day coastlines.
  ```
- **Map stills:** designed orthographic views, lit from frame-left, 9:16 crop, with no labels.
  - **NW Europe:** K0 today → K1 −60 m → K2 −125 m (with the ice sheet over Scandinavia and Scotland).
  - **Beringia:** K0 → K2.
  - **Sundaland/Sahul:** K0 → K2.
  - Build them from NOAA ETOPO bathymetry [U licensing for any reference maps].

#### B1 · Hook · `T−20,000 YRS` · 6s (0:00–0:06)
- **VO (11 w):** "Twenty thousand years ago, you could walk from England to France."
- **Visual:**
  ```
  Vertical photoreal wide shot of a lone small figure in fur clothing seen from behind, walking away across a vast windswept tundra valley of low grass and gravel, a shallow braided river nearby, pale chalk cliffs on the far horizon, low cold sun at frame-left, long shadows to the right, no face visible. Camera: continuous slow follow at a distance. {SC-L}
  ```
- **Controls:** epic / single-shot / **35mm-film** / anamorphic / 2020s / the-grey-channel.
- **Stitch:** 1 gen, 6 s.
- **SFX:** wind, footsteps on gravel.
- **HUD:** clock slam `T−20,000 YRS` (REWIND styling). Pill **"−120 m"**. Chip `REAL SCIENCE`.

#### B2 · The ice-age sea · `T−20,000 YRS` · 34s (0:06–0:40)
- **VO (72 w):** "Not over a bridge — over dry land. During the last ice age, so much of Earth's water was locked in ice sheets that global sea level sat about a hundred and twenty to a hundred and thirty meters lower than today. Kilometers-thick ice covered Canada and Scandinavia. Where the English Channel is now, a river ran across open tundra. And the North Sea was largely land — a region we now call Doggerland."
- **Visual:** **Seedance 2.5 i2v** NW-Europe map, chained. Prompt: "Photoreal orbital view of northwestern Europe, sunlight from frame-left, the sea smoothly and steadily retreating from the coasts, broad pale land emerging between Britain and the continent, white ice spreading over Scandinavia, continuous gradual change, no camera movement."
- **Stitch:** 34 s → **17 + 17**. S04-B2a K0→K1; S04-B2b K1→K2. The seams are exact.
- **Pacing:** Remotion adds a slow 100→112% push across the pair. Label pops (*English Channel River, Doggerland, ice sheet*) land every ~3 s.
- **SFX:** a low ice drone, water draining.
- **HUD:** the pill counts `SEA LEVEL 0 → −125 m · src: Lambeck et al. 2014 PNAS`. Chip `REAL SCIENCE`.

#### B3 · The lost lands · `T−20,000 YRS` · 60s (0:40–1:40)
- **VO (128 w):** "And it wasn't just Europe. Between Siberia and Alaska, a land bridge called Beringia stretched hundreds of kilometers wide — the route by which people first reached the Americas. Florida was about twice as wide as it is today. Japan's main islands were joined to one another. In Southeast Asia, Sumatra, Java and Borneo were joined to the mainland in a single landmass: Sundaland. Australia, New Guinea and Tasmania formed one continent: Sahul. Sri Lanka was joined to India. The Persian Gulf was a river valley. From orbit, the planet looked different — bigger continents, wider coasts, white ice across the north. And most of the coastlines where ice-age people lived are now underwater. That's why so much of their story is still missing: it's out there, under the sea."
- **Visual:** three sub-shots, each internally chained. Joins between sub-shots are cut on motion (Shorts pacing).
  - **B3a–b, Beringia (10 + 10 s, Seedance, chained):** K0 today → K1 −60 m → K2 −125 m. The same prompt, adapted: "…a wide land bridge emerging between Siberia and Alaska…".
  - **B3c–d, Sundaland/Sahul (10 + 10 s, Seedance, chained):** K0 → K1 → K2. "…the islands of Southeast Asia joining the mainland, Australia joining New Guinea…".
  - **B3e–f (10 + 10 s, Cinema, chained):**
    ```
    Vertical photoreal orbital view of ice-age Earth: large white ice sheets over North America and northern Europe, broad pale continental shelves exposed, darker blue narrower oceans, sunlight from frame-left, terminator on the right, rotating slowly west to east. Camera: continuous slow push. {SC-L}
    ```
    Controls: epic / single-shot / modern / clean-sharp / 2020s / the-grey-channel.
- **Stitch:** 60 s → 6 segments of 10 s, in 3 chained pairs (each ≤30 s).
- **SFX:** a whoosh on each map cut, a glassy chime per label.
- **HUD:**
  - Labels *Beringia, Sundaland, Sahul, Sri Lanka–India, Persian Gulf valley*.
  - Pill `LAND BRIDGES: 5+`.
  - Chip `REAL SCIENCE`.

#### B4 · The ice melts · `T−14,500 → T−7,000 YRS` · 44s (1:40–2:24)
- **VO (93 w):** "Then the ice melted. Around fourteen and a half thousand years ago, sea level jumped about twenty meters in only a few centuries — a burst scientists call Meltwater Pulse 1A. That's about four centimeters a year, roughly ten times faster than the sea is rising today. Doggerland shrank into islands, and people lived on those shrinking shores. Around eight thousand years ago, an undersea landslide off Norway — the Storegga Slide — sent a tsunami across what remained. By roughly seven thousand years ago, the sea had nearly reached today's level. Britain was an island."
- **Visual:**
  - **B4a (15 s, Cinema):**
    ```
    Vertical locked-off photoreal time-lapse of a low green coastal plain at dusk, the grey sea steadily advancing over the grass and pooling in hollows, reeds drowning, a small distant campfire smoke trail on a rise, no faces. Single-shot. {SC-D}
    ```
    Controls: epic / single-shot / 35mm-film / clean-sharp / 2020s / the-grey-channel.
  - **B4b (15 s, Cinema):**
    ```
    Vertical photoreal aerial at dusk of a small low grassy island in a vast grey sea, a large smooth swell rolling toward it from the far horizon, sun low at frame-left, no people visible. Camera: continuous slow descent. {SC-D}
    ```
    Controls: drama / calm / 35mm-film / anamorphic / 2020s / industrial-fog. This is a restrained, distant wave, not a disaster close-up.
  - **B4c (14 s, Seedance):** NW-Europe map K2 (−125 m) → K0 (today), i.e. B2 reversed. This lands on today's coastline.
- **Stitch:** 3 shots, 15 + 15 + 14, cut on motion. B4c's end frame is K0.
- **SFX:** rising water, a deep swell rumble, then calm surf.
- **HUD:**
  - Slam `T−14,500 YRS` with pill `MWP-1A: ~20 m in <500 yrs · src: Lambeck 2014`.
  - Slam `T−8,150 YRS` with `STOREGGA TSUNAMI`.
  - Slam `T−7,000 YRS` with `SEA ≈ TODAY`.
  - Chip `REAL SCIENCE`.

#### B5 · Loop · `TODAY` · 6s (2:24–2:30)
- **VO (17 w):** "So look at your coastline today — and ask: where could you have walked, twenty thousand years ago?"
- **Visual:** a **Remotion hold on B4c's last frame** (0 gen) with a slow push and a pulsing "YOU ARE HERE?" ring that the viewer imagines. Cut on the last word to B1 frame 1.
- **Loop:** "…twenty thousand years ago?" → "Twenty thousand years ago, you could walk…"
- **HUD:** the clock spins from `TODAY` → `T−20,000 YRS` on the loop cut.

**Science fact list**

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | LGM sea level ~120 m lower (Lambeck: ~−134 m at 21 ka) | REAL | https://en.wikipedia.org/wiki/Doggerland · https://www.pnas.org/doi/10.1073/pnas.1411762111 |
| 2 | North Sea and much of Britain ice-covered or dry at the LGM; Doggerland connected Britain to the continent | REAL | https://en.wikipedia.org/wiki/Doggerland · https://education.nationalgeographic.org/resource/doggerland/ |
| 3 | A river drained the Channel basin | REAL [U; cite a "Channel River" paper] | — |
| 4 | Beringia land bridge; the route for the peopling of the Americas | REAL [U cite: NPS Bering Land Bridge] | https://www.nps.gov/bela/ [U] |
| 5 | Sundaland and Sahul formed; Sri Lanka joined to India; the Persian Gulf dry | REAL [U: verify each with a primary source] | — |
| 6 | MWP-1A: ~20 m at ≥40 mm/yr, possibly <500 yr, ~14.5 ka | REAL | https://www.pnas.org/doi/10.1073/pnas.1411762111 · https://en.wikipedia.org/wiki/Meltwater_pulse_1A |
| 7 | Doggerland inundated between ~10,000 and 7,000 years ago; Storegga tsunami ~6150 BCE (≈8,150 yr ago) | REAL | https://en.wikipedia.org/wiki/Doggerland · https://sites.law.lsu.edu/coast/2020/12/drowned-worlds-doggerland-the-neolithic-bridge-between-britain-and-europe/ |
| 8 | Sea level near today's by ~7,000 years ago | REAL (approx.) | Lambeck 2014 (#1) |
| 9 | Many ice-age coastal sites are now submerged | REAL (widely accepted) [U cite] | — |
| 10 | Florida roughly twice as wide at the LGM; Honshu, Shikoku and Kyushu joined | REAL [U: verify with a primary paleogeography source] | — |
| 11 | MWP-1A ~40 mm/yr ≈ 10× today's ~4 mm/yr global rise | REAL | Lambeck 2014 (#1) · https://sealevel.nasa.gov/ [U page for the current rate] |

**Edit notes**
- 150 s needs **plateau-style** pacing (R4). Each place name is a mini-payoff with a label pop, and there's a HUD event every ≤3 s.
- Pin the retention checkpoint at 0:40 (B3 opens with "And it wasn't just Europe").
- **Highlight words:** *walk, 120, Doggerland, Beringia, Sundaland, Sahul, underwater, twenty meters, Storegga, island*.
- **Pinned comment:** sources plus "The opposite timeline: *What If All the Ice Melted?*"

**QC (S04-specific)**
- Map coastlines are signed off against ETOPO before generation.
- B2 and B3 maps only ever *expose* land; B4c only ever *floods* (monotonic per beat).
- B1 and B4a figures show no face.
- The B4b wave is small in frame, with no destruction.
- Ice sheets appear in B2's K2 and B3e–f but not in B4c's end.

**Revision plan**
- **Highest-risk:** **B3a–d maps** (coastline warping) and **B1** (the ancient-human figure's plausibility).
- **Revision 1:** ≤30 s, the worst two map segments plus B1 (26 s).
- **Revision 2:** ≤15 s, B4b.
- **Fallback:** Remotion still cross-fades for maps; B1 without the figure, using footprints in the gravel.

**Estimate**

| Item | Seconds | Cost |
|---|---|---|
| Base: 12 gens (B5 is a Remotion hold) | 144 s | $29.62 |
| Revision cap | 45 s | $9.26 |
| **Total** | **189 s** | **≤ $38.88** |

---

## Part 6 — Batch plan

### 6.1 Production order (generation)

The order front-loads pipeline validation on cheap Shorts and reuses look-dev between related videos.

| # | Item | Why this slot | Gate before next |
|---|---|---|---|
| 0 | **Channel assets:** ident (5 s, 16:9) and outro (18 s, 16:9), Bible §6.1/§6.3 | These are reused by all 4 long-forms and generated once. | Ident and outro approved |
| 1 | **S01** Moon at ISS height | Cheapest end-to-end test of the 9:16 Cinema + chained + loop pipeline. Look-devs the **grey rocky ring** reused in L06. | The ring style frame is locked as the L06 reference image |
| 2 | **L01** Moon disappeared (flagship) | This is the first long-form. It tests Seedance i2v continuity (S1b, S7) and the "no Moon" QC. | L01 v1 QC report; the prompt suffix is tuned from its failures |
| 3 | **S07** 65 days | Tests the continuous day-counter HUD (F4) in Remotion. | Counter component reusable |
| 4 | **L06** Rings | Reuses the S01 ring frame as `image_1` in every SC-R prompt. It has the hardest ground-view geometry, so it runs while the team is warmed up. | Arch-geometry QC passed or the composite fallback is chosen |
| 5 | **S22** Spun backwards | Tests the **time-reverse** trick and the Seedance dune→savanna morph. | Reverse-export check automated |
| 6 | **L02** Stopped spinning | Tests "no rotation" SC-Z orbital shots, which the lessons from S22 inform. Uses the Seedance map morph pipeline. | Map-morph pipeline proven |
| 7 | **S04** Sea level −120 m | Heavy on map keyframes, sharing the designer's ETOPO workflow with L03. | Map keyframes reviewed |
| 8 | **L03** All ice melted | The most compliance-sensitive (real coasts, IPCC numbers), so it goes last with the full QC muscle. | Final batch QC sign-off |

**Parallelism:** designed stills can be made in parallel from day 1 by the design track. That covers L01 S1b and S7, L02 §5, L03 §5–§7, L06 §2 and §7, S22 B3a, and S04 maps. Generation runs sequentially in the order above.

### 6.2 Budget

| Item | Base s | Base $ | Revision cap s | Revision $ | Total s | Total $ |
|---|---:|---:|---:|---:|---:|---:|
| Channel assets (ident + outro) | 23 | 4.73 | 0 | 0.00 | 23 | 4.73 |
| S01 | 70 | 14.40 | 30 | 6.17 | 100 | 20.57 |
| L01 | 485 | 99.76 | 100 | 20.57 | 585 | 120.33 |
| S07 | 75 | 15.43 | 30 | 6.17 | 105 | 21.60 |
| L06 | 470 | 96.68 | 100 | 20.57 | 570 | 117.25 |
| S22 | 64 | 13.16 | 30 | 6.17 | 94 | 19.34 |
| L02 | 515 | 105.94 | 100 | 20.57 | 615 | 126.51 |
| S04 | 144 | 29.62 | 45 | 9.26 | 189 | 38.88 |
| L03 | 495 | 101.82 | 100 | 20.57 | 595 | 122.39 |
| **Batch** | **2,341** | **$481.54** | **535** | **$110.05** | **2,876** | **≤ $591.59** |

- **Expected spend.** Assume revisions use ~60% of their caps [U; planning assumption]: about **$548**. The hard ceiling is **$591.59**.
- **Not included** [U]:
  - Stage keyframe stills and designed stills (image-model and design time).
  - Seedance's actual rate, assumed to equal Cinema's $0.2057/s.
  - ElevenLabs VO (about 4,800 words in total).
  - The music licence.
  - Remotion render compute.
- **Budget rule.** If any video's first pass exceeds 1.25× its base seconds because of hard failures, pause the queue and review the prompts. Do not dip into another video's revision cap.

### 6.3 What this batch A/B-tests

| # | Question | Arms | Primary metric | Secondary | Read after |
|---|---|---|---|---|---|
| T1 | Which **premise type** makes the best first impression? | L01 removal · L02 physics catastrophe · L03 real-science/climate · L06 awe/alt-Earth | Impressions CTR × AVD% (≈ watch time per impression) | 30-s retention, subs per 1K views | 14 days per video |
| T2 | **Title** framing | Per long-form: the plain query (Final) vs a descriptive or "hour by hour" framing (Alt A) vs a curiosity add-on (Alt B) | Test & Compare **watch-time share** (R12) | — | when the test resolves (≤14 days) |
| T3 | **Thumbnail** system | Per long-form: `ThumbSplit` with text vs no text vs orbital/ground swap | Test & Compare watch-time share | CTR | same |
| T4 | **Shorts length bucket** | ≤75 s (S01, S07, S22) vs 150 s mini-sim (S04) | Viewed-vs-swiped % (R3) and APV | Engaged views, subscribers gained, related-video clicks | 7 days |
| T5 | **Shorts hook type** | Impossible visual (S01) · number + countdown (S07) · counterintuitive fact (S22) · concrete past-real claim (S04) | Viewed-vs-swiped % | Retention at s3, replay spike above 100% at s1 (R7) | 7 days |
| T6 | **Loop efficacy** | All 4 Shorts carry dual (visual + narrative) loops. The benchmark is a replay spike above 100% at s1 | Retention at s1 over 100% | Views/engaged-views ratio (R2) | 7 days |
| T7 | **Shorts → long-form funnel** | S01→L06 · S07→L02 · S22→L02 · S04→L03 (related-video link + pinned comment) | Related-video click-through | Long-form views sourced from Shorts | 14 days |
| T8 | **Trust signals** (qualitative + quantitative) | L03's hard "reality check" (§2) vs the other long-forms without an equivalent beat | Retention dip or hold at the reality-check timestamp | Comment sentiment on accuracy | 14 days |

**Release cadence**
- Follows Bible §8 and §9.2.7: ≤1 long-form per week, with Shorts between.
- **Week 1:** L01 (Sat) · S01 (Tue) · S07 (Thu).
- **Week 2:** L06 · S22.
- **Week 3:** L02 · S04.
- **Week 4:** L03.
- Hold the publish slot (Sat 14:00 ET [U]) constant so the time of day isn't a confound.
- Each Short publishes **after** its funnel long-form is live, so the related-video link works. S01 funnels to L06, so link S01 → L01 until L06 is live, then switch the link [U: related-video edits allowed post-publish].

**Decision rules for Batch 02**
- The premise type (T1) with the best watch time per impression gets **2 of the next 4** long-forms.
- If the 150 s Short (S04) matches or beats the ≤75 s median on viewed-vs-swiped and delivers higher subs per view, make 1 in 3 Shorts mini-sims. Otherwise, keep mini-sims ≤1 in 5.
- Adopt the winning hook type (T5) as the default for the next 10 Shorts, keeping one control arm.

### 6.4 Compliance and sign-off checklist (per video, before upload)
- [ ] Altered-content label matches the brief: L01 OFF, L02 ON, L03 ON, L06 OFF, S01 ON, S07 ON, S22 ON, S04 ON.
- [ ] The description has 3–6 sources (primary first) plus a "How we built this simulation" note.
- [ ] Every `SPECULATIVE` / `MODEL EST.` item from the fact list appears as a chip or badge on screen.
- [ ] `[U]` items in the fact list are resolved or reworded before VO recording.
- [ ] There is no generated text in any frame, and all QC criteria (§3.4 plus the video-specific list) are PASS.
- [ ] The production log records the human decisions per video (Bible §9.2.7).

---

## Part 7 — Consolidated sources

**Format research:**
- https://9to5google.com/2024/10/03/youtube-shorts-3-minutes/
- https://support.google.com/youtube/answer/15424877
- https://www.shortimize.com/blog/youtube-shorts-retention-rate
- https://emarketer.com/content/youtube-shorts-changes-view-count-rules-match-tiktok--instagram
- https://reelrise.app/guide/viewed-vs-swiped-away-the-only-youtube-shorts-metric-that-matters/
- https://vidiq.com/blog/post/youtube-shorts-algorithm/
- https://aibrify.com/blog/youtube-shorts-retention-curve-playbook
- https://www.opus.pro/blog/youtube-shorts-hook-formulas
- https://virvid.ai/blog/looping-structure-shorts-retention-2026
- https://ivideonow.com/blog/why-zack-d-films-dominates-youtube-shorts-with-unsettling-3d-animation-content-en
- https://en.wikipedia.org/wiki/Timelapse_of_the_Future
- https://www.asoundeffect.com/timelapse-of-the-future-sound/
- https://kurzgesagt.org/what-we-do?visit=videos
- https://medium.com/@prismiqpro/creative-spotlight-how-kurzgesagt-transforms-disorienting-science-youtube-analysis-video-editing-tips-e83f3373d600
- https://en.wikipedia.org/wiki/Underknown
- https://www.searchenginejournal.com/youtube-title-a-b-testing-rolls-out-globally-to-creators/562571/
- https://gyre.pro/blog/youtubes-new-title-ab-testing-tool-everything-creators-need-to-know
- https://1of10.com/blog/three-minute-shorts-need-know/

**Science, by video:**
- **L01:**
  - https://oceanservice.noaa.gov/education/tutorial_tides/tides02_cause.html
  - https://www.jpl.nasa.gov/news/apollo-11-experiment-continues-to-return-valuable-data/
  - https://elifesciences.org/articles/09991
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC4721961/
  - https://ui.adsabs.harvard.edu/abs/1993Natur.361..615L
  - https://perso.imcce.fr/jacques-laskar/en/general-audience/earth-without-the-moon/
  - https://ui.adsabs.harvard.edu/abs/2012Icar..217...77L/abstract
  - https://pubmed.ncbi.nlm.nih.gov/11541242/
  - https://royalsocietypublishing.org/rspa/article/472/2196/20160404/57288/
- **L02:**
  - https://en.wikipedia.org/wiki/Earth%27s_rotation
  - https://www.esri.com/news/arcuser/0610/nospin.html
  - https://bigthink.com/strange-maps/475-the-day-the-earth-stood-still/
  - https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
- **L03:**
  - https://www.usgs.gov/water-science-school/science/glaciers-and-icecaps
  - https://www.ipcc.ch/report/ar6/syr/figures/figure-3-4/
  - https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/
  - https://iccinet.org/ipcc-sixth-assessment-report-ar6-release-of-wg1-report-the-physical-science-basis-of-climate-change/
  - https://www.antarcticglaciers.org/glaciers-and-climate/what-is-the-global-volume-of-land-ice-and-how-is-it-changing/
  - https://nsidc.org/learn/parts-cryosphere/ice-sheets/ice-sheet-quick-facts
  - https://ocp.ldeo.columbia.edu/flood/noice.html
  - https://biodiversity.ku.edu/news/article/2023/01/25/52-million-year-old-fossils-high-arctic-show-near-primates-were-cool-colder-climate
  - https://www.colorado.edu/today/2010/08/24/new-study-shows-how-tortoises-alligators-thrived-high-arctic-some-50-million-years-ago
- **L06:**
  - https://en.wikipedia.org/wiki/Roche_limit
  - https://coolcosmos.ipac.caltech.edu/ask/108-How-large-are-Saturn-s-rings-
  - https://www.monash.edu/science/news-events/news/2024/earth-may-have-had-a-ring-system-466-million-years-ago
  - https://phys.org/news/2024-09-earth-million-years.html
  - https://eos.org/articles/a-close-asteroid-encounter-may-have-once-given-earth-a-ring
- **S07:**
  - https://phys.org/news/2016-07-earth-orbiting-sun.html
  - https://www.universetoday.com/articles/earth-stopped-orbiting-sun
  - https://en.wikipedia.org/wiki/Free-fall_time
- **S22:** https://esd.copernicus.org/articles/9/1191/2018/
- **S04:**
  - https://www.pnas.org/doi/10.1073/pnas.1411762111
  - https://en.wikipedia.org/wiki/Doggerland
  - https://en.wikipedia.org/wiki/Meltwater_pulse_1A
  - https://education.nationalgeographic.org/resource/doggerland/

**Before VO recording:** every row marked `[U]` in a fact list needs a live primary-source check. Wikipedia and secondary sources above are pointers; replace them with the primary paper in video descriptions where one exists.
