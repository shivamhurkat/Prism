import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { NewDecisionForm } from '@/components/new-decision-form'

export const metadata = {
  title: 'New Decision — Prism',
}

export default async function NewDecisionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground font-sans hover:text-foreground transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h1 className="font-display text-[40px] font-light tracking-tight text-foreground">
            Start a decision.
          </h1>
          <p className="mt-2 text-base text-muted-foreground font-sans">
            Begin with a clear question. You can refine context next.
          </p>
        </div>

        {/* Form card */}
        <LiquidGlass className="p-8">
          <NewDecisionForm />
        </LiquidGlass>
      </div>
    </div>
  )
}
