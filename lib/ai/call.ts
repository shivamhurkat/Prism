import { getAnthropicClientForUser } from '@/lib/ai/anthropic'
import { getCostUsd } from '@/lib/ai/pricing'
import { logAiCall } from '@/lib/events'

export class AiError extends Error {
  constructor(
    public readonly code: 'no_api_key' | 'invalid_response' | 'rate_limited' | 'server_error',
    message?: string
  ) {
    super(message ?? code)
    this.name = 'AiError'
  }
}

interface CallJsonModelOptions {
  userId: string
  decisionId: string
  kind: string
  model: string
  system: string
  user: string
}

interface CallJsonModelResult {
  data: unknown
  usage: { input: number; output: number; costUsd: number }
}

export async function callJsonModel({
  userId,
  decisionId,
  kind,
  model,
  system,
  user: userMessage,
}: CallJsonModelOptions): Promise<CallJsonModelResult> {
  const client = await getAnthropicClientForUser(userId)
  if (!client) throw new AiError('no_api_key')

  const startMs = Date.now()

  async function attempt(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
    const response = await client!.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages,
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return { raw, cleaned, response }
  }

  let result: Awaited<ReturnType<typeof attempt>>

  try {
    result = await attempt([{ role: 'user', content: userMessage }])
  } catch (err: unknown) {
    console.error('[ai] call error', err)
    const status = (err as { status?: number })?.status
    if (status === 429) throw new AiError('rate_limited')
    const msg = (err as Error).message || `HTTP ${status ?? 'unknown'}`
    throw new AiError('server_error', msg)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(result.cleaned)
  } catch {
    // Retry once with correction prompt
    try {
      const retry = await attempt([
        { role: 'user', content: userMessage },
        { role: 'assistant', content: result.raw },
        {
          role: 'user',
          content:
            'Your previous reply was not valid JSON. Reply with JSON only, no preamble or markdown.',
        },
      ])
      try {
        parsed = JSON.parse(retry.cleaned)
        result = retry
      } catch {
        throw new AiError('invalid_response', 'Model returned invalid JSON after retry')
      }
    } catch (err) {
      console.error('[ai] retry error', err)
      if (err instanceof AiError) throw err
      throw new AiError('invalid_response', (err as Error).message || 'Retry failed')
    }
  }

  const durationMs = Date.now() - startMs
  const inputTokens = result.response.usage.input_tokens
  const outputTokens = result.response.usage.output_tokens
  const costUsd = getCostUsd(model, inputTokens, outputTokens)

  await logAiCall({ userId, decisionId, kind, model, inputTokens, outputTokens, costUsd, durationMs })

  return {
    data: parsed,
    usage: { input: inputTokens, output: outputTokens, costUsd },
  }
}
