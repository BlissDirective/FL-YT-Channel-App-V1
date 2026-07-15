# Fable5 — Resend Double-Opt-In Setup Guide

**Status:** Deferred deliverable (build spec Part G). Nothing here is built yet —
this is the step-by-step for when you're ready to add confirmation + welcome
emails to the `/launch` waitlist. The `launch_leads` table already carries a
`confirmed_at` column reserved for exactly this, so the upgrade is additive: no
data migration, no change to the hero page.

**What "double opt-in" means:** today the waitlist is *single* opt-in — an email
hits `launch_leads` and that's it. Double opt-in adds a confirmation step: after
signup we email a one-click "confirm" link; the lead only counts as confirmed
once they click it. This is the gold standard for deliverability (mailbox
providers trust confirmed lists) and the strongest GDPR posture (provable
consent).

---

## 0. Decide if you need it yet

Single opt-in is fine to start collecting. Add double opt-in when any of these
is true: you're about to send real broadcast email, you're seeing spam/bot
signups, or you want EU-clean consent records before launch. If none apply yet,
bookmark this and keep collecting.

---

## 1. Create the Resend account + API key

1. Sign up at [resend.com](https://resend.com) (free tier covers a pre-launch
   list — ~3,000 emails/mo, 100/day at time of writing).
2. **API Keys → Create API Key.** Name it `faceless-studio-prod`. Scope it to
   **Sending access** only. Copy the key (starts `re_…`) — you won't see it
   again.
3. You'll add it to the app as `RESEND_API_KEY` in Step 4.

## 2. Verify your sending domain (the part that takes longest)

Email from `onboarding@resend.dev` works for testing but lands in spam for real
sends. Verify a domain you own:

1. **Resend → Domains → Add Domain.** Enter the domain you'll send from — e.g.
   `faceless.studio` (or a subdomain like `mail.faceless.studio`, which keeps
   your root domain's reputation separate — recommended).
2. Resend shows DNS records to add. In your DNS provider (Cloudflare, Namecheap,
   the registrar, wherever the domain lives), add:
   - **SPF** — a TXT record authorizing Resend to send.
   - **DKIM** — one or more TXT/CNAME records that cryptographically sign mail.
   - **DMARC** (recommended) — a TXT record at `_dmarc.<domain>` such as
     `v=DMARC1; p=none; rua=mailto:you@faceless.studio` to start in
     monitoring mode.
3. Back in Resend, click **Verify**. DNS can take minutes to a few hours to
   propagate; the domain flips to **Verified** when the records are readable.
4. Pick your **From** identity, e.g. `Faceless Studio <hello@faceless.studio>`.

> Tip: keep the confirmation email plain and personal (text-forward, one link).
> Heavy HTML/marketing templates hurt first-contact deliverability.

## 3. Add the environment variables (Vercel)

In **Vercel → Project → Settings → Environment Variables** (Production, and
Preview if you want to test on previews):

| Key | Example value | Notes |
|-----|---------------|-------|
| `RESEND_API_KEY` | `re_xxx` | From Step 1. Server-only — never `NEXT_PUBLIC_`. |
| `RESEND_FROM` | `Faceless Studio <hello@faceless.studio>` | Verified sender from Step 2. |
| `LAUNCH_CONFIRM_URL` | `https://your-domain/launch/confirm` | Where the confirm link points (Step 5). |

Redeploy after adding them. Follow the app's existing pattern: the adapter reads
the key and stays a no-op mock until the key is present (mirrors `isXLive()`),
so nothing breaks in environments without it.

## 4. Install the SDK

```
pnpm add -w resend
```

## 5. The code changes (drop-in, when you're ready to build)

The table already has `confirmed_at`. The flow becomes:

1. **On signup** (`joinLaunchList`, `src/lib/actions/launch.ts`): after the
   insert, generate a signed confirmation token (an HMAC of the email + a
   secret, or a random token stored on the row — add a `confirm_token` column if
   you prefer opaque tokens) and send the confirmation email via a new
   `src/lib/adapters/email.ts` Resend adapter. Keep the honeypot + rate-limit
   exactly as they are.
2. **New confirm route** `src/app/(marketing)/launch/confirm/route.ts` (public —
   add `/launch/confirm` is already covered by the `/launch` public prefix in
   middleware): validates the token, sets `confirmed_at = now()` on the row via
   the service-role client, then redirects to a `/launch/confirmed` thank-you
   page. Invalid/expired tokens redirect to a friendly retry.
3. **Adapter** `src/lib/adapters/email.ts`:
   ```ts
   import "server-only";
   import { Resend } from "resend";
   export function isEmailLive() { return Boolean(process.env.RESEND_API_KEY); }
   export async function sendConfirmEmail(to: string, confirmUrl: string) {
     if (!isEmailLive()) return { ok: true, mocked: true }; // mock-first
     const resend = new Resend(process.env.RESEND_API_KEY!);
     const { error } = await resend.emails.send({
       from: process.env.RESEND_FROM!,
       to,
       subject: "Confirm your spot on the Faceless Studio list",
       text: `You're almost in. Confirm your email:\n\n${confirmUrl}\n\n` +
             `If you didn't request this, ignore it — nothing happens without the click.`,
     });
     return { ok: !error, error: error?.message };
   }
   ```
4. **Admin leads view**: show confirmed vs pending (`confirmed_at is not null`)
   so you can measure confirmation rate and export only confirmed emails for a
   real broadcast.

### Suggested extra column (optional)

```sql
alter table launch_leads add column if not exists confirm_token text;
create index if not exists launch_leads_confirm_token_idx on launch_leads (confirm_token);
```
Use this if you want opaque, single-use tokens instead of stateless HMAC links.

## 6. Test before you point traffic at it

1. With `RESEND_API_KEY` set on a preview deploy, sign up with your own address.
2. Confirm the email arrives (check spam on the first send — that's normal until
   the domain warms up), click the link, verify `confirmed_at` is set.
3. Sign up again with the same email → still a silent success, no duplicate row.
4. Tamper with the token in the URL → friendly failure, `confirmed_at` stays
   null.
5. Send a couple of real confirmations to a Gmail + an Outlook address and check
   they land in the inbox before you scale up.

## 7. Compliance notes

- Keep the confirmation copy clear that they're joining a launch list.
- Include a physical mailing address and an unsubscribe path once you send
  broadcasts (CAN-SPAM / GDPR). Resend can host an unsubscribe list.
- Update `/legal/privacy` to name Resend as a processor once it's live (the
  current draft already anticipates this).

---

**Bottom line:** the waitlist was built so this is a bolt-on. The only external
clock is DNS verification (Step 2) — start that first; everything else is an
afternoon.
