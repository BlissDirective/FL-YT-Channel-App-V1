# Launch Leads — Viewing the Beta List & Email Setup

Everything about the emails collected by the `/launch` beta sign-up forms:
where they live, how to read and export them, and the planned Resend
integration for confirmations and the September 14 invite send.

## Where signups are stored

Every capture form on `/launch` (hero, demo section, mid-page, and the final
card) calls the `joinLaunchList` server action
(`src/lib/actions/launch.ts`), which inserts into the **`launch_leads`**
table in the Supabase project.

| Column | Meaning |
| --- | --- |
| `email` | The address. `citext` + unique — case-insensitive, duplicates absorbed silently (the form reports "already on the list"). |
| `source` | Which form converted: `hero`, `demo`, `mid`, or `final`. |
| `referrer` | Sanitized referring URL, when the browser provided one. |
| `utm` | JSON of any `utm_*` params on the visit — tag campaign links (`?utm_source=x&utm_campaign=beta`) and attribution lands here automatically. |
| `consent_at` | When the visitor agreed to the Privacy Policy / Terms line. |
| `confirmed_at` | Reserved for double-opt-in (null until the Resend flow ships — see below). |
| `created_at` | Signup timestamp (indexed, newest-first). |

Defenses already in place: a honeypot field (bots get a fake success), a
best-effort per-IP rate limit, and the unique-email constraint as the real
dedupe.

### Access model (important)

Row-level security is deliberately strict:

- **anon** (site visitors): *insert only*. Nobody can read the list through
  the public site, ever.
- **service_role**: full access — this is what the Supabase dashboard and any
  future admin export use.
- **authenticated** (operator login): no policy — the in-app session cannot
  read the list today. There is currently **no in-app leads page**; the
  Supabase dashboard is the only window. (If we add one, it must query with
  the service-role key server-side, gated to the operator.)

## Viewing & exporting the list

Supabase Dashboard → project → either:

1. **Table Editor → `launch_leads`** — browse, sort, filter live rows.
2. **SQL Editor** — run a query, then use **Export → CSV** on the results.

Mail-ready export:

```sql
select email, source, utm->>'source' as utm_source,
       utm->>'campaign' as utm_campaign, created_at
from launch_leads
order by created_at desc;
```

Signups per form placement (which capture converts):

```sql
select source, count(*) from launch_leads group by source order by 2 desc;
```

Signups per campaign (requires tagged links):

```sql
select coalesce(utm->>'source', '(untagged)') as channel, count(*)
from launch_leads group by 1 order by 2 desc;
```

Daily signup curve:

```sql
select date_trunc('day', created_at) as day, count(*)
from launch_leads group by 1 order by 1;
```

## Future: Resend integration (double-opt-in + invite send)

The schema already reserves `confirmed_at` for this. The plan, when we wire
it up:

1. **Account + domain.** Create a Resend account, add the sending domain,
   and set the DNS records Resend prints (SPF + DKIM TXT records, and the
   optional DMARC record). Wait for the domain to show **Verified**.
2. **API key.** Create a Resend API key and add it to Vercel as
   `RESEND_API_KEY` (server-only; never `NEXT_PUBLIC_*`).
3. **Confirmation email (double-opt-in).** Extend `joinLaunchList`: after the
   insert, send a "confirm your spot" email containing a signed link (token =
   HMAC of the lead id with a server secret). A tiny route
   (`/api/launch/confirm?token=…`) verifies the token and stamps
   `confirmed_at = now()`. Until then the lead counts as single-opt-in — the
   current behavior stays the fallback if the send fails, so signups are
   never lost.
4. **The September 14 invite.** Send via Resend **Broadcasts** (create an
   Audience, import the CSV from the export query above — or sync
   programmatically), or loop the list server-side with the SDK in batches.
   Filter to `confirmed_at is not null` if double-opt-in has been live;
   otherwise send to all and include the mandatory unsubscribe link Resend
   injects for broadcasts.
5. **Suppression back-sync (optional).** Resend webhooks
   (`email.bounced`, `email.complained`) → a small route that flags the lead
   (add a `suppressed_at` column) so bounced addresses are excluded from
   future sends.

Cost note: Resend's free tier (3,000 emails/month at the time of writing)
comfortably covers a confirmation + one launch broadcast for an early list;
re-check limits before the big send.

## Operational checklist for September 14

- [ ] Export the list (query above) or sync the Audience the day before.
- [ ] Send a test invite to yourself from the exact template.
- [ ] Send the broadcast; watch bounces/complaints in Resend.
- [ ] Keep founding-operator pricing honored for everyone with
      `created_at < launch`.
