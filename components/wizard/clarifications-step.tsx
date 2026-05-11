'use client'

import { useRouter } from 'next/navigation'
import { ClarificationsSection } from '@/components/clarifications-section'

interface Clarification {
  id: string
  question: string
  suggested_answers: string[]
  user_answer: string | null
  position: number
}

interface Props {
  decisionId: string
  hasApiKey: boolean
  latestClarifications: Clarification[]
}

export function ClarificationsStep({ decisionId, hasApiKey, latestClarifications }: Props) {
  const router = useRouter()

  const hasClarifications = latestClarifications.length > 0

  return (
    <div>
      <ClarificationsSection
        decisionId={decisionId}
        hasApiKey={hasApiKey}
        latestClarifications={latestClarifications}
      />

      {!hasClarifications && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/d/${decisionId}?step=council`)}
            className="text-sm text-muted-foreground font-sans hover:text-foreground transition-colors"
          >
            Skip clarifications — your council can work with what you&apos;ve given. &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
