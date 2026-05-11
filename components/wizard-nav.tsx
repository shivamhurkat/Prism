'use client'

import { useRouter } from 'next/navigation'
import {
  WIZARD_STEPS,
  STEP_LABELS,
  canAdvanceFrom,
  nextStep,
  prevStep,
  ADVANCE_HINTS,
  type WizardStep,
  type StepData,
} from '@/lib/wizard/reachability'
import { cn } from '@/lib/utils'

interface Props {
  currentStep: WizardStep
  decisionId: string
  data: Pick<StepData, 'decision' | 'agents' | 'scenarios'>
}

export function WizardNav({ currentStep, decisionId, data }: Props) {
  const router = useRouter()
  const currentIndex = WIZARD_STEPS.indexOf(currentStep)

  const prev = prevStep(currentStep)
  const next = nextStep(currentStep)
  const canGoNext = canAdvanceFrom(currentStep, data)
  const hint = !canGoNext ? ADVANCE_HINTS[currentStep] : null

  function go(step: WizardStep) {
    console.log('[wizard] navigated', currentStep, '→', step)
    router.push(`/dashboard/d/${decisionId}?step=${step}`)
  }

  const navContent = (isMobile: boolean) => (
    <div className={cn(
      'flex items-center justify-between gap-4',
      isMobile ? 'px-4 py-3' : 'max-w-[820px] mx-auto mt-12 pt-6 border-t border-border'
    )}>
      {/* Back */}
      <button
        type="button"
        onClick={() => prev && go(prev)}
        disabled={!prev}
        className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &larr; Back
      </button>

      {/* Center label — desktop only */}
      {!isMobile && (
        <span className="text-xs text-muted-foreground font-sans">
          Step {currentIndex + 1} of {WIZARD_STEPS.length}
        </span>
      )}

      {/* Next or nothing on review */}
      {currentStep !== 'review' && (
        <div className={cn('flex flex-col gap-1', isMobile ? 'items-end' : 'items-end')}>
          {isMobile && hint && (
            <p className="text-xs text-muted-foreground font-sans text-right max-w-[200px]">
              {hint}
            </p>
          )}
          <button
            type="button"
            onClick={() => next && canGoNext && go(next)}
            disabled={!canGoNext || !next}
            className={cn(
              'rounded-full bg-accent-copper text-white px-5 py-2 text-sm font-sans font-medium transition-opacity',
              (!canGoNext || !next) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
            )}
          >
            {next ? `${STEP_LABELS[next]} →` : 'Next →'}
          </button>
          {!isMobile && hint && (
            <p className="text-xs text-muted-foreground font-sans text-right max-w-[240px]">
              {hint}
            </p>
          )}
        </div>
      )}

      {/* Placeholder spacer on review so back stays left */}
      {currentStep === 'review' && <div />}
    </div>
  )

  return (
    <>
      {/* Desktop inline nav */}
      <div className="hidden md:block">
        {navContent(false)}
      </div>

      {/* Mobile fixed nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur border-t border-border bg-background/80">
        {navContent(true)}
      </div>
    </>
  )
}
