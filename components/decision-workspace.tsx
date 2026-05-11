'use client'

import { DecisionStepper } from '@/components/decision-stepper'
import { StepFrame } from '@/components/step-frame'
import { WizardNav } from '@/components/wizard-nav'
import { ContextStep } from '@/components/wizard/context-step'
import { ClarificationsStep } from '@/components/wizard/clarifications-step'
import { CouncilStep } from '@/components/wizard/council-step'
import { ScenariosStep } from '@/components/wizard/scenarios-step'
import { ReviewStep } from '@/components/wizard/review-step'
import type { WizardStep, StepData } from '@/lib/wizard/reachability'
import type { Tables } from '@/lib/database.types'
import type { ApiKeyStatus } from '@/app/actions/api-keys'
import type { Provider } from '@/lib/ai/models'

type FileRow = Tables<'decision_files'>
type DecisionStatus = NonNullable<Tables<'decisions'>['status']>

interface Decision {
  id: string
  title: string
  question: string | null
  context_text: string | null
  status: DecisionStatus
  updated_at: string
}

interface Clarification {
  id: string
  question: string
  suggested_answers: string[]
  user_answer: string | null
  position: number
}

interface Agent {
  id: string
  name: string
  role: string | null
  perspective: string | null
  biases: string | null
  locked: boolean
  position: number
}

interface Scenario {
  id: string
  name: string
  description: string | null
  assumptions: string | null
  time_horizon: string | null
  locked: boolean
  position: number
}

interface Props {
  decision: Decision
  files: FileRow[]
  clarifications: Clarification[]
  agents: Agent[]
  scenarios: Scenario[]
  apiKeyStatus: ApiKeyStatus
  contextChars: number
  currentStep: WizardStep
  onSaveTitle: (value: string) => Promise<{ ok: boolean; error?: string }>
  onSaveQuestion: (value: string) => Promise<{ ok: boolean; error?: string }>
  onSaveContextText: (value: string) => Promise<{ ok: boolean; error?: string }>
}

const statusConfig: Record<DecisionStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-border/60 text-muted-foreground' },
  configuring: { label: 'Configuring', className: 'border border-accent-copper text-accent-copper' },
  ready: { label: 'Ready', className: 'border border-accent-copper text-accent-copper' },
  running: { label: 'Running', className: 'bg-accent-copper text-white' },
  synthesizing: { label: 'Synthesizing', className: 'bg-accent-copper text-white' },
  completed: { label: 'Completed', className: 'bg-success/15 text-success' },
  archived: { label: 'Archived', className: 'bg-border/60 text-muted-foreground' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-border/60 text-muted-foreground' },
}

const FROZEN_STATUSES = new Set<DecisionStatus>(['running', 'synthesizing', 'completed'])

function formatRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function DecisionWorkspace({
  decision,
  files,
  clarifications,
  agents,
  scenarios,
  apiKeyStatus,
  contextChars,
  currentStep,
  onSaveTitle,
  onSaveQuestion,
  onSaveContextText,
}: Props) {
  const { label, className } = statusConfig[decision.status]
  const isLocked = FROZEN_STATUSES.has(decision.status)
  const hasApiKey = apiKeyStatus.keys.some(k => k.hasKey)
  const provider: Provider = apiKeyStatus.preferredProvider

  const stepData: StepData = {
    currentStep,
    decision,
    agents,
    scenarios,
  }

  function renderStepContent() {
    switch (currentStep) {
      case 'context':
        return (
          <ContextStep
            decision={decision}
            files={files}
            onSaveTitle={onSaveTitle}
            onSaveQuestion={onSaveQuestion}
            onSaveContextText={onSaveContextText}
            isLocked={isLocked}
          />
        )
      case 'clarifications':
        return (
          <ClarificationsStep
            decisionId={decision.id}
            hasApiKey={hasApiKey}
            latestClarifications={clarifications}
          />
        )
      case 'council':
        return (
          <CouncilStep
            decisionId={decision.id}
            agents={agents}
            hasApiKey={hasApiKey}
          />
        )
      case 'scenarios':
        return (
          <ScenariosStep
            decisionId={decision.id}
            scenarios={scenarios}
            hasApiKey={hasApiKey}
          />
        )
      case 'review':
        return (
          <ReviewStep
            decisionId={decision.id}
            agentsCount={agents.length}
            scenariosCount={scenarios.length}
            filesCount={files.length}
            contextChars={contextChars}
            provider={provider}
            hasApiKey={hasApiKey}
            agents={agents.map(a => ({ id: a.id, name: a.name, locked: a.locked }))}
            scenarios={scenarios.map(s => ({ id: s.id, name: s.name, locked: s.locked }))}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-30 backdrop-blur border-b border-border bg-background/80">
        <div className="max-w-[820px] mx-auto px-6 h-14 flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-xs text-muted-foreground font-sans hover:text-foreground transition-colors shrink-0"
          >
            &larr; Dashboard
          </a>
          <span className="text-sm font-sans font-medium text-foreground truncate max-w-[480px]">
            {decision.title}
          </span>
          <div className="flex-1" />
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-sans font-medium uppercase tracking-wide ${className}`}
          >
            {label}
          </span>
          <span className="text-xs text-muted-foreground font-sans shrink-0 hidden sm:block">
            {formatRelative(decision.updated_at)}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <DecisionStepper
        currentStep={currentStep}
        decisionId={decision.id}
        data={stepData}
      />

      {/* Step content with animation */}
      <StepFrame currentStep={currentStep}>
        {renderStepContent()}
        <WizardNav
          currentStep={currentStep}
          decisionId={decision.id}
          data={stepData}
        />
      </StepFrame>
    </div>
  )
}
