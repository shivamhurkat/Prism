import Link from 'next/link'
import { AmbientBackground } from '@/components/ui/ambient-background'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SignUpForm } from '@/components/signup-form'

export const metadata = {
  title: 'Sign Up — Prism',
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — 60% */}
      <div className="flex-[3] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 bg-background relative">
        <div className="absolute top-6 left-6 md:top-8 md:left-8">
          <Link href="/" className="font-display text-xl font-light text-foreground">
            Prism
          </Link>
        </div>
        <div className="absolute top-6 right-6 md:top-8 md:right-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm mx-auto space-y-10">
          {/* Headline */}
          <div className="space-y-2">
            <h1 className="font-display text-3xl md:text-4xl font-light tracking-tight text-foreground">
              Convene your council.
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              Sign up to make your first decision.
            </p>
          </div>

          <SignUpForm />

          {/* Legal */}
          <p className="text-xs text-muted-foreground font-sans leading-relaxed text-center">
            By continuing, you agree to Prism&apos;s{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Right panel — 40% */}
      <div className="flex-[2] relative hidden md:flex flex-col items-center justify-center overflow-hidden bg-[#0E0E10]">
        <AmbientBackground />
        <div className="relative z-10 px-12 max-w-md">
          <LiquidGlass variant="prominent" className="p-8 space-y-5">
            <blockquote>
              <p className="font-display text-xl font-light italic leading-relaxed text-[#F4F4F0]">
                &ldquo;By minute eight the customer agent had said the thing my whole team was afraid to.&rdquo;
              </p>
            </blockquote>
            <p className="text-xs font-sans tracking-[0.2em] text-[#A1A1A1] uppercase">
              — Series B Founder
            </p>
          </LiquidGlass>
        </div>
      </div>
    </div>
  )
}
