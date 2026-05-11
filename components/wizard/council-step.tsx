'use client'

import { AgentCouncilSection } from '@/components/agent-council-section'

interface Agent {
  id: string
  name: string
  role: string | null
  perspective: string | null
  biases: string | null
  locked: boolean
  position: number
}

interface Props {
  decisionId: string
  agents: Agent[]
  hasApiKey: boolean
}

export function CouncilStep({ decisionId, agents, hasApiKey }: Props) {
  return (
    <AgentCouncilSection
      decisionId={decisionId}
      agents={agents}
      hasApiKey={hasApiKey}
    />
  )
}
