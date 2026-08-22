import type { Metadata } from "next";
import Image from "next/image";
import {
  ShieldCheck,
  Coins,
  Workflow,
  Network,
  Clapperboard,
  AudioLines,
  Brain,
  ArrowDown,
  UserRound,
  Users,
  Tv,
  Music4,
} from "lucide-react";
import { Reveal, WordReveal, CountUp, Aurora } from "@/components/bits/motion";
import { Magnetic } from "@/components/bits/interactive";
import { ControlGrid, ClickSpark, BentoCard, TiltGlare } from "@/components/bits/fx";
import { CaptureForm } from "./capture-form";
import { ControlRoom } from "./control-room";
import { CrewBoard } from "./crew-board";
import { MvdaDemo } from "./mvda-demo";
import { EditorTour } from "./editor-tour";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Faceless Studio — Full automation. Zero blind trust.",
};

/** The twelve distinguishing systems — each an accurate, specific hook grounded
    in a real subsystem (counts verified against the codebase). `isNew` marks
    capabilities added since the last hero revision. */
const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Four gates, fifty-plus checks",
    body: "IDEA, SCRIPT, ASSETS, and FINAL each need a green light — and behind them 50+ automated checks (a 20-point rubric, a 14-point self-watch, 7 media checks, a 7-dimension provider score) grade every video against a floor you set. Nothing ships under the bar.",
    tag: "Quality control",
    isNew: false,
  },
  {
    icon: Coins,
    title: "Spends like a director",
    body: "A router picks the cheapest of 8 visual mediums — 5 of them essentially free — that still lands each beat. Premium generative video (7 models on tap) is saved for the 1–3 hero beats that earn it, under a hard monthly cap.",
    tag: "Cost & medium routing",
    isNew: false,
  },
  {
    icon: Workflow,
    title: "Idea to upload, on autopilot",
    body: "A 10-stage path — seed, research, script, fact-check, shot-plan, generate, render, auto-fix, QC, publish — runs end-to-end from one brief, behind a mechanical kill switch that stops every paid action at once.",
    tag: "Agentic pipeline",
    isNew: false,
  },
  {
    icon: UserRound,
    title: "A host who speaks your script",
    body: "Approve one portrait and the studio casts it as your on-camera presenter — lip-synced by 5 avatar models (Kling, OmniHuman, InfiniTalk and more) to the exact narration audio. Mix host beats with b-roll on a per-beat call, or stay fully faceless.",
    tag: "AI presenters",
    isNew: true,
  },
  {
    icon: Network,
    title: "A crew of thirty, not a chatbot",
    body: "30+ autonomous roles — an operator, a cut agent, an art director, a shot planner, a panel of judges, a fact-checker, a librarian — each own their craft. Every move is versioned, budgeted, and answerable to your gates.",
    tag: "Multi-agent orchestration",
    isNew: false,
  },
  {
    icon: Users,
    title: "A cast that never drifts off-model",
    body: "Design your characters and styles once; reference-image generation keeps every scene, group shot, and thumbnail on-model after that — with 2–3 fresh images per beat, recurring characters actually recur.",
    tag: "Character studio",
    isNew: true,
  },
  {
    icon: Tv,
    title: "Every video opens like a show",
    body: "A branded animated cold open — your wordmark, tagline, and colors over motion graphics, with a custom-generated music sting — renders in front of every upload automatically. Build it once; your channel has a signature.",
    tag: "Branded intros",
    isNew: true,
  },
  {
    icon: Music4,
    title: "Original songs, synced to the syllable",
    body: "Three song models compose and sing full original tracks, then forced alignment pins every caption to the exact moment each word is sung. Sing-alongs stay karaoke-tight, and nothing ever drifts off the vocal.",
    tag: "Music & sing-along",
    isNew: true,
  },
  {
    icon: Workflow,
    title: "Twelve loops that never sleep",
    body: "The operator, build-runner, render farm, auto-fix, clean-house, intelligence and optimizer loops run the studio around the clock — 12 scheduled autonomous loops, each with its own budget and rails.",
    tag: "Always-on autonomy",
    isNew: false,
  },
  {
    icon: Clapperboard,
    title: "You edit the same document the agent does",
    body: "A real timeline with version history — v3 compiler, v4 agent, v5 you. The agent works 18 editing verbs over the exact same validated ops your inspector uses. No export, no round-trip; revert anything.",
    tag: "Editing",
    isNew: false,
  },
  {
    icon: AudioLines,
    title: "Narration that drives the cut",
    body: "Word-timestamped voiceover — ElevenLabs or 8 built-in voices — locks captions, emphasis, and clip timing to the exact syllable the line is spoken. Not a guess, and never drifting.",
    tag: "Voice",
    isNew: false,
  },
  {
    icon: Brain,
    title: "It learns from your audience",
    body: "Every retention dip is traced to the cut that caused it. Seven learning loops turn outcomes into lessons — and a lesson only graduates once your own channel data proves it. An internet tip can never outvote your numbers.",
    tag: "Learning loops",
    isNew: false,
  },
] as const;

const STATS = [
  { to: 4, suffix: "", label: "approval gates in your hands" },
  { to: 50, suffix: "+", label: "automated quality checks per video" },
  { to: 12, suffix: "", label: "autonomous loops running 24/7" },
  { to: 0, suffix: "", label: "videos shipped under your floor" },
] as const;

/** The capability loop — verified reach + breadth stats, marqueed (LogoLoop
    with our own numbers instead of borrowed logos). */
const REACH = [
  ["8", " visual mediums (5 free)"],
  ["7", " AI video models"],
  ["5", " lip-sync avatar models"],
  ["3", " original-song models"],
  ["10", "-stage hands-off path"],
  ["7", " platforms · 5 aspect ratios"],
  ["8", " dub languages"],
  ["18", " agent editing verbs"],
  ["7", " learning loops"],
  ["$", " hard caps in code"],
] as const;

const FAQ = [
  {
    q: "Is this AI slop?",
    a: "That's exactly what the gate stack exists to prevent. 50+ automated checks — a 20-point rubric, a 14-point self-watch, media and provider scoring — grade every video against a floor you set, four checkpoints need a green light, and you can open and override any edit. Automation with a veto is the whole point.",
  },
  {
    q: "What do I still do?",
    a: "The judgment calls — the brand, the taste, and the veto. You choose the orchestration mode (Autonomous, where the pipeline self-advances, or Director, where every stage waits for your press), and per gate you set the autonomy level — Assist (notify and wait), Copilot (auto-approve only high-scoring work), or Autopilot. The crew handles the labor; you stay the director.",
  },
  {
    q: "Do my videos have to be faceless?",
    a: "No — that's now a choice, not a constraint. Approve a single portrait and the studio casts it as a lip-synced on-camera host, mixing presenter beats with b-roll shot by shot. Skip it and every video stays fully faceless. Either way, the same gates grade the result.",
  },
  {
    q: "What does it cost to run?",
    a: "Per-video production lands in a coffee-tier range that depends on length and how much premium video each script earns — enforced by ledgers and hard caps in code, not by hope. Exact pricing and plans go to the beta list first.",
  },
  {
    q: "Is this affiliated with YouTube?",
    a: "No. Faceless Studio is an independent tool and is not affiliated with, endorsed by, or sponsored by YouTube or Google. Uploads stay under your own account and your control.",
  },
  {
    q: "When can I get in?",
    a: "The beta opens September 14th. Invites go out in list order, so join below to hold your place — founding-operator pricing is locked in for everyone on the list.",
  },
] as const;

export default function LaunchPage() {
  return (
    <main id="top" className="relative overflow-clip">
      {/* Effect layer: film grain over everything + emerald click sparks. */}
      <div className="m-noise" aria-hidden="true" />
      <ClickSpark />

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-5 pb-16 pt-24 text-center">
        <ControlGrid />
        <Aurora />
        <div className="relative z-10 mx-auto max-w-4xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--m-line)] bg-[#0e1422]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-muted)] backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-[var(--m-amber)] shadow-[0_0_10px_var(--m-amber)]" />
              Beta opens September 14
            </span>
          </Reveal>

          {/* Primary tagline (#3) — Space Grotesk, largest */}
          <h1
            className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.75rem,9vw,6rem)] font-bold leading-[0.95] tracking-[-0.02em] text-[var(--m-ink)]"
          >
            <WordReveal text="Full automation." />
            <br />
            <WordReveal text="Zero blind trust." startDelay={260} wordClassName="m-gradient-text" />
          </h1>

          {/* Secondary tagline (#10) — Sora, smaller, different face */}
          <Reveal delay={520}>
            <p className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-display-alt)] text-[clamp(1rem,2.4vw,1.4rem)] font-light leading-snug text-[var(--m-muted)]">
              Script, voice, visuals, music, and the final cut — one brief, one
              crew, your call on every gate.
            </p>
          </Reveal>

          <Reveal delay={640} className="mx-auto mt-8 max-w-xl">
            <CaptureForm source="hero" size="lg" />
          </Reveal>
        </div>

        {/* Soft blur where the hero hands off to content. */}
        <div className="m-gblur z-[5]" aria-hidden="true" />
        <a
          href="#watch"
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
        >
          <span className="flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.14em]">
            Watch it work
            <ArrowDown className="size-4 animate-bounce" />
          </span>
        </a>
      </section>

      {/* ── 1b. Control-room loop (flagship) ─────────────────────────────── */}
      <section id="watch" className="mx-auto max-w-6xl px-5 pb-8">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
            The whole studio, live
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight text-[var(--m-ink)]">
            One brief in. A tracked video out.
          </h2>
          <p className="mt-3 text-[var(--m-muted)]">
            Watch a single video travel the real ten-stage path — every agent
            hand-off, every gate, every reconciled cent — hands-off, under a cap.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ControlRoom />
        </Reveal>
      </section>

      {/* ── 1c. The real product (Track B — authentic screenshot) ────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <Reveal>
          <TiltGlare className="m-star-border overflow-hidden p-2">
            <Image
              src="/marketing/product-board.png"
              alt="The live Backlot production board — every asset from first spark to published, with stage counts, QC scores, and per-video spend."
              width={2032}
              height={876}
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="w-full rounded-xl"
            />
          </TiltGlare>
          <p className="mt-3 text-center text-xs text-[var(--m-muted)]">
            Not a mockup — the live Backlot board. Every asset from first spark to
            published, with stage counts, QC scores, and per-video spend.
          </p>
        </Reveal>
      </section>

      {/* ── 1d. Capability loop — verified numbers on an infinite marquee ── */}
      <div className="m-loop" aria-hidden="true">
        <div className="m-loop-track">
          {[...REACH, ...REACH].map(([n, rest], i) => (
            <span key={i} className="m-loop-chip">
              <b>{n}</b>
              {rest}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. Feature showcase ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
            What makes it different
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight text-[var(--m-ink)]">
            Twelve systems most tools don&apos;t have
          </h2>
          <p className="mt-3 text-[var(--m-muted)]">
            Every claim below is backed by a system that exists — a gate, a cap, a
            version number. Not magic. Machinery.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 80}>
              <BentoCard className="group h-full p-5">
                <div className="flex items-start justify-between">
                  <f.icon className="size-6 text-[var(--m-amber)]" strokeWidth={1.75} />
                  {f.isNew && (
                    <span className="rounded-full bg-[var(--m-amber)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--m-on-accent)] shadow-[0_0_16px_-4px_var(--m-amber)]">
                      New
                    </span>
                  )}
                </div>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--m-muted)]">
                  {f.tag}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--m-ink)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">
                  {f.body}
                </p>
              </BentoCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 4. The crew — multi-agent orchestration ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
            Multi-agent orchestration
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight text-[var(--m-ink)]">
            A crew of thirty, handing off in the open
          </h2>
          <p className="mt-3 text-[var(--m-muted)]">
            Not one model doing everything — a roster of specialists, each with a
            job, a budget, and a log. Watch them build one video, tool call by
            tool call.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <CrewBoard />
        </Reveal>
      </section>

      {/* ── 2b. The agent cuts — MVDA demo (centerpiece) ─────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.35fr]">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
              Inside the edit
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight text-[var(--m-ink)]">
              The agent cuts a real timeline
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--m-muted)]">
              Every edit is a versioned, validated change to an explicit timeline —
              the same document you can open and override. The agent is capped:
              about $0.80 a session, and it can&apos;t ship anything the judge
              scores under your floor.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--m-muted)]">
                <span className="size-2.5 rounded-full bg-[var(--m-amber)]" /> agent action
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--m-muted)]">
                <span className="size-2.5 rounded-full bg-[var(--m-sky)]" /> you
              </span>
            </div>
            <div className="mt-6 max-w-sm">
              <CaptureForm source="demo" />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <MvdaDemo />
          </Reveal>
        </div>
      </section>

      {/* ── 2c. The editor — human + agent are peers (§3.5) ──────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <EditorTour />
        </Reveal>
      </section>

      <div className="m-ticks mx-auto max-w-5xl" />

      {/* ── 3. Stat band ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-[var(--m-line)] bg-black/30 px-5 py-16">
        <div className="relative z-10 mx-auto grid max-w-5xl gap-8 text-center sm:grid-cols-4">
          {STATS.map((s) => (
            <Reveal key={s.label}>
              <div className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,3.5rem)] font-bold text-[var(--m-ink)]">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <p className="mt-2 text-sm text-[var(--m-muted)]">{s.label}</p>
            </Reveal>
          ))}
        </div>
        <p className="relative z-10 mx-auto mt-10 max-w-2xl text-center text-sm text-[var(--m-muted)]">
          Costs are enforced by ledgers and hard caps in code, not by hope. Exact
          per-video pricing and plans go to the beta list first.
        </p>
      </section>

      {/* ── 4. Mid capture ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[var(--m-ink)]">
            Be in the beta on day one.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--m-muted)]">
            Doors open September 14th, and invites go out in list order. Sign up
            now and yours is in the first wave.
          </p>
          <div className="mx-auto mt-6 max-w-lg">
            <CaptureForm source="mid" />
          </div>
        </Reveal>
      </section>

      <div className="m-ticks mx-auto max-w-5xl" />

      {/* ── 5. Founder note + FAQ ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
            Why we built it
          </p>
          <p className="mt-4 font-[family-name:var(--font-display-alt)] text-lg font-light leading-relaxed text-[var(--m-ink)]">
            Faceless channels deserve a real production system — not a slot machine
            that spits out clips and hopes. So we built the studio we wanted: a crew
            of agents that does the labor, a stack of gates that keeps the taste
            yours, and a ledger that never lies about what a video costs.
          </p>
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQ.map((item) => (
            <Reveal key={item.q}>
              <details className="group rounded-xl border border-[var(--m-line)] bg-[var(--m-card)] px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[var(--m-ink)] [&::-webkit-details-marker]:hidden">
                  <span className="font-medium">{item.q}</span>
                  <span className="ml-4 text-[var(--m-muted)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--m-muted)]">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 6. Final capture — the one loud element: ElectricBorder ──────── */}
      <section className="relative overflow-hidden px-5 py-24 text-center">
        <ControlGrid />
        <Aurora />
        <div className="relative z-10 mx-auto max-w-2xl">
          <Reveal>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3.25rem)] font-bold leading-tight text-[var(--m-ink)]">
              The first operators set the price forever.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[var(--m-muted)]">
              The beta opens September 14th. Sign up now — get in before the
              doors do.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="m-electric mx-auto mt-8 max-w-lg p-5">
              <CaptureForm source="final" size="lg" />
            </div>
          </Reveal>
          <Reveal delay={200} className="mt-8">
            <Magnetic>
              <a
                href="#top"
                className="inline-block text-sm font-medium text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
              >
                Back to top ↑
              </a>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {/* ── Footer: legal, disclaimer, discreet operator login ──────────── */}
      <footer className="border-t border-[var(--m-line)] px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--m-muted)]">
            Faceless Studio is an independent product and is{" "}
            <span className="text-[var(--m-ink)]">
              not affiliated with, endorsed by, or sponsored by YouTube or Google
            </span>
            . All product names and logos are the property of their respective
            owners.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--m-muted)]">
            <a href="/legal/privacy" className="hover:text-[var(--m-ink)]">
              Privacy
            </a>
            <a href="/legal/terms" className="hover:text-[var(--m-ink)]">
              Terms
            </a>
            <a href="/legal/disclaimer" className="hover:text-[var(--m-ink)]">
              Disclaimer
            </a>
            <a href="/legal/ai-disclosure" className="hover:text-[var(--m-ink)]">
              AI disclosure
            </a>
          </nav>
          <p className="text-[11px] text-[var(--m-muted)]/70">
            © {new Date().getFullYear()} Faceless Studio ·{" "}
            <a href="/login" className="underline underline-offset-2 hover:text-[var(--m-ink)]">
              Operator login
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
