# ⚡ FACELESS CHANNEL EMPIRE — MASTER PLAYBOOK

### A Multi-Phase Action Plan for a Claude-Powered, Near-Fully-Automated YouTube Business

-----

> **Starting Point:** Claude Max account ✓ | Everything else: Phase 0  
> **Model:** 1 pilot channel → validate → clone at scale  
> **Core Differentiator:** Claude as the permanent research and creative brain — not just a script tool

-----

## 📐 PLAN ARCHITECTURE AT A GLANCE

```
PHASE 0  →  Stack Acquisition & Setup          (Week 1–2)
PHASE 1  →  Niche Intelligence & Selection     (Week 2–3)
PHASE 2  →  Content Intelligence System        (Week 3–4)
PHASE 3  →  Channel Identity & Pilot Launch    (Week 4–6)
PHASE 4  →  Production Pipeline Build          (Week 6–8)
PHASE 5  →  Automation & n8n Orchestration     (Week 8–10)
PHASE 6  →  Monetization Layer                 (Week 10–12)
PHASE 7  →  Scale Protocol                     (Week 12+)
```

-----

## 💰 DUAL BUDGET PATHS

Two fully-specified stacks. Choose one, or start lean and graduate.

### 🟢 LEAN STACK — ~$67–90/month

|Tool                  |Purpose                            |Cost                     |
|----------------------|-----------------------------------|-------------------------|
|Claude Max            |Brain, research, scripting, prompts|$100/mo (already owned)  |
|ElevenLabs Starter    |Voiceover                          |Free → $5/mo             |
|Kling AI              |Video generation                   |~$10–20/mo (pay per clip)|
|CapCut                |Video editing & captions           |Free                     |
|n8n Cloud Starter     |Automation                         |$24/mo                   |
|Nano Banana / Ideogram|Thumbnails                         |Free tier                |
|YouTube Studio        |Publishing & analytics             |Free                     |
|Notion                |SOPs, content calendar             |Free                     |
|**TOTAL**             |                                   |**~$139–149/mo**         |


> ✅ Best for: Validating niche and format before committing to premium tools. Lean stack can take a channel to $3K–5K/month before it becomes the bottleneck.

-----

### 🔵 PREMIUM STACK — ~$350–500/month

|Tool                       |Purpose                            |Cost                   |
|---------------------------|-----------------------------------|-----------------------|
|Claude Max                 |Brain, research, scripting, prompts|$100/mo (already owned)|
|ElevenLabs Creator         |Cloned voice, multilingual         |$22/mo                 |
|Kling AI Pro               |Higher quality, faster renders     |~$50–80/mo             |
|Veo 3.1 (Google AI Premium)|Cinematic hero content             |~$20/mo (bundled)      |
|CapCut Pro                 |Advanced editing, team sync        |$10/mo                 |
|n8n Cloud Pro              |More workflows, executions         |$50/mo                 |
|Nano Banana Pro            |Premium thumbnails & assets        |$15–20/mo              |
|Ahrefs / TubeBuddy Pro     |SEO + keyword intelligence         |$29–49/mo              |
|Make (Integromat)          |Secondary automation layer         |$16/mo                 |
|Descript                   |Audio cleanup + overdub            |$24/mo                 |
|Notion Team                |Full ops dashboard                 |$16/mo                 |
|**TOTAL**                  |                                   |**~$352–461/mo**       |


> ✅ Best for: Launching at maximum quality from day one. Positions the channel as a top-tier producer from the first upload. Use if budget is not a constraint.

-----

## PHASE 0 — STACK ACQUISITION & ENVIRONMENT SETUP

### ⏱ Week 1–2

**Goal:** Every tool is active, tested, and integrated before a single video is made.

### 0.1 — Account Creation Checklist

- [ ] **ElevenLabs** — Create account, explore Voice Library, DO NOT pick a voice yet (that happens in Phase 3)
- [ ] **Kling AI** — Create account at klingai.com, run 2–3 test generations to understand credit system
- [ ] **Veo 3.1** — Activate Google AI Premium (if Premium Stack); run 1 test generation
- [ ] **CapCut** — Install desktop + mobile, create account, link them
- [ ] **n8n** — Sign up for cloud OR self-host via Docker (self-host = free, requires ~1hr setup)
- [ ] **Nano Banana / Ideogram** — Create account, test image generation with a sample thumbnail prompt
- [ ] **TubeBuddy Pro** — Install Chrome extension, connect to YouTube (create channel shell first)
- [ ] **Notion** — Duplicate the content OS template (link in Phase 3)
- [ ] **YouTube Channel** — Create the shell channel (no branding yet — that’s Phase 3)

### 0.2 — Claude Environment Setup

Create a dedicated Claude Project for this operation. Inside it, set a persistent system prompt:

```
You are the creative director and research brain for a faceless YouTube channel business.
You have expertise in:
- YouTube niche analysis (RPM, CPM, audience intent, competition density)
- Viral content pattern recognition
- Scriptwriting for faceless educational channels
- SEO and metadata optimization
- n8n workflow design and prompt engineering

When I ask for niche research, structure outputs in the standard format I have defined.
When I ask for scripts, follow the Master Script Framework.
When I ask for sourcing analysis, follow the Content Intelligence Protocol.
Always think like a media business operator, not a content creator.
```

> 💡 **Why a Project?** All your niche data, channel context, and sourced video analyses accumulate in one persistent context. Claude becomes increasingly effective the more you feed it.

-----

## PHASE 1 — NICHE INTELLIGENCE & SELECTION

### ⏱ Week 2–3

**Goal:** Use Claude as a systematic research engine to identify 3–5 candidate niches, then score and select the pilot channel niche with data-backed confidence.

### 1.1 — Claude Niche Research Protocol (Manual Session)

Run this prompt in your Claude Project:

```
NICHE RESEARCH BRIEF

I'm launching a faceless YouTube channel powered by AI-generated video and voiceover.
I need you to analyze the following and produce a ranked niche scorecard.

Evaluation criteria (score each 1–10):
1. Average RPM range (higher = better)
2. Evergreen content potential (vs. time-sensitive)
3. Content repurposability (how easy is it to rewrite/recreate existing top videos)
4. Audience comment engagement patterns (do people ask questions = more video ideas)
5. Competition density at the 10K–100K subscriber level (lower = better for new channel)
6. Affiliate/sponsorship ecosystem richness
7. AI video generation suitability (can Kling/Veo realistically visualize this niche)

Niches to evaluate:
[Insert your candidate list — e.g., Personal Finance, AI Tools, Health Optimization,
Real Estate Investing, Productivity, Stoic Philosophy, Dark History, True Crime, etc.]

For each niche, provide:
- Scorecard (7 criteria above)
- Top 5 content formats that perform in this niche
- 3 example video titles that would realistically hit 100K+ views
- Primary monetization path beyond AdSense
- One "unfair advantage" angle a new channel could own in this niche
```

### 1.2 — High-RPM Niche Reference Table

Use this as your seed list for the prompt above:

|Niche                          |Est. RPM Range|Best Format         |Repurpose Difficulty|
|-------------------------------|--------------|--------------------|--------------------|
|Personal Finance               |$12–$22       |List / Story        |Low                 |
|Real Estate Investing          |$15–$28       |Educational         |Low                 |
|AI Tools & Software            |$10–$18       |Tutorial / List     |Medium              |
|Health Optimization / Longevity|$8–$16        |Explainer           |Low                 |
|Stoic / Self-Improvement       |$6–$12        |Narrated Philosophy |Very Low            |
|True Crime                     |$4–$8         |Storytelling        |Low                 |
|Dark History                   |$5–$10        |Narrated Documentary|Low                 |
|Legal / Law Explained          |$14–$24       |Explainer           |Medium              |
|Insurance / Wealth Planning    |$18–$35       |Educational         |Medium              |
|Business Case Studies          |$12–$20       |Storytelling        |Low                 |


> ⚠️ RPM ranges are estimates. Actual RPM varies by audience geography, seasonality, and ad demand. Use as directional signals only.

### 1.3 — Niche Selection Gate ✋

Before moving to Phase 2, you must lock in:

- [ ] **Primary niche** selected
- [ ] **Secondary niche** identified (backup if pilot underperforms)
- [ ] **Content angle** defined — what specific POV will this channel own within the niche?
- [ ] **Audience statement** written: *“This channel is for [person] who wants [outcome] but struggles with [friction].”*

-----

## PHASE 2 — CONTENT INTELLIGENCE SYSTEM

### ⏱ Week 3–4

**Goal:** Build a systematic process for sourcing, analyzing, and repurposing top-performing content — powered by both automated Claude pipelines and manual research sessions.

### 2.1 — The Two-Mode Content Intelligence System

```
MODE A: AUTOMATED DAILY PIPELINE (n8n + Claude)
  └── Runs every morning
  └── Scrapes trending/top content signals from your niche
  └── Claude scores and ranks them
  └── Delivers a prioritized brief to Telegram
  └── Awaits your approval ✋ GATE

MODE B: MANUAL DEEP RESEARCH SESSION (You + Claude, weekly)
  └── Specific competitor channel teardowns
  └── New niche investigation
  └── Format experimentation analysis
  └── Quarterly niche pivot research
```

-----

### 2.2 — MODE A: Automated Content Sourcing Pipeline (n8n)

**Workflow architecture:**

```
[Trigger: Daily 7AM]
      │
      ▼
[HTTP Request] → YouTube Data API v3
  Search for top videos in niche (last 7 days, sorted by viewCount)
  Pull: title, views, likes, comments, publish date, channel size
      │
      ▼
[Claude AI Node] → Content Scoring Prompt
  Score each video on: Repurposability, Angle Freshness, Audience Fit
  Flag: "HIGH VALUE" / "MEDIUM" / "SKIP"
  Generate: 1-sentence repurpose brief for each HIGH VALUE video
      │
      ▼
[Filter Node] → Keep only HIGH VALUE items
      │
      ▼
[Telegram Bot] → Morning Brief Delivery
  Formatted daily digest with:
  - Video title + URL
  - View count + channel size
  - Repurpose brief
  - Suggested script angle
      │
      ▼
✋ APPROVAL GATE — You select which videos to repurpose
      │
      ▼
[Webhook trigger from Telegram button press]
      │
      ▼
[Claude AI Node] → Full Script Generation
[ElevenLabs Node] → Voiceover generation queued
[Notion Node] → Adds to content calendar with status "SCRIPTED"
```

**YouTube Data API Setup:**

1. Go to console.cloud.google.com
1. Create project → Enable YouTube Data API v3
1. Generate API key
1. Free tier: 10,000 units/day (sufficient for daily pulls)

**n8n Claude Node prompt for scoring:**

```
You are a content intelligence analyst for a faceless YouTube channel in the [NICHE] niche.

Analyze these YouTube videos and score each for repurposability:

{{$json["videos"]}}

For each video, return JSON:
{
  "title": "original title",
  "url": "video url",
  "repurposability_score": 1-10,
  "reason": "one sentence why",
  "repurpose_angle": "how I would reframe this for my channel",
  "flag": "HIGH VALUE | MEDIUM | SKIP"
}

Score HIGH VALUE if: views > 100K on a channel under 500K subscribers,
OR any video over 500K views regardless of channel size.
Prioritize content that is 3–18 months old (proven, not stale).
```

-----

### 2.3 — MODE B: Manual Deep Research Session (Weekly Claude Workflow)

Run this once per week as a dedicated 30-minute session. Use this master prompt:

```
WEEKLY CONTENT INTELLIGENCE SESSION — [DATE] — [NICHE]

This week's research targets:
- Competitor channels to analyze: [paste 2–3 channel names]
- Specific topics to investigate: [paste any topics from your Telegram brief]
- New angles to explore: [any ideas from comments or your own observations]

For each competitor channel, provide:
1. Top 3 performing videos (by views) and WHY they worked
2. Pattern in their hook style
3. Gaps — what topics are they NOT covering that the audience wants?
4. One "steal and elevate" concept I can repurpose better than their version

For each topic:
1. Search intent breakdown (what is the viewer really asking?)
2. The "already told" version vs. the "better version I should make"
3. Optimal video length and format
4. Hook concept for a thumbnail + title combo

Output as a structured content brief I can hand to my production pipeline.
```

-----

### 2.4 — Content Repurposing Ethics & Legal Notes

> 📌 **Important distinction:**
> 
> - **Inspiration/Format repurposing** = Studying what works and making your own original version. ✅ Fully legal and standard industry practice.
> - **Direct repurposing** = Rewriting the script and recreating visuals from scratch using AI. ✅ Legal when no original footage, audio, or text is copied.
> - **Clipping/reuploading** = Taking someone’s actual video. ❌ Copyright violation. Not part of this plan.

All content in this pipeline is **original AI-generated video + original AI voiceover + original Claude-written scripts** inspired by — not copied from — source material.

-----

## PHASE 3 — CHANNEL IDENTITY & PILOT LAUNCH

### ⏱ Week 4–6

**Goal:** Create a channel brand that feels intentional, establish the voice, and publish the first 5 videos before optimizing anything.

### 3.1 — Channel Brand Creation (Claude Session)

```
CHANNEL IDENTITY BRIEF

Niche: [your selected niche]
Target audience: [your audience statement from Phase 1]
Channel tone: [pick one: authoritative, curious, alarming, calm, aspirational]

Generate:
1. 10 channel name options (memorable, niche-adjacent, not keyword-stuffed)
2. Channel tagline (under 10 words)
3. Voice personality description (5 adjectives that define how this channel sounds)
4. Visual identity direction (color palette concept, thumbnail style, logo archetype)
5. "Content pillars" — the 4–5 recurring topic categories this channel will own
6. Proposed upload schedule for first 30 days (3–4 videos/week)
```

### 3.2 — Voice Cloning & Lock-In (ElevenLabs)

This is the highest-leverage setup decision you will make.

1. Browse the ElevenLabs Voice Library — do NOT use default voices
1. Test 5–10 voices against a sample paragraph from your niche
1. If Premium Stack: Record 10–15 minutes of your own voice (or hire a voice actor on Fiverr for $50–100) and clone it — this becomes your channel’s unique, uncloneable audio identity
1. **Lock this voice permanently.** Do not switch it after channel launch.

### 3.3 — Thumbnail System (Nano Banana / Ideogram)

Establish a consistent thumbnail template before first upload:

```
THUMBNAIL SYSTEM PROMPT (save in Claude Project):

Create a thumbnail image prompt for a [NICHE] YouTube video.
Style rules for this channel:
- [Color 1] and [Color 2] as dominant colors
- Bold, high-contrast text overlay (maximum 5 words)
- [Facial expression / object / scene type] as focal element
- No stock photo feel — cinematic, dramatic, or conceptual
- Aspect ratio: 16:9, optimized for mobile thumbnail size

Video title: [TITLE]
Thumbnail concept goal: [curiosity / fear / aspiration / shock]

Generate 5 distinct thumbnail concepts as image prompts.
```

### 3.4 — First 5 Videos: The Proof-of-Concept Batch

Do NOT optimize or analyze until all 5 are published.

|Video #|Purpose                    |Format                       |
|-------|---------------------------|-----------------------------|
|1      |Establish channel authority|List (“Top 7…”)              |
|2      |Highest repurpose potential|Recreate a proven 500K+ video|
|3      |Test storytelling format   |Case study / narrative       |
|4      |Test evergreen SEO         |“How to” / explainer         |
|5      |Test emotional hook        |Warning / alarming angle     |

-----

## PHASE 4 — PRODUCTION PIPELINE BUILD

### ⏱ Week 6–8

**Goal:** Standardize every step from “video idea” to “ready to upload” into a repeatable, near-automated process.

### 4.1 — Master Script Framework (Claude)

Save this as a permanent template in your Claude Project:

```
MASTER SCRIPT FRAMEWORK

You are a senior scriptwriter for a faceless educational YouTube channel.

Channel niche: [NICHE]
Channel voice personality: [5 adjectives from Phase 3]
Target audience: [audience statement]

Write a complete script for:
Topic: [TOPIC]
Format: [List / Story / Explainer / Case Study]
Target length: [60 sec / 5 min / 8–10 min]
Source inspiration: [optional — paste title/URL of video being repurposed]

Requirements:
- Hook: First 3 seconds = pattern interrupt. No "welcome back."
- Open loop in first 20 seconds: tease the payoff without revealing it
- Spoken English only — conversational, not academic
- [PAUSE] markers every 3–4 sentences
- [VISUAL: detailed scene description] for every beat — these feed directly to Kling
- Chapters/segments labeled for editing
- Soft CTA at 70% mark (not the end) and end card suggestion

Output:
1. Full word-for-word script
2. Estimated runtime
3. [VISUAL] prompt list extracted separately (ready to paste into Kling)
4. 5 thumbnail concepts
5. 3 title variations: [SEO] [Curiosity] [Emotional]
6. Description (500 words, keyword-rich, with chapters)
7. Tags (20 tags, mix of broad and long-tail)
```

### 4.2 — Video Generation Workflow

**For Lean Stack (Kling only):**

1. Extract `[VISUAL]` prompts from script
1. Batch generate clips in Kling (group similar scenes)
1. Download all clips
1. Assemble in CapCut with voiceover track
1. Add auto-captions (CapCut free feature)
1. Export at 4K

**For Premium Stack (Kling + Veo 3.1):**

- Use **Kling** for: standard b-roll, transitions, talking-head-equivalent scenes
- Use **Veo 3.1** for: opening cinematic shot, key “hero moment” scene, thumbnail-quality stills
- Combine in CapCut/Descript

### 4.3 — Production Time Targets

|Step                     |Lean Stack    |Premium Stack |
|-------------------------|--------------|--------------|
|Script (Claude)          |5 min         |5 min         |
|Visual prompt extraction |5 min         |5 min         |
|Voiceover (ElevenLabs)   |3 min         |3 min         |
|Video generation (Kling) |30–45 min     |20–30 min     |
|Editing (CapCut)         |20–30 min     |15–20 min     |
|Thumbnail (Nano Banana)  |10 min        |10 min        |
|Metadata package (Claude)|3 min         |3 min         |
|**TOTAL ACTIVE TIME**    |**~75–90 min**|**~60–75 min**|

-----

## PHASE 5 — AUTOMATION & n8n ORCHESTRATION

### ⏱ Week 8–10

**Goal:** Connect all tools into a single orchestrated pipeline. Reduce active time to ~30 min/video.

### 5.1 — Master n8n Workflow Map

```
MORNING INTELLIGENCE RUN (Daily, 7AM)
├── YouTube API pull → niche trending videos
├── Claude scoring → ranked brief
└── → Telegram digest ✋ GATE 1: You approve repurpose targets

SCRIPT PIPELINE (Triggered by Gate 1 approval)
├── Claude → full script generation
├── Claude → extract visual prompts list
├── ElevenLabs → generate voiceover MP3
├── Notion → create video card (status: SCRIPTED)
└── → Telegram notification: "Script + VO ready for review" ✋ GATE 2: Script approval

ASSET PIPELINE (Triggered by Gate 2 approval)
├── Kling API (or webhook) → batch video generation queue
├── Nano Banana → 5 thumbnail options generated
├── Claude → metadata package (title variants, description, tags)
├── Notion → update card (status: ASSETS GENERATING)
└── → Telegram notification: "Assets ready, review in Notion" ✋ GATE 3: Asset review

FINAL ASSEMBLY NOTIFICATION
├── All assets compiled in designated folder (Google Drive / Dropbox)
├── Notion card updated (status: READY TO UPLOAD)
└── → Telegram: "Video [TITLE] ready for upload. Checklist attached."

UPLOAD = MANUAL (You upload directly to YouTube Studio)
```

### 5.2 — Approval Gate Design

Each gate sends a Telegram message with inline buttons:

**Gate 1 (Content sourcing):**

```
📊 TODAY'S TOP REPURPOSE TARGETS

1. [Title] — 847K views on 45K sub channel
   Angle: "Reframe as a warning story"
   [✅ QUEUE IT] [⏭ SKIP] [🔁 MODIFY ANGLE]

2. [Title] — 312K views on 89K sub channel
   Angle: "Same data, better visualization hook"
   [✅ QUEUE IT] [⏭ SKIP] [🔁 MODIFY ANGLE]
```

**Gate 2 (Script review):**

```
📝 SCRIPT READY: "[VIDEO TITLE]"
Est. runtime: 7:42
Format: Storytelling / Case Study

[View in Notion] [▶️ APPROVE & GENERATE ASSETS] [✏️ REVISION NEEDED]
```

**Gate 3 (Asset review):**

```
🎬 ASSETS READY: "[VIDEO TITLE]"
✓ Voiceover: 7:38
✓ 14 video clips generated
✓ 5 thumbnail options
✓ Metadata package complete

[View in Drive] [✅ MARK READY TO UPLOAD] [⚠️ FLAG FOR EDIT]
```

### 5.3 — Tools & APIs Required for Full Automation

|Integration        |Method                                                               |
|-------------------|---------------------------------------------------------------------|
|YouTube Data API v3|REST API key (Google Cloud Console)                                  |
|Claude API         |Anthropic API key (separate from Claude.ai — budget ~$20–30/mo usage)|
|ElevenLabs API     |API key from dashboard                                               |
|Kling API          |Available on Pro plan                                                |
|Notion API         |Internal integration token                                           |
|Telegram Bot       |BotFather → bot token                                                |
|Google Drive API   |OAuth2 credentials                                                   |


> 💡 Note: Your Claude Max subscription is for claude.ai (manual use). The n8n automation uses the **Anthropic API** separately, billed by token usage. Budget ~$20–40/month for pipeline usage on top of your Max subscription.

-----

## PHASE 6 — MONETIZATION LAYER

### ⏱ Week 10–12

**Goal:** Layer in revenue streams so you’re not solely dependent on AdSense eligibility timelines.

### 6.1 — Monetization Sequence

```
TIER 1 (Month 1–3): Pre-monetization setup
├── Affiliate links in every description from Day 1
├── Tool stack affiliates (many tools pay 20–30% recurring)
└── Relevant Amazon associates / niche product links

TIER 2 (Month 2–4): YouTube Partner Program
├── Requirement: 1,000 subscribers + 4,000 watch hours (or 10M Shorts views)
└── AdSense activated → RPM income begins

TIER 3 (Month 3–6): Digital product
├── Claude builds a $19–$49 product (prompt pack, niche guide, cheat sheet)
├── Lovable or Carrd builds the landing page
└── Gumroad or Lemon Squeezy handles fulfillment

TIER 4 (Month 4+): Sponsorships
├── Use Passionfroot, Sponsr.is, or direct outreach
└── Target: 1–2 sponsors/month at $500–2,000/video by 50K subs

TIER 5 (Month 6+): Channel licensing / white label
└── Sell the proven channel playbook/template to other operators
```

### 6.2 — Affiliate Stack for Tool Niches

If your niche touches AI, productivity, finance, or software, you have immediate affiliate upside:

|Tool             |Affiliate Commission         |
|-----------------|-----------------------------|
|ElevenLabs       |22% recurring                |
|n8n              |Available via partner program|
|CapCut           |Periodic campaigns           |
|TubeBuddy        |30% recurring                |
|Jasper / Copy.ai |30% recurring                |
|SurferSEO        |25% recurring                |
|Amazon Associates|1–10% per sale               |

-----

## PHASE 7 — SCALE PROTOCOL

### ⏱ Week 12+

**Goal:** Once pilot channel hits consistent $3K+/month, clone the system for channels 2 and 3.

### 7.1 — Scale Triggers (Do NOT scale before these are met)

- [ ] 30+ videos published
- [ ] Clear top-performing format identified (min. 3 videos over 50K views)
- [ ] n8n pipeline fully operational (< 45 min active time per video)
- [ ] At least 2 monetization streams active
- [ ] Monthly revenue > $2,500 consistently for 6 weeks

### 7.2 — Channel Cloning Protocol

For each new channel:

1. Duplicate the Claude Project with a new channel identity prompt
1. Run Phase 1 niche research fresh (new niche OR adjacent niche to pilot)
1. Clone the n8n workflow (duplicate + update API keys/channel targets)
1. New ElevenLabs voice (never reuse a voice across channels)
1. New visual identity (thumbnail color system, font system)
1. Separate YouTube channel with no cross-promotion initially

### 7.3 — 3-Channel Revenue Model (Month 12+ projection)

|Channel  |Niche           |Monthly Views|Est. RPM|AdSense|Affiliates|Products |Total      |
|---------|----------------|-------------|--------|-------|----------|---------|-----------|
|Pilot    |Finance/AI      |400K         |$14     |$5,600 |$800      |$1,200   |**$7,600** |
|Channel 2|Health/Longevity|250K         |$10     |$2,500 |$600      |$800     |**$3,900** |
|Channel 3|Business Cases  |200K         |$16     |$3,200 |$400      |$600     |**$4,200** |
|         |                |             |        |       |          |**TOTAL**|**$15,700**|


> ⚠️ These are illustrative projections based on industry benchmarks, not guarantees. Actual results depend on niche selection, content quality, and consistency.

-----

## 📋 MASTER CHECKLIST — PHASE BY PHASE

### Phase 0 ✅

- [ ] ElevenLabs account created
- [ ] Kling AI account + test generation
- [ ] n8n set up (cloud or self-hosted)
- [ ] CapCut installed (desktop + mobile)
- [ ] Nano Banana / Ideogram account
- [ ] TubeBuddy installed
- [ ] YouTube channel shell created
- [ ] Claude Project created with persistent system prompt
- [ ] Notion workspace set up

### Phase 1 ✅

- [ ] Claude niche scoring session completed
- [ ] Top 3 niches ranked with full scorecard
- [ ] Pilot niche selected
- [ ] Audience statement written
- [ ] Content angle defined

### Phase 2 ✅

- [ ] YouTube Data API v3 key obtained
- [ ] n8n content sourcing workflow built
- [ ] Telegram bot created and connected to n8n
- [ ] Weekly manual research session template saved in Claude Project
- [ ] First 10 repurpose targets identified

### Phase 3 ✅

- [ ] Channel name selected
- [ ] Voice locked in (ElevenLabs)
- [ ] Thumbnail template system established
- [ ] First 5 video topics selected (from Phase 2 sources)
- [ ] Channel branding created (banner, logo, About section)

### Phase 4 ✅

- [ ] Master Script Framework saved in Claude Project
- [ ] First 5 scripts written and approved
- [ ] First 5 voiceovers generated
- [ ] First 5 videos assembled and exported
- [ ] First 5 metadata packages generated

### Phase 5 ✅

- [ ] All API keys obtained and stored in n8n credentials
- [ ] Full master workflow operational
- [ ] All 3 approval gates tested
- [ ] Google Drive asset folder structure created
- [ ] Notion content calendar live

### Phase 6 ✅

- [ ] Affiliate links added to all published videos
- [ ] YPP application submitted (at 1K subs / 4K hours)
- [ ] First digital product created
- [ ] Landing page live
- [ ] First sponsorship outreach sent

### Phase 7 ✅

- [ ] All scale triggers met
- [ ] Niche 2 research completed
- [ ] Channel 2 identity created
- [ ] n8n workflow cloned for Channel 2
- [ ] Channel 2 first 5 videos in production

-----

## 🔑 CRITICAL SUCCESS RULES

1. **Do not skip Phase 2.** Channels that skip content intelligence publish into the void. Sourcing proven content signals is the primary competitive advantage of this system.
1. **Lock the voice before video 1.** The algorithm rewards voice consistency. Changing voices after 20 videos means starting over sonically.
1. **Publish 5 before you optimize anything.** Data doesn’t exist on a 1-video sample. Resist the urge to tweak after video 1.
1. **Approve every gate, every time.** The automation is built to handle 95% of the work. The approval gates are where your editorial judgment protects channel quality.
1. **The Claude Project is a living document.** After every 10 videos, run a “What worked?” session in Claude and update the Master Script Framework with what you’ve learned.
1. **Never cross-contaminate channels.** Different voice, different brand, different n8n workflow instance, different Claude Project. Each channel is an isolated business unit.

-----

*Built for SparkForge / BlissDirective — Pilot Channel Launch System v1.0*