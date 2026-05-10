import Link from 'next/link'
import { LiquidGlass } from '@/components/ui/liquid-glass'

export const metadata = {
  title: 'New Decision — Prism',
}

export default function NewDecisionPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <LiquidGlass className="p-10 max-w-md w-full text-center space-y-4">
        <h1 className="font-display text-3xl font-light text-foreground">
          Coming in step 3.
        </h1>
        <p className="text-sm text-muted-foreground font-sans">
          The decision wizard will be built here.
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors font-sans underline underline-offset-2"
        >
          Back to dashboard
        </Link>
      </LiquidGlass>
    </div>
  )
}
