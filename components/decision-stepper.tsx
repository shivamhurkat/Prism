'use client'

import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import {
  WIZARD_STEPS,
  STEP_LABELS,
  getStepStatus,
  type WizardStep,
  type StepData,
} from '@/lib/wizard/reachability'
import { cn } from '@/lib/utils'

interface Props {
  currentStep: WizardStep
  decisionId: string
  data: StepData
}

export function DecisionStepper({ currentStep, decisionId, data }: Props) {
  const router = useRouter()
  const currentIndex = WIZARD_STEPS.indexOf(currentStep)

  function navigate(step: WizardStep) {
    console.log('[wizard] navigated', currentStep, '→', step)
    router.push(`/dashboard/d/${decisionId}?step=${step}`)
  }

  return (
    <>
      {/* Desktop stepper */}
      <div className="hidden md:flex items-center justify-center max-w-[760px] mx-auto mt-6 mb-10">
        {WIZARD_STEPS.map((step, idx) => {
          const status = getStepStatus(step, data)
          const isClickable = status === 'completed' || status === 'current' || status === 'reachable'
          const stepNumber = idx + 1

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Connector before */}
              {idx > 0 && (
                <div
                  className={cn(
                    'h-px flex-1',
                    idx <= currentIndex ? 'bg-accent-copper' : 'bg-border'
                  )}
                />
              )}

              {/* Node */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => isClickable && step !== currentStep && navigate(step)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
                    status === 'completed' && 'border-2 border-accent-copper bg-background',
                    status === 'current' && 'bg-accent-copper',
                    status === 'reachable' && 'border border-border bg-background hover:border-accent-copper/50',
                    status === 'unreachable' && 'border border-border bg-background opacity-50 cursor-not-allowed'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-4 w-4 text-accent-copper" strokeWidth={2.5} />
                  ) : (
                    <span
                      className={cn(
                        'font-display text-[14px] leading-none',
                        status === 'current' ? 'text-white' : 'text-muted-foreground'
                      )}
                    >
                      {stepNumber}
                    </span>
                  )}
                </button>

                <span
                  className={cn(
                    'text-[12px] font-sans whitespace-nowrap',
                    status === 'completed' && 'text-accent-copper',
                    status === 'current' && 'text-accent-copper font-medium',
                    (status === 'reachable' || status === 'unreachable') && 'text-muted-foreground'
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>

              {/* Connector after (last node only, hidden since we do it before each) */}
              {idx < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-1',
                    idx < currentIndex ? 'bg-accent-copper' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile stepper */}
      <div className="md:hidden px-6 mt-4 mb-6">
        <p className="text-sm font-sans text-muted-foreground">
          Step {currentIndex + 1} of {WIZARD_STEPS.length} · {STEP_LABELS[currentStep]}
        </p>
        <div className="mt-2 h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-copper rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  )
}
