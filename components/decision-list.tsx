'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { Tables, DecisionStatus } from '@/lib/database.types'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  return `${day} day${day === 1 ? '' : 's'} ago`
}

const statusConfig: Record<DecisionStatus, { label: string; className: string; dot?: boolean }> = {
  draft: { label: 'Draft', className: 'bg-border/60 text-muted-foreground' },
  configuring: { label: 'Configuring', className: 'border border-accent-copper text-accent-copper' },
  ready: { label: 'Ready', className: 'border border-accent-copper text-accent-copper' },
  running: { label: 'Running', className: 'border border-accent-copper text-accent-copper', dot: true },
  synthesizing: { label: 'Synthesizing', className: 'bg-accent-copper text-white', dot: true },
  completed: { label: 'Completed', className: 'bg-success/15 text-success' },
  archived: { label: 'Archived', className: 'bg-border/60 text-muted-foreground' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-border/60 text-muted-foreground' },
}

export function DecisionList({
  decisions,
}: {
  decisions: Pick<Tables<'decisions'>, 'id' | 'title' | 'question' | 'status' | 'created_at'>[]
}) {
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-light text-foreground">
          Your decisions
        </h2>
        <Link
          href="/dashboard/new"
          onMouseEnter={() => router.prefetch('/dashboard/new')}
          className="rounded-full bg-accent-copper text-white px-5 py-2 text-sm font-sans font-medium hover:opacity-90 transition-opacity duration-150"
        >
          New decision
        </Link>
      </div>

      <div className="space-y-3">
        {decisions.map((d) => {
          const { label, className, dot } = statusConfig[d.status]
          const href = `/dashboard/d/${d.id}`
          return (
            <Link
              key={d.id}
              href={href}
              onMouseEnter={() => router.prefetch(href)}
              className="block"
            >
              <LiquidGlass
                interactive
                className="px-6 py-5 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-display text-[22px] font-light text-foreground leading-snug">
                    {d.title}
                  </h3>
                  {d.question && (
                    <p className="text-sm text-muted-foreground font-sans truncate">
                      {d.question}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-sans font-medium uppercase tracking-wide ${className}`}
                  >
                    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans">
                    {relativeTime(d.created_at)}
                  </span>
                </div>
              </LiquidGlass>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
