import { generateObject, NoObjectGeneratedError } from 'ai'
import { z } from 'zod'
import { getCostUsd } from '@/lib/ai/pricing'
import { logAiCall } from '@/lib/events'
import { getProviderForUser } from '@/lib/ai/providers'
import { callWithBackoff } from '@/lib/ai/retry'

export class AiError extends Error {
  constructor(
    public readonly code:
      | 'no_api_key'
      | 'invalid_response'
      | 'rate_limited'
      | 'server_error'
      | 'no_key_for_provider',
    message?: string
  ) {
    super(message ?? code)
    this.name = 'AiError'
  }
}

interface CallJsonModelOptions<T> {
  userId: string
  decisionId?: string
  kind: string
  modelTier: import('@/lib/ai/models').ModelTier
  system: string
  user: string
  schema: z.ZodSchema<T>
  schemaName: string
}

interface CallJsonModelResult<T> {
  data: T
  usage: { input: number; output: number; costUsd: number }
}

export async function callJsonModel<T>({
  userId,
  decisionId,
  kind,
  modelTier,
  system,
  user: userPrompt,
  schema,
  schemaName,
}: CallJsonModelOptions<T>): Promise<CallJsonModelResult<T>> {
  const resolved = await getProviderForUser(userId)
  if (!resolved) throw new AiError('no_api_key')

  const startMs = Date.now()
  const modelId = resolved.modelIdFor(modelTier)
  const model = resolved.modelFor(modelTier)

  try {
    const { object, usage } = await callWithBackoff(
      () =>
        generateObject({
          model,
          schema,
          schemaName,
          system,
          prompt: userPrompt,
          maxRetries: 0,  // we own retries via callWithBackoff
        }),
      { label: `${kind}:${modelTier}` }
    )

    const durationMs = Date.now() - startMs
    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    const costUsd = getCostUsd(modelId, inputTokens, outputTokens)

    if (decisionId) {
      await logAiCall({ userId, decisionId, kind, model: modelId, inputTokens, outputTokens, costUsd, durationMs })
    }

    return { data: object, usage: { input: inputTokens, output: outputTokens, costUsd } }
  } catch (err: unknown) {
    const errObj = err as { statusCode?: number; message?: string; name?: string }
    const status = errObj?.statusCode
    const msg = errObj?.message ?? ''
    const name = errObj?.name ?? ''

    console.log('[ai] error', resolved.provider, kind, status, msg.slice(0, 120))

    if (NoObjectGeneratedError.isInstance(err) || name === 'ZodError') {
      throw new AiError('invalid_response', msg)
    }
    // rate_limited only fires if backoff exhausted all attempts and final error is still 429
    if (status === 429) throw new AiError('rate_limited')
    if (status === 401 || status === 403) {
      throw new AiError('no_api_key', 'Key was rejected by provider — re-enter it in Settings')
    }
    throw new AiError('server_error', msg)
  }
}
