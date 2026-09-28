# Channel Bot Team

There is one Grok bot per channel: **Earthlines**, **INKLIGHT** and **Thimble Town**. Tomorrowscape is on hold and has no bot. Each bot drives the Faceless Studio app through the studio's MCP server. It produces **one video at a time**, watches the result, researches what is going viral in its niche, logs lessons, and makes the next video better. Every video stops at **Final review**, and the operator publishes.

The director (Claude) reviews every bot **daily**. It adopts or retires their lessons, pushes guidance into their playbooks, and sends the operator a digest.

## How it fits together

```
Grok (SuperGrok Heavy)                       Faceless Studio (Vercel)
┌──────────────────────┐   custom MCP        ┌──────────────────────────────────┐
│ Earthlines bot       │── connector ───────▶│ /api/mcp  (bot token → rails)     │
│ INKLIGHT bot         │   Bearer fsbot_…    │  • own channel only               │
│ Thimble Town bot     │                     │  • $600/mo Higgsfield cap         │
└──────────────────────┘                     │  • one video in flight            │
          ▲                                  │  • lesson + research before next  │
          │ get_bot_brief (rules, playbook,  │  • no publish / approvals / voices│
          │ lessons, director notes, budget) └──────────────────────────────────┘
          │                                              ▲
Claude (director) ── control token ── sync_bot_playbook, review_lessons,
                                      bot_digest, create/update_bot_agent
```

- **Server-side rails** (`src/lib/bots/agents.ts`, `enforceBot`): these are enforced by code, not by the prompt. A bot cannot:
  - publish
  - approve gates
  - save voices
  - touch another channel
  - start production that doesn't fit its remaining monthly budget
  - import a new video while another is in flight
  - import a new video before logging a lesson and a research note on its last one
- **Living guidance** is stored in the `bot_playbooks` table and served by `get_bot_brief`. The source files are:

| File | Scope |
|---|---|
| [`operating-rules.md`](operating-rules.md) | Shared, strict |
| [`../production/lessons-learned.md`](../production/lessons-learned.md) | Shared, every lesson so far |
| [`channels/<channel>/playbook.md`](channels) | Channel bible, look, cast, formats, script recipe, QC gate, spend policy, idea queue, research focus |
| `director-notes` | Per channel, written by the director after each review |

- **Continuous learning** has two parts:
  - `bot_lessons`: a bot proposes a lesson and the director adopts it, at which point it becomes a rule in the bot's brief.
  - `bot_research`: sourced viral research, each note tied to the video it follows.
- **Budget and resolution:** 720p costs $0.4622/s and 480p costs $0.2056/s, the same for Seedance 2.5 and Cinema Studio 4.0. Each bot has $600/month, enforced on the month's Higgsfield ledger.

## Setup (operator)

1. **Deploy.** Migrations 0084 and 0085 run automatically, and the app ships the bot tools.
2. **The director creates the bots** with `create_bot_agent`, one per channel. Each token is shown **once**. The director loads the playbooks with `sync_bot_playbook`.
3. **In Grok** (grok.com → Connectors → New Connector → Custom), add one connector **per bot**:
   - Name: `faceless-studio-<channel>`
   - URL: `https://faceless-studio-app.vercel.app/api/mcp`
   - HTTP header: `Authorization: Bearer <that bot's fsbot_… token>`
   - Leave OAuth empty.
4. **Create one Grok project per bot.** Enable only that bot's connector, and paste its prompt from [`prompts/`](prompts) as the project instructions.
5. **Schedule a Grok Task per bot** that runs its project about every 2 hours with the message "Run your production loop." Each run moves its video forward by one step.
6. **Pause or stop a bot at any time.** Tell the director, who calls `update_bot_agent` with `active=false`, or rotate its token.

## Director review (daily)

`bot_digest` returns, per bot: spend against its cap, videos since the last review, lessons awaiting review, and research and action counts.

For each bot the director:
1. QCs every finished video with `get_qc_pack`.
2. Adopts or retires lessons with a note (`review_lessons`).
3. Writes `director-notes` (`sync_bot_playbook`).
4. Promotes cross-channel lessons into `lessons-learned.md` and re-syncs it.
5. Sends the operator a digest.
