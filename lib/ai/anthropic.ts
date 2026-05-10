import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { decryptApiKey } from '@/lib/crypto/keys'

export async function getAnthropicClientForUser(userId: string): Promise<Anthropic | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', 'anthropic')
    .single()

  if (!data) return null

  const apiKey = decryptApiKey(data.encrypted_key)
  return new Anthropic({ apiKey })
}

export async function validateAnthropicKey(
  plaintextKey: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = new Anthropic({ apiKey: plaintextKey })
  try {
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return { ok: true }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return { ok: false, reason: 'invalid_key' }
    if (status === 429) return { ok: false, reason: 'rate_limited' }
    return { ok: false, reason: (err as Error).message ?? 'unknown_error' }
  }
}
