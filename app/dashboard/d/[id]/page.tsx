import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { DecisionStatus } from '@/lib/database.types'

export const metadata = {
  title: 'Decision — Prism',
}

const statusConfig: Record<DecisionStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-border/60 text-muted-foreground' },
  configuring: {
    label: 'Configuring',
    className: 'border border-accent-copper text-accent-copper',
  },
  ready: { label: 'Ready', className: 'border border-accent-copper text-accent-copper' },
  running: { label: 'Running', className: 'bg-accent-copper text-white' },
  completed: { label: 'Completed', className: 'bg-success/15 text-success' },
  archived: { label: 'Archived', className: 'bg-border/60 text-muted-foreground' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function DecisionDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: decision } = await supabase
    .from('decisions')
    .select('id, title, question, status, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!decision) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <LiquidGlass className="p-10 max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl font-light text-foreground">
            Decision not found.
          </h1>
          <p className="text-sm text-muted-foreground font-sans">
            It may have been deleted or you may not have access.
          </p>
          <Link
            href="/dashboard"
            className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors font-sans underline underline-offset-2"
          >
            ← Back to dashboard
          </Link>
        </LiquidGlass>
      </div>
    )
  }

  const { label, className } = statusConfig[decision.status]

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

        <LiquidGlass className="p-8">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="font-display text-3xl font-light text-foreground leading-tight">
              {decision.title}
            </h1>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-sans font-medium uppercase tracking-wide ${className}`}
            >
              {label}
            </span>
          </div>

          {decision.question && (
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {decision.question}
            </p>
          )}

          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground font-sans italic">
              Your council and scenarios will be configured here. Coming in step 4.
            </p>
          </div>
        </LiquidGlass>
      </div>
    </div>
  )
}
