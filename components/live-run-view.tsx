'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Check, X, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cancelRun } from '@/app/actions/runs'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

type RunRow = Tables<'runs'>
type RunTaskRow = Tables<'run_tasks'>
type AgentRow = Pick<Tables<'agent_charters'>, 'id' | 'name' | 'locked'>
type ScenarioRow = Pick<Tables<'scenarios'>, 'id' | 'name' | 'locked'>

interface Props {
  decision: Pick<Tables<'decisions'>, 'id' | 'title' | 'updated_at'>
  run: RunRow
  tasks: RunTaskRow[]
  agents: AgentRow[]
  scenarios: ScenarioRow[]
}

function formatRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

function derivePhase(tasks: RunTaskRow[]): { label: string; step: number } {
  const hasRunningCritique = tasks.some(t => t.kind === 'critique' && (t.status === 'running' || t.status === 'completed'))
  const hasRunningAnalysis = tasks.some(t => t.kind === 'analysis' && t.status === 'running')
  const allAnalysisDone = tasks.filter(t => t.kind === 'analysis').every(t => t.status === 'completed' || t.status === 'failed')
  const hasRunningSynthesis = tasks.some(t => t.kind === 'synthesis' && (t.status === 'running' || t.status === 'completed'))

  if (hasRunningSynthesis) return { label: 'Step 3 of 3: Synthesizing', step: 3 }
  if (hasRunningCritique || (allAnalysisDone && !hasRunningAnalysis)) return { label: 'Step 2 of 3: Critiquing', step: 2 }
  return { label: 'Step 1 of 3: Analyzing', step: 1 }
}

interface TaskDialogState {
  open: boolean
  task: RunTaskRow | null
  agent: AgentRow | null
  scenario: ScenarioRow | null
}

function AnalysisDialogContent({ output }: { output: string }) {
  let parsed: Record<string, unknown> | null = null
  try { parsed = JSON.parse(output) } catch { /* raw */ }

  if (!parsed) {
    return <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{output}</pre>
  }

  const fields = [
    { label: 'Position', key: 'position' },
    { label: 'What they see', key: 'what_you_see' },
    { label: 'Concerns', key: 'concerns' },
    { label: 'Conditions', key: 'conditions' },
  ]

  return (
    <div className="space-y-4">
      {fields.map(({ label, key }) => (
        <div key={key}>
          <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
          <p className="text-sm font-sans text-foreground leading-relaxed">{String(parsed?.[key] ?? '')}</p>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">Confidence</p>
        <span className="text-sm font-mono text-accent-copper font-medium capitalize">{String(parsed?.confidence ?? '')}</span>
        <span className="text-xs text-muted-foreground">— {String(parsed?.confidence_reasoning ?? '')}</span>
      </div>
    </div>
  )
}

function CritiqueDialogContent({ output }: { output: string }) {
  let parsed: { critiques?: Array<{ agent_name: string; critique: string }> } | null = null
  try { parsed = JSON.parse(output) } catch { /* raw */ }

  if (!parsed?.critiques) {
    return <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{output}</pre>
  }

  return (
    <div className="space-y-4">
      {parsed.critiques.map((c, i) => (
        <div key={i}>
          <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground mb-1">
            On {c.agent_name}
          </p>
          <p className="text-sm font-sans text-foreground leading-relaxed">{c.critique}</p>
        </div>
      ))}
    </div>
  )
}

function TaskCellDialog({ state, onClose }: { state: TaskDialogState; onClose: () => void }) {
  const { task, agent, scenario } = state
  if (!task) return null

  const title = task.kind === 'analysis'
    ? `${agent?.name ?? 'Agent'} × ${scenario?.name ?? 'Scenario'}`
    : task.kind === 'critique'
    ? `${agent?.name ?? 'Agent'} — Council critique`
    : 'Council Chair — Synthesis'

  return (
    <Dialog open={state.open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-light">{title}</DialogTitle>
        </DialogHeader>
        {task.status === 'failed' ? (
          <div className="space-y-2">
            <p className="text-[10px] font-sans uppercase tracking-widest text-destructive">Error</p>
            <p className="text-sm font-sans text-muted-foreground">{task.error_message ?? 'Unknown error'}</p>
          </div>
        ) : task.output ? (
          task.kind === 'analysis' ? (
            <AnalysisDialogContent output={task.output} />
          ) : task.kind === 'critique' ? (
            <CritiqueDialogContent output={task.output} />
          ) : (
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{task.output}</pre>
          )
        ) : (
          <p className="text-sm text-muted-foreground font-sans">No output yet.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function LiveRunView({ decision, run: initialRun, tasks: initialTasks, agents, scenarios }: Props) {
  const router = useRouter()
  const [run, setRun] = useState<RunRow>(initialRun)
  const [tasks, setTasks] = useState<RunTaskRow[]>(initialTasks)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [dialogState, setDialogState] = useState<TaskDialogState>({ open: false, task: null, agent: null, scenario: null })

  // Elapsed timer
  useEffect(() => {
    const startedAt = run.started_at ? new Date(run.started_at).getTime() : Date.now()
    const tick = () => setElapsedMs(Date.now() - startedAt)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [run.started_at])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`run-${run.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'run_tasks', filter: `run_id=eq.${run.id}` },
        (payload) => {
          console.log('[realtime] update task=', payload.new.id, 'status=', payload.new.status)
          setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as RunTaskRow : t))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'runs', filter: `id=eq.${run.id}` },
        (payload) => {
          console.log('[realtime] update run=', payload.new.id, 'status=', payload.new.status)
          const updated = payload.new as RunRow
          setRun(updated)
          if (updated.status === 'completed' || updated.status === 'failed') {
            router.refresh()
          }
        }
      )
      .subscribe()

    console.log('[realtime] subscribed run=', run.id)
    return () => { supabase.removeChannel(channel) }
  }, [run.id, router])

  const analysisTasks = tasks.filter(t => t.kind === 'analysis')
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const phase = derivePhase(tasks)

  const approxSpentSoFar = run.total_cost_usd > 0
    ? run.total_cost_usd.toFixed(2)
    : '0.00'

  const isSynthesizing = run.status === 'synthesizing'

  function openTaskDialog(task: RunTaskRow) {
    if (task.status !== 'completed' && task.status !== 'failed') return
    const agent = agents.find(a => a.id === task.agent_charter_id) ?? null
    const scenario = scenarios.find(s => s.id === task.scenario_id) ?? null
    setDialogState({ open: true, task, agent, scenario })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelRun(run.id)
      if (result.ok) {
        toast.success('Run cancelled.')
        router.push(`/dashboard/d/${decision.id}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  // Activity stream: completed/failed tasks, newest first
  const activityTasks = [...tasks]
    .filter(t => t.status === 'completed' || t.status === 'failed')
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())

  function activityLabel(task: RunTaskRow): string {
    const agent = agents.find(a => a.id === task.agent_charter_id)
    const scenario = scenarios.find(s => s.id === task.scenario_id)
    if (task.kind === 'analysis') return `${agent?.name ?? 'Agent'} weighed in on ${scenario?.name ?? 'a scenario'}.`
    if (task.kind === 'critique') return `${agent?.name ?? 'Agent'} critiqued the council.`
    return 'Council Chair drafted the synthesis.'
  }

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
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-sans font-medium uppercase tracking-wide bg-accent-copper text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {isSynthesizing ? 'Synthesizing' : 'Running'}
          </span>
          <span className="text-xs text-muted-foreground font-sans shrink-0 hidden sm:block">
            {formatRelative(decision.updated_at)}
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-[820px] mx-auto px-6 mt-10">
        <h1 className="font-display text-[36px] font-light text-foreground leading-tight">
          {isSynthesizing ? 'Synthesizing the verdict.' : 'Your council is deliberating.'}
        </h1>
        <p className="text-base text-muted-foreground font-sans mt-2 leading-relaxed">
          You can close this tab. We&apos;ll keep working in the background. Or watch the work.
        </p>
      </div>

      {/* Main layout */}
      <div className="max-w-[820px] mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        {/* LEFT — Live matrix */}
        <div className="lg:col-span-7">
          <LiquidGlass variant="prominent" className="p-8">
            <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground mb-6">
              Council &times; Scenarios
            </p>

            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="w-28" />
                    {scenarios.map(s => (
                      <th key={s.id} className="w-9">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="text-[10px] font-sans text-muted-foreground"
                            style={{ writingMode: 'vertical-rl', maxHeight: '60px', overflow: 'hidden' }}
                            title={s.name}
                          >
                            {s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name}
                          </span>
                          {s.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => (
                    <tr key={agent.id}>
                      <td className="pr-2">
                        <div className="flex items-center gap-1 justify-end">
                          <span
                            className="text-[10px] font-sans text-muted-foreground text-right"
                            title={agent.name}
                          >
                            {agent.name.length > 18 ? agent.name.slice(0, 18) + '…' : agent.name}
                          </span>
                          {agent.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                        </div>
                      </td>
                      {scenarios.map(s => {
                        const task = analysisTasks.find(
                          t => t.agent_charter_id === agent.id && t.scenario_id === s.id
                        )
                        const status = task?.status ?? 'pending'
                        const clickable = status === 'completed' || status === 'failed'

                        return (
                          <td key={s.id}>
                            <AnimatePresence mode="wait">
                              <motion.button
                                key={status}
                                initial={{ opacity: 0.6 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => task && openTaskDialog(task)}
                                disabled={!clickable}
                                title={`${agent.name} × ${s.name} — ${status}`}
                                className={[
                                  'w-9 h-9 rounded-md flex items-center justify-center transition-colors border',
                                  status === 'pending' && 'bg-surface border-border',
                                  status === 'running' && 'bg-accent-copper/15 border-accent-copper/50',
                                  status === 'completed' && 'bg-accent-copper/20 border-accent-copper/30 cursor-pointer hover:bg-accent-copper/30',
                                  status === 'failed' && 'bg-destructive/15 border-destructive/30 cursor-pointer hover:bg-destructive/20',
                                ].filter(Boolean).join(' ')}
                              >
                                {status === 'running' && (
                                  <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="w-2 h-2 rounded-full bg-accent-copper"
                                  />
                                )}
                                {status === 'completed' && <Check className="h-3.5 w-3.5 text-accent-copper" />}
                                {status === 'failed' && <X className="h-3.5 w-3.5 text-destructive" />}
                              </motion.button>
                            </AnimatePresence>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Progress */}
            <div className="mt-8 space-y-3">
              <p className="text-xs font-sans font-medium text-accent-copper">{phase.label}</p>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent-copper"
                  animate={{ width: `${run.progress_pct ?? 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-sans">
                <span>{completedCount} of {totalCount} tasks complete</span>
                <span>{formatDuration(elapsedMs)} elapsed</span>
              </div>
            </div>

            {/* Cancel */}
            <div className="mt-6 flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm text-muted-foreground font-sans hover:text-foreground transition-colors">
                    Cancel run
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this run?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tasks already in flight will finish but their results won&apos;t be used.
                      You&apos;ll be charged for AI calls already made (~${approxSpentSoFar}).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep running</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} className="bg-destructive text-white hover:bg-destructive/90">
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel run'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </LiquidGlass>
        </div>

        {/* RIGHT — Activity stream */}
        <div className="lg:col-span-5">
          <LiquidGlass variant="subtle" className="p-6 max-h-[600px] overflow-y-auto flex flex-col">
            <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground mb-4 shrink-0">
              Council voices
            </p>

            {activityTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans italic">Waiting for the first voice…</p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {activityTasks.map(task => (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      onClick={() => openTaskDialog(task)}
                      className="w-full text-left flex items-start gap-2.5 hover:bg-foreground/5 rounded-lg p-1.5 -mx-1.5 transition-colors"
                    >
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-accent-copper shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-sans text-foreground leading-snug">
                          {activityLabel(task)}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          {task.completed_at ? formatRelative(task.completed_at) : ''}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </LiquidGlass>
        </div>
      </div>

      <TaskCellDialog state={dialogState} onClose={() => setDialogState(s => ({ ...s, open: false }))} />
    </div>
  )
}
