'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptApiKey, maskApiKey } from '@/lib/crypto/keys'
import { validateProviderKey } from '@/lib/ai/providers'
import { logEvent } from '@/lib/events'
import type { Provider } from '@/lib/ai/models'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProviderKeyStatus = {
  provider: Provider
  hasKey: boolean
  masked?: string
  lastValidatedAt?: string
}

export type ApiKeyStatus = {
  keys: ProviderKeyStatus[]
  preferredProvider: Provider
}

// Legacy narrow type still consumed by ApiKeyModal
export type SingleKeyStatus = {
  hasKey: boolean
  masked?: string
  lastValidatedAt?: string
}

export type SaveApiKeyResult =
  | { status: 'success'; provider: Provider; masked: string }
  | { error: string }

// ─── getApiKeyStatus ──────────────────────────────────────────────────────────

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      keys: [
        { provider: 'anthropic', hasKey: false },
        { provider: 'google', hasKey: false },
      ],
      preferredProvider: 'anthropic',
    }
  }

  const service = createServiceClient()
  const [{ data: keyRows }, { data: profile }] = await Promise.all([
    service
      .from('api_keys')
      .select('provider, encrypted_key, last_validated_at')
      .eq('user_id', user.id),
    service
      .from('profiles')
      .select('preferred_provider')
      .eq('id', user.id)
      .single(),
  ])

  const { decryptApiKey } = await import('@/lib/crypto/keys')

  const providers: Provider[] = ['anthropic', 'google']
  const keys: ProviderKeyStatus[] = providers.map(p => {
    const row = keyRows?.find(r => r.provider === p)
    if (!row) return { provider: p, hasKey: false }
    let masked: string | undefined
    try { masked = maskApiKey(decryptApiKey(row.encrypted_key)) } catch { masked = undefined }
    return { provider: p, hasKey: true, masked, lastValidatedAt: row.last_validated_at ?? undefined }
  })

  return {
    keys,
    preferredProvider: (profile?.preferred_provider as Provider | null) ?? 'anthropic',
  }
}

// ─── saveApiKey ───────────────────────────────────────────────────────────────

export async function saveApiKey(formData: FormData): Promise<SaveApiKeyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const raw = (formData.get('apiKey') as string | null) ?? ''
  const key = raw.trim()
  const providerRaw = (formData.get('provider') as string | null) ?? 'anthropic'
  const provider: Provider = providerRaw === 'google' ? 'google' : 'anthropic'

  if (!key || key.length < 20) return { error: 'API key is too short.' }

  console.log('[api-key] validating', provider)
  const validation = await validateProviderKey(provider, key)

  if (!validation.ok) {
    console.log('[api-key] error', validation.reason)
    return { error: validation.reason }
  }

  const encrypted = encryptApiKey(key)
  const masked = maskApiKey(key)

  const service = createServiceClient()

  // Check if this is the user's first key
  const { data: existingKeys } = await service
    .from('api_keys')
    .select('provider')
    .eq('user_id', user.id)

  const isFirstKey = !existingKeys || existingKeys.length === 0

  const { error: upsertError } = await service
    .from('api_keys')
    .upsert(
      {
        user_id: user.id,
        provider,
        encrypted_key: encrypted,
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

  if (upsertError) {
    console.log('[api-key] error', upsertError.message)
    return { error: upsertError.message }
  }

  // Set preferred_provider for the first key connected
  if (isFirstKey) {
    await service
      .from('profiles')
      .update({ preferred_provider: provider })
      .eq('id', user.id)
  }

  console.log('[provider] saved', provider)
  await logEvent('api_key_saved', { provider })
  revalidatePath('/dashboard/settings')

  return { status: 'success', provider, masked }
}

// ─── deleteApiKey ─────────────────────────────────────────────────────────────

export async function deleteApiKey(
  provider: Provider = 'anthropic'
): Promise<{ status: 'success' } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const service = createServiceClient()
  const { error } = await service
    .from('api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  if (error) {
    console.log('[api-key] error', error.message)
    return { error: error.message }
  }

  // If we deleted the preferred provider, fall back to the other one
  const { data: profile } = await service
    .from('profiles')
    .select('preferred_provider')
    .eq('id', user.id)
    .single()

  if (profile?.preferred_provider === provider) {
    const other: Provider = provider === 'anthropic' ? 'google' : 'anthropic'
    const { data: otherKey } = await service
      .from('api_keys')
      .select('provider')
      .eq('user_id', user.id)
      .eq('provider', other)
      .single()

    if (otherKey) {
      await service.from('profiles').update({ preferred_provider: other }).eq('id', user.id)
    }
  }

  await logEvent('api_key_deleted', { provider })
  revalidatePath('/dashboard/settings')

  return { status: 'success' }
}

// ─── setPreferredProvider ─────────────────────────────────────────────────────

export async function setPreferredProvider(
  provider: Provider
): Promise<{ status: 'success' } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const service = createServiceClient()

  // Verify the user has a key for this provider
  const { data: keyRow } = await service
    .from('api_keys')
    .select('provider')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single()

  if (!keyRow) return { error: 'no_key_for_provider' }

  const { data: profile } = await service
    .from('profiles')
    .select('preferred_provider')
    .eq('id', user.id)
    .single()

  const from = profile?.preferred_provider ?? 'anthropic'

  const { error } = await service
    .from('profiles')
    .update({ preferred_provider: provider })
    .eq('id', user.id)

  if (error) return { error: error.message }

  console.log('[provider] switched', `${from}→${provider}`)
  await logEvent('preferred_provider_changed', { from, to: provider })
  revalidatePath('/dashboard/settings')

  return { status: 'success' }
}
