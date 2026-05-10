'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  saveDecisionDraft,
  saveDecisionAndContinue,
  type DecisionDraftState,
  type DecisionContinueState,
} from '@/app/actions/decisions'

const CONTEXT_KEY = 'prism:newDecision:contextExpanded'

const draftInitial: DecisionDraftState = { status: 'idle' }
const continueInitial: DecisionContinueState = { status: 'idle' }

export function NewDecisionForm() {
  const router = useRouter()

  const [draftState, draftAction] = useActionState(saveDecisionDraft, draftInitial)
  const [continueState, continueAction] = useActionState(saveDecisionAndContinue, continueInitial)

  const [decisionId, setDecisionId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [contextText, setContextText] = useState('')

  const [contextExpanded, setContextExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(CONTEXT_KEY) === 'true'
    } catch {
      return false
    }
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contextRef = useRef<HTMLTextAreaElement>(null)

  function toggleContext() {
    setContextExpanded((v) => {
      const next = !v
      try {
        localStorage.setItem(CONTEXT_KEY, String(next))
      } catch {}
      return next
    })
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    if (textareaRef.current) autoGrow(textareaRef.current)
  }, [question])

  useEffect(() => {
    if (contextRef.current) autoGrow(contextRef.current)
  }, [contextText])

  useEffect(() => {
    if (draftState.status === 'success') {
      toast.success('Draft saved.')
      if (draftState.id && draftState.id !== decisionId) {
        setDecisionId(draftState.id)
        router.replace(`/dashboard/new?id=${draftState.id}`)
      }
    } else if (draftState.status === 'error' && draftState.errors._root) {
      toast.error(draftState.errors._root)
    }
  }, [draftState]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (continueState.status === 'error' && continueState.errors._root) {
      toast.error(continueState.errors._root)
    }
  }, [continueState])

  const draftErrors = draftState.status === 'error' ? draftState.errors : {}
  const continueErrors = continueState.status === 'error' ? continueState.errors : {}
  const titleErrors = draftErrors.title ?? continueErrors.title
  const questionErrors = draftErrors.question ?? continueErrors.question

  const titleOk = title.length >= 1 && title.length <= 120
  const questionOk = question.length >= 50

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title" className="font-sans text-sm text-foreground">
          Title
        </Label>
        <input
          id="title"
          name="title-display"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Sell 4 acres or develop villas"
          required
          className="w-full h-11 rounded-[10px] border border-border bg-transparent px-4 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 focus:border-accent-copper/40 transition-colors"
          aria-invalid={!!titleErrors}
        />
        <div className="flex justify-between items-start">
          {titleErrors ? (
            <p className="text-xs text-destructive font-sans">{titleErrors}</p>
          ) : (
            <span />
          )}
          <span
            className={`text-xs font-mono tabular-nums ${
              title.length > 110 ? 'text-warning' : 'text-muted-foreground'
            }`}
          >
            {title.length}/120
          </span>
        </div>
      </div>

      {/* Decision question */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="question" className="font-sans text-sm text-foreground">
          The decision you need to make
        </Label>
        <textarea
          ref={textareaRef}
          id="question"
          name="question-display"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value)
            autoGrow(e.target)
          }}
          rows={6}
          placeholder="What is the decision? Include the options on the table, who is affected, and the timeline. The clearer this is, the better your council can deliberate."
          required
          className="w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 focus:border-accent-copper/40 transition-colors resize-none overflow-hidden leading-relaxed"
          style={{ maxHeight: '22rem' }}
          aria-invalid={!!questionErrors}
        />
        <div className="flex justify-between items-start">
          {questionErrors ? (
            <p className="text-xs text-destructive font-sans">{questionErrors}</p>
          ) : (
            <span />
          )}
          <span
            className={`text-xs font-mono tabular-nums ${
              questionOk ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            {question.length} chars
          </span>
        </div>
      </div>

      {/* Context — collapsible */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={toggleContext}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-sans self-start"
        >
          {contextExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {contextExpanded ? 'Hide additional context' : '+ Add additional context (optional)'}
        </button>

        {contextExpanded && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="context_text" className="font-sans text-sm text-foreground">
              Additional context
            </Label>
            <textarea
              ref={contextRef}
              id="context_text"
              name="context_text-display"
              value={contextText}
              onChange={(e) => {
                setContextText(e.target.value)
                autoGrow(e.target)
              }}
              rows={4}
              placeholder="Anything else your council should know — background, constraints, what you've already considered."
              className="w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 focus:border-accent-copper/40 transition-colors resize-none overflow-hidden leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex items-center justify-between gap-3">
        {/* Draft form */}
        <form action={draftAction} className="flex-1">
          <input type="hidden" name="id" value={decisionId} />
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="question" value={question} />
          <input type="hidden" name="context_text" value={contextText} />
          <SubmitButton
            variant="secondary"
            disabled={!titleOk}
            pendingLabel="Saving..."
            className="w-full"
          >
            Save as draft
          </SubmitButton>
        </form>

        {/* Continue form */}
        <form action={continueAction} className="flex-1">
          <input type="hidden" name="id" value={decisionId} />
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="question" value={question} />
          <input type="hidden" name="context_text" value={contextText} />
          <SubmitButton
            variant="primary"
            disabled={!titleOk || !questionOk}
            pendingLabel="Saving..."
            className="w-full"
          >
            Continue → Configure council
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
