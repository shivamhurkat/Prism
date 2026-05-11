import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ProviderCard } from '@/components/provider-card'
import { PreferredProviderSwitcher } from '@/components/preferred-provider-switcher'
import { getApiKeyStatus } from '@/app/actions/api-keys'
import { signOut } from '@/app/actions/auth'

export const metadata = {
  title: 'Settings — Prism',
}

const PROFILE_LABELS: Array<{ key: keyof ProfileRow; label: string }> = [
  { key: 'full_name', label: 'Full name' },
  { key: 'company_name', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'team_size', label: 'Team size' },
  { key: 'industry', label: 'Industry' },
  { key: 'primary_use_case', label: 'Primary use case' },
]

type ProfileRow = {
  email: string
  full_name: string | null
  company_name: string | null
  role: string | null
  team_size: string | null
  industry: string | null
  primary_use_case: string | null
  created_at: string
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const [{ data: profile }, apiKeyStatus] = await Promise.all([
    supabase
      .from('profiles')
      .select('email, full_name, company_name, role, team_size, industry, primary_use_case, created_at')
      .eq('id', user.id)
      .single(),
    getApiKeyStatus(),
  ])

  const email = profile?.email ?? user.email ?? ''
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  const anthropicStatus = apiKeyStatus.keys.find(k => k.provider === 'anthropic')
  const googleStatus = apiKeyStatus.keys.find(k => k.provider === 'google')
  const bothConnected =
    (anthropicStatus?.hasKey ?? false) && (googleStatus?.hasKey ?? false)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[760px] mx-auto px-6 py-12 space-y-8">
        <div className="mb-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground font-sans hover:text-foreground transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <h1 className="font-display text-[40px] font-light text-foreground leading-tight">
          Settings
        </h1>

        {/* API keys section */}
        <LiquidGlass id="api-key" className="p-8 space-y-6">
          <div>
            <h2 className="font-display text-[22px] font-light text-foreground">API keys</h2>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              Connect one or both providers. Anthropic (Opus/Sonnet) for highest quality. Google (Gemini) for cheap iteration.
            </p>
          </div>

          {bothConnected && (
            <PreferredProviderSwitcher current={apiKeyStatus.preferredProvider} />
          )}

          <div className="space-y-4">
            <ProviderCard
              provider="anthropic"
              status={anthropicStatus ?? { hasKey: false }}
            />
            <ProviderCard
              provider="google"
              status={googleStatus ?? { hasKey: false }}
            />
          </div>
        </LiquidGlass>

        {/* Profile section */}
        <LiquidGlass className="p-8 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-[22px] font-light text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground font-sans mt-1">
                Used to tailor your council and decision context.
              </p>
            </div>
            <span className="text-sm text-muted-foreground font-sans">Edit coming soon</span>
          </div>
          <div className="space-y-3">
            {PROFILE_LABELS.map(({ key, label }) => {
              const value = profile?.[key as keyof ProfileRow]
              return (
                <div key={key} className="flex items-baseline gap-4">
                  <span className="text-sm text-muted-foreground font-sans w-36 shrink-0">{label}</span>
                  <span className="text-sm font-sans text-foreground">
                    {value ?? <span className="text-muted-foreground/60">—</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </LiquidGlass>

        {/* Account section */}
        <LiquidGlass className="p-8 space-y-5">
          <div>
            <h2 className="font-display text-[22px] font-light text-foreground">Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-baseline gap-4">
              <span className="text-sm text-muted-foreground font-sans w-36 shrink-0">Email</span>
              <span className="text-sm font-sans text-foreground">{email}</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-sm text-muted-foreground font-sans w-36 shrink-0">Member since</span>
              <span className="text-sm font-sans text-foreground">{memberSince}</span>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-[10px] border border-destructive text-destructive px-5 py-2 text-sm font-sans hover:bg-destructive/5 transition-colors duration-150"
            >
              Sign out
            </button>
          </form>
        </LiquidGlass>
      </div>
    </div>
  )
}
