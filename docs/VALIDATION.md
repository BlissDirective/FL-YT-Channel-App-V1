# VALIDATION — Your first hour with the studio

A guided, click-by-click walkthrough to validate every flow, then create your
first real channel. Written for a non-developer. No terminal required (one
optional MCP step at the end). Budget ~1 hour.

> The app already works on **mock data** with no keys. Add provider keys
> (`docs/setup.md`) whenever you want real AI output — flows below note which
> step needs which key.

---

## 0. Sign in
1. Open the production URL.
2. Sign in with your email + password (the single operator account).
3. You land on **Overview**. If it's empty, click **Seed demo project**.

✅ You should see the warm control-panel dashboard with project cards, a
portfolio stat row (Projects / In pipeline / Published / Total views / Est.
revenue), an Activity feed, and a Monthly spend meter.

---

## 1. Overview & a project (Flows 1 + 3)
*(UI v2 — see Fable-5-UI-Redesign.md: the project home is the Library; gate
decisions live on Library tiles and the Asset Canvas checkpoint.)*
1. Click the **Money Mindset (Demo)** card → the project **Library**.
2. Note the stage sections (Ideas → Script → Production → Ready → Published),
   the signal strip, and **Scout** (collapsible section).
3. Click **Run demo pipeline** (empty-state) → a new idea tile appears in
   **Ideas** with quick actions.

✅ Walk the demo video through the four checkpoints (tile quick-approve, or
open the tile → Asset Canvas → checkpoint panel):
- **Idea** → Approve.
- **Script** → on the Canvas: play the voiceover, edit a line, Approve.
- **Assets** → review clips + thumbnails at the checkpoint, reroll one, Approve.
- **Final cut** → watch the rendered video, Approve.

Try **Request changes** on one gate and watch it loop back with your note.

---

## 2. Autonomy & QC (the trust dial)
1. On a project, open **Settings** → set a gate (e.g. Assets) to **Co-pilot**.
2. Run another demo pipeline. The **QC agent** scores each gate; in Co-pilot,
   high-confidence gates auto-approve.
3. Global **Settings → QC agent agreement** shows how often QC matched you —
   your signal for when to raise a gate to Autopilot.

---

## 3. Publish Kit & live stats (Flows 4 + 5)  🔑 YouTube key for real stats
1. Open a **Tracking** video (demo: "How Compound Interest Actually Works").
2. The **Publish Kit** shows: MP4 + thumbnail downloads, one-tap copy for
   title/description/tags, the upload checklist (incl. AI-content disclosure),
   and live stats with a views sparkline + estimated revenue.
3. For a real video: after uploading to YouTube, paste the URL into
   **Mark as uploaded** → it starts tracking that video's public stats.
4. Back on **Overview**, use **Export CSV** to download all tracked stats.

---

## 4. Intelligence, Scout & Optimizer (Phase 8)  🔑 Anthropic + YouTube keys
1. On a project, click **Run intelligence** → scored idea cards land in the
   Library’s Ideas section with source stats and a suggested angle.
2. Open **Scout** on the project page → ask "tear down the top channels in my
   niche". Save a good finding as an idea card.
3. Go to **/insights** → **Generate insights**. Review an Optimizer card;
   **Apply suggestion** writes a new (revertible) version of your prompt
   template.

---

## 5. Safety rails
- **Settings → Pipeline control → Kill switch**: flip it on, try to run a
  pipeline — it pauses with a visible reason. Flip off, Resume.
- **Budgets**: each project's per-video + monthly caps (project Settings) pause
  the pipeline before any overspend. Every paid call shows in the **cost
  ledger** (Settings) and the dashboard spend meter.
- **Credentials health** (Settings): green = connected. Click **Test** to
  live-ping a connected provider.

---

## 6. Go live (handoff checklist)
1. **Settings → Danger zone → Purge demo data** (removes all demo projects).
2. **New Project** → your real niche, audience, brand kit, voice, budgets.
3. Set every autonomy gate to **Assist** (you approve everything) until you
   trust the QC agreement rate.
4. Confirm per-video and monthly **budget caps**.
5. Confirm the four scheduled jobs are armed (GitHub → Actions): Render Farm,
   Stats Refresh, Daily Intelligence, Weekly Optimizer.

---

## 7. (Optional) Operate it from Claude
Wire the **studio-mcp** server into Claude (see `docs/RUNBOOK.md` §5) and ask
"what's pending review across my projects?" — Claude can read stats and drive
approvals for you.

---

## 8. Credential rotation
Rotate any secret by updating its **GitHub repository secret**, then running
the **Sync Vercel Env** workflow (it pushes to Vercel and redeploys). Rotate:
`STUDIO_MCP_TOKEN`, `CRON_SECRET`, and any provider key on your normal cadence.
Never paste a live token into a public file or chat.

You're done — the studio is yours. See `docs/BACKLOG.md` for what's next (v2).
