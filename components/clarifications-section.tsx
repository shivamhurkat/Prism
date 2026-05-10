'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ApiKeyModal } from '@/components/api-key-modal'
import { generateClarifications, saveClarificationAnswers } from '@/app/actions/clarifications'
import { cn } from '@/lib/utils'

const LOADING_MESSAGES = [
  'Reading your decision...',
  'Identifying gaps in context...',
  'Drafting questions a sharp advisor would ask...',
  'Almost there...',
]

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

export function ClarificationsSection({ decisionId, hasApiKey, latestClarifications }: Props) {
  const [clarifications, setClarifications] = useState(latestClarifications)
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(latestClarifications.map(c => [c.id, c.user_answer ?? '']))
  )
  const [selectedChips, setSelectedChips] = useState<Record<string, string>>({})
  const [isGenerating, startGenerate] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [skipped, setSkipped] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [pendingRetry, setPendingRetry] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync state when server revalidates and passes updated props — useState only
  // takes the initial value, so we need this effect to pick up questions after generation.
  useEffect(() => {
    if (latestClarifications.length > 0) {
      setClarifications(latestClarifications)
      setAnswers(Object.fromEntries(latestClarifications.map(c => [c.id, c.user_answer ?? ''])))
      setSelectedChips({})
    }
  }, [latestClarifications])

  useEffect(() => {
    if (isGenerating) {
      setLoadingMsgIdx(0)
      loadingTimerRef.current = setInterval(() => {
        setLoadingMsgIdx(i => Math.min(i + 1, LOADING_MESSAGES.length - 1))
      }, 2000)
    } else {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current)
    }
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current)
    }
  }, [isGenerating])

  function handleGenerate() {
    setGenerateError(null)
    startGenerate(async () => {
      const result = await generateClarifications(decisionId)
      if ('error' in result) {
        if (result.code === 'no_api_key') {
          setApiKeyModalOpen(true)
          setPendingRetry(true)
        } else {
          const msg = result.error || 'Generation failed — check server logs.'
          setGenerateError(msg)
          toast.error(msg)
        }
        return
      }
      // State syncs via the useEffect above once revalidatePath re-renders the parent.
    })
  }

  function handleApiKeySuccess() {
    setApiKeyModalOpen(false)
    if (pendingRetry) {
      setPendingRetry(false)
      handleGenerate()
    }
  }

  function handleAnswerChange(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }))
    if (selectedChips[id] && value !== selectedChips[id]) {
      setSelectedChips(prev => { const n = { ...prev }; delete n[id]; return n })
    }
  }

  function handleChipClick(id: string, answer: string) {
    setAnswers(prev => ({ ...prev, [id]: answer }))
    setSelectedChips(prev => ({ ...prev, [id]: answer }))
  }

  function handleSave() {
    startSave(async () => {
      const payload = clarifications.map(c => ({
        id: c.id,
        user_answer: answers[c.id] ?? '',
      }))
      const result = await saveClarificationAnswers(decisionId, payload)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Answers saved.')
    })
  }

  if (skipped) return null

  const isEmpty = clarifications.length === 0

  return (
    <>
      <div className="border-t border-border pt-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[24px] font-light text-foreground">
              Clarifying questions
            </h2>
            {isEmpty && (
              <p className="text-sm text-muted-foreground font-sans mt-1">
                A sharp analyst will read your context and ask the questions that would change the answer.
              </p>
            )}
          </div>
          {!isEmpty && (
            <span className="text-sm text-muted-foreground font-sans shrink-0 mt-1">
              {clarifications.length} {clarifications.length === 1 ? 'question' : 'questions'}
            </span>
          )}
        </div>

        {isEmpty && (
          <LiquidGlass variant="subtle" className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              {isGenerating ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-accent-copper" />
                  <p className="text-sm text-muted-foreground font-sans transition-opacity">
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="rounded-full bg-accent-copper text-white px-6 py-2.5 text-sm font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate clarifying questions
                  </button>
                  {generateError && (
                    <p className="text-xs text-destructive font-sans max-w-sm">
                      {generateError}
                    </p>
                  )}
                  <button
                    onClick={() => setSkipped(true)}
                    className="text-xs text-muted-foreground font-sans hover:text-foreground transition-colors"
                  >
                    Skip — these are optional. Your council will work with what you&apos;ve given.
                  </button>
                </>
              )}
            </div>
          </LiquidGlass>
        )}

        {!isEmpty && (
          <>
            {isGenerating && (
              <LiquidGlass variant="subtle" className="p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-copper" />
                  <p className="text-sm text-muted-foreground font-sans">
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </p>
                </div>
              </LiquidGlass>
            )}

            {!isGenerating && (
              <div className="space-y-4">
                {clarifications.map((c, i) => (
                  <LiquidGlass key={c.id} variant="subtle" className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5 w-6">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-base font-sans leading-relaxed text-foreground">
                        {c.question}
                      </p>
                    </div>

                    {c.suggested_answers.length > 0 && (
                      <div className="flex flex-wrap gap-2 pl-10">
                        {c.suggested_answers.map(chip => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleChipClick(c.id, chip)}
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-sans border transition-colors',
                              selectedChips[c.id] === chip
                                ? 'border-accent-copper text-accent-copper bg-accent-copper/5'
                                : 'border-border text-muted-foreground hover:border-accent-copper/50 hover:text-foreground'
                            )}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="pl-10 space-y-1">
                      <AutoGrowTextarea
                        value={answers[c.id] ?? ''}
                        onChange={v => handleAnswerChange(c.id, v)}
                        placeholder="Your answer (optional)"
                      />
                      <p className="text-xs text-muted-foreground font-sans text-right">
                        {(answers[c.id] ?? '').length} chars
                      </p>
                    </div>
                  </LiquidGlass>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-full bg-accent-copper text-white px-6 py-2.5 text-sm font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save answers
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={isGenerating}
                    className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Replace existing questions and answers?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your current answers will not be saved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerate}>
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <button
                onClick={() => setSkipped(true)}
                className="text-xs text-muted-foreground font-sans hover:text-foreground transition-colors ml-auto"
              >
                Skip — these are optional.
              </button>
            </div>
          </>
        )}
      </div>

      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={open => {
          setApiKeyModalOpen(open)
          if (!open) setPendingRetry(false)
        }}
      />
    </>
  )
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full resize-none rounded-[10px] border border-border bg-surface px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition overflow-hidden"
    />
  )
}
