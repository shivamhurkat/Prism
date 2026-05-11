import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { DashboardNav } from '@/components/dashboard-nav'
import { AmbientBackground } from '@/components/ui/ambient-background'
import { OnboardingModal } from '@/components/onboarding-modal'
import { DecisionList } from '@/components/decision-list'
import { getApiKeyStatus } from '@/app/actions/api-keys'

export const metadata = {
  title: 'Dashboard — Prism',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const [{ data: profile }, { data: decisions }, apiKeyStatus] = await Promise.all([
    supabase
      .from('profiles')
      .select('email, full_name, avatar_url, onboarded_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('decisions')
      .select('id, title, question, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getApiKeyStatus(),
  ])

  await logEvent('dashboard_viewed')

  const email = profile?.email ?? user.email ?? ''
  const displayName = profile?.full_name ?? null
  const avatarUrl = profile?.avatar_url ?? null
  const needsOnboarding = !profile?.onboarded_at

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNav
        email={email}
        avatarUrl={avatarUrl}
        displayName={displayName}
        hasNoKeys={apiKeyStatus.keys.every(k => !k.hasKey)}
      />

      <main className="flex-1">
        {!decisions || decisions.length === 0 ? (
          <EmptyState />
        ) : (
          <DecisionList decisions={decisions} />
        )}
      </main>

      <footer className="border-t border-border-edge py-6">
        <p className="text-xs text-muted-foreground font-sans text-center">
          Prism — AI Decision Intelligence
        </p>
      </footer>

      {needsOnboarding && (
        <OnboardingModal initialName={profile?.full_name ?? ''} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 overflow-hidden">
      <AmbientBackground />
      <div className="relative z-10 flex flex-col items-center text-center max-w-[720px] space-y-8">
        <div className="space-y-3">
          <h1 className="font-display text-5xl font-light tracking-tight text-foreground">
            Your council awaits.
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed">
            Start your first decision and Prism will convene the right voices.
          </p>
        </div>

        <LiquidGlass
          variant="prominent"
          interactive
          className="w-full max-w-[480px] p-10"
        >
          <div className="flex flex-col items-center gap-6">
            <Link
              href="/dashboard/new"
              className="rounded-full bg-accent-copper text-white px-8 py-3 text-sm font-sans font-medium hover:opacity-90 transition-opacity duration-150"
            >
              Start a decision
            </Link>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed text-center max-w-prose">
              Average decision takes 12 minutes. You&apos;ll get a board-ready
              dashboard.
            </p>
          </div>
        </LiquidGlass>
      </div>
    </div>
  )
}
