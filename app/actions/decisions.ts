'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events'

type DecisionErrors = Partial<
  Record<'title' | 'question' | '_root', string>
>

export type DecisionDraftState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; errors: DecisionErrors }

export type DecisionContinueState =
  | { status: 'idle' }
  | { status: 'error'; errors: DecisionErrors }

function validate(title: string, question: string): DecisionErrors | null {
  const errors: DecisionErrors = {}
  if (!title || title.length > 120) {
    errors.title = title ? 'Title must be 120 characters or fewer.' : 'Title is required.'
  }
  if (!question || question.length < 50) {
    errors.question = question
      ? 'Please describe your decision in at least 50 characters.'
      : 'Decision question is required.'
  }
  return Object.keys(errors).length > 0 ? errors : null
}

export async function saveDecisionDraft(
  _prevState: DecisionDraftState,
  formData: FormData
): Promise<DecisionDraftState> {
  const existingId = (formData.get('id') as string | null) ?? null
  const title = ((formData.get('title') as string | null) ?? '').trim()
  const question = ((formData.get('question') as string | null) ?? '').trim()
  const context_text = ((formData.get('context_text') as string | null) ?? '').trim() || null

  console.log('[decision] saving draft', { id: existingId })

  const errors = validate(title, question)
  if (errors) return { status: 'error', errors }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { status: 'error', errors: { _root: 'Not authenticated.' } }
    }

    let id = existingId

    if (id) {
      // Verify ownership before updating
      const { data: existing } = await supabase
        .from('decisions')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!existing) {
        return { status: 'error', errors: { _root: 'Decision not found.' } }
      }

      const { error } = await supabase
        .from('decisions')
        .update({ title, question, context_text, status: 'draft' })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.log('[decision] error', error.message)
        return { status: 'error', errors: { _root: error.message } }
      }
    } else {
      const { data, error } = await supabase
        .from('decisions')
        .insert({ user_id: user.id, title, question, context_text, status: 'draft' })
        .select('id')
        .single()

      if (error || !data) {
        console.log('[decision] error', error?.message)
        return { status: 'error', errors: { _root: error?.message ?? 'Insert failed.' } }
      }
      id = data.id
    }

    await logEvent('decision_draft_saved', { decision_id: id })
    return { status: 'success', id: id! }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[decision] error', msg)
    return { status: 'error', errors: { _root: msg } }
  }
}

export async function saveDecisionAndContinue(
  _prevState: DecisionContinueState,
  formData: FormData
): Promise<DecisionContinueState> {
  const existingId = (formData.get('id') as string | null) ?? null
  const title = ((formData.get('title') as string | null) ?? '').trim()
  const question = ((formData.get('question') as string | null) ?? '').trim()
  const context_text = ((formData.get('context_text') as string | null) ?? '').trim() || null

  const errors = validate(title, question)
  if (errors) return { status: 'error', errors }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { status: 'error', errors: { _root: 'Not authenticated.' } }
    }

    let id = existingId

    if (id) {
      const { data: existing } = await supabase
        .from('decisions')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!existing) {
        return { status: 'error', errors: { _root: 'Decision not found.' } }
      }

      const { error } = await supabase
        .from('decisions')
        .update({ title, question, context_text, status: 'configuring' })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.log('[decision] error', error.message)
        return { status: 'error', errors: { _root: error.message } }
      }
    } else {
      const { data, error } = await supabase
        .from('decisions')
        .insert({ user_id: user.id, title, question, context_text, status: 'configuring' })
        .select('id')
        .single()

      if (error || !data) {
        console.log('[decision] error', error?.message)
        return { status: 'error', errors: { _root: error?.message ?? 'Insert failed.' } }
      }
      id = data.id
    }

    console.log('[decision] continue', { id })
    await logEvent('decision_configuring', { decision_id: id })
    redirect(`/dashboard/d/${id}`)
  } catch (err) {
    // redirect() throws — let it propagate
    if ((err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw err
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[decision] error', msg)
    return { status: 'error', errors: { _root: msg } }
  }
}

const EDITABLE_STATUSES = new Set(['draft', 'configuring', 'ready', 'failed'])

export async function updateDecisionBasics(
  decisionId: string,
  fields: { title?: string; question?: string; context_text?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: decision } = await supabase
    .from('decisions')
    .select('id, status')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { ok: false, error: 'Decision not found.' }

  if (!EDITABLE_STATUSES.has(decision.status)) {
    const reason = decision.status === 'running' ? 'running' : 'completed'
    console.log('[decision] basics error', `locked while ${reason}`)
    return { ok: false, error: `Cannot edit while decision is ${reason}.` }
  }

  if (fields.title !== undefined) {
    if (!fields.title || fields.title.length > 120) {
      return { ok: false, error: fields.title ? 'Title must be 120 characters or fewer.' : 'Title is required.' }
    }
  }
  if (fields.question !== undefined) {
    if (!fields.question || fields.question.length < 50) {
      return { ok: false, error: 'Decision question must be at least 50 characters.' }
    }
  }

  const update: { title?: string; question?: string; context_text?: string | null } = {}
  const fieldsChanged: string[] = []
  if (fields.title !== undefined) { update.title = fields.title; fieldsChanged.push('title') }
  if (fields.question !== undefined) { update.question = fields.question; fieldsChanged.push('question') }
  if (fields.context_text !== undefined) { update.context_text = fields.context_text || null; fieldsChanged.push('context_text') }

  if (fieldsChanged.length === 0) return { ok: true }

  const { error } = await supabase
    .from('decisions')
    .update(update)
    .eq('id', decisionId)
    .eq('user_id', user.id)

  if (error) {
    console.log('[decision] basics error', error.message)
    return { ok: false, error: error.message }
  }

  console.log('[decision] basics updated', fieldsChanged)
  await logEvent('decision_basics_updated', { decision_id: decisionId, fields_changed: fieldsChanged })
  revalidatePath(`/dashboard/d/${decisionId}`)
  return { ok: true }
}
