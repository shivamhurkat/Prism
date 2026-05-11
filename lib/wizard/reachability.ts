export type WizardStep = 'context' | 'clarifications' | 'council' | 'scenarios' | 'review'

export const WIZARD_STEPS: WizardStep[] = ['context', 'clarifications', 'council', 'scenarios', 'review']

export interface StepData {
  currentStep: WizardStep
  decision: { title: string; question: string | null }
  agents: { id: string }[]
  scenarios: { id: string }[]
}

export type StepStatus = 'completed' | 'current' | 'reachable' | 'unreachable'

function meetsThreshold(step: WizardStep, data: Pick<StepData, 'decision' | 'agents' | 'scenarios'>): boolean {
  const titleOk = data.decision.title.trim().length >= 1
  const questionOk = (data.decision.question ?? '').trim().length >= 50
  switch (step) {
    case 'context': return true
    case 'clarifications': return titleOk && questionOk
    case 'council': return titleOk && questionOk
    case 'scenarios': return data.agents.length >= 2
    case 'review': return data.scenarios.length >= 2
  }
}

export function getStepStatus(step: WizardStep, data: StepData): StepStatus {
  const currentIndex = WIZARD_STEPS.indexOf(data.currentStep)
  const stepIndex = WIZARD_STEPS.indexOf(step)
  if (step === data.currentStep) return 'current'
  if (!meetsThreshold(step, data)) return 'unreachable'
  if (stepIndex < currentIndex) return 'completed'
  return 'reachable'
}

export function canAdvanceFrom(step: WizardStep, data: Pick<StepData, 'decision' | 'agents' | 'scenarios'>): boolean {
  const titleOk = data.decision.title.trim().length >= 1
  const questionOk = (data.decision.question ?? '').trim().length >= 50
  switch (step) {
    case 'context': return titleOk && questionOk
    case 'clarifications': return true
    case 'council': return data.agents.length >= 2
    case 'scenarios': return data.scenarios.length >= 2
    case 'review': return false
  }
}

export function nextStep(step: WizardStep): WizardStep | null {
  const idx = WIZARD_STEPS.indexOf(step)
  return idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1] : null
}

export function prevStep(step: WizardStep): WizardStep | null {
  const idx = WIZARD_STEPS.indexOf(step)
  return idx > 0 ? WIZARD_STEPS[idx - 1] : null
}

export const STEP_LABELS: Record<WizardStep, string> = {
  context: 'Context',
  clarifications: 'Clarifications',
  council: 'Council',
  scenarios: 'Scenarios',
  review: 'Review',
}

export const ADVANCE_HINTS: Record<WizardStep, string | null> = {
  context: 'Add a title and a question of at least 50 characters.',
  clarifications: null,
  council: 'Add at least 2 agents (the Devil\'s Advocate counts as one).',
  scenarios: 'Add at least 2 scenarios (the Premortem counts as one).',
  review: null,
}
