# AI Influencer Playbook: What to Take, What to Skip

Review of "How to get rich in the attention economy (AI Influencers Full Course)" by @EXM7777 (X Article, sponsored by Higgsfield), mapped onto Faceless Studio and Hadrian Idris Moss. Prepared 2026-10-09.

## The short version

The article sells one business: **build one AI influencer, use it to make paid-social ads, and sell those ads to direct-to-consumer (DTC) brands on a monthly retainer of $1,500–10,000.** The demand is real. Ads wear out when the same audience sees them too often (Meta calls it creative fatigue), so brands constantly need new ones. An AI character that never books out can feed that need. The workflow is: research what is already winning, lock a character, copy winning formats with Higgsfield Genjutsu, make original ones with Seedance 2.5, pitch with spec ads, disclose everything, then scale.

**For us, about two thirds of it is already built.** The studio has a locked character (Hadrian), Seedance 2.5 through directed scripts, a reference-image pipeline, approval gates, cost tracking and QC. The most valuable new ideas are cheap: a **format vault** that stores *why* a video worked, a **script pace check**, **hook-first rendering**, and an **AI-disclosure checklist**. The parts to treat carefully are **scraping TikTok and Instagram** and **copying other creators' performances with Motion Transfer**. Both collide with the studio's existing policy ("no scrape/rip path, ever"; concept-level reuse only) and carry platform and IP risk. There are compliant versions of both.

## What the article says, section by section

| # | Section | Core claims |
|---|---|---|
| 1 | The business | Make ads with one AI influencer and sell them to brands. Ads fatigue, so brands keep buying. Offer: a monthly stream of creatives, one recognisable character, formats copied from what already wins, $1,500–10,000/month. "The brand buys a refill schedule, you sell them the refills." |
| 2 | Research | Pick one product niche. Scrape TikTok and Instagram (Apify trend, hashtag and reel scrapers; Scrape Creators feeds). Rank by plays and shares, then comments. Dedupe by link; Instagram play counts are unreliable. Save winners to a vault (Obsidian) with the link, the hook word for word, and a second-by-second beat map. |
| 3 | Capture vs persuasion | Split every research entry into a **capture record** (link, views, date: proof it won) and a **persuasion record** (hook, beats, product moment, *why* it worked). Only the persuasion record is reusable. |
| 4 | Build the character | Pinterest mood board for the niche's "look". Build the sheet in Nano Banana Pro: headshot first, then full body from it, a **closed wardrobe** (short fixed list of outfits), one **identity anchor** that appears in every shot, and phone-photo realism (grain, imperfect framing, real rooms). "A character sheet is a contract with your future self." |
| 5 | Higgsfield tools | AI Influencer: menu-driven builder (19 settings, up to 4K), outputs a portrait and full-body pair. Soul ID: train on 20+ photos to hold the face. Genjutsu (Motion tab): **Motion Transfer** puts your character into a reference video's movement; **Object Swap** replaces a product, outfit or prop; 4–30 s reference video plus up to 30 images; 30+ trend presets. |
| 6 | Original formats | Seedance 2.5: up to 30 s, 9:16 to 21:9, audio in the same pass, up to 50 references; start from a turnaround sheet on white. Rules: **3.5 spoken words per second**, one beat per generation then stitch, **render the hook first**, 1080p for anything client-facing. Caveat: a showcase doesn't prove repeatable consistency; test your character across a batch. |
| 7 | Spec ads and pitch | Make a few spec ads with a real DTC brand's product in a format already winning in their niche; pitch the monthly stream. Refresh cadence: every 2–4 weeks on Meta, weekly on TikTok. Second revenue line: sell ad spots on the influencer's own account. |
| 8 | Disclosure | TikTok: AI-generated label on realistic AI content; undisclosed AI ads get rejected; commercial-content toggle on branded posts. Meta: tag paid partnerships. FTC: disclose the brand connection in the post itself, and don't rely on the platform's tool alone. |
| 9 | Scale | Same character across platforms; more creatives per brand; more accounts per niche; more influencers, each with its own sheet and Soul ID. "One character pays for the setup, every character after that is margin." |

## How much to trust it

- **It is sponsored by Higgsfield.** The tool choices are partly paid placement. The workflow still holds up, but read "use Higgsfield for X" as one option.
- **Creative fatigue is real and well documented.** That is the honest engine of the business, and the refresh cadences quoted are in line with common practitioner advice.
- **The $1,500–10,000/month retainer is asserted, not evidenced.** No client examples, close rates or churn. Treat it as a target range for pricing conversations, not a forecast.
- **The disclosure section is the most important part and it is directionally right.** Rules change; check each platform's current policy before launch.
- **The author flags the consistency gap themselves.** That matches our own tests: Seedance holds Hadrian well in short clips, but details like the robotic eye drift and need prompt rules (see below).

## What we already have

| Article step | In the studio today |
|---|---|
| Character sheet, closed wardrobe, identity anchor | **Done.** Hadrian Idris Moss is locked in the Character Studio (AI Influencer project): two 12-view sheets (shirt open to mid-chest, shirtless), 24 views, a portrait look, and written identity anchors (Metatron's Cube tattoo, scar and robotic eye on his left, light-blue right eye, platinum hair). |
| Soul ID | **Training now** (v1 and v2) through the new Soul ID workflow; ids are saved on the character. |
| Seedance 2.5 original formats | **Done.** Directed scripts: per-section clips with a first frame, 9:16 output, native audio, stitching, render and QC. Tested three times on Hadrian this week. |
| One beat per generation, stitched | **Done.** That is exactly how directed sections work. |
| Cost control | **Done.** Per-video estimates, cost ledger, spend checks, nothing publishes without approval. |
| Research memory | **Partial.** `record_research`, lessons and the intelligence workers store findings, but not in the capture/persuasion split, and not as reusable format templates. |

## What to add, ranked by value for effort

### 1. Hadrian's production rules (no code, today)

Add to every Hadrian video prompt (already written into the AI Influencer project instructions):
- "The robotic eye does not glow or emit light" (it glowed in two of three test clips without this).
- "No piercings, no jewellery" (Seedance invented an eyebrow stud in the tight-crop test).
- First frames from the **shirt-open** set or head-to-upper-chest crops: Higgsfield's safety filter rejected a full bare-torso first frame.
- Wardrobe stays closed: navy shirt open to mid-chest, black tapered pants, belt, black dress shoes; shirtless only for formats that need it, framed above mid-chest. Add new outfits deliberately, one locked sheet at a time, as the article recommends.

### 2. Format vault with persuasion records (small build)

The single best idea in the article. A vault entry is a reusable, *concept-level* template, which is exactly what the studio's compliance model allows.

- **Data:** a `formats` table: niche, platform, source link and stats (capture record), and hook text, beat map (second-by-second), product moment, on-screen text, audio pattern, and *why it works* (persuasion record), plus tags and a "used by" list.
- **Tools:** extend `record_research` (or add `record_format`) so research saves into the vault; add `list_formats`; let `import_script` take `fromFormat` to pre-fill sections from a beat map with Hadrian as the cast.
- **Effect:** every winning format becomes a template for every future character, which is the article's "the vault keeps growing" compounding loop, without copying anyone's footage.

### 3. Script pace check (small build)

The directed parser has no words-per-second check. Add a warning in `estimate_directed`/`import_script` when a section's spoken lines exceed **3.5 words per second** of section length (and a hard error well above it, e.g. 4.5). This is the "robot reading terms of service" failure the article warns about, caught before any spend.

### 4. Hook-first rendering (small build)

Add a script flag (`hookFirst`) that produces section 1 only, puts it in front of you at a gate, and queues the rest after approval. If the hook is weak, you lose about $2–7 instead of a whole video. This fits the existing gate model.

### 5. Disclosure checklist on publish (small build, required before any posting)

A per-platform checklist the FINAL gate enforces for the AI Influencer project: AI-generated label on, commercial-content or paid-partnership toggle when branded, and a written disclosure line in the caption ("AI-generated character", plus "#ad / paid partnership with @brand" for brand work). Store the caption line in the project so it is never forgotten.

### 6. Multi-platform publishing (larger build)

Publishing today is YouTube only. The article's scale step needs TikTok (Content Posting API, with its AI-content label field) and Instagram Reels (Graph API, content publishing). Both need app review and per-account authorisation. This is a few days of work and should come after the first content proves out. Until then, export the 9:16 renders and post manually.

### 7. Genjutsu and Object Swap (operator-run for now)

Our research found no public API for Higgsfield AI Influencer, and Genjutsu's API availability is unconfirmed. Use it in the Higgsfield web app with Hadrian's Soul ID once trained. If Higgsfield exposes it in the API later, it slots in beside Seedance as another clip model.

**Use it compliantly:** Motion Transfer on *your own* reference videos (you or a hired performer acting out a beat map from the vault), Higgsfield's trend presets, or licensed footage. Not on scraped creator videos: copying a specific creator's performance frame for frame is the footage-level reuse our policy rules out. It also invites takedowns and platform penalties exactly when you need the account to stay healthy. Object Swap on a brand's product is fine with the brand's permission, which spec-ad outreach is asking for anyway.

### 8. Research inputs (decide before building)

The article scrapes TikTok and Instagram with Apify and Scrape Creators. The studio's policy currently forbids scraping. Compliant options, in order of preference:
- **Official sources:** TikTok Creative Center (trending hashtags, songs, top ads), TikTok Research API (eligibility limits), Instagram Graph API hashtag search for your own business account, YouTube Data API for Shorts (already integrated).
- **Manual capture:** you or a bot paste links and transcripts into the vault (the persuasion record is the valuable part, and it is written by us anyway).
- **Third-party scrapers:** only as an explicit operator decision that changes the policy, with the article's own warnings (duplicates, unreliable Instagram counts).

## The business, in our numbers

Measured costs from this week's tests: Seedance 2.5 is about **$0.46 per generated second** (5 s clip $2.31; 30 s $13.87) and character stills are $0.15 each.

| Monthly package | Ads | Production cost (est.) | At $1,500/month | At $5,000/month |
|---|---|---|---|---|
| Starter | 8 × 15 s | about $60–90 (incl. re-rolls, stills, voice) | ~95% gross margin | — |
| Growth | 20 × 15 s | about $150–220 | — | ~96% gross margin |
| Volume | 40 × 15–30 s | about $400–650 | — | ~87–92% gross margin |

The generation cost is small next to the retainer; the real costs are **your time** (research, scripting, review, client communication), re-rolls when consistency slips, and platform/ad-account risk. The studio's automation is what makes the time cost manageable: scripts from vault templates, batch production, QC, and approval gates.

**The two revenue lines in order:**
1. **Hadrian's own accounts first.** Build an audience on TikTok, Reels and Shorts with original formats. This de-risks the character (does the audience accept him?) and creates the "ad spots on the influencer's own account" line.
2. **Spec ads and retainers second.** Spec ads are unsolicited work with a real brand's product, so never publish them; send them privately as part of the pitch. They need no production changes beyond product references (an Object Swap step or a product reference image in the directed script).

## Suggested roadmap

| Phase | What | Cost | Effort |
|---|---|---|---|
| 0, now | Hadrian prompt rules, closed wardrobe, disclosure caption line (done in project instructions); Soul ID training (running) | ~$3 | none |
| 1, next | Format vault + pace check + hook-first flag | none (code) | 1–2 days |
| 2 | First 10 Hadrian originals for his own TikTok, Reels and Shorts, posted manually with labels | ~$100–150 | a week of production |
| 3 | Genjutsu tests in the web app with his Soul ID (own reference performances and presets) | ~$20–40 | an afternoon |
| 4 | Spec ads for 2–3 DTC brands in one niche, sent privately | ~$50–100 | a few days |
| 5 | Multi-platform publishing (TikTok, Instagram) with enforced disclosure | none (code) | several days + platform app review |

## Decisions for you

1. **Research inputs:** keep the no-scraping policy and use official sources plus manual capture (recommended), or explicitly allow a third-party scraper?
2. **Order:** Hadrian's own channels first (recommended), or straight to spec ads for brands?
3. **Niche:** which product niche should the vault and first spec ads focus on?
4. **Builds:** should I start Phase 1 (format vault, pace check, hook-first)? It would go up as one PR for you to review.

*Source: X Article by @EXM7777, "How to get rich in the attention economy (AI Influencers Full Course)", retrieved 2026-10-09 via a public mirror (the original page requires an X login). Cost figures are from this project's own ledger; platform rules are as stated in the article and should be re-checked against each platform's current policy before launch.*
