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
