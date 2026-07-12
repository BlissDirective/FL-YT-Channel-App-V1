# Fable-5 — Faceless Studio Hero Page Build Plan

**The pre-launch marketing + email-collection page.** One public route that
makes a visitor *feel* what the product does in under 8 seconds, proves it
with live-looking demos of the real systems (the MVDA cut agent, the QC
gates, the /edit timeline, the pipelines), and converts them into a launch
list email. This is the primary campaign asset — every ad, post, and DM
points here.

Reference bar: the Subscribr special-offer page (subscribr.ai/special-offer/
youtube) — long-scroll narrative, one job per viewport, constant motion that
never fights the copy, social proof woven between feature beats, and the
email/CTA repeated at every scroll temperature. We take that structure and
beat it on one axis they can't: **our demos are the actual product**, not
screenshots.

---

## 0. Goal, audience, and the one metric

- **Goal:** email captures for the pre-launch list. Everything else
  (scroll depth, demo interactions) is diagnostic, not the goal.
- **Audience:** faceless-channel operators and would-be operators — people
  already burning nights in CapCut or paying editors $50-200/video. They are
  YouTube-literate, skeptical of "AI slop," and respond to *control*
  (gates, budgets, kill switch) as much as *automation*.
- **North-star metric:** visitor → email conversion ≥ 8% (paid traffic),
  ≥ 15% (warm/social). Secondary: 50% reach the agent-demo section.
- **The promise, in one line (hero H1):** the channel runs itself —
  *you keep the veto.*

---

## 1. Route, stack, and page skeleton

- **Route:** `src/app/(marketing)/launch/page.tsx` — a route group so the
  marketing layout (no app chrome, its own fonts/theme) never touches the
  app shell. Add `/launch` to `PUBLIC_PATHS` in `src/middleware.ts`.
- **Rendering:** static (`export const dynamic = "force-static"`) + a tiny
  client island per animated section. The page must score ≥95 Lighthouse
  performance on mobile — the animations are CSS/WAAPI/Framer-Motion-lite
  (react-bits), never a canvas that blocks LCP.
- **Fonts:** display = `Clash Display` or `Cabinet Grotesk` (licensed via
  fontshare), body = existing app sans. `next/font` with `display: swap`.
- **Email capture backend:** migration `xxxx_launch_leads.sql` —
  `launch_leads (id, email unique, source, referrer, utm jsonb, created_at)`
  + a rate-limited server action `joinLaunchList(email, source)` with a
  honeypot field. RLS: insert-only for anon. (Optional later: forward to
  Resend/ConvertKit via webhook — the table is the source of truth.)
- **Analytics:** Vercel Analytics + section-view beacons
  (`IntersectionObserver` → `navigator.sendBeacon`) so scroll-depth and
  demo-interaction rates are measurable without a heavy SDK.

### Section map (one job per viewport)

| # | Section | Job | Signature motion (react-bits) |
|---|---------|-----|-------------------------------|
| 1 | Hero + capture | The promise + first email ask | `Aurora` bg, `SplitText` H1, `ShinyText` CTA |
| 2 | The machine (pipeline) | Show the whole factory in one diagram | `Stepper` + `LogoLoop`, scroll-driven beam |
| 3 | The agent cuts (MVDA demo) | Watch the agent edit a real timeline | Custom timeline replay + `DecryptedText` tool log |
| 4 | Gates & control | "You keep the veto" — autonomy dials, kill switch | `SpotlightCard` grid, `CountUp` scores |
| 5 | The editor (/edit) | Human and agent are peers on one document | `TiltedCard` editor shot + hotspot tour |
| 6 | It learns (knowledge loop) | Retention → lessons → better cuts | `ScrollReveal` loop diagram, `GradientText` |
| 7 | Numbers | Cost/video, time saved, caps | `CountUp` stat band on dark |
| 8 | Founder note + FAQ | Disarm skepticism | `BlurText` reveal, plain accordion |
| 9 | Final capture | The ask, repeated at full heat | `StarBorder` form, `Magnet` button |

Plus a **sticky mini-bar** (appears after 60% scroll on mobile, 40% desktop):
logo · one-line promise · email input · Join. Dismissable, session-persistent.

---

## 2. Design system (the page's own, not the app's)

- **Canvas:** near-black `#0B0A08` → the brand's warm dark (`#17150F`) in
  radial washes. The app is light; the marketing page is **cinema dark** —
  it frames the product UI screenshots (light cards) like footage on a
  timeline.
- **Accent:** the brand amber `#F5B829` reserved EXCLUSIVELY for CTAs and
  the "agent is acting" moments in demos. Never decorative. A second cool
  accent `#7DD3FC` (sky) marks *human* actions in demos — the page teaches
  its own legend: amber = agent, sky = you.
- **Type scale:** H1 clamp(2.75rem, 7vw, 5.5rem), tight leading (0.95),
  -2% tracking. Body 1.06rem/1.7. Section eyebrows: 11px uppercase,
  +12% tracking, muted.
- **Motion language (three rules):**
  1. Everything enters once, on scroll, 250–450ms, ease-out, ≤24px travel —
     no looping section animations except inside demos.
  2. Demos loop; chrome doesn't.
  3. `prefers-reduced-motion` collapses every entrance to opacity and stops
     demo autoplay behind a "Play demo" button.
- **Texture:** 1px hairlines `rgba(245,184,41,.14)`, film-grain overlay at
  3% opacity on hero only, timeline-tick motif (the /edit ruler) as the
  section divider throughout — the page itself reads like a timeline.

---

## 3. Section specs

### 3.1 Hero — "the promise" (100dvh)

- **Background:** react-bits `Aurora` (or `Particles` at ≤40 particles,
  mobile: static gradient) in amber/ember tones at 20% opacity, masked to
  the top 70%.
- **Eyebrow:** `FACELESS STUDIO — PRE-LAUNCH` with a soft `GlareHover` chip.
- **H1 (SplitText, word-by-word, 40ms stagger):**
  *"Your YouTube channel, run by an agent crew. You keep the veto."*
- **Sub (BlurText, 200ms after H1):** "Idea → script → visuals → **an AI
  editor that actually cuts the video** → QC gates you control → publish.
  From one brief."
- **Capture form (the only interactive element above the fold):** single
  email input + `ShinyText` button "Get early access". Under it, in muted
  12px: "Founding-operator pricing locked for the list. No spam, one launch
  email + 2 build-log emails."
- **Below the form:** a 720×405 autoplaying (muted, `playsinline`) 8-second
  loop: screen capture of the /edit timeline while the agent's versions tick
  v1→v4 in the version strip — the single most product-true asset we have.
  Poster frame inline (base64) so LCP is the H1, not the video.
- **Scroll cue:** timeline-tick divider + "watch it work ↓".

### 3.2 The machine — pipeline in one viewport

- Horizontal `Stepper` (react-bits) pinned while the section scrolls
  (desktop only; mobile = vertical list): **Idea → Script → Voice → Visuals
  → Cut → QC → Publish**, each node lighting as a beam travels the connector.
- Each node expands a one-liner on hover/tap with the REAL system name —
  "Seedance/Kling clip farm," "ElevenLabs word-timestamps," "MVDA cut
  agent," "frame-critic judge" — credibility through specificity.
- Under the stepper, a `LogoLoop` of the stack (YouTube, ElevenLabs, Kling,
  Seedance, Remotion, Claude) at 40% opacity. Caption: "Rented the best
  parts. Built the brain."

### 3.3 The agent cuts — the MVDA demo (the page's centerpiece)

The section that no competitor page can copy. A **scripted replay** of a
real agent session, rendered with the actual /edit timeline components
(imported from the app — same `EddTimeline`, mock doc, no Player):

- Left: the timeline. Right: a terminal-style tool log.
- The replay (12s loop, or stepped by scroll on desktop):
  1. `get_context` → log line types in with `DecryptedText`.
  2. `retime_clip b2 −1.5s` → the clip visually shrinks, later clips reflow
     (animate the real component's props — it's just data).
  3. `set_transition b4 → whip 0.4s` → tick mark flashes amber.
  4. `auto_emphasis (3 tokens)` → caption tokens pop/scale/color in place.
  5. `judge_preview → 7.4 / floor 7.0` → a `CountUp` score dial fills.
  6. `mark_ready ✓ — "tightened the hook, varied the b-roll rhythm"` →
     the whole timeline gets a brief amber `GlareHover` sweep.
- Legend chips above (amber = agent action) pay off the color system set up
  in §2.
- Copy block beside it: "Every edit is a **versioned, validated** change to
  an explicit timeline — the same document you can open and override. The
  agent is capped: ~$0.80 a session, 12 turns, and it can't ship anything
  the judge scores under your floor."
- CTA echo: small inline email field ("See it on your niche → get access").

### 3.4 Gates & control — "you keep the veto"

2×2 `SpotlightCard` grid (spotlight follows cursor; static borders mobile):

1. **Four gates.** IDEA / SCRIPT / CUT / FINAL with the autonomy dial
   rendered as the app's real pill toggle (Assist · Co-pilot · Autopilot).
   Micro-demo: dial flips to Co-pilot, a `CountUp` judge score rises past
   7.0, the gate stamps APPROVED.
2. **A judge that watches frames.** 3 blurred video stills with critique
   annotations fading in ("caption collides with subject — reframe").
   Copy: "Vision QC scores every cut before you ever see it."
3. **Hard budgets.** An animated ledger: `$0.42 session · $0.80 cap` bar
   filling; kill-switch toggle that (in the demo) instantly greys every
   agent control. Copy: "One switch stops every paid action. Mechanically —
   not a prompt asking nicely."
4. **It answers to retention.** Mini retention curve dips; the dip maps to
   a timeline clip that highlights; a lesson chip slides out: *"static
   still held 9s — add motion."* Copy: "Every dip is traced to the exact
   cut that caused it. The agent learns from your audience, not from
   internet tips." (This is §11/Phase E — real.)

### 3.5 The editor — human and agent are peers

- Large `TiltedCard` (subtle 4° max) screenshot of /edit with 4 pulsing
  hotspots: version history ("v3 compiler · v4 agent · v5 **you**"), the
  trim/motion inspector, kinetic captions, the true-fidelity preview.
- Copy: "No export, no round-trip. You edit the same document the agent
  does — your save is just the next version. Revert anything."
- `InfiniteScroll` (slow, vertical, pausable) of real version-note strings:
  "tighten hook −0.8s" · "whip → crossfade at topic shift" · "mute b6 for
  dramatic pause" — texture that reads authentically machine+human.

### 3.6 It learns — the knowledge loop

- `ScrollReveal` diagram of the loop: **cuts ship → retention comes back →
  dips attribute to edits → lessons (shadow) → proven lessons graduate →
  the next cut starts smarter.** Amber nodes = agent, sky node = "your
  channel's data."
- `GradientText` pull-quote: "Techniques have to *earn* their way in — an
  external tip can never outvote your own retention."
- Small print (credibility): "Research runs on a separate $20/mo budget
  with its own kill-switch-gated cron. Yes, we budget the librarian too."

### 3.7 Numbers — the stat band

Dark band, four `CountUp` stats triggered at 50% visibility:

- **$3–8** production cost per long-form video (tier-dependent)
- **~$0.80** hard cap per agent cut session
- **4 gates** between an idea and your channel
- **0** videos published without clearing your floor

Sub-line: "Costs are enforced by ledgers and caps in code, not by hope."

### 3.8 Founder note + FAQ

- 3-sentence founder note (`BlurText` on scroll), signed, human: why
  faceless channels deserve a real production system, not a slot machine.
- FAQ accordion (plain, fast, no animation beyond height): "Is this AI
  slop?" (the QC/judge answer) · "What do I still do?" (gates, brand, taste)
  · "What does it cost to run?" (tiers + caps) · "When does it launch?"
  (the list gets the date first) · "Can I edit manually?" (/edit section
  recap).

### 3.9 Final capture

- Full-viewport, aurora returns at 12% opacity.
- H2: "The first 100 operators set the price forever."
- `StarBorder` form card + `Magnet` on the submit button (desktop only).
- Post-submit state: confetti-free ✓, "You're on the list — watch for the
  build-log email this week." + a share link (pre-filled tweet) — the only
  viral hook on the page.

---

## 4. React-bits usage manifest (install-time checklist)

Text: `SplitText`, `BlurText`, `ShinyText`, `GradientText`, `DecryptedText`,
`CountUp`. Surfaces: `SpotlightCard`, `TiltedCard`, `GlareHover`,
`StarBorder`, `Magnet`. Structure/motion: `Stepper`, `LogoLoop`,
`InfiniteScroll`, `ScrollReveal`, `Aurora` (or `Particles`).

Rules: copy components into `src/components/bits/` (react-bits is
copy-paste by design — no runtime dep), strip unused variants, every
component wrapped in a `<MotionGate>` that renders the static fallback for
`prefers-reduced-motion` and for mobile where flagged. Budget: JS for all
islands combined ≤ 90KB gzip; `Aurora`/`Particles` lazy-mounted after LCP
via `requestIdleCallback`.

## 5. Copy voice

Confident, specific, slightly dry. Every claim is backed by a system that
exists (never say "magic"; say the cap, the gate, the version number).
Ban-list: revolutionize, unleash, 10x, game-changer, effortless. The word
"veto" appears exactly twice (hero, gates) — it's the brand hook.

## 6. Build order & acceptance

1. **Scaffold** route group + migration + `joinLaunchList` action +
   sticky bar + sections 1, 7, 9 (the conversion spine). *Accept:* email
   lands in `launch_leads`, dupes upsert silently, honeypot drops bots,
   Lighthouse mobile ≥95, LCP < 1.8s on 4G throttle.
2. **The machine + gates** (sections 2, 4). *Accept:* stepper degrades to
   vertical list on mobile; all four cards keyboard-accessible.
3. **The MVDA demo** (section 3) — import `EddTimeline` with a fixture doc;
   scripted action list drives prop changes on a 12s timer. *Accept:* loop
   runs at 60fps on a mid phone (no layout thrash — transforms only),
   reduced-motion shows a 5-frame stepped storyboard instead.
4. **Editor + learning + FAQ** (5, 6, 8). *Accept:* hotspot tour works by
   tap; InfiniteScroll pauses on hover/focus.
5. **Polish pass:** section-view beacons, OG image (dark frame of the
   agent-demo timeline mid-edit + H1), `/launch` in sitemap, A/B hook for
   H1 variants (`?v=` param stored with the lead).
6. **Verify:** Playwright spec `e2e/launch.spec.ts` — page renders, form
   submits, lead row exists, sticky bar appears after scroll; axe pass with
   0 serious violations.

*Total estimate: 3–4 focused build days. Ship section spine first — the
page converts from day one and the demos land as upgrades.*
