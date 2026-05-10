import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function logEvent(
  name: string,
  properties?: Record<string, unknown>
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const service = createServiceClient()
    await service.from('events').insert({
      user_id: user?.id ?? null,
      event_name: name,
      properties: (properties ?? {}) as unknown as import('@/lib/database.types').Json,
    })
  } catch (err) {
    console.error('[events] failed to log:', name, err)
  }
}

export async function logAiCall({
  userId,
  decisionId,
  kind,
  model,
  inputTokens,
  outputTokens,
  costUsd,
  durationMs,
}: {
  userId: string
  decisionId: string
  kind: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
}) {
  try {
    const service = createServiceClient()

    const [, { data: dec }] = await Promise.all([
      service.from('events').insert({
        user_id: userId,
        event_name: 'ai_call',
        properties: {
          decision_id: decisionId,
          kind,
          model,
          inputTokens,
          outputTokens,
          costUsd,
          durationMs,
        } as unknown as import('@/lib/database.types').Json,
      }),
      service.from('decisions').select('actual_cost_usd').eq('id', decisionId).single(),
    ])

    if (dec !== null) {
      await service
        .from('decisions')
        .update({ actual_cost_usd: (dec.actual_cost_usd ?? 0) + costUsd })
        .eq('id', decisionId)
    }
  } catch (err) {
    console.error('[events] failed to log ai_call:', err)
  }
}
