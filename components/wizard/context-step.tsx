'use client'

import { EditableField } from '@/components/ui/editable-field'
import { FileSection } from '@/components/file-list'
import type { Tables } from '@/lib/database.types'

type FileRow = Tables<'decision_files'>
type DecisionStatus = Tables<'decisions'>['status']

interface Props {
  decision: {
    id: string
    title: string
    question: string | null
    context_text: string | null
    status: DecisionStatus
  }
  files: FileRow[]
  onSaveTitle: (value: string) => Promise<{ ok: boolean; error?: string }>
  onSaveQuestion: (value: string) => Promise<{ ok: boolean; error?: string }>
  onSaveContextText: (value: string) => Promise<{ ok: boolean; error?: string }>
  isLocked: boolean
}

export function ContextStep({
  decision,
  files,
  onSaveTitle,
  onSaveQuestion,
  onSaveContextText,
  isLocked,
}: Props) {
  return (
    <div>
      {/* Section heading */}
      <div className="flex items-baseline gap-3 mb-8">
        <h2 className="font-display text-[28px] font-light text-foreground">Context</h2>
        <span className="font-mono text-[13px] text-muted-foreground">01</span>
      </div>
      <p className="text-sm text-muted-foreground font-sans -mt-4 mb-8">
        Define the decision clearly and give your council whatever they should read first.
      </p>

      {/* Title */}
      <EditableField
        variant="title"
        value={decision.title}
        onSave={onSaveTitle}
        maxLength={120}
        disabled={isLocked}
      />

      {/* Question */}
      <div className="mt-6">
        <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-2">
          The decision you need to make
        </p>
        <EditableField
          variant="prose"
          value={decision.question ?? ''}
          onSave={onSaveQuestion}
          label="decision question"
          placeholder="What is the decision? Include the options on the table, who is affected, and the timeline."
          disabled={isLocked}
        />
      </div>

      {/* Written context */}
      <div className="mt-6">
        <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-2">
          Written context
        </p>
        <EditableField
          variant="prose"
          value={decision.context_text ?? ''}
          onSave={onSaveContextText}
          label="written context"
          disabled={isLocked}
        />
      </div>

      {/* Files */}
      <div className="mt-10">
        <h3 className="font-display text-[20px] font-light text-foreground">Files</h3>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Board decks, financials, contracts, strategy memos — anything your council should read.
        </p>
        <div className="mt-6">
          <FileSection decisionId={decision.id} initialFiles={files} />
        </div>
      </div>
    </div>
  )
}
