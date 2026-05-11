'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildDecisionContext } from '@/lib/ai/context'
import { callJsonModel, AiError } from '@/lib/ai/call'
import { AGENTS_SYSTEM, buildAgentsUserPrompt } from '@/lib/ai/prompts/agents'
import { DEVILS_ADVOCATE } from '@/lib/ai/devils-advocate'
import { logEvent } from '@/lib/events'

const AgentsSchema = z.object({
  agents: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        role: z.string().max(200),
        perspective: z.string().min(20).max(600),
        biases: z.string().max(400),
      })
    )
    .min(3)
    .max(7),
})

type AgentFields = {
  name?: string
  role?: string
  perspective?: string
  biases?: string
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

export async function generateAgentCouncil(
  decisionId: string
): Promise<{ ok: true; count: number } | { error: string; code?: string }> {
  console.log('[agents] generating', decisionId)

  const { user, decision, supabase } = await verifyDecisionOwnership(decisionId)
  if (!user) return { error: 'Not authenticated.' }
  if (!decision) return { error: 'Decision not found.' }
  if (!EDITABLE_STATUSES.has(decision.status)) {
    return { error: `Cannot modify council while decision is ${decision.status}.` }
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
      kind: 'agents',
      modelTier: 'light',
      system: AGENTS_SYSTEM,
      user: buildAgentsUserPrompt(context),
      schema: AgentsSchema,
      schemaName: 'AgentCouncil',
    })

    await service.from('agent_charters').delete().eq('decision_id', decisionId)

    const rows = [
      ...data.agents.map((a, i) => ({
        decision_id: decisionId,
        name: a.name,
        role: a.role,
        perspective: a.perspective,
        biases: a.biases,
        locked: false,
        position: i,
      })),
      {
        decision_id: decisionId,
        name: DEVILS_ADVOCATE.name,
        role: DEVILS_ADVOCATE.role,
        perspective: DEVILS_ADVOCATE.perspective,
        biases: DEVILS_ADVOCATE.biases,
        locked: true,
        position: data.agents.length,
      },
    ]

    const { error: insertError } = await service.from('agent_charters').insert(rows)
    if (insertError) {
      console.log('[agents] error', insertError.message)
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
    console.log('[agents] generated', data.agents.length, '+1 DA =', count, 'cost', usage.costUsd.toFixed(6))
    await logEvent('agents_generated', { decision_id: decisionId, count, costUsd: usage.costUsd })

    revalidatePath(`/dashboard/d/${decisionId}`)
    return { ok: true, count }
  } catch (err) {
    console.log('[agents] error', err instanceof Error ? err.message : String(err))
    if (err instanceof AiError) {
      return { error: err.message || err.code, code: err.code }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg || 'Unknown error generating council.' }
  }
}

export async function updateAgent(
  agentId: string,
  fields: AgentFields
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: agent } = await supabase
    .from('agent_charters')
    .select('id, locked, decision_id, name')
    .eq('id', agentId)
    .single()

  if (!agent) return { ok: false, error: 'Agent not found.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', agent.decision_id)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Access denied.' }

  if (agent.locked && fields.name !== undefined && fields.name !== agent.name) {
    return { ok: false, error: 'Locked agent — name cannot be changed.' }
  }

  if (fields.name !== undefined && (fields.name.length < 1 || fields.name.length > 80)) {
    return { ok: false, error: 'Name must be 1–80 characters.' }
  }
  if (fields.role !== undefined && fields.role.length > 200) {
    return { ok: false, error: 'Role must be 200 characters or fewer.' }
  }
  if (fields.perspective !== undefined && fields.perspective.length > 600) {
    return { ok: false, error: 'Perspective must be 600 characters or fewer.' }
  }
  if (fields.biases !== undefined && fields.biases.length > 400) {
    return { ok: false, error: 'Biases must be 400 characters or fewer.' }
  }

  const update: Partial<AgentFields> = {}
  const fieldsChanged: string[] = []
  if (!agent.locked && fields.name !== undefined) { update.name = fields.name; fieldsChanged.push('name') }
  if (fields.role !== undefined) { update.role = fields.role; fieldsChanged.push('role') }
  if (fields.perspective !== undefined) { update.perspective = fields.perspective; fieldsChanged.push('perspective') }
  if (fields.biases !== undefined) { update.biases = fields.biases; fieldsChanged.push('biases') }

  if (fieldsChanged.length === 0) return { ok: true }

  const { error } = await supabase.from('agent_charters').update(update).eq('id', agentId)

  if (error) {
    console.log('[agents] updated error', error.message)
    return { ok: false, error: error.message }
  }

  console.log('[agents] updated', agentId, fieldsChanged)
  await logEvent('agent_updated', { agent_id: agentId, fields_changed: fieldsChanged })
  revalidatePath(`/dashboard/d/${agent.decision_id}`)
  return { ok: true }
}

export async function addAgent(
  decisionId: string,
  fields: Required<Pick<AgentFields, 'name' | 'role' | 'perspective' | 'biases'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, decision, supabase } = await verifyDecisionOwnership(decisionId)
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!decision) return { ok: false, error: 'Decision not found.' }
  if (!EDITABLE_STATUSES.has(decision.status)) {
    return { ok: false, error: `Cannot add agents while decision is ${decision.status}.` }
  }

  const service = createServiceClient()

  const { data: daRow } = await supabase
    .from('agent_charters')
    .select('id, position')
    .eq('decision_id', decisionId)
    .eq('locked', true)
    .single()

  const daPosition = daRow?.position ?? 0
  const newPosition = daRow ? daPosition : 0

  if (daRow) {
    await service.from('agent_charters').update({ position: daPosition + 1 }).eq('id', daRow.id)
  }

  const { error } = await service.from('agent_charters').insert({
    decision_id: decisionId,
    name: fields.name,
    role: fields.role,
    perspective: fields.perspective,
    biases: fields.biases,
    locked: false,
    position: newPosition,
  })

  if (error) {
    console.log('[agents] added error', error.message)
    return { ok: false, error: error.message }
  }

  console.log('[agents] added to', decisionId)
  await logEvent('agent_added', { decision_id: decisionId })
  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true }
}

export async function deleteAgent(
  agentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: agent } = await supabase
    .from('agent_charters')
    .select('id, locked, decision_id, position')
    .eq('id', agentId)
    .single()

  if (!agent) return { ok: false, error: 'Agent not found.' }

  if (agent.locked) {
    return {
      ok: false,
      error:
        "Devil's Advocate is part of every Prism council and cannot be removed. You can refine its framing instead.",
    }
  }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', agent.decision_id)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Access denied.' }

  const service = createServiceClient()
  const { error } = await service.from('agent_charters').delete().eq('id', agentId)
  if (error) {
    console.log('[agents] deleted error', error.message)
    return { ok: false, error: error.message }
  }

  const { data: remaining } = await supabase
    .from('agent_charters')
    .select('id, position')
    .eq('decision_id', agent.decision_id)
    .order('position', { ascending: true })

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await service.from('agent_charters').update({ position: i }).eq('id', remaining[i].id)
      }
    }
  }

  console.log('[agents] deleted', agentId)
  await logEvent('agent_deleted', { agent_id: agentId, decision_id: agent.decision_id })
  revalidatePath(`/dashboard/d/${agent.decision_id}`)
  return { ok: true }
}

export async function reorderAgents(
  decisionId: string,
  orderedIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, decision, supabase } = await verifyDecisionOwnership(decisionId)
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!decision) return { ok: false, error: 'Decision not found.' }

  const { data: agents } = await supabase
    .from('agent_charters')
    .select('id, locked')
    .eq('decision_id', decisionId)

  if (!agents) return { ok: false, error: 'Agents not found.' }

  const agentMap = new Map(agents.map(a => [a.id, a]))
  for (const id of orderedIds) {
    if (!agentMap.has(id)) return { ok: false, error: 'Invalid agent id.' }
  }

  let finalOrder = [...orderedIds]
  const daId = agents.find(a => a.locked)?.id
  if (daId) {
    finalOrder = finalOrder.filter(id => id !== daId)
    finalOrder.push(daId)
  }

  const service = createServiceClient()
  for (let i = 0; i < finalOrder.length; i++) {
    await service.from('agent_charters').update({ position: i }).eq('id', finalOrder[i])
  }

  console.log('[agents] reordered', decisionId)
  await logEvent('agents_reordered', { decision_id: decisionId })
  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true }
}
