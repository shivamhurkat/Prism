'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildDecisionContext } from '@/lib/ai/context'
import { callJsonModel, AiError } from '@/lib/ai/call'
import { SCENARIOS_SYSTEM, buildScenariosUserPrompt } from '@/lib/ai/prompts/scenarios'
import { PREMORTEM } from '@/lib/ai/premortem'
import { logEvent } from '@/lib/events'

const ScenariosSchema = z.object({
  scenarios: z
    .array(
      z.object({
        name: z.string().min(3).max(80),
        description: z.string().min(20).max(400),
        assumptions: z.string().min(20).max(800),
        time_horizon: z.string().min(2).max(60),
      })
    )
    .min(3)
    .max(5),
})

type ScenarioFields = {
  name?: string
  description?: string
  assumptions?: string
  time_horizon?: string
}

const EDITABLE_STATUSES = new Set(['draft', 'configuring', 'ready', 'failed'])

async function verifyDecisionOwnership(decisionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, decision: null, supabase }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id, status, user_id')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  return { user, decision, supabase }
}

export async function generateScenarios(
  decisionId: string
): Promise<{ ok: true; count: number } | { error: string; code?: string }> {
  console.log('[scenarios] generating', decisionId)

  const { user, decision, supabase } = await verifyDecisionOwnership(decisionId)
  if (!user) return { error: 'Not authenticated.' }
  if (!decision) return { error: 'Decision not found.' }
  if (!EDITABLE_STATUSES.has(decision.status)) {
    return { error: `Cannot modify scenarios while decision is ${decision.status}.` }
  }

  const service = createServiceClient()

  const [{ data: decisionFull }, { data: files }, { data: latestGenRow }] = await Promise.all([
    supabase
      .from('decisions')
      .select('id, title, question, context_text')
      .eq('id', decisionId)
      .single(),
    supabase
      .from('decision_files')
      .select('file_name, extracted_text, parse_skipped_reason')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('decision_clarifications')
      .select('generation_id')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!decisionFull) return { error: 'Decision not found.' }

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

  const context = buildDecisionContext({
    decision: decisionFull,
    files: files ?? [],
    clarifications,
  })

  try {
    const { data, usage } = await callJsonModel({
      userId: user.id,
      decisionId,
      kind: 'scenarios',
      modelTier: 'light',
      system: SCENARIOS_SYSTEM,
      user: buildScenariosUserPrompt(context),
      schema: ScenariosSchema,
      schemaName: 'Scenarios',
    })

    await service.from('scenarios').delete().eq('decision_id', decisionId)

    const rows = [
      ...data.scenarios.map((s, i) => ({
        decision_id: decisionId,
        name: s.name,
        description: s.description,
        assumptions: s.assumptions,
        time_horizon: s.time_horizon,
        locked: false,
        position: i,
      })),
      {
        decision_id: decisionId,
        name: PREMORTEM.name,
        description: PREMORTEM.description,
        assumptions: PREMORTEM.assumptions,
        time_horizon: PREMORTEM.time_horizon,
        locked: true,
        position: data.scenarios.length,
      },
    ]

    const { error: insertError } = await service.from('scenarios').insert(rows)
    if (insertError) {
      console.log('[scenarios] error', insertError.message)
      return { error: insertError.message }
    }

    if (decision.status === 'draft') {
      await supabase
        .from('decisions')
        .update({ status: 'configuring' })
        .eq('id', decisionId)
        .eq('user_id', user.id)
    }

    const count = rows.length
    console.log('[scenarios] generated', data.scenarios.length, '+1 Premortem cost', usage.costUsd.toFixed(6))
    await logEvent('scenarios_generated', { decision_id: decisionId, count, costUsd: usage.costUsd })

    revalidatePath(`/dashboard/d/${decisionId}`)
    return { ok: true, count }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[scenarios] error', msg)
    if (err instanceof AiError) {
      return { error: err.message || err.code, code: err.code }
    }
    return { error: msg || 'Unknown error generating scenarios.' }
  }
}

export async function updateScenario(
  scenarioId: string,
  fields: ScenarioFields
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: scenario } = await supabase
    .from('scenarios')
    .select('id, locked, decision_id, name')
    .eq('id', scenarioId)
    .single()

  if (!scenario) return { ok: false, error: 'Scenario not found.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', scenario.decision_id)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Access denied.' }

  if (scenario.locked && fields.name !== undefined && fields.name !== scenario.name) {
    return { ok: false, error: 'Locked scenario — name cannot be changed.' }
  }

  if (fields.name !== undefined && (fields.name.length < 3 || fields.name.length > 80)) {
    return { ok: false, error: 'Name must be 3–80 characters.' }
  }
  if (fields.description !== undefined && fields.description.length > 400) {
    return { ok: false, error: 'Description must be 400 characters or fewer.' }
  }
  if (fields.assumptions !== undefined && fields.assumptions.length > 800) {
    return { ok: false, error: 'Assumptions must be 800 characters or fewer.' }
  }
  if (fields.time_horizon !== undefined && fields.time_horizon.length > 60) {
    return { ok: false, error: 'Time horizon must be 60 characters or fewer.' }
  }

  const update: Partial<ScenarioFields> = {}
  const fieldsChanged: string[] = []
  if (!scenario.locked && fields.name !== undefined) { update.name = fields.name; fieldsChanged.push('name') }
  if (fields.description !== undefined) { update.description = fields.description; fieldsChanged.push('description') }
  if (fields.assumptions !== undefined) { update.assumptions = fields.assumptions; fieldsChanged.push('assumptions') }
  if (fields.time_horizon !== undefined) { update.time_horizon = fields.time_horizon; fieldsChanged.push('time_horizon') }

  if (fieldsChanged.length === 0) return { ok: true }

  const { error } = await supabase.from('scenarios').update(update).eq('id', scenarioId)
  if (error) {
    console.log('[scenarios] updated error', error.message)
    return { ok: false, error: error.message }
  }

  await logEvent('scenario_updated', { scenario_id: scenarioId, fields_changed: fieldsChanged })
  revalidatePath(`/dashboard/d/${scenario.decision_id}`)
  return { ok: true }
}

export async function addScenario(
  decisionId: string,
  fields: Required<Pick<ScenarioFields, 'name' | 'description' | 'assumptions' | 'time_horizon'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, decision, supabase } = await verifyDecisionOwnership(decisionId)
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!decision) return { ok: false, error: 'Decision not found.' }
  if (!EDITABLE_STATUSES.has(decision.status)) {
    return { ok: false, error: `Cannot add scenarios while decision is ${decision.status}.` }
  }

  const service = createServiceClient()

  const { data: pmRow } = await supabase
    .from('scenarios')
    .select('id, position')
    .eq('decision_id', decisionId)
    .eq('locked', true)
    .single()

  const pmPosition = pmRow?.position ?? 0
  const newPosition = pmRow ? pmPosition : 0

  if (pmRow) {
    await service.from('scenarios').update({ position: pmPosition + 1 }).eq('id', pmRow.id)
  }

  const { error } = await service.from('scenarios').insert({
    decision_id: decisionId,
    name: fields.name,
    description: fields.description,
    assumptions: fields.assumptions,
    time_horizon: fields.time_horizon,
    locked: false,
    position: newPosition,
  })

  if (error) {
    console.log('[scenarios] added error', error.message)
    return { ok: false, error: error.message }
  }

  await logEvent('scenario_added', { decision_id: decisionId })
  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true }
}

export async function deleteScenario(
  scenarioId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: scenario } = await supabase
    .from('scenarios')
    .select('id, locked, decision_id, position')
    .eq('id', scenarioId)
    .single()

  if (!scenario) return { ok: false, error: 'Scenario not found.' }

  if (scenario.locked) {
    return {
      ok: false,
      error: 'Premortem is part of every Prism run and cannot be removed. You can refine its framing instead.',
    }
  }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', scenario.decision_id)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Access denied.' }

  const service = createServiceClient()
  const { error } = await service.from('scenarios').delete().eq('id', scenarioId)
  if (error) {
    console.log('[scenarios] deleted error', error.message)
    return { ok: false, error: error.message }
  }

  const { data: remaining } = await supabase
    .from('scenarios')
    .select('id, position')
    .eq('decision_id', scenario.decision_id)
    .order('position', { ascending: true })

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await service.from('scenarios').update({ position: i }).eq('id', remaining[i].id)
      }
    }
  }

  await logEvent('scenario_deleted', { scenario_id: scenarioId, decision_id: scenario.decision_id })
  revalidatePath(`/dashboard/d/${scenario.decision_id}`)
  return { ok: true }
}

export async function reorderScenarios(
  decisionId: string,
  orderedIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, decision, supabase } = await verifyDecisionOwnership(decisionId)
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!decision) return { ok: false, error: 'Decision not found.' }

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('id, locked')
    .eq('decision_id', decisionId)

  if (!scenarios) return { ok: false, error: 'Scenarios not found.' }

  const scenarioMap = new Map(scenarios.map(s => [s.id, s]))
  for (const id of orderedIds) {
    if (!scenarioMap.has(id)) return { ok: false, error: 'Invalid scenario id.' }
  }

  let finalOrder = [...orderedIds]
  const pmId = scenarios.find(s => s.locked)?.id
  if (pmId) {
    finalOrder = finalOrder.filter(id => id !== pmId)
    finalOrder.push(pmId)
  }

  const service = createServiceClient()
  for (let i = 0; i < finalOrder.length; i++) {
    await service.from('scenarios').update({ position: i }).eq('id', finalOrder[i])
  }

  await logEvent('scenarios_reordered', { decision_id: decisionId })
  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true }
}
