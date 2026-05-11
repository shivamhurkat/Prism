'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/actions/auth'

interface DashboardNavProps {
  email: string
  avatarUrl: string | null
  displayName: string | null
  hasNoKeys?: boolean
}

export function DashboardNav({ email, avatarUrl, displayName, hasNoKeys = false }: DashboardNavProps) {
  const initial = ((displayName || email || '?')[0] ?? '?').toUpperCase()
  const router = useRouter()
  const [isSigningOut, startSignOut] = useTransition()

  function handleSignOut() {
    startSignOut(async () => {
      await signOut()
    })
  }

  return (
    <LiquidGlass
      variant="subtle"
      className="sticky top-0 z-50 rounded-none border-x-0 border-t-0"
    >
      <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          onMouseEnter={() => router.prefetch('/dashboard')}
          className="font-display text-xl font-light text-foreground hover:opacity-80 transition-opacity"
        >
          Prism
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/new"
            onMouseEnter={() => router.prefetch('/dashboard/new')}
            className="rounded-full bg-accent-copper text-white px-5 py-2 text-sm font-sans font-medium hover:opacity-90 transition-opacity duration-150"
          >
            New decision
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-copper/40 relative"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={email} />
                  )}
                  <AvatarFallback className="bg-border text-foreground text-xs font-sans font-medium">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                {hasNoKeys && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent-copper border-2 border-background" />
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground font-sans truncate">
                  {email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings#api-key"
                  onMouseEnter={() => router.prefetch('/dashboard/settings')}
                  className="cursor-pointer"
                >
                  API keys
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  onMouseEnter={() => router.prefetch('/dashboard/settings')}
                  className="cursor-pointer"
                >
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  handleSignOut()
                }}
                disabled={isSigningOut}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm font-sans w-full">
                  {isSigningOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Sign out
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </LiquidGlass>
  )
}
