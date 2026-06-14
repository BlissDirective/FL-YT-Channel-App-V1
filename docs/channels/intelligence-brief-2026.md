# Concept Intelligence Brief — 4 Candidates (2026)

Live competitor teardowns + demand signals + scored idea cards for the four
candidate concepts, gathered the way the studio's **Scout** + **Run
intelligence** would surface them — then a ready-to-paste wizard config per
concept so each can be stood up in four clicks.

> **Why this is a hand-research brief, not an in-app run.** The studio's
> `run_intelligence_now` lives behind the deployed `/api/mcp` (bearer
> `STUDIO_MCP_TOKEN`), and the studio-mcp has no `create_project` tool — projects
> are created in the web wizard. In this environment the MCP endpoint returns
> `401` and the app's own Supabase DB isn't reachable, so the four projects can't
> be materialized from here. This brief delivers the *data* that run would
> produce; the configs below let you create the projects in the wizard, after
> which `run_intelligence_now` (with a token) can refresh these cards live.

*Subscriber/view figures are public snapshots gathered June 2026 — directional,
not exact; the live YouTube Data API run will supersede them.*

---

## 1. Investing in the AI Economy

**Competitor landscape (the wedge is real).** The space splits into two camps that
*don't* overlap with this concept:
- **AI-tool channels** — Matt Wolfe / *Future Tools* (~800K), *The AI Grid*
  (~374K), *Two Minute Papers* (~1.6M), Yannic Kilcher (~300K). These cover
  *tools and research*, not investing.
- **Generic stock/finance channels** — enormous but saturated and not
  AI-specialized.
- **The thin middle = your lane.** Cole Medin (~174K) is the closest — "AI in
  finance/trading/economic modeling" — and Nate Herk (ex-Goldman, ~600K in under
  two years) proves how fast an *AI-×-money* crossover compounds. Nobody clean
  owns *"understand the AI economy well enough to invest with conviction."*

**Demand read:** ★★★★★ — two of the highest-CPM ad categories stacked (finance +
AI), and the timeliest story on the platform (Nvidia/Rubin, hyperscaler capex).
**Competition:** moderate *in this exact wedge* (high in finance generally).
**Verdict:** the wedge thesis from the concept review holds up against live data.

**Scored idea cards**
| Score | Idea | Hook | Source lane |
|---|---|---|---|
| 92 | "How to actually value an AI company" | the framework hype videos skip | charts + press-kit logos |
| 88 | "Reading Nvidia's earnings like an investor, not a fan" | what the numbers really say | screen-rec + data-viz |
| 84 | "The capex supercycle, explained for your portfolio" | who profits when everyone's spending | animated explainer |
| 80 | "Every AI bubble call, scored against history" | 2000 vs 2026 — is it different? | archival + charts |

---

## 2. The Past, Present & Future of Space Exploration

**Competitor landscape (proven, crowded at the top, open in the middle).**
- *Real Engineering* (Brian McManus) — **5.02M subs / 689M views** (engineering,
  incl. aerospace).
- Astrum — ~2.6M (cinematic astronomy explainers).
- *SPACE (Official)* — ~3.6M. Kurzgesagt — ~21M (space-adjacent).
- *Event Horizon* (John Michael Godier) — ~325K; his personal channel ~481K
  (futurist/space narrative). *Primal Space* — obscure-space-questions niche.

**Demand read:** ★★★★ — perennial, deeply evergreen, repeatedly viral. **Source
fit:** ★★★★★ — NASA/ESA/gov public-domain footage, free and already in the
Source Library; lowest cost-per-video of the four. **Competition:** strong
incumbents, but the *"travel space **and** time — rank the past, explain the
present, seriously imagine the future"* spine is a differentiated wrapper.

**Scored idea cards**
| Score | Idea | Hook | Source lane |
|---|---|---|---|
| 90 | "Ranking every mission that changed spaceflight" | from Sputnik to Starship, tiered | NASA/Archive (public domain) |
| 87 | "What a crewed Mars transit actually does to a body" | the part the movies skip | NASA + animation |
| 83 | "Dyson swarm: the real engineering bill" | could we, and what would it cost? | animation + gov imagery |
| 78 | "The probes still talking to us from interstellar space" | Voyager's last whispers | NASA public domain |

---

## 3. Analyzing Movie Tech

**Competitor landscape (a vacated lane).** The defining channel was *Because
Science* (Kyle Hill, under Nerdist ~2.7M) — literally "the science of [movie/comic]
tech." **Hill left and the franchise wound down**, leaving the *movie-tech
feasibility* format unusually open. Adjacent but not direct: Isaac Arthur / *SFIA*
(~828K, futurism within known science — concepts, not films) and John Michael
Godier (futurist). No one is systematically doing *"fictional tech → real science
→ feasibility & timeline → risks"* per film right now.

**Demand read:** ★★★★ — evergreen back-catalog (*Avatar* neural link, *Iron Man*
JARVIS, *Minority Report*, *Dune*) **plus** a release-driven spike for every new
sci-fi/fantasy film. **Source fit:** ⚠️ the film itself is off-limits — carry it
with AI concept art, real-science b-roll, diagrams, and press-kit stills per
[gaming-source-lanes.md](../gaming-source-lanes.md); the film is *referenced*,
never re-uploaded. **Verdict:** most *ownable* concept here, RPM lifted by the
tech/AI payload.

**Scored idea cards**
| Score | Idea | Hook | Source lane |
|---|---|---|---|
| 89 | "Avatar's neural link: how close are we, really?" | BCIs vs. driving a body | AI concept art + BCI b-roll |
| 86 | "Building JARVIS: which parts already exist" | the AI assistant, audited | screen-rec + diagrams |
| 82 | "Minority Report's gesture UI — we have it now" | what they got right in 2002 | stock tech + commentary |
| 79 | "Ranking sci-fi tech by how soon it's real" | a feasibility tier list | AI renders + diagrams |

---

## 4. Science & Tech: The Dark Side

**Competitor landscape (proven appetite, strong narrators).** "Dark science" is a
hot, validated lane: Kyle Hill (post–Because Science) effectively owns *dark
science disasters* (nuclear/radioactive horror storytelling); Joe Scott / *Answers
With Joe* runs weird-and-unsettling science; Vsauce (existential curiosity);
NileRed and *The Backyard Scientist* (dangerous experiments); and evergreen
compilation hits like "20 Most Disturbing Human Experiments" pull big views.

**Demand read:** ★★★★ — dread + curiosity is elite CTR/retention fuel.
**Caution (★★):** "moderate horror / shocking" framing risks **advertiser-friendly
limited-ads (yellow icon)** *and* the July-2025 inauthentic-content lens on
sensational AI content — each video must be carried by **real science substance**.
**Competition:** strong incumbents; differentiate on *systematic* "taken
seriously" treatment, not gore. *Toning the brand toward "mind-blowing science"
rather than "horror" materially de-risks RPM — worth A/B testing with Scout.*

**Scored idea cards**
| Score | Idea | Hook | Source lane |
|---|---|---|---|
| 88 | "The experiment they were never allowed to repeat" | real study, real reason | archival + stock |
| 85 | "The theory that breaks your intuition about reality" | physics that shouldn't be true | animation |
| 81 | "The technology nobody's ready for" | dual-use science, soberly | stock + AI visuals |
| 76 | "The materials too dangerous to keep making" | chemistry's forbidden shelf | stock + diagrams |

---

## Ready-to-paste wizard configs

Each maps 1:1 to the new-project wizard / `update_project` fields. Tones and
thumbnail styles are exact wizard options.

| Field | 1 · AI Economy | 2 · Space | 3 · Movie Tech | 4 · Dark Science |
|---|---|---|---|---|
| **name** | AI Economy Investor | Cosmos & Time | Reel Tech | The Dark Lab |
| **niche** | AI-economy investing (education) | Space exploration — past/present/future | Sci-fi movie tech — feasibility | The unsettling edge of science & tech |
| **audience** | Curious retail investors stuck between hype and jargon | Awe-seekers & armchair futurists | Sci-fi fans asking "could we build that?" | Curiosity-seekers drawn by unease, kept by science |
| **angle** | Framework-first AI-economy education — no tickers, no jargon wall | Travel space *and* time: rank the past, explain the present, imagine the future | Fictional tech as a serious feasibility question | The unsettling frontier, taken seriously — never fabricated |
| **tone** | `authoritative` | `aspirational` | `curious` | `alarming` |
| **thumbnail_style** | `bold-text` | `cinematic` | `conceptual` | `dramatic` |
| **brand_primary / secondary** | `#5BB98C` / `#0F1F18` | `#A78BFA` / `#1A1726` | `#F5B829` / `#17150F` | `#F0876C` / `#2A1A14` |
| **rpm_usd** | `20` | `6` | `9` | `7` |
| **key guardrail** | YMYL — educate, never advise (lean on QC policy check) | none — public-domain sources | press-kit/AI art only; film referenced, never re-uploaded | shocking, not graphic — substance every video |

---

## To run this for real, in-app

1. Create the four in the **wizard** using the configs above (set each project's
   **niche RPM** to the value shown).
2. Set `STUDIO_MCP_TOKEN` on the deployment and in your MCP client so
   `/api/mcp` authorizes; then call **`run_intelligence_now`** per project to
   refresh these idea cards from the live YouTube Data API + Claude.
3. Use **Scout** for the per-concept teardown ("tear down the top channels in
   [niche]; what proven topics am I missing?") to pressure-test the wedge before
   scaling.

*Hand-gathered live snapshot — supersede with an authenticated in-app intelligence
run once the projects exist.*
