import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { logEvent } from '@/lib/events'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  console.log('[auth] callback hit, code present:', !!code)

  if (!code) {
    return NextResponse.redirect(`${origin}/signin`)
  }

  const cookiesFromSupabase: Array<{
    name: string
    value: string
    options?: Record<string, unknown>
  }> = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => cookiesFromSupabase.push(c))
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.log('[auth] exchange error:', error.message)
    const errResponse = NextResponse.redirect(`${origin}/signin?error=callback`)
    cookiesFromSupabase.forEach(({ name, value, options }) => {
      errResponse.cookies.set(name, value, options as Parameters<typeof errResponse.cookies.set>[2])
    })
    return errResponse
  }

  console.log('[auth] session established for:', data.session?.user.email)

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', data.session!.user.id)
    .single()

  const provider =
    (data.session?.user.app_metadata?.provider as string | undefined) ??
    'email'
  await logEvent('signin_completed', { provider })

  const destination = profile?.onboarded_at ? '/dashboard' : '/onboarding'
  const finalResponse = NextResponse.redirect(`${origin}${destination}`)

  cookiesFromSupabase.forEach(({ name, value, options }) => {
    finalResponse.cookies.set(name, value, options as Parameters<typeof finalResponse.cookies.set>[2])
  })

  return finalResponse
}
