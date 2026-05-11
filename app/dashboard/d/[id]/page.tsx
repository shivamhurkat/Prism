import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { FileSection } from '@/components/file-list'
import { ContinueToConfigButton } from '@/components/continue-to-config-button'
import { ClarificationsSection } from '@/components/clarifications-section'
import { AgentCouncilSection } from '@/components/agent-council-section'
import { EditableField } from '@/components/ui/editable-field'
import { getApiKeyStatus } from '@/app/actions/api-keys'
import { updateDecisionBasics } from '@/app/actions/decisions'
import type { DecisionStatus } from '@/lib/database.types'

export const metadata = {
  title: 'Decision — Prism',
}

const statusConfig: Record<DecisionStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-border/60 text-muted-foreground' },
  configuring: {
    label: 'Configuring',
    className: 'border border-accent-copper text-accent-copper',
  },
  ready: { label: 'Ready', className: 'border border-accent-copper text-accent-copper' },
  running: { label: 'Running', className: 'bg-accent-copper text-white' },
  completed: { label: 'Completed', className: 'bg-success/15 text-success' },
  archived: { label: 'Archived', className: 'bg-border/60 text-muted-foreground' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive' },
}

const FROZEN_STATUSES = new Set(['running', 'completed'])

interface Props {
  params: Promise<{ id: string }>
}

export default async function DecisionDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  // Fetch latest clarification generation_id first, then rows for that generation
  const latestGenRow = await supabase
    .from('decision_clarifications')
    .select('generation_id')
    .eq('decision_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const latestGenId = latestGenRow.data?.generation_id ?? null

  const [{ data: decision }, { data: files }, { data: clarifications }, { data: agents }, apiKeyStatus] =
    await Promise.all([
      supabase
        .from('decisions')
        .select('id, title, question, context_text, status, created_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('decision_files')
        .select('id, file_name, byte_size, file_type, extracted_text, parse_status, parse_skipped_reason, created_at')
        .eq('decision_id', id)
        .order('created_at', { ascending: true }),
      latestGenId
        ? supabase
            .from('decision_clarifications')
            .select('id, question, suggested_answers, user_answer, position')
            .eq('decision_id', id)
            .eq('generation_id', latestGenId)
            .order('position', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from('agent_charters')
        .select('id, name, role, perspective, biases, locked, position')
        .eq('decision_id', id)
        .order('position', { ascending: true }),
      getApiKeyStatus(),
    ])

  if (!decision) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <LiquidGlass className="p-10 max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl font-light text-foreground">
            Decision not found.
          </h1>
          <p className="text-sm text-muted-foreground font-sans">
            It may have been deleted or you may not have access.
          </p>
          <Link
            href="/dashboard"
            className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors font-sans underline underline-offset-2"
          >
            ← Back to dashboard
          </Link>
        </LiquidGlass>
      </div>
    )
  }

  const { label, className } = statusConfig[decision.status]
  const initialFiles = files ?? []
  const latestClarifications = (clarifications ?? []).map(c => ({
    ...c,
    suggested_answers: Array.isArray(c.suggested_answers) ? c.suggested_answers as string[] : [],
  }))
  const agentList = (agents ?? []).map(a => ({
    id: a.id,
    name: a.name,
    role: a.role,
    perspective: a.perspective,
    biases: a.biases,
    locked: a.locked,
    position: a.position,
  }))

  const isLocked = FROZEN_STATUSES.has(decision.status)

  async function onSaveTitle(newValue: string) {
    'use server'
    return updateDecisionBasics(id, { title: newValue })
  }

  async function onSaveQuestion(newValue: string) {
    'use server'
    return updateDecisionBasics(id, { question: newValue })
  }

  async function onSaveContextText(newValue: string) {
    'use server'
    return updateDecisionBasics(id, { context_text: newValue })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground font-sans hover:text-foreground transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <LiquidGlass className="p-8">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <EditableField
                variant="title"
                value={decision.title}
                onSave={onSaveTitle}
                maxLength={120}
                disabled={isLocked}
              />
            </div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-sans font-medium uppercase tracking-wide mt-2 ${className}`}
            >
              {label}
            </span>
          </div>

          {/* Decision question */}
          <div className="mt-2 mb-6">
            <EditableField
              variant="prose"
              value={decision.question ?? ''}
              onSave={onSaveQuestion}
              label="decision question"
              placeholder="What is the decision you need to make?"
              disabled={isLocked}
            />
          </div>

          {/* Context & files section */}
          <div className="border-t border-border pt-6 space-y-5">
            <div>
              <h2 className="font-display text-[24px] font-light text-foreground">
                Context &amp; files
              </h2>
              <p className="text-sm text-muted-foreground font-sans mt-1">
                Upload board decks, financials, contracts, strategy memos — anything your council should read.
              </p>
            </div>

            {/* Written context inline edit */}
            <div>
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

            <FileSection decisionId={id} initialFiles={initialFiles} />
          </div>

          <ClarificationsSection
            decisionId={id}
            hasApiKey={apiKeyStatus.hasKey}
            latestClarifications={latestClarifications}
          />

          <AgentCouncilSection
            decisionId={id}
            agents={agentList}
            hasApiKey={apiKeyStatus.hasKey}
          />

          <div className="border-t border-border pt-6">
            <div className="flex justify-end">
              <ContinueToConfigButton />
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>
  )
}
