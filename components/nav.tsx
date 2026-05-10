'use client'

import Link from 'next/link'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-3">
      <LiquidGlass
        variant="subtle"
        className="mx-auto max-w-7xl px-5 py-3 rounded-[14px]"
      >
        <nav className="flex items-center justify-between gap-4">
          {/* Wordmark */}
          <Link
            href="/"
            className="font-display text-xl font-light tracking-tight text-foreground shrink-0"
          >
            Prism
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-6">
            {['Product', 'Methodology', 'Use Cases', 'Pricing'].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 font-sans"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/signin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 font-sans hidden sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium font-sans bg-accent-copper text-white hover:opacity-90 transition-opacity duration-150"
            >
              Start a decision
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </LiquidGlass>
    </header>
  )
}
