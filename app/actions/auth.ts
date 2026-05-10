'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events'

export type AuthState =
  | { status: 'idle' }
  | { status: 'success'; email: string }
  | { status: 'error'; message: string }

export async function sendSignUpMagicLink(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string | null) ?? ''
  console.log('[auth] OTP request →', email)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.log('[auth] OTP error:', error.message)
    return { status: 'error', message: error.message }
  }

  console.log('[auth] OTP sent')
  await logEvent('signup_email_sent', { email })
  return { status: 'success', email }
}

export async function sendSignInMagicLink(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string | null) ?? ''
  console.log('[auth] OTP request →', email)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.log('[auth] OTP error:', error.message)
    return { status: 'error', message: error.message }
  }

  console.log('[auth] OTP sent')
  await logEvent('signin_email_sent', { email })
  return { status: 'success', email }
}

export async function signInWithGoogle() {
  console.log('[auth] OAuth init')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.log('[auth] OAuth error:', error.message)
    throw error
  }

  if (!data?.url) throw new Error('No OAuth URL returned')

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await logEvent('signout')
  await supabase.auth.signOut()
  redirect('/')
}
