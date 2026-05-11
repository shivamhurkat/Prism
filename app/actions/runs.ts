'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import { estimateRunCost } from '@/lib/ai/estimator'
import { buildDecisionContext } from '@/lib/ai/context'
import { logEvent } from '@/lib/events'

type StartResult = { ok: true; runId: string } | { ok: false; error: string }

export async function startDeliberation(decisionId: string): Promise<StartResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  // Verify ownership + current status
  const { data: decision } = await supabase
    .from('decisions')
    .select('id, status, title, question, context_text')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Decision not found.' }

  const STARTABLE = new Set(['draft', 'configuring', 'ready', 'failed'])
  if (!STARTABLE.has(decision.status)) {
    return { ok: false, error: `Cannot start a run while decision is ${decision.status}.` }
  }

  const service = createServiceClient()

  // Load prerequisites
  const [{ data: agents }, { data: scenarios }, { data: apiKey }, { data: files }] = await Promise.all([
    supabase.from('agent_charters').select('id, name, locked, position').eq('decision_id', decisionId).order('position'),
    supabase.from('scenarios').select('id, name, locked, position').eq('decision_id', decisionId).order('position'),
    supabase.from('api_keys').select('id').eq('user_id', user.id).limit(1).single(),
    supabase.from('decision_files').select('extracted_text').eq('decision_id', decisionId),
  ])

  if (!agents || agents.length < 2) {
    return { ok: false, error: 'At least 2 agents required.' }
  }
  if (!scenarios || scenarios.length < 2) {
    return { ok: false, error: 'At least 2 scenarios required.' }
  }
  if (!apiKey) {
    return { ok: false, error: 'No API key connected. Add one in Settings.' }
  }

  // Compute estimate
  const { data: profile } = await supabase.from('profiles').select('preferred_provider').eq('id', user.id).single()
  const provider = profile?.preferred_provider ?? 'anthropic'

  const contextChars =
    (decision.context_text?.length ?? 0) +
    (files ?? []).reduce((n, f) => n + (f.extracted_text?.length ?? 0), 0)

  const estimate = estimateRunCost({
    agentsCount: agents.length,
    scenariosCount: scenarios.length,
    contextChars,
    provider,
  })

  // Store the estimate on the decision row
  await service
    .from('decisions')
    .update({ cost_estimate_usd: estimate.estimatedCostUsd })
    .eq('id', decisionId)

  // Insert run + tasks in one transaction (sequential inserts using service client)
  const { data: runRow, error: runErr } = await service
    .from('runs')
    .insert({
      decision_id: decisionId,
      status: 'pending',
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
    })
    .select('id')
    .single()

  if (runErr || !runRow) {
    return { ok: false, error: runErr?.message ?? 'Failed to create run.' }
  }

  const runId = runRow.id

  // Build task rows
  const analysisTasks = agents.flatMap(agent =>
    scenarios.map(scenario => ({
      run_id: runId,
      agent_charter_id: agent.id,
      scenario_id: scenario.id,
      kind: 'analysis' as const,
      status: 'pending' as const,
    }))
  )

  const critiqueTasks = agents.map(agent => ({
    run_id: runId,
    agent_charter_id: agent.id,
    scenario_id: null,
    kind: 'critique' as const,
    status: 'pending' as const,
  }))

  const synthesisTask = {
    run_id: runId,
    agent_charter_id: null,
    scenario_id: null,
    kind: 'synthesis' as const,
    status: 'pending' as const,
  }

  const { error: taskErr } = await service
    .from('run_tasks')
    .insert([...analysisTasks, ...critiqueTasks, synthesisTask])

  if (taskErr) {
    // Cleanup the run row
    await service.from('runs').delete().eq('id', runId)
    return { ok: false, error: taskErr.message }
  }

  // Update decision status to running
  const { error: statusErr } = await service
    .from('decisions')
    .update({ status: 'running' })
    .eq('id', decisionId)

  if (statusErr) {
    return { ok: false, error: statusErr.message }
  }

  const totalTasks = analysisTasks.length + critiqueTasks.length + 1

  // Fire Inngest event
  await inngest.send({
    name: 'deliberation/start',
    data: { runId, decisionId, userId: user.id },
  })

  console.log('[run] started', runId, `tasks=${totalTasks}`, `estimate=$${estimate.estimatedCostUsd}`)
  await logEvent('deliberation_started', {
    decision_id: decisionId,
    run_id: runId,
    total_tasks: totalTasks,
    cost_estimate_usd: estimate.estimatedCostUsd,
  })

  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true, runId }
}

export async function cancelRun(runId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  // Verify ownership via decision
  const { data: runRow } = await supabase
    .from('runs')
    .select('id, decision_id, status')
    .eq('id', runId)
    .single()

  if (!runRow) return { ok: false, error: 'Run not found.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', runRow.decision_id)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Access denied.' }

  if (runRow.status === 'completed' || runRow.status === 'cancelled') {
    return { ok: false, error: `Run is already ${runRow.status}.` }
  }

  const service = createServiceClient()
  await service
    .from('runs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', runId)

  await service
    .from('decisions')
    .update({ status: 'configuring' })
    .eq('id', runRow.decision_id)

  console.log('[run] cancelled', runId)
  await logEvent('run_cancelled', { run_id: runId })
  revalidatePath(`/dashboard/d/${runRow.decision_id}`)
  return { ok: true }
}

export async function retryFailedRun(
  decisionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id, status')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Decision not found.' }
  if (decision.status !== 'failed') {
    return { ok: false, error: 'Decision is not in failed state.' }
  }

  const service = createServiceClient()
  await service.from('decisions').update({ status: 'configuring' }).eq('id', decisionId)

  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true }
}
