import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events'

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()

  await logEvent('signout')
  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}/`, { status: 302 })
}
