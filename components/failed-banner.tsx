'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { retryFailedRun } from '@/app/actions/runs'

interface Props {
  decisionId: string
  errorMessage: string
}

export function FailedBanner({ decisionId, errorMessage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRetry() {
    startTransition(async () => {
      const result = await retryFailedRun(decisionId)
      if (result.ok) {
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3">
      <div className="max-w-[820px] mx-auto flex items-center justify-between gap-4">
        <p className="text-sm font-sans text-destructive">
          Last run failed: {errorMessage}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isPending}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-sans text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Try again
        </button>
      </div>
    </div>
  )
}
