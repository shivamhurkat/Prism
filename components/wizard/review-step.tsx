'use client'

import { PreRunReview } from '@/components/pre-run-review'
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

export function ReviewStep(props: Props) {
  return <PreRunReview {...props} />
}
