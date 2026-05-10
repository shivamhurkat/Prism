'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptApiKey, maskApiKey } from '@/lib/crypto/keys'
import { validateAnthropicKey } from '@/lib/ai/anthropic'
import { logEvent } from '@/lib/events'

export type ApiKeyStatus = {
  hasKey: boolean
  masked?: string
  lastValidatedAt?: string
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hasKey: false }

  const service = createServiceClient()
  const { data } = await service
    .from('api_keys')
    .select('encrypted_key, last_validated_at')
    .eq('user_id', user.id)
    .eq('provider', 'anthropic')
    .single()

  if (!data) return { hasKey: false }

  const { decryptApiKey } = await import('@/lib/crypto/keys')
  let masked: string | undefined
  try {
    masked = maskApiKey(decryptApiKey(data.encrypted_key))
  } catch {
    masked = undefined
  }

  return {
    hasKey: true,
    masked,
    lastValidatedAt: data.last_validated_at ?? undefined,
  }
}

export type SaveApiKeyResult =
  | { status: 'success'; masked: string }
  | { error: string }

export async function saveApiKey(formData: FormData): Promise<SaveApiKeyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const raw = (formData.get('apiKey') as string | null) ?? ''
  const key = raw.trim()

  if (!key || key.length < 20) return { error: 'API key is too short.' }

  console.log('[api-key] validating')
  const validation = await validateAnthropicKey(key)

  if (!validation.ok) {
    console.log('[api-key] error', validation.reason)
    return { error: validation.reason }
  }

  const encrypted = encryptApiKey(key)
  const masked = maskApiKey(key)

  const service = createServiceClient()
  const { error: upsertError } = await service
    .from('api_keys')
    .upsert(
      {
        user_id: user.id,
        provider: 'anthropic',
        encrypted_key: encrypted,
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

  if (upsertError) {
    console.log('[api-key] error', upsertError.message)
    return { error: upsertError.message }
  }

  console.log('[api-key] saved')
  await logEvent('api_key_saved', { provider: 'anthropic' })
  revalidatePath('/dashboard/settings')

  return { status: 'success', masked }
}

export async function deleteApiKey(): Promise<{ status: 'success' } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const service = createServiceClient()
  const { error } = await service
    .from('api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'anthropic')

  if (error) {
    console.log('[api-key] error', error.message)
    return { error: error.message }
  }

  await logEvent('api_key_deleted')
  revalidatePath('/dashboard/settings')

  return { status: 'success' }
}
