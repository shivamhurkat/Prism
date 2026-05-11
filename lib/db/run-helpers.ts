/**
 * RUN HELPERS — server-only
 *
 * SECURITY NOTE: This file uses SUPABASE_SERVICE_ROLE_KEY to bypass Row-Level Security.
 * This is intentional: Inngest functions execute in a background context with no user
 * session, so the anon/user client cannot be used. The service-role client is scoped
 * strictly to run-related tables and is the ONLY place outside admin paths where RLS
 * is bypassed. Never import this file from client components or user-facing server actions.
 */
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type RunRow = Database['public']['Tables']['runs']['Row']
export type RunTaskRow = Database['public']['Tables']['run_tasks']['Row']

export async function getRun(runId: string): Promise<RunRow> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from('runs').select('*').eq('id', runId).single()
  if (error || !data) throw new Error(`getRun failed: ${error?.message}`)
  return data
}

export async function getRunTasks(
  runId: string,
  kind?: 'analysis' | 'critique' | 'synthesis',
  status?: 'pending' | 'running' | 'completed' | 'failed'
): Promise<RunTaskRow[]> {
  const supabase = getServiceClient()
  let q = supabase.from('run_tasks').select('*').eq('run_id', runId)
  if (kind) q = q.eq('kind', kind)
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) throw new Error(`getRunTasks failed: ${error.message}`)
  return data ?? []
}

export async function getSynthesisTask(runId: string): Promise<RunTaskRow> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('run_tasks')
    .select('*')
    .eq('run_id', runId)
    .eq('kind', 'synthesis')
    .single()
  if (error || !data) throw new Error(`getSynthesisTask failed: ${error?.message}`)
  return data
}

export async function getDecisionWithChildren(decisionId: string) {
  const supabase = getServiceClient()

  const [
    { data: decision, error: dErr },
    { data: files },
    { data: agents },
    { data: scenarios },
    { data: latestGenRow },
  ] = await Promise.all([
    supabase.from('decisions').select('*').eq('id', decisionId).single(),
    supabase
      .from('decision_files')
      .select('file_name, extracted_text, parse_skipped_reason')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('agent_charters')
      .select('*')
      .eq('decision_id', decisionId)
      .order('position', { ascending: true }),
    supabase
      .from('scenarios')
      .select('*')
      .eq('decision_id', decisionId)
      .order('position', { ascending: true }),
    supabase
      .from('decision_clarifications')
      .select('generation_id')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (dErr || !decision) throw new Error(`getDecisionWithChildren failed: ${dErr?.message}`)

  let clarifications: Array<{ question: string; user_answer: string | null }> = []
  if (latestGenRow?.generation_id) {
    const { data: cRows } = await supabase
      .from('decision_clarifications')
      .select('question, user_answer, position')
      .eq('decision_id', decisionId)
      .eq('generation_id', latestGenRow.generation_id)
      .order('position', { ascending: true })
    clarifications = cRows ?? []
  }

  return {
    decision,
    files: files ?? [],
    agents: agents ?? [],
    scenarios: scenarios ?? [],
    clarifications,
  }
}

export async function markRunRunning(runId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('runs')
    .update({ status: 'running', started_at: new Date().toISOString(), progress_pct: 0 })
    .eq('id', runId)
}

export async function markRunSynthesizing(runId: string) {
  const supabase = getServiceClient()
  await supabase.from('runs').update({ status: 'synthesizing' }).eq('id', runId)
}

export async function markRunCompleted(runId: string) {
  const supabase = getServiceClient()

  const { data: tasks } = await supabase
    .from('run_tasks')
    .select('input_tokens, output_tokens, status')
    .eq('run_id', runId)

  const totalInput = tasks?.reduce((n, t) => n + (t.input_tokens ?? 0), 0) ?? 0
  const totalOutput = tasks?.reduce((n, t) => n + (t.output_tokens ?? 0), 0) ?? 0

  const { data: runRow } = await supabase.from('runs').select('decision_id').eq('id', runId).single()

  let totalCost = 0
  if (runRow) {
    const { data: decRow } = await supabase
      .from('decisions')
      .select('actual_cost_usd')
      .eq('id', runRow.decision_id)
      .single()
    totalCost = decRow?.actual_cost_usd ?? 0
  }

  await supabase
    .from('runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress_pct: 100,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      total_cost_usd: totalCost,
    })
    .eq('id', runId)
}

export async function markRunFailed(runId: string, message: string) {
  const supabase = getServiceClient()
  await supabase
    .from('runs')
    .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: message })
    .eq('id', runId)
}

export async function markDecisionCompleted(decisionId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('decisions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', decisionId)
}

export async function recomputeRunProgress(runId: string) {
  const supabase = getServiceClient()
  const { data: tasks } = await supabase
    .from('run_tasks')
    .select('status')
    .eq('run_id', runId)

  if (!tasks || tasks.length === 0) return

  const completed = tasks.filter(t => t.status === 'completed').length
  const pct = Math.floor((completed * 100) / tasks.length)
  await supabase.from('runs').update({ progress_pct: pct }).eq('id', runId)
}

export async function updateTaskRunning(taskId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('run_tasks')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', taskId)
}

export async function updateTaskCompleted(
  taskId: string,
  {
    output,
    input_tokens,
    output_tokens,
  }: { output: string; input_tokens: number; output_tokens: number }
) {
  const supabase = getServiceClient()
  await supabase
    .from('run_tasks')
    .update({
      status: 'completed',
      output,
      input_tokens,
      output_tokens,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
}

export async function updateTaskFailed(taskId: string, errorMessage: string) {
  const supabase = getServiceClient()
  await supabase
    .from('run_tasks')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
}

export async function insertRunSynthesis(params: {
  run_id: string
  verdict: string
  confidence_pct: number
  confidence_reasoning: string
  top_risks: unknown
  decision_criteria: unknown
  what_would_change_my_mind: string
  summary_text: string
}) {
  const supabase = getServiceClient()
  const { error } = await supabase.from('run_synthesis').insert({
    run_id: params.run_id,
    verdict: params.verdict,
    confidence_pct: params.confidence_pct,
    top_risks: params.top_risks as import('@/lib/database.types').Json,
    decision_criteria: params.decision_criteria as import('@/lib/database.types').Json,
    what_would_change_my_mind: params.what_would_change_my_mind,
    summary_text: params.summary_text,
  })
  if (error) throw new Error(`insertRunSynthesis failed: ${error.message}`)
}
