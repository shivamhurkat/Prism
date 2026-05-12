import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { DecisionWorkspace } from '@/components/decision-workspace'
import { LiveRunView } from '@/components/live-run-view'
import { CompletedRunPlaceholder } from '@/components/completed-run-placeholder'
import { ArchivedNotice } from '@/components/archived-notice'
import { FailedBanner } from '@/components/failed-banner'
import { getApiKeyStatus } from '@/app/actions/api-keys'
import { updateDecisionBasics } from '@/app/actions/decisions'
import { WIZARD_STEPS, type WizardStep } from '@/lib/wizard/reachability'
import { MODELS, type Provider } from '@/lib/ai/models'
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

  // Fetch core decision
  const { data: decision } = await supabase
    .from('decisions')
    .select('id, title, question, context_text, status, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

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

  const { status } = decision

  // ── ARCHIVED ──────────────────────────────────────────────────────────────
  if (status === 'archived') {
    return <ArchivedNotice />
  }

  // ── RUNNING / SYNTHESIZING ─────────────────────────────────────────────────
  if (status === 'running' || status === 'synthesizing') {
    const [
      { data: agents },
      { data: scenarios },
      { data: runs },
    ] = await Promise.all([
      supabase
        .from('agent_charters')
        .select('id, name, locked')
        .eq('decision_id', id)
        .order('position'),
      supabase
        .from('scenarios')
        .select('id, name, locked')
        .eq('decision_id', id)
        .order('position'),
      supabase
        .from('runs')
        .select('*')
        .eq('decision_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    const latestRun = runs?.[0] ?? null
    if (!latestRun) {
      // Inconsistent state — fall back to wizard
    } else {
      const { data: tasks } = await supabase
        .from('run_tasks')
        .select('*')
        .eq('run_id', latestRun.id)
        .order('created_at')

      return (
        <LiveRunView
          decision={decision}
          run={latestRun}
          tasks={tasks ?? []}
          agents={agents ?? []}
          scenarios={scenarios ?? []}
        />
      )
    }
  }

  // ── COMPLETED ──────────────────────────────────────────────────────────────
  if (status === 'completed') {
    const [{ data: runs }, { data: profile }] = await Promise.all([
      supabase
        .from('runs')
        .select('*')
        .eq('decision_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase.from('profiles').select('preferred_provider').eq('id', user.id).single(),
    ])

    const latestRun = runs?.[0] ?? null
    const provider: Provider = (profile?.preferred_provider as Provider | null) ?? 'anthropic'
    const modelsUsed = { analysis: MODELS[provider].analysis, synthesis: MODELS[provider].heavy }

    const [{ data: synthesis }, { data: tasks }] = await Promise.all([
      latestRun
        ? supabase.from('run_synthesis').select('*').eq('run_id', latestRun.id).single()
        : Promise.resolve({ data: null }),
      latestRun
        ? supabase.from('run_tasks').select('*').eq('run_id', latestRun.id).order('created_at')
        : Promise.resolve({ data: [] }),
    ])

    return (
      <CompletedRunPlaceholder
        decision={decision}
        run={latestRun!}
        synthesis={synthesis ?? null}
        tasks={tasks ?? []}
        modelsUsed={modelsUsed}
      />
    )
  }

  // ── FAILED ─────────────────────────────────────────────────────────────────
  // ── CANCELLED ─────────────────────────────────────────────────────────────
  // ── DRAFT / CONFIGURING / READY ────────────────────────────────────────────
  // All fall through to the wizard with optional banners

  const latestGenRow = await supabase
    .from('decision_clarifications')
    .select('generation_id')
    .eq('decision_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const latestGenId = latestGenRow.data?.generation_id ?? null

  const [
    { data: files },
    { data: clarifications },
    { data: agents },
    { data: scenarios },
    { data: latestRunRows },
    apiKeyStatus,
  ] = await Promise.all([
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
    supabase
      .from('runs')
      .select('error_message')
      .eq('decision_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
    getApiKeyStatus(),
  ])

  const initialFiles = files ?? []
  const latestClarifications = (clarifications ?? []).map(c => ({
    ...c,
    suggested_answers: Array.isArray(c.suggested_answers) ? c.suggested_answers as string[] : [],
  }))
  const agentList = agents ?? []
  const scenarioList = scenarios ?? []
  const lastRunErrorMessage = latestRunRows?.[0]?.error_message ?? null

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
    <>
      {/* Failed banner */}
      {status === 'failed' && lastRunErrorMessage && (
        <FailedBanner decisionId={id} errorMessage={lastRunErrorMessage} />
      )}

      {/* Cancelled banner */}
      {status === 'cancelled' && (
        <div className="bg-border/30 border-b border-border px-6 py-3">
          <div className="max-w-[820px] mx-auto">
            <p className="text-sm font-sans text-muted-foreground">
              This run was cancelled. Continue editing or run again.
            </p>
          </div>
        </div>
      )}

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
    </>
  )
}
