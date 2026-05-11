import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { DecisionWorkspace } from '@/components/decision-workspace'
import { getApiKeyStatus } from '@/app/actions/api-keys'
import { updateDecisionBasics } from '@/app/actions/decisions'
import { WIZARD_STEPS, type WizardStep } from '@/lib/wizard/reachability'
import Link from 'next/link'

export const metadata = {
  title: 'Decision — Prism',
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string }>
}

export default async function DecisionDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const stepParam = sp.step as string | undefined
  const currentStep: WizardStep = WIZARD_STEPS.includes(stepParam as WizardStep)
    ? (stepParam as WizardStep)
    : 'context'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  // Fetch latest clarification generation_id
  const latestGenRow = await supabase
    .from('decision_clarifications')
    .select('generation_id')
    .eq('decision_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const latestGenId = latestGenRow.data?.generation_id ?? null

  const [
    { data: decision },
    { data: files },
    { data: clarifications },
    { data: agents },
    { data: scenarios },
    apiKeyStatus,
  ] = await Promise.all([
    supabase
      .from('decisions')
      .select('id, title, question, context_text, status, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('decision_files')
      .select('id, decision_id, file_name, byte_size, file_type, extracted_text, parse_status, parse_skipped_reason, created_at, storage_path')
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
    supabase
      .from('scenarios')
      .select('id, name, description, assumptions, time_horizon, locked, position')
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
            &larr; Back to dashboard
          </Link>
        </LiquidGlass>
      </div>
    )
  }

  const initialFiles = files ?? []
  const latestClarifications = (clarifications ?? []).map(c => ({
    ...c,
    suggested_answers: Array.isArray(c.suggested_answers) ? c.suggested_answers as string[] : [],
  }))
  const agentList = agents ?? []
  const scenarioList = scenarios ?? []

  const contextChars =
    (decision.context_text?.length ?? 0) +
    initialFiles.reduce((n, f) => n + (f.extracted_text?.length ?? 0), 0) +
    latestClarifications.reduce((n, c) => n + 200 + (c.user_answer?.length ?? 0), 0)

  async function onSaveTitle(newValue: string): Promise<{ ok: boolean; error?: string }> {
    'use server'
    return updateDecisionBasics(id, { title: newValue })
  }

  async function onSaveQuestion(newValue: string): Promise<{ ok: boolean; error?: string }> {
    'use server'
    return updateDecisionBasics(id, { question: newValue })
  }

  async function onSaveContextText(newValue: string): Promise<{ ok: boolean; error?: string }> {
    'use server'
    return updateDecisionBasics(id, { context_text: newValue })
  }

  return (
    <DecisionWorkspace
      decision={decision}
      files={initialFiles}
      clarifications={latestClarifications}
      agents={agentList}
      scenarios={scenarioList}
      apiKeyStatus={apiKeyStatus}
      contextChars={contextChars}
      currentStep={currentStep}
      onSaveTitle={onSaveTitle}
      onSaveQuestion={onSaveQuestion}
      onSaveContextText={onSaveContextText}
    />
  )
}
