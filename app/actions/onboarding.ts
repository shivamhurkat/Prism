'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events'

type OnboardingErrors = Partial<
  Record<
    | 'full_name'
    | 'company_name'
    | 'role'
    | 'team_size'
    | 'industry'
    | 'primary_use_case'
    | '_root',
    string
  >
>

export type OnboardingState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; errors: OnboardingErrors }

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  console.log('[onboarding] submitting')

  try {
    const full_name = (formData.get('full_name') as string | null)?.trim() ?? ''
    const company_name = (formData.get('company_name') as string | null)?.trim() ?? ''
    const role = (formData.get('role') as string | null)?.trim() ?? ''
    const team_size = (formData.get('team_size') as string | null)?.trim() ?? ''
    const industry = (formData.get('industry') as string | null)?.trim() ?? ''
    const primary_use_case = (formData.get('primary_use_case') as string | null)?.trim() ?? ''

    const errors: OnboardingErrors = {}
    if (!full_name) errors.full_name = 'Required.'
    if (!company_name) errors.company_name = 'Required.'
    if (!role) errors.role = 'Required.'
    if (!team_size) errors.team_size = 'Required.'
    if (!industry) errors.industry = 'Required.'
    if (!primary_use_case) errors.primary_use_case = 'Required.'

    if (Object.keys(errors).length > 0) {
      return { status: 'error', errors }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { status: 'error', errors: { _root: 'Not authenticated.' } }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name,
        company_name,
        role,
        team_size,
        industry,
        primary_use_case,
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.log('[onboarding] error', error.message)
      return { status: 'error', errors: { _root: error.message } }
    }

    await logEvent('onboarding_completed', { team_size, industry, primary_use_case })
    revalidatePath('/dashboard')
    console.log('[onboarding] success')
    return { status: 'success' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[onboarding] error', msg)
    return { status: 'error', errors: { _root: msg } }
  }
}
