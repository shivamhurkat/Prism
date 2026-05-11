'use client'

import { ScenariosSection } from '@/components/scenarios-section'

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
  decisionId: string
  scenarios: Scenario[]
  hasApiKey: boolean
}

export function ScenariosStep({ decisionId, scenarios, hasApiKey }: Props) {
  return (
    <ScenariosSection
      decisionId={decisionId}
      scenarios={scenarios}
      hasApiKey={hasApiKey}
    />
  )
}
