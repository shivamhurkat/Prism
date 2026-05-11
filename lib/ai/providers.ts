import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { LanguageModel } from 'ai'
import { createServiceClient } from '@/lib/supabase/server'
import { decryptApiKey } from '@/lib/crypto/keys'
import { MODELS, type Provider, type ModelTier } from '@/lib/ai/models'

export type ResolvedProvider = {
  provider: Provider
  modelFor: (tier: ModelTier) => LanguageModel
  modelIdFor: (tier: ModelTier) => string
}

export async function getProviderForUser(userId: string): Promise<ResolvedProvider | null> {
  const supabase = createServiceClient()

  // Read preferred_provider from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_provider')
    .eq('id', userId)
    .single()

  const provider: Provider = (profile?.preferred_provider as Provider | null) ?? 'anthropic'
  console.log('[provider] resolving', provider)

  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single()

  if (!keyRow) {
    console.log('[provider] no key for', provider)
    return null
  }

  const apiKey = decryptApiKey(keyRow.encrypted_key)

  const factory =
    provider === 'anthropic'
      ? createAnthropic({ apiKey })
      : createGoogleGenerativeAI({ apiKey })

  return {
    provider,
    modelFor: (tier: ModelTier): LanguageModel => factory(MODELS[provider][tier]) as LanguageModel,
    modelIdFor: (tier: ModelTier): string => MODELS[provider][tier],
  }
}

export async function validateProviderKey(
  provider: Provider,
  plaintextKey: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  console.log('[provider] validating', provider)

  const model =
    provider === 'anthropic'
      ? createAnthropic({ apiKey: plaintextKey })(MODELS.anthropic.validation) as LanguageModel
      : createGoogleGenerativeAI({ apiKey: plaintextKey })(MODELS.google.validation) as LanguageModel

  try {
    await generateText({ model, maxOutputTokens: 5, prompt: 'ping' })
    console.log('[provider] valid', provider)
    return { ok: true }
  } catch (err: unknown) {
    const errObj = err as { statusCode?: number; message?: string }
    const status = errObj?.statusCode
    const msg = errObj?.message ?? ''

    console.log('[provider] invalid', provider, status, msg.slice(0, 80))

    if (
      status === 401 ||
      status === 403 ||
      msg.includes('API key not valid') ||
      msg.includes('invalid_api_key') ||
      msg.includes('PERMISSION_DENIED')
    ) {
      return { ok: false, reason: 'invalid_key' }
    }
    if (status === 429 || msg.toLowerCase().includes('rate limit')) {
      return { ok: false, reason: 'rate_limited' }
    }
    return { ok: false, reason: msg.slice(0, 160) || 'unknown_error' }
  }
}
