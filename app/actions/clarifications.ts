'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildDecisionContext } from '@/lib/ai/context'
import { callJsonModel, AiError } from '@/lib/ai/call'
import { CLARIFICATIONS_SYSTEM, buildClarificationsUserPrompt } from '@/lib/ai/prompts/clarifications'
import { logEvent } from '@/lib/events'

const ClarificationsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(5).max(500),
        suggested_answers: z.array(z.string().max(80)).max(4),
      })
    )
    .min(3)
    .max(5),
})

type GenerateResult =
  | { status: 'success'; generationId: string }
  | { error: string; code?: string }

export async function generateClarifications(decisionId: string): Promise<GenerateResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id, title, question, context_text')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { error: 'Decision not found.' }

  const { data: files } = await supabase
    .from('decision_files')
    .select('file_name, extracted_text, parse_skipped_reason')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: true })

  const context = buildDecisionContext({ decision, files: files ?? [] })

  console.log('[clarifications] generating', decisionId)

  try {
    const { data, usage } = await callJsonModel({
      userId: user.id,
      decisionId,
      kind: 'clarifications',
      modelTier: 'light',
      system: CLARIFICATIONS_SYSTEM,
      user: buildClarificationsUserPrompt(context),
      schema: ClarificationsSchema,
      schemaName: 'Clarifications',
    })

    const generationId = randomUUID()
    const service = createServiceClient()

    const rows = data.questions.map((q, i) => ({
      decision_id: decisionId,
      question: q.question,
      suggested_answers: q.suggested_answers,
      user_answer: null,
      position: i,
      generation_id: generationId,
    }))

    const { error: insertError } = await service
      .from('decision_clarifications')
      .insert(rows)

    if (insertError) {
      console.log('[clarifications] error', insertError.message)
      return { error: insertError.message }
    }

    console.log('[clarifications] generated', data.questions.length, usage.costUsd.toFixed(6))
    await logEvent('clarifications_generated', {
      decision_id: decisionId,
      question_count: data.questions.length,
      costUsd: usage.costUsd,
    })

    revalidatePath(`/dashboard/d/${decisionId}`)
    return { status: 'success', generationId }
  } catch (err) {
    console.error('[clarifications] full error', err)
    if (err instanceof AiError) {
      return { error: err.message || err.code, code: err.code }
    }
    const msg = err instanceof Error ? (err.message || err.constructor.name) : String(err)
    return { error: msg || 'Unknown error generating clarifications' }
  }
}

export async function saveClarificationAnswers(
  decisionId: string,
  answers: { id: string; user_answer: string }[]
): Promise<{ status: 'success' } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { error: 'Decision not found.' }

  const service = createServiceClient()

  for (const { id, user_answer } of answers) {
    const { error } = await service
      .from('decision_clarifications')
      .update({ user_answer })
      .eq('id', id)
      .eq('decision_id', decisionId)

    if (error) return { error: error.message }
  }

  await logEvent('clarifications_answered', {
    decision_id: decisionId,
    answered_count: answers.filter(a => a.user_answer.trim()).length,
  })
  revalidatePath(`/dashboard/d/${decisionId}`)
  return { status: 'success' }
}
