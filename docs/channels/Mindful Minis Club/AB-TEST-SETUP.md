# A/B test setup — Mindful Minis Club

How to stand the two style tracks up in the app so the comparison is valid.

---

> **Superseded — read this first.** The Character Studio (Phase 4) makes art
> styles first-class objects, so the two-project split below is no longer
> necessary. Use **[One project, two styles](#one-project-two-styles-current)**
> instead. The original two-project method still works and is kept here for
> anyone already running it.

---

## One project, two styles (current)

A style is now its own record with its own string, palette, and exclusions, and
each video names which style it renders in. The cast is separate again: one
description per character, one locked image *per style*. That removes the
reason the test needed two projects.

1. Create **one** project — `Mindful Minis Club`.
2. Open **Cast** (from the Library header) → **Start from a channel preset** →
   *Mindful Minis Club*. That creates the six characters and both style tracks,
   verbatim from `STYLE-LOCK-A.md` / `-B.md`, and costs nothing. It is
   idempotent and never overwrites a description or style string you have
   already edited.
3. Per style, press **Looks for everyone** (it quotes the total first — six
   characters is ~$0.90 on Nano Banana Pro). Review each character in the
   Studio and **lock** the one that best matches the written block. The text is
   the source of truth, not the prettiest render.
4. Per style, press **Group shot** once. It fixes relative height, which is the
   single most common failure in a frame with a child and a knee-height bunny.
5. On each video, pick the style from the **Art style** control in the
   workspace header. Alternate A/B/A/B across the first ten videos.

Why this is a better test than two projects: the cast is *identical* by
construction rather than by careful copy-paste, both tracks share one exemplar
library and one outcome loop, and the only variable left is the art direction —
which is what you were trying to measure.

The comparison itself doesn't change: same channel, alternating uploads, and
`videos.style_id` tells you which track any given video belongs to.

---

## Use TWO projects (original method)

The app carries exactly one **Project Instructions** field per project, and that
field is what locks the art style into every visual prompt. Running both styles
from a single project would mean editing the style string between videos —
which guarantees drift, blends the two looks in the exemplar library, and makes
the outcome loop average the styles together instead of comparing them.

So:

| Project name | Instructions source | Purpose |
|---|---|---|
| `Mindful Minis Club — A` | `STYLE-LOCK-A.md` | Soft pastel vector track |
| `Mindful Minis Club — B` | `STYLE-LOCK-B.md` | Watercolor paper-craft track |

Both publish to the **same YouTube channel** (same audience, same algorithmic
context — that's what makes it a real test). Connect the same channel
credentials to both projects, or leave both on the default channel.

After the test, keep the winner and archive the loser — or repurpose the loser
for bedtime episodes, where watercolor may earn its own lane.

---

## Setup steps (~5 minutes)

For **each** of the two projects:

1. **New project** in the app.
   - Name: `Mindful Minis Club — A` (then `— B`)
   - Niche: `children's sing-along songs for emotional regulation, ages 1-6`
   - Audience: `toddlers and preschoolers ages 1-6, and their caregivers`
   - Angle: `one skill per song, the chorus is the technique`
   - Tone: `warm, calm, encouraging`
2. **Project Settings → Project instructions:** paste the entire fenced block
   from `STYLE-LOCK-A.md` (or `-B.md`). This is the single most important step —
   it feeds every script and every image prompt.
3. **Voice:** select the warm adult female voice you locked in the voice test.
4. **Budget:** per-video cap `$2`, monthly cap `$60`. Storyboard videos land far
   under this; the cap is a guardrail, not a target.
5. **Mode:** Director (you approve each stage) for the whole test. Autopilot is
   for after the style and vocal are locked.
6. **Reference images:** upload that track's six character sheets plus the cast
   group shot.
7. **Notifications:** whichever channels you want; both projects can notify.

---

## Running the test

**Test protocol** (from the setup guide §3):

1. Produce video #1 — *"Breathe Like a Bunny"* — in **both** projects. Identical
   lyrics, identical vocal, identical scene list. Style is the only variable.
   - In project A: `write a song about breathing slowly to calm down, led by Breeze the bunny, using "smell the flower, blow the candle"`
   - Then `continue` to illustrate.
   - In project B: paste **the same approved lyrics** rather than regenerating,
     so the songs are identical and only the pictures differ.
2. Publish both within 48 hours: one as the main video, one as a Short — then
   **swap the arrangement on song #2** so format bias cancels out.
3. Generate 3 thumbnail candidates per style. Style affects CTR more than
   retention at this age, so thumbnails are part of the test, not an afterthought.
4. **Decide after 4 videos (2 per style), not 1.** Judge in this order:
   average view duration → CTR → which one you can stand to look at 200 times.
5. Ask each project `how are my videos performing?` — the outcome loop reports
   per project, which is exactly why the two-project split matters.

---

## Before the first upload

⚠️ **Compliance blocker:** the app's publish path does not yet set
`selfDeclaredMadeForKids` on upload. For this channel that is a compliance gap,
not a convenience one — uploads would land un-designated and need fixing by
hand. Either publish these first videos manually through YouTube Studio (with
the Made for Kids toggle set), or have the publish adapter updated first.

Also set the **channel-level** Made for Kids designation in YouTube Studio
before anything goes live (Settings → Channel → Advanced settings), and confirm
the per-video setting on every upload — the video-level flag is the binding one.

---

## Optional: seed the projects with SQL

If you'd rather create both projects directly in the database than through the
UI, run this in the Supabase SQL editor, pasting each style-lock block into the
`instructions` value. (The UI path is recommended — it fills defaults this
snippet leaves to the schema.)

```sql
insert into projects (name, niche, audience, angle, tone, instructions, pipeline_mode, workspace_mode, status)
values
  ('Mindful Minis Club — A',
   'children''s sing-along songs for emotional regulation, ages 1-6',
   'toddlers and preschoolers ages 1-6, and their caregivers',
   'one skill per song, the chorus is the technique',
   'warm, calm, encouraging',
   $lock$<<< paste the full STYLE-LOCK-A block here >>>$lock$,
   'director', 'director', 'active'),
  ('Mindful Minis Club — B',
   'children''s sing-along songs for emotional regulation, ages 1-6',
   'toddlers and preschoolers ages 1-6, and their caregivers',
   'one skill per song, the chorus is the technique',
   'warm, calm, encouraging',
   $lock$<<< paste the full STYLE-LOCK-B block here >>>$lock$,
   'director', 'director', 'active');
```

Verify afterwards:

```sql
select id, name, left(instructions, 60) as instructions_head
from projects where name like 'Mindful Minis Club%';
```
