'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, Loader2 } from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { estimateRunCost } from '@/lib/ai/estimator'
import { startDeliberation } from '@/app/actions/runs'
import type { Provider } from '@/lib/ai/models'

interface Agent {
  id: string
  name: string
  locked: boolean
}

interface Scenario {
  id: string
  name: string
  locked: boolean
}

interface Props {
  decisionId: string
  agentsCount: number
  scenariosCount: number
  filesCount: number
  contextChars: number
  provider: Provider
  hasApiKey: boolean
  agents: Agent[]
  scenarios: Scenario[]
}

export function PreRunReview({
  decisionId,
  agentsCount,
  scenariosCount,
  filesCount,
  contextChars,
  provider,
  hasApiKey,
  agents,
  scenarios,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const estimate = estimateRunCost({ agentsCount, scenariosCount, contextChars, provider })
  const deliberations = agentsCount * scenariosCount

  const canRun = hasApiKey && agentsCount >= 2 && scenariosCount >= 2

  let disabledReason: string | null = null
  if (!hasApiKey) {
    disabledReason = 'Connect an API key in Settings to run.'
  } else if (agentsCount < 2) {
    disabledReason = 'Add at least 2 agents to your council. The Devil\'s Advocate plus one other minimum.'
  } else if (scenariosCount < 2) {
    disabledReason = 'Add at least 2 scenarios. The Premortem plus one other minimum.'
  }

  function handleRun() {
    if (!canRun || isPending) return
    console.log('[run] requested', {
      decisionId,
      estimate: {
        totalCalls: estimate.totalCalls,
        estimatedCostUsd: estimate.estimatedCostUsd,
        estimatedMinutes: estimate.estimatedMinutes,
        modelUsed: estimate.modelUsed,
      },
    })
    startTransition(async () => {
      const result = await startDeliberation(decisionId)
      if (result.ok) {
        router.push(`/dashboard/d/${decisionId}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-0">
      {/* Section heading */}
      <div>
        <h2 className="font-display text-[24px] font-light text-foreground">Pre-run review</h2>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Once you click Run, your council deliberates across every scenario. This is the work — and the cost — you&apos;re about to commission.
        </p>
      </div>

      <LiquidGlass variant="prominent" className="p-8 mt-6">
        {/* A. Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: agentsCount, label: 'Agents' },
            { value: scenariosCount, label: 'Scenarios' },
            { value: deliberations, label: 'Deliberations' },
            { value: filesCount, label: 'Context files' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1">
              <span className="font-display text-[32px] font-light text-accent-copper leading-none">
                {value}
              </span>
              <span className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* B. Matrix */}
        <div className="mt-8">
          <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-4">
            Council &times; Scenarios
          </p>
          {agents.length < 1 || scenarios.length < 1 ? (
            <div className="border border-dashed border-border rounded-[14px] p-6 text-center">
              <p className="text-sm text-muted-foreground font-sans">
                Configure both to preview the matrix.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="w-24" />
                    {scenarios.map(s => (
                      <th key={s.id} className="w-8">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="text-[11px] font-sans text-muted-foreground"
                            style={{ writingMode: 'vertical-rl', maxHeight: '64px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={s.name}
                          >
                            {s.name.length > 16 ? s.name.slice(0, 16) + '…' : s.name}
                          </span>
                          {s.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
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
                            className="text-[11px] font-sans text-muted-foreground text-right"
                            title={agent.name}
                          >
                            {agent.name.length > 20 ? agent.name.slice(0, 20) + '…' : agent.name}
                          </span>
                          {agent.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                        </div>
                      </td>
                      {scenarios.map(s => (
                        <td key={s.id}>
                          <LiquidGlass
                            variant="subtle"
                            className="w-7 h-7 rounded-md"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* C. Cost + time */}
        <div className="mt-8 flex justify-between items-center gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[28px] font-light text-foreground leading-none">
              ${estimate.estimatedCostUsd.toFixed(2)}
            </span>
            <span className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
              Estimated cost · {estimate.modelUsed}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="font-display text-[28px] font-light text-foreground leading-none">
              ~{estimate.estimatedMinutes} min
            </span>
            <span className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
              Estimated time · {estimate.totalCalls} calls
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground font-sans">
          Actuals will be tracked against this estimate. Switch provider in Settings before running to lower cost.
        </p>

        {/* D. Run button */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun || isPending}
            className="w-full md:max-w-[280px] h-12 flex items-center justify-center gap-2 rounded-full bg-accent-copper text-white text-sm font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Starting…' : 'Run deliberation'}
          </button>
          {disabledReason && (
            <p className="text-xs text-muted-foreground font-sans text-center max-w-xs">
              {disabledReason}
            </p>
          )}
        </div>
      </LiquidGlass>
    </div>
  )
}
