'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import type { Tables } from '@/lib/database.types'

type RunRow = Tables<'runs'>
type SynthesisRow = Tables<'run_synthesis'>
type RunTaskRow = Tables<'run_tasks'>

interface Props {
  decision: Pick<Tables<'decisions'>, 'id' | 'title' | 'updated_at'>
  run: RunRow
  synthesis: SynthesisRow | null
  tasks: RunTaskRow[]
  modelsUsed?: { analysis: string; synthesis: string }
}

function formatRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function durationMin(run: RunRow): string {
  if (!run.started_at || !run.completed_at) return '—'
  const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
  const m = Math.ceil(ms / 60_000)
  return `${m} min`
}

function TaskDetail({ task }: { task: RunTaskRow }) {
  const [open, setOpen] = useState(false)
  const label =
    task.kind === 'analysis' ? `Analysis — task ${task.id.slice(0, 8)}`
    : task.kind === 'critique' ? `Critique — task ${task.id.slice(0, 8)}`
    : 'Synthesis'

  return (
    <div className="border border-border rounded-[10px] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-sans text-foreground hover:bg-foreground/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${task.status === 'completed' ? 'bg-success' : 'bg-destructive'}`} />
          {label}
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {task.output ? (
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-background rounded-lg p-3 mt-1 overflow-x-auto">
              {JSON.stringify(JSON.parse(task.output), null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground font-sans mt-1">
              {task.error_message ?? 'No output.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function CompletedRunPlaceholder({ decision, run, synthesis, tasks, modelsUsed }: Props) {
  const [rawOpen, setRawOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 backdrop-blur border-b border-border bg-background/80">
        <div className="max-w-[820px] mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/dashboard" className="text-xs text-muted-foreground font-sans hover:text-foreground transition-colors shrink-0">
            &larr; Dashboard
          </a>
          <span className="text-sm font-sans font-medium text-foreground truncate max-w-[480px]">
            {decision.title}
          </span>
          <div className="flex-1" />
          <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-sans font-medium uppercase tracking-wide bg-success/15 text-success">
            Completed
          </span>
          <span className="text-xs text-muted-foreground font-sans shrink-0 hidden sm:block">
            {formatRelative(decision.updated_at)}
          </span>
        </div>
      </div>

      <div className="max-w-[820px] mx-auto px-6 pb-20">
        {/* Hero */}
        <div className="mt-10">
          <h1 className="font-display text-[36px] font-light text-foreground leading-tight">
            Deliberation complete.
          </h1>
          <p className="text-base text-muted-foreground font-sans mt-2">
            Your council reached a verdict. The full dashboard ships next.
          </p>
        </div>

        {/* Verdict card */}
        <LiquidGlass variant="prominent" className="p-10 mt-10">
          <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">Verdict</p>
          <h2 className="font-display text-[28px] font-light text-foreground mt-3 leading-snug">
            {synthesis?.summary_text ?? '—'}
          </h2>

          <div className="mt-6 flex justify-between items-center flex-wrap gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-[48px] font-light text-accent-copper leading-none">
                {synthesis?.confidence_pct ?? '—'}%
              </span>
              <span className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Confidence
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="font-display text-[28px] font-light text-foreground leading-none">
                ${(run.total_cost_usd ?? 0).toFixed(2)}
              </span>
              <span className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Actual cost &middot; {durationMin(run)}
              </span>
              {modelsUsed && (
                <span className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                  Analysis &middot; {modelsUsed.analysis} &middot; Synthesis &middot; {modelsUsed.synthesis}
                </span>
              )}
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground font-sans leading-relaxed">
            Full reasoning, scenario breakdowns, and per-agent voices land in the step-10 dashboard.
          </p>

          {/* Raw outputs collapsible */}
          <div className="mt-6 border-t border-border pt-6">
            <button
              onClick={() => setRawOpen(o => !o)}
              className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
            >
              {rawOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              View raw outputs
            </button>

            {rawOpen && (
              <div className="mt-4 space-y-3">
                {synthesis && (
                  <div className="mb-4">
                    <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground mb-2">Synthesis</p>
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-background rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(synthesis, null, 2)}
                    </pre>
                  </div>
                )}
                {tasks.map(task => (
                  <TaskDetail key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </LiquidGlass>

        {/* Action row */}
        <div className="mt-10 flex justify-center gap-4 flex-wrap">
          <Link
            href="/dashboard/new"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-sans text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Start a new decision
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-sans text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Back to all decisions
          </Link>
        </div>
      </div>
    </div>
  )
}
