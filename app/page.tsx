import Link from 'next/link'
import { Nav } from '@/components/nav'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { AmbientBackground } from '@/components/ui/ambient-background'
import { HeroSpecimen } from '@/components/hero-specimen'
import { EmailCapture } from '@/components/email-capture'

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Describe',
    body: 'Frame the decision you are facing — what you are weighing, who is affected, and what outcome you are optimizing for. No template required. Plain language is enough.',
  },
  {
    num: '02',
    title: 'Convene',
    body: "Prism instantiates a council: a customer agent, an investor agent, an employee agent, and a devil's advocate. Each holds a distinct perspective and will not defer to the others.",
  },
  {
    num: '03',
    title: 'Decide',
    body: "A structured dashboard surfaces the council's verdict, minority dissents, confidence by scenario, and a one-page brief you can share with a board or a co-founder.",
  },
]

const FRAMEWORKS = [
  'Sell vs Build',
  'In-house vs Outsource Legal',
  'Raise vs Bootstrap',
  'Fire vs Coach a Co-founder',
  'Pivot vs Persist',
  'Layoffs vs Cut Burn',
  'Acquire vs Partner',
  'Open vs Closed Source',
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="relative flex-1 flex items-center overflow-hidden">
        <AmbientBackground />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Copy */}
            <div className="space-y-8">
              <div className="space-y-5">
                <h1 className="font-display text-5xl lg:text-[4.25rem] font-light leading-[1.05] tracking-tight text-foreground">
                  Make hard calls with a council, not a hunch.
                </h1>
                <p className="text-base lg:text-lg text-muted-foreground font-sans leading-relaxed max-w-lg">
                  Describe a high-stakes decision. Prism convenes a council of AI agents — your customers, your investors, your employees, and a devil&apos;s advocate — and stress-tests your call across futures. You get a board-ready dashboard, not a chat.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full h-12 px-6 text-sm font-medium font-sans bg-accent-copper text-white hover:opacity-90 transition-opacity duration-150"
                >
                  Start a decision
                </Link>
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-[10px] h-12 px-6 text-sm font-medium font-sans border border-border text-foreground hover:bg-muted transition-colors duration-150"
                >
                  See a sample dashboard
                </Link>
              </div>
            </div>

            {/* Dashboard specimen */}
            <HeroSpecimen />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              The process
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-foreground">
              How it works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ num, title, body }) => (
              <LiquidGlass key={num} variant="subtle" className="p-8 space-y-4">
                <span className="font-display text-3xl text-accent-copper font-light">
                  {num}
                </span>
                <h3 className="font-display text-xl font-light text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {body}
                </p>
              </LiquidGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Frameworks */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Templates
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-foreground">
              Frameworks for every crossroad
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {FRAMEWORKS.map((label) => (
              <LiquidGlass
                key={label}
                className="rounded-full px-5 py-2.5"
                interactive
              >
                <span className="text-sm font-sans text-foreground whitespace-nowrap">
                  {label}
                </span>
              </LiquidGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <blockquote>
            <p className="font-display text-2xl md:text-3xl lg:text-4xl font-light italic leading-[1.3] text-foreground">
              &ldquo;I had three advisors I trusted. Now I have twelve I can convene in fifteen minutes.&rdquo;
            </p>
          </blockquote>
          <p className="text-xs font-sans tracking-[0.2em] text-muted-foreground uppercase">
            — Founder, Series B SaaS
          </p>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <LiquidGlass className="p-8 md:p-12 space-y-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Early access
              </p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-foreground">
                Secure your council seat
              </h2>
              <p className="text-base text-muted-foreground font-sans leading-relaxed">
                Prism uses your own Claude API key — your data stays yours, your costs stay transparent. Hosted plans soon.
              </p>
            </div>
            <div className="max-w-lg">
              <EmailCapture />
            </div>
          </LiquidGlass>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-lg font-light text-foreground">
            Prism
          </span>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Security', 'Status'].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 font-sans"
              >
                {item}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-sans">
            &copy; 2026 Prism. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
