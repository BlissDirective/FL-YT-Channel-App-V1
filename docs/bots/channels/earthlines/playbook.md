# Earthlines: Channel Playbook

**Channel:** Earthlines (working name *What If Earth*). Planet-scale "what if" simulations told as scientific timelines.
**Tagline:** *"Every change. Every consequence. Every timeline."* Handle/banner descriptor: "What-if Earth simulations."
**Series:** WHAT IF · EARTH IN… · ALTERNATE EARTHS · REWIND EARTH (real past Earth states).
**Default model:** Cinema Studio 4.0 (`hf-cinema-studio-4`). Seedance 2.5 (`hf-seedance-2-5`) only where a designed still must be exact.
**Voices today:** `N` (narrator, "The Observer"). No other speakers.

This playbook holds the channel-specific knowledge. The shared operating rules win on any conflict.

---

## 1. Channel identity

**Promise to the viewer:** one counterfactual premise that changes *our* planet, followed through real physics, climate and biology on an escalating timeline, with every number sourced and every guess labelled.

**Audience:** 12–40, broad and evergreen. Not "made for kids". Long-form is the revenue engine (education/science RPM); Shorts are discovery and funnel viewers to long-form.

**Tone:** calm authority with slight wonder. A mission scientist narrating from orbit who respects the viewer's intelligence. Extreme visuals, steady voice: that contrast *is* the channel.

**The Earthlines signature (non-negotiable, every video):**
1. **T+ clock.** Visible from the hook to the CTA; slams at every stage. Top-left in long-form, top-centre in Shorts. It is the in-world brand.
2. **Terminator light.** The hero shot and the final frame sit on a day/night terminator (from orbit, or dusk/dawn on the ground). Orbital key light always from **frame-left**; night side and city lights on the right. The surface drifts **left→right** (west→east, north up).
3. **Calm-authority narration** (The Observer). No hype.
4. **Cited science.** Each stage carries a `REAL SCIENCE` or `SPECULATIVE` chip. Each on-screen metric carries a `src:` tag; model numbers carry `MODEL EST.`. At least one "scientists disagree" or "here's the real number" beat per video. The description carries 3–6 primary sources.
5. **"Our planet, altered."** Every premise changes *Earth*. One hero colour per episode (amber dust, magma red, ice white, emerald green…).

**What we never do:**
- Generated on-screen text, numbers, signage, fake UI or logos (HUD is labels only).
- Recognisable real people, faces in close-up, panicking crowds, bodies, gore. Figures are small, seen from behind, for scale only.
- Identifiable skylines or landmarks in Cinema shots. Real coastlines appear only in designed Seedance map stills.
- Fake news framing: no chyrons, anchors, "BREAKING" styling, or real dates presented as events.
- Misstate real climate projections. All-ice-melt (~70 m) takes **thousands of years**; IPCC AR6 2100 likely range is 0.28–0.55 m (SSP1-1.9) to 0.63–1.01 m (SSP5-8.5). Say so on screen.
- Real-hazard fearmongering. Real hazards get real odds (Yellowstone caldera eruption ≈ 1 in 730,000 per year, USGS).
- Doom-bait, shouting, a logo or ident before the hook, Earth rotating backward (except a scripted reversed-spin stage), a Moon where the stage says none, lens flare in space.
- "What If" in the brand; it belongs only in titles (trademark/confusion risk with Underknown's *What If* and Marvel).

---

## 2. Look & sound bible

### 2.1 Locked look
- **Photoreal planetary cinematography:** NASA "Blue Marble" / ISS-window realism: thin blue atmospheric limb, real cloud texture, specular ocean glint, city lights on the night side.
- **Orbital views:** stable, slow, weighty; the planet never wobbles. West→east rotation (surface drifts left→right) in every segment.
- **IMAX ground scale:** every ground shot has a scale anchor (lone figure from behind, highway, wind turbine, lighthouse). Low horizon, wide lens.
- **Lighting:** physically plausible single-sun key. Golden hour/twilight for emotion, noon for clarity. City lights = human presence; lights going out = collapse.
- **Planet-state monotonicity:** a later stage never looks *less* changed than an earlier one unless the script says it recovers.

### 2.2 Palette and typography (HUD/labels)
| Token | Hex | Use |
|---|---|---|
| space-black | `#05070D` | Backgrounds, end screen |
| orbit-navy | `#0B1B2E` | Panels, HUD plates |
| limb-cyan | `#4FD1FF` | `REAL SCIENCE` chip, "normal Earth" side |
| t-plus-amber | `#FFB547` | T+ clock, `SPECULATIVE` chip, cast colour for `N`, highlight words |
| magma-red | `#FF4A2E` | Danger states |
| biome-green | `#3FD98A` | Recovery, life |
| ice-white | `#EEF3F8` | Body text, captions |
| data-grey | `#8A99AD` | Units, source lines, `MODEL EST.` |

Fonts (render side): Anton for titles/thumbnails; Space Grotesk 600/700 for HUD and captions; JetBrains Mono 700 for the clock and data.

### 2.3 Camera grammar and Cinema controls
Controls keys: `genre / pacing / camera_model / camera_lens / era / color_palette`. **Channel default:** `epic / calm / modern / anamorphic / 2020s / static-noon`.

| Beat | Camera | Lens | Pacing | Palette |
|---|---|---|---|---|
| Orbital establishing | Locked or ultra-slow push/orbit, 300–2,000 km, limb in frame | `clean-sharp` (or `anamorphic` for the hero) | `calm` / `single-shot` | `static-noon`, `after-dark` (night side) |
| Ground human-scale | Low-angle wide, 1.6 m eye height, slow dolly, tiny figure | `anamorphic` | `calm` → `dynamic` | per stage |
| Macro evidence | Macro slider, shallow DOF | `clean-sharp` | `calm` | `the-morning-after-rain`, `industrial-fog` |
| Time-lapse | Locked tripod | `clean-sharp` | `single-shot` | per stage |
| Disaster peak (max 1–2 per episode) | Tracking aerial, long lens, safe distance | `anamorphic` | `dynamic` (`chaotic` max once per episode) | `industrial-fog`, `mirage-at-noon` |
| Aftermath / new equilibrium | Slow crane-up, drone rise | `vintage-anamorphic` | `calm` | `the-morning-after-rain`, `the-emerald-ambush`, `a-dream-in-color` (alt Earths) |

Other palettes in use: `twilight-fable` (dusk, Short hooks), `the-grey-channel` (cold/grey stages). `genre`: `drama` for quiet aftermath; `horror` only for "dark Earth" stages; never `comedy`. `camera_model: 35mm-film` for REWIND EARTH stages. `era` stays `2020s`.

### 2.4 Reusable prompt blocks (verbatim)

**Prompt suffix** (append to every Cinema prompt, after the Stage Card):
> `Photoreal, physically plausible single-sun lighting, NASA ISS photography realism, IMAX scale. No text, no letters, no numbers, no logos, no watermarks, no human faces, no lens flare in space.`

**Stage Card rule:** each timeline stage gets one `STAGE:` sentence describing the planet state (Moon, ice, oceans, clouds, vegetation, night lights, sky, sun position). Paste the **identical** text into every prompt of that stage, after the shot description. Examples from the briefs:
- SC-A BASELINE: `STAGE: present-day Earth. Moon present: full Moon, bright, correct size. Ice extent today. Deep-blue oceans with sun glint. Normal clouds. City lights on night side. Sun from frame-left in orbital views.`
- SC-B MOONLESS: `STAGE: Earth with NO MOON anywhere — no Moon in any sky, no moonlight, no moon-path on water. Night skies dense with stars and a bright Milky Way away from cities. Ice, oceans, clouds, vegetation and city lights exactly as today. Sun from frame-left in orbital views.`
- SC-N NEAR MOON (S01): `STAGE: the Moon impossibly close, its disc spanning almost half the sky, grey cratered surface in sharp detail, lit from frame-left with its terminator visible; Earth otherwise as today.`
- SC-R RING (S01): `STAGE: no Moon; a broad grey-brown rocky ring arch across the sky, lit from frame-left; Earth otherwise as today.`

**Bible templates** (fill the braces; keep the fixed wording):
- Orbital: `Photoreal orbital view of Earth from 800 km altitude, {STATE}, thin blue atmospheric limb curving across the upper third, sun at {LEFT/RIGHT} casting a sharp day-night terminator, city lights glowing on the night side, real cloud textures over {REGION}. The planet rotates slowly west to east (surface drifting left to right). Camera performs a continuous, very slow push toward the terminator, no cuts. NASA ISS photography realism, IMAX scale, deep black space, no text, no lens flare.`
- Surface disaster: `Photoreal ground-level wide shot at {PLACE TYPE, e.g. "a generic Atlantic coastal town, no identifiable landmarks"}, {EVENT}, a single small human figure on a sea wall for scale, seen from behind. {LIGHT}. Camera: slow steady dolly forward at eye height, continuous motion. Epic, weighty, realistic physics, debris consistent with wind from {DIRECTION}. No text, no logos, no faces.`
- Aftermath: `Photoreal aerial crane-up over {LANDSCAPE}, {TIME}, soft morning light after rain, mist in valleys, birds in the far distance. Camera rises slowly and continuously, revealing the horizon; the move continues past the end of the shot. Awe, stillness. No text, no people.`
- Time-lapse bridge: `Locked-off photoreal time-lapse of {SUBJECT}, sun arcing across the sky repeatedly, {CHANGE} progressing steadily and continuously from frame start to frame end. Single-shot, no camera movement.`

### 2.5 Model choice per shot type
- **Cinema Studio 4.0:** everything cinematic and free-form (orbital, surface, aftermath, time-lapse). It takes no literal first frame and **cannot chain from the previous clip's last frame**: write every Cinema section so it stands alone and check continuity at the cut in QC. `endFrame` does not work on Cinema.
- **Seedance 2.5 i2v:** only when a designed still must be honoured exactly: planet diagrams (tilt, orbit geometry, Roche limit), maps and coastline morphs (`keyframePrompt` today → `endFrame {prompt}` changed), supercontinent layouts, stage-to-stage morphs, invisible seams, and loop endings (`endFrame {fromSection: 0}` needs section 0 to have a `keyframePrompt`).
- **Refs:** optional for Cinema only (e.g. reuse the S01 grey-ring look frame as a ref for ring videos). Don't make refs for Seedance-only videos.

### 2.6 Audio
- **Native audio:** off (`generateAudio` false). Narration, music and SFX are added in post; generated audio clashes.
- **Music** (continuous `music` bed): cinematic ambient pads under narration (warm synths, low strings, felt piano); orchestral swell (brass + taiko) only at the disaster peak and the final reveal; key shifts per stage, resolving to major in the aftermath; deliberate silence at the premise moment. Proven S01 setting: `gainDb -15`, `underVoDb -9`. If music must stop dead on a cue, use timed SFX music cues instead of `music`.
- **SFX palette:** metallic tick + sub-thump on each T+ slam; stylised wind/room tone for orbit; distant thunder for disaster onset; water rush, ice cracks; glassy chime on Readout updates; reversed whoosh for stage transitions; sub-bass boom then silence on a Short's frame 1.

### 2.7 Labels / HUD conventions (as produced in S01)
- **T+ clock:** one `label` per section, `position: "top"`, `style: "label"`, `at: 0`, `durationSec` = section length. Text like `T+0`, `T+1 HR`, `T+1 DAY`, `T+1,000 YRS`, `T+1M YRS`, `END`, `REFLECTION`, `REWIND −52M YRS`.
- **Readout / chip:** `position: "lower-third"`, `style: "label"`, e.g. `TIDES ×~92,000 · (384,400 / 8,508 km)³ · REAL SCIENCE`, `RING: GREY ROCK · MODEL EST.`, `ORBIT ≈ 2.2 h · derived`, or the chip alone (`SPECULATIVE`, `REAL SCIENCE`).
- **Hook text (Shorts):** 2–4 words readable on mute from frame 1, `style: "caption-bold"`, lower-third, e.g. `MOON AT 400 KM? · SPECULATIVE`.
- **Premise card (long-form):** the question as a `title` label for ~3s right after the hook (e.g. `WHAT IF THE MOON DISAPPEARED?`).
- **Highlight words:** the big numbers and payoff words (S01: *Four hundred, half, sky, two hours, ninety thousand, cracks, ring*).
- **Captions:** on (Shorts centre; long-form lower third optional, on by default for tests).

### 2.8 Sting / ident / outro / watermark
- **Shorts:** frame 1 is the hook. No ident. `sting` 0.5s just after the hook (S01: `at 5.1`). Watermark on. Loop Shorts: `outro {mode: "overlay", sec: 2.5, cta: "Full timeline: <long-form title>"}`. Non-loop Shorts: `outro {mode: "card", sec: 3–4}` with a CTA to the related long-form.
- **Long-form:** cold open/hook first, then the **ident (5s) at ~0:20–0:25**, never at 0:00. Intro sting (≤2s) marks the jump from the premise to stage one (the clock resets to `T+0`). **Outro 18s** with VO "Every change has consequences. Pick your next timeline." and a sustained, decaying major chord; end-screen elements need 16s.
- Generate the ident and outro plates **once** as sections of the first long-form, then `reuse {videoId, sectionIdx}` in every later long-form ($0). Ident prompt: `Photoreal Earth from deep orbit, a thin glowing cyan line traces a path around the planet like an orbit, then splits into three diverging luminous lines that wrap the globe; the planet's day side subtly shifts color along each line (blue, amber, green). Continuous slow push-in, single-shot, deep black space, no text.` (epic / single-shot / modern / clean-sharp / after-dark). Outro prompt: `Photoreal Earth slowly rotating, perfectly centered in the lower two-thirds, night side with city lights, the terminator advancing, a calm wide negative space above and at left and right for end-screen elements. Continuous single-shot, no camera move except a barely perceptible drift. No text.`

---

## 3. Cast & voices

Earthlines has **no characters**. The planet is the protagonist; the only speaker is the narrator.

| Speaker key | Role | Cast colour | Status |
|---|---|---|---|
| `N` | "The Observer", narrator | `#FFB547` | Saved and in use |

**Voice direction (locked):** "Mid-range, warm baritone or alto; neutral mid-Atlantic accent; close-mic documentary intimacy; measured cadence with gentle upward curiosity on questions; clear consonants; restrained awe on big numbers; no vocal fry, no announcer hype." Stock or designed voice, never a clone.

**Pace:** plan every line at **169 wpm (~2.8 words/s)**, the measured rate of our saved voice. Leave 0.4–0.8s after each T+ slam. A 5s hook holds ≤ 12 words.

**Script rules:**
- Second person for immersion ("you'd notice…").
- Every number is spoken **and** shown (label).
- Each stage ends on a forward question that opens the next.
- Speculative values: "scientists estimate / models suggest".
- A line may run past its own section into following *line-free* sections (S01 B3a's 42-word line spans B3a+B3b = 16s). It must end before the next line starts.

**Sample register:** "At nine forty-one tonight, the Moon is gone. No explosion. No flash. Just an empty patch of sky. Most people won't notice for hours. But the ocean notices immediately — and by morning, every coastline on Earth is behaving strangely."

---

## 4. Formats that work

Each card: the proven reference pattern, then **our layer**.

### Long-form (16:9, 8–12 min; mid-rolls need ≥ 8:00; deep-future epics 12–15 min at most once a month)

**F1 · Timeline Ladder** (What If / Underknown). Hook 0–3s: the premise happening *now*, with a time stamp ("At 9:41 tonight…"), premise visual in frame 1. Fixed rungs: T+seconds → hours → days → years → deep time, each an order of magnitude, each ending on a question. New rung every ~45–75s. Payoff: the "new equilibrium" rung, then a twist ("this already happened once"). Title: "What If {premise}?". *Ours:* rungs are T+ clock slams; clock visible throughout; a chip per rung; photoreal orbital cinematography.

**F3 · Cascading Paradox** (Kurzgesagt). Hook: the counterintuitive consequence first ("the first thing you'd notice isn't the dark, it's the tides"). Each answer raises a bigger "but then…"; one extended analogy; ends by reframing the viewer's place. *Ours:* the "scientists disagree, here are both" beat (e.g. Laskar 1993 vs Lissauer 2012), `src:` tags, a reframing twist at a hard cut near the end.

**F4 · Accelerating Counter** (melodysheep *Timelapse of the Future*). Counter starts and music locks to it; logarithmic time; each era its own palette and sound; breathing silences. *Ours:* log progress bar `SEC · HR · DAY · YR · 1K · 1M`; music changes key per stage; every T+ slam lands on a downbeat; silence at the premise moment.

**F5 · Ambient Cinematic Doc** (texture only). Long orbital pushes, the terminator at dusk, restrained score for aftermath/awe stages. We reject the slow opening: we hook in 5s.

**Long-form skeleton** (Bible §2.1, L01 as proven by the brief):
1. Cold open/hook (15–20s) · 2. ident 5s · 3. premise + baseline (T−0, 40–50s) · 4. T+1 sec/min · 5. T+1 hr/day · 6. T+1 week/year · 7. T+100/10,000 yrs · 8. T+1M yrs new equilibrium · 9. ‖ twist/reflection · 10. CTA + next timeline (20s) · 11. outro 18s.
Hard cuts (`transitionOut: "cut"`) only at the premise moment, disaster onset and the twist. The Bible's Earth-globe "Turn" between stages is not a directed-pipeline transition; use `crossfade` (or `dipToBlack`) at the other stage boundaries and let the clock slam label carry the change.

### Shorts (9:16, native vertical; 45–75s viral, 61–180s "mini-sim")

**F2 · Visual-First Short** (Zack D. Films). An impossible visual explains the premise in 0–1.5s; ≤4 words of text; 3–4 cause→consequence beats, each a bigger version of the same object; 45–75s; a visual change every ~2s; no intro, no logo at 0:00; abrupt ending that sends the viewer back to frame 1. *Ours:* calm Observer VO over the extreme image; the T+ clock top-centre + terminator in frame are the in-world brand; the last frame physically matches frame 1. **Proven:** S01 "What If the Moon Were at the ISS's Height?" (70s).

**F6 · Scale-Anchor Number.** Hook = one number spoken and shown ("Sixty-five days."); convert it into things the viewer knows; list pace; the number returns changed. *Ours:* the number lives in a lower-third readout with `src:`; speculative numbers carry `MODEL EST.` (briefed: S07 "65 days").

**Counterintuitive-fact hook** (F3 in Short form): "the Sun rises in the west" (briefed: S22). **Concrete past-real claim / mini-sim** (61–180s): "walk from England to France" (briefed: S04, 150s, REWIND EARTH).

**Shorts house rules:** frame 1 is the most spectacular frame, with 2–4 words of text from frame 1; beats run as several 4–8s shots so something changes every 2–3s (a cut, a clock slam or a label swap); every Short ends on a **narrative + visual loop** (the last line re-opens the first, the last frame matches the first); related video = the funnel long-form; pinned comment carries the math/sources + "Full timeline →". Put the literal search query in the title, the hook and the on-screen text; end on a "next question" that can become its own Short.

**Titles:** ≤60 chars, query first. Formulas: `What If {Premise}?` · `What If {Premise}? (Minute-by-Minute)` · `Earth After {Event}: Hour by Hour` · `Earth in {N} Years` · `What If Earth Had {Feature}?` · `This Is Earth If {Premise}`. Thumbnail/cover text ≤4 words, never repeating the title.

---

## 5. Script-writing recipe

1. **Pick the premise and verify the science.** List every claim with status (REAL / REAL-derived / SPECULATIVE) and a source. Recompute any idea-card number (S01's card said "8,000,000× tides"; the correct figure is ~92,000×). Anything unsourced becomes `MODEL EST.` or is cut.
2. **Choose the format card and the loop/twist first.** Write the last line so it re-opens the first.
3. **Write the Stage Cards** (one `STAGE:` sentence per stage) and pick one hero colour.
4. **Section plan.**
   - Shorts: 5–7 beats; each beat is 1–2 sections of **5–8s** (S01: 5, 7, 6, 8, 8, 8, 8, 8, 7, 5 = 70s). Keep every Short section ≤30s.
   - Long-form: 10–11 sections of 20–70s (ident and outro via `reuse`). Sections >30s must use `segments`: a list of {sec 4–30, prompt} that adds up to the section's seconds. Each segment gets its own verbatim prompt and starts from the previous segment's last frame (Cinema Studio can't truly continue a frame, so its segment prompts must each stand alone). Put every segment boundary on a natural motion beat. `estimate_directed` warns about any >30s section without segments. Landed segments are saved, so a retry never pays for them twice.
5. **VO.** Write lines at 169 wpm into each section's window. `at` 0.1–0.6s. Numbers spoken in words ("four hundred kilometers").
6. **videoPrompt** = `Vertical photoreal {shot} (Shorts) | Photoreal {shot}` + subject + one clear continuous motion + light direction (frame-left) + `Camera: continuous {move}.` + `{STAGE CARD}` + `{PROMPT SUFFIX}`. Name generic places ("a generic open ocean coast, no people, no buildings").
7. **controls** per section from §2.3 (full six keys).
8. **Seedance sections only:** `model: "hf-seedance-2-5"`, a `keyframePrompt` (the literal first frame, 9:16 or 16:9, no text), and `endFrame` where a landing or loop frame matters.
9. **labels:** clock at top for the whole section, readout/chip lower-third, hook text caption-bold. Keep each label inside its section (the estimate warns).
10. **zooms:** small punch-ins on a slam or a crack (S01: `toScale 1.12–1.15, overSec 0.1–0.12, holdSec 0.5–0.6`); must finish before the section ends.
11. **sfx:** a sub-boom on frame 1, a whoosh on big passes, a rumble on disaster, a harp glint on awe. Each cue inside its section.
12. **music:** one prompt describing the arc with timings (see example). **sting / outro / watermark / captions** per §2.8. **qc:** the video-specific checks plus the shared list (§6).
13. Metadata: `title`, 2 `altTitles` (for Test & Compare), description with 3–6 primary sources and "How we built this simulation", tags, `topic`, `cast: {"N": {"color": "#FFB547"}}`.

**Example excerpt (S01, produced and approved):**
```json
{
  "label": "B1 Hook", "sec": 5,
  "lines": [{ "speaker": "N", "text": "The Moon. Four hundred kilometers above your head.", "at": 0.2 }],
  "videoPrompt": "Vertical photoreal dusk shot: an enormous gibbous Moon filling the top seventy percent of the frame, craters razor-sharp, lit from the left with its terminator curving on the right, a flat dark horizon in the bottom fifth with one tiny human figure seen from behind for scale, deep blue sky. Camera: continuous slow push-in. STAGE: the Moon impossibly close, its disc spanning almost half the sky, grey cratered surface in sharp detail, lit from frame-left with its terminator visible; Earth otherwise as today.",
  "controls": { "genre": "epic", "pacing": "single-shot", "camera_model": "modern", "camera_lens": "anamorphic", "era": "2020s", "color_palette": "twilight-fable" },
  "sfx": [{ "at": 0, "prompt": "deep cinematic sub-bass boom, single hit, then silence", "durationSec": 2, "gainDb": -2 }],
  "labels": [
    { "at": 0, "durationSec": 5, "text": "T+0", "position": "top", "style": "label" },
    { "at": 0, "durationSec": 5, "text": "MOON AT 400 KM? · SPECULATIVE", "position": "lower-third", "style": "caption-bold" }
  ],
  "highlightWords": ["Four", "hundred"]
}
```
Loop section (B6, 5s): the last line "That's why the Moon can never be four hundred kilometers above your head." over the same horizon and figure framing as B1; clock labels `END` (0–4.8s) then `T+0` (4.8–5s).
Music: `"cinematic ambient score: warm synth pads, low strings and felt piano under calm narration, building tension, a deep brass and taiko hit around 34 seconds, then an awe-filled choir swell for a planetary ring reveal around 50 seconds, instrumental, no vocals except wordless choir"`, `gainDb -15`, `underVoDb -9`. Sting `{at: 5.1, sec: 0.5}`. Outro overlay 2.5s, CTA "Full timeline: What If Earth Had Rings?".

Note: S01's prompts omit the §2.4 suffix. Append it on new videos: the shared rules require "no text" language in every prompt.

---

## 6. QC gate

**Shared Earthlines acceptance criteria (verbatim from the brief).** A clip **fails** if any of these is true:
1. **Planet state.** The Stage Card is violated: a Moon where there shouldn't be one, wrong ice or ocean extent, or a later stage that looks *less* changed than an earlier one without a script reason.
2. **Physics.** Sun direction differs from the Stage Card. Orbital shots must be lit from frame-left. On the ground, shadow direction must match between chained segments. Other failures: Earth rotating right→left (except a scripted reversed stage), a lens flare or atmosphere glow in open space, a Moon phase that doesn't match the sun direction, stars visible in a sunlit daytime sky, or a night side without its terminator gradient.
3. **Text artifacts.** Any generated letters, numbers, signage, fake UI or logos. Text belongs only to the HUD.
4. **Human faces.** Any recognizable face, any face in close-up, crowds in panic, bodies or gore. Figures are small, seen from behind, and used for scale only.
5. **Seams.** Colour, exposure, camera speed or direction jumps at a chained seam. Allowed drift is ≤ one step of perceived camera speed and no visible palette shift.
6. **Morphing.** Continents or coastlines that "breathe" or melt in Cinema orbital shots. Accept small drift; reject any recognizable shape change the script doesn't call for.
7. **Real places.** Any identifiable skyline or landmark in a Cinema shot. Real coastlines appear only in designed Seedance maps.

Plus, per video: the loop horizon/framing matches frame 1 (S01 standard: ±3% frame height); no second Moon; fragments/changes progress monotonically; every `SPECULATIVE`/`MODEL EST.` item from the fact list appears as a label; captions/labels readable on mute.

**Failure → fix:**
| Failure | Fix (revise only that section) |
|---|---|
| Moon/ring present in a no-Moon stage, or missing | Strengthen the Stage Card ("NO MOON anywhere…"); re-roll. If it repeats, switch the section to Seedance from a designed still |
| Wrong sun side / terminator missing | Put "lit from frame-left, terminator on the right" in the shot sentence *and* the Stage Card; re-roll |
| Generated text or pseudo-letters | Re-roll with the full suffix; replace text-prone subjects (signs, screens, cities) with generic wording |
| Face, crowd, gore | Rewrite to "one tiny figure seen from behind for scale" or "no people"; re-roll |
| Continents melt/breathe in orbit | Shorten the shot or push slower; if a real map is needed, use a Seedance map still with `endFrame {prompt}` |
| Discontinuity at a Cinema cut (Cinema cannot chain) | Rewrite the second prompt to stand alone with matching light and direction; or cover the join with a clock slam label on a narration beat |
| Blob-like water/fracture VFX (S01's highest-risk beats) | One targeted re-roll; fallback: Seedance i2v from a designed still (e.g. "cracked Moon") |
| Loop frame mismatch | Re-roll the last section with "framing identical to the opening shot's bottom fifth", or make it Seedance with `endFrame {fromSection: 0}` (section 0 needs a `keyframePrompt`) |
| A line overlaps the next | Trim words, never add seconds |

Fallbacks per brief: a Seedance i2v from a designed still, a hold/zoom on the best frame, or covering with a transition. Don't open a third revision on the same section.

---

## 7. Spend guidance

**Resolution policy:** Shorts **720p**; long-form **480p**. Resolution is per script (every section), so it cannot be mixed within one video. (The Bible predates this policy and says "480p only for previz"; the operator policy wins.)

| Item | Seconds | 480p ($0.2056/s) | 720p ($0.4622/s) |
|---|---:|---:|---:|
| Short (S01-size) | 70 | $14.39 | $32.35 |
| Short mini-sim (S04-size) | 150 | $30.84 | $69.33 |
| Long-form (L01-size, sections only) | 485 | $99.72 | $224.17 |
| Ident + outro, once per channel (then `reuse`) | 23 | $4.73 | $10.63 |
| Revision cap, Short (brief) | 30 | $6.17 | $13.87 |
| Revision cap, long-form (brief) | 100 | $20.56 | $46.22 |

Stills ~$0.09 each (Earthlines uses few: Seedance diagram/map stills only).

**Fitting 4+ videos in $600/month (policy resolutions):**
- **Plan A (default):** 2 long-forms at 480p with a full revision cap (2 × $120.28 = $240.56) + 6 Shorts at 720p with a full revision cap (6 × $46.22 = $277.32) + first-month ident/outro $4.73 ≈ **$523**, leaving ~$77 for re-rolls and stills.
- **Plan B (Shorts-heavy):** 1 long-form 480p ($120) + 10 Shorts at 720p ($462) ≈ $582.
- Never plan a 720p long-form (~$224–270) unless the director asks; it costs as much as five Shorts.
- Mini-sims (61–180s) cost 2× a standard Short. Batch rule: if S04 (150s) matches or beats the ≤75s median on viewed-vs-swiped and brings more subs per view, make 1 in 3 Shorts mini-sims; otherwise keep them to ≤1 in 5.

**When a revision is worth it:** a hard failure from §6 (planet state, physics, text, faces, real places), a broken loop, or anything in the first 5 seconds. Otherwise log it as a lesson. Revise the failing section only, and stay within the brief caps: 20s Short / 60s long-form in round 1, 10s / 40s in round 2.

---

## 8. Idea queue

**Done in test batch 01 (don't repeat):** S01 Moon at ISS height (produced, approved) · L01 Moon disappeared · L02 Earth stopped spinning · L03 All the ice melted · L06 Earth had rings · S04 Sea level −120 m · S07 Earth stopped orbiting · S22 Earth spun backwards (all briefed and scripted for the batch).

**Re-rank rule:** once batch results are in, the winning premise type (removal / physics catastrophe / real-science climate / awe alt-Earth) gets 2 of the next 4 long-forms, and the winning Shorts hook type becomes the default for the next 10 Shorts (keep one control arm).

| # | Idea | Format | Hook (from the idea card) |
|---|---|---|---|
| 1 | S05 What If Jupiter Replaced the Moon? (66s) | F2 impossible visual + loop ("Io already lives this way") | "Jupiter, at the Moon's distance. It would cover forty times more sky." [verify ~40×] |
| 2 | S02 What If a Day Lasted One Hour? (60s) | F2 time-lapse + F6 (84-min breakup limit) | "Sunrise. Sunset. Sunrise. All before lunch." |
| 3 | L10 What If the Sun Disappeared? | F1 ladder, removal premise (deferred only for overlap with L01) | "If the Sun vanished right now, you wouldn't know for eight minutes and twenty seconds." |
| 4 | S20 What If Earth Were Tilted Like Uranus? (60s) | F3 counterintuitive fact, vertical terminator | "Tip Earth on its side, and your summer is 24 hours of sun for months." |
| 5 | L07 What If Earth Had No Tilt? (ALTERNATE EARTHS) | F3 paradox ("sounds perfect, it isn't") | "Every day of the year, the same weather. No summer. No winter. It sounds perfect. It isn't." |
| 6 | S10 What If Earth Had Two Suns? (60s) | F2 visual (double sunset) | "Two sunsets, every evening. Like Tatooine — but real planets do this." |
| 7 | L11 What If Earth Had Two Moons? | F1 + awe arm | "Two moons rising over the same horizon. Brighter nights, stranger tides — and one of them won't last." |
| 8 | S13 What If the Oceans Were Twice as Deep? (60s) | F6 number/map (Seedance map morph) | "Double every ocean. Most of the land you know disappears." |
| 9 | L09 Earth in 250 Million Years: The Next Supercontinent | F4 counter + news hook (Pangaea Ultima) | "In 250 million years, every continent collides into one. And a new study says it may be too hot for mammals." |
| 10 | S03 What If You Could See Earth's Magnetic Field? (60s) | F2, Seedance field diagram; ends on "Next: what if it vanished?" | "There's a shape around Earth you've never seen. Here it is." |
| 11 | L04 What If the Sahara Turned Green Again? (REWIND EARTH) | F1 + real paleoclimate; `35mm-film` past stages | "Ten thousand years ago, hippos swam where the Sahara's dunes are now. And it could happen again." |
| 12 | S27 What If Earth Were the Size of the Moon? (60s) | F6 number | "Shrink Earth to the Moon's size. You could jump six times higher. For a while." |
| 13 | L05 Earth in 1 Million Years (EARTH IN…) | F4 counter tour | "In one million years, the sky has new constellations, a volcano has erupted, and the Moon is 38 kilometers farther away." |
| 14 | S19 What If All of Earth's Lightning Hit One Place? (60s) | F6 number | "Earth gets hit by lightning about forty-four times a second. What if it all hit one spot?" |
| 15 | L16 What If Earth Spun 10 Times Faster? | F1 ladder, physics (pairs with L02) | "A sunrise every two hours and twenty-four minutes. That's Earth at ten times the speed. And the planet starts to change shape." |

Parked: L08 Yellowstone (real-hazard fear risk; label ON), S06 1 km asteroid (realistic disaster, drifts from "our planet, altered"), L19 Humans vanished (crowded, heavy city imagery). Every `[verify]` on an idea card must be checked before scripting.

---

## 9. Research focus

**Channels to study:** Zack D. Films (visual-first Shorts, loops, logo inside the world) · What If / Underknown (premise volume, titles) · Kurzgesagt (cascading paradox, sourcing) · melodysheep (counter + music) · Veritasium (counterintuitive hooks) · Unveiled (what-if titles, where thin sourcing loses) · Science Time, Primal Space, SEA-style ambient space docs (pacing, sleep-friendly watch time) · any channel posting "what if the Moon disappeared / Earth stopped spinning" Shorts.

**Queries (YouTube, X, TikTok, last 90 days):** "what if the moon disappeared" · "what if earth stopped spinning" · "what if all the ice melted" · "earth in 1 million years" · "what if earth had rings" · "what if the sun disappeared" · "next supercontinent" · "what if earth had no tilt" · the next queued premise verbatim. Also watch science-news hooks (sea level, supercontinent, Sun-brightening studies) that can become an episode.

**Extract per video:** frame-1 image and words on screen; seconds to the premise; cuts or visual changes per 10s; runtime bucket (≤60s / 61–180s / 8–12 min); loop type (narrative, visual, both) and whether the last frame matches the first; the number used as the hook; title and thumbnail text and whether they repeat; how speculation is labelled and sources cited; views relative to subscriber count.

**Our own metrics to read (after publish, via the operator's data):** viewed vs swiped away (target ~70–80%); retention at s1 (>100% = working loop) and s3 (a 30–50% s1→s3 cliff = failed hook); APV; engaged views vs views; related-video click-through to the funnel long-form; for long-form, Test & Compare watch-time share, CTR × AVD, 30s retention, subs per 1K views, and the retention hold at the "reality check" beat.
