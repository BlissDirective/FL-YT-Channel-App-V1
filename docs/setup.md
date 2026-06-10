# 🔑 SETUP GUIDE — Accounts & Credentials

> **Your part of the build.** Create these accounts, collect the listed credential for
> each, and hand them over (see §10 for how). Everything else — coding, wiring,
> deployment — happens autonomously. Items are ordered by when the build needs them;
> doing them all in one sitting (~45–60 min) is easiest.

> 💡 Use one dedicated email (e.g. a `studio@` or your gmail) for all accounts so
> billing and password resets live in one inbox.

---

## QUICK CHECKLIST

| # | Service | Plan to pick | Credential to collect | Needed by | Est. cost |
|---|---------|--------------|----------------------|-----------|-----------|
| 1 | Vercel | Hobby (free) | Team/account connected to GitHub repo | Phase 0 | $0 (→ Pro $20/mo only if needed) |
| 2 | Supabase | Free | Project URL, `anon` key, `service_role` key, DB password | Phase 0 | $0 (→ Pro $25/mo at scale) |
| 3 | Trigger.dev | Free | Project ref + Secret API key | Phase 0 | $0 (→ ~$10/mo at volume) |
| 4 | Anthropic API | Pay-as-you-go | API key | Phase 4 | ~$5–15/mo |
| 5 | ElevenLabs | Starter $5/mo | API key | Phase 4 | $5–22/mo |
| 6 | fal.ai | Pay-as-you-go | API key | Phase 5 | ~$5–12 per video produced |
| 7 | Pexels | Free | API key | Phase 5 | $0 |
| 8 | Google Cloud (YouTube Data API) | Free tier | API key | Phase 7 | $0 |
| 9 | Sentry *(optional)* | Free | DSN | Phase 9 | $0 |

Total fixed cost to start: **~$5/month** (ElevenLabs). Everything else is free tier or
pay-per-use, with spending caps enforced in the app.

---

## 1. VERCEL — app hosting

1. Go to **vercel.com** → Sign up → **Continue with GitHub** (use the GitHub account that
   owns `BlissDirective/FL-YT-Channel-App-V1`).
2. When prompted, install the Vercel GitHub app and grant it access to this repository.
3. Plan: **Hobby (free)** is fine to start.
4. ✅ **Hand over:** nothing secret — just confirm the GitHub connection is done. (Import
   of the project and all environment variables will be configured during Phase 0.)

## 2. SUPABASE — database, auth & file storage

1. Go to **supabase.com** → Sign up with GitHub → **New project**.
2. Name: `faceless-studio` · Region: closest to you (US East if unsure) · Generate a
   strong **database password** and save it.
3. Plan: **Free** to start (500MB DB / 1GB storage — fine through validation; we'll
   bump to Pro $25/mo when video storage demands it).
4. After the project finishes provisioning: **Project Settings → API**.
5. ✅ **Hand over:**
   - Project URL (`https://xxxx.supabase.co`)
   - `anon` public key
   - `service_role` key ⚠️ treat like a password
   - Database password

## 3. TRIGGER.DEV — pipeline orchestration

1. Go to **trigger.dev** → Sign up with GitHub → create org `faceless-studio` →
   create a project (v4), name `studio-pipelines`.
2. Plan: **Free** (enough concurrent runs for one operator; upgrade later if renders queue).
3. Find: **Project → API Keys**.
4. ✅ **Hand over:** the **Secret key** (`tr_…`) and the **Project ref** (`proj_…`).

## 4. ANTHROPIC API — the AI brain (scripts, scoring, agents)

> Note: this is separate from your Claude Max subscription. Max covers claude.ai chat;
> the app calls the API, billed per token.

1. Go to **console.anthropic.com** → sign up / log in.
2. **Billing** → add a payment method → buy initial credits (**$25** is plenty to start).
   Recommended: set a **monthly spend limit** of $25–50 in Billing → Limits.
3. **API Keys → Create key**, name it `faceless-studio`.
4. ✅ **Hand over:** the API key (`sk-ant-…`).

## 5. ELEVENLABS — voiceovers

1. Go to **elevenlabs.io** → Sign up.
2. Plan: **Starter ($5/mo)** — 30k credits ≈ ~30 min of audio, enough for validation.
   (Creator $22/mo when producing 8+ videos/month; you can also clone a custom voice
   on Creator later — the app's voice picker will show whatever your account has.)
3. Click your profile (bottom-left) → **API Keys** → create key.
4. ✅ **Hand over:** the API key.
5. *(Optional, fun)* Browse the **Voice Library** and "add" 3–5 voices you like to your
   account — they'll appear in the app's voice picker with previews.

## 6. FAL.AI — AI video clips & thumbnails (Kling, Veo, Ideogram, etc.)

1. Go to **fal.ai** → Sign up with GitHub or Google.
2. Add a payment method (pay-per-use; no subscription). Set a **budget/limit** in
   billing settings if offered — $30/mo is a sensible starting cap (the app enforces
   its own caps too).
3. **Dashboard → Keys** → create an API key named `faceless-studio`.
4. ✅ **Hand over:** the API key (`key_id:key_secret` format).

## 7. PEXELS — free licensed stock footage

1. Go to **pexels.com/api** → Sign up → request an API key (instant, free).
2. Fill the short form: purpose = "video production app, stock b-roll for YouTube
   videos" — auto-approved.
3. ✅ **Hand over:** the API key.

## 8. GOOGLE CLOUD — YouTube Data API key (trend research + live video stats)

> API-key only — **no OAuth, no audit, no scary verification screens.** This key can
> only read public YouTube data (search results, public view counts). Uploading stays
> manual by design.

1. Go to **console.cloud.google.com** → sign in with the Google account you prefer
   (does NOT need to be the YouTube channel's account).
2. Top bar → **New Project** → name `faceless-studio` → Create (and select it).
3. **APIs & Services → Library** → search **"YouTube Data API v3"** → **Enable**.
4. **APIs & Services → Credentials → + Create credentials → API key.**
5. Recommended: click the key → **API restrictions** → restrict to *YouTube Data API v3*.
6. ✅ **Hand over:** the API key (`AIza…`).

## 9. SENTRY — error monitoring *(optional but recommended, Phase 9)*

1. Go to **sentry.io** → sign up (free Developer plan) → create a Next.js project.
2. ✅ **Hand over:** the **DSN** (Settings → Client Keys).

---

## 10. HOW TO HAND OVER CREDENTIALS

**Never paste keys into the GitHub repo, issues, or PR comments.** Good options, best first:

1. **Best — enter them yourself in the dashboards (5 min):** During Phase 0 I'll set up
   the projects and tell you exactly which Settings → Environment Variables screens to
   paste each key into (Vercel + Trigger.dev + Supabase). You paste; I never see them;
   rotation is trivial.
2. **Fine — paste into our Claude session chat** when I ask at the start of the phase
   that needs them; I write them straight into the env vaults and they're never
   committed anywhere.

Either way, the app gets a **Credentials Health panel** (`/settings`) showing each
service as 🟢 connected / 🔴 missing, with a Test button — so you can always see what's
wired without reading code.

### Environment variable names (for option 1 self-entry)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Orchestration
TRIGGER_SECRET_KEY=

# AI providers
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
FAL_KEY=

# Media & data
PEXELS_API_KEY=
YOUTUBE_API_KEY=

# Optional
SENTRY_DSN=
```

---

## 11. WHAT YOU DO **NOT** NEED

- ❌ **n8n / Make / Zapier** — replaced by Trigger.dev (code-first, in this repo)
- ❌ **Notion** — the app's database is the content calendar
- ❌ **Google Drive / Dropbox** — Supabase Storage holds all assets
- ❌ **CapCut / Descript** — Remotion renders videos programmatically (no account needed;
  its license is free for individuals & small companies)
- ❌ **Kling / Veo direct subscriptions** — both are reached through your one fal.ai key
- ❌ **Telegram bot** — approval gates live in the app with phone push notifications
  (a Telegram mirror can be added later if you want it)
- ❌ **YouTube OAuth / Google verification audit** — uploads are manual by design in v1
- ❌ **TubeBuddy / Ahrefs** — Phase 8's intelligence runs cover sourcing; revisit only
  if you want deeper SEO tooling later

---

*Once the checklist's top section (rows 1–3) is done, Phase 0 can begin immediately —
rows 4–8 can follow any time before their phases.*
