'use client'

import Link from 'next/link'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardNavProps {
  email: string
  avatarUrl: string | null
  displayName: string | null
}

export function DashboardNav({ email, avatarUrl, displayName }: DashboardNavProps) {
  const initial = ((displayName || email || '?')[0] ?? '?').toUpperCase()

  return (
    <LiquidGlass
      variant="subtle"
      className="sticky top-0 z-50 rounded-none border-x-0 border-t-0"
    >
      <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className="font-display text-xl font-light text-foreground hover:opacity-80 transition-opacity"
        >
          Prism
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/new"
            className="rounded-full bg-accent-copper text-white px-5 py-2 text-sm font-sans font-medium hover:opacity-90 transition-opacity duration-150"
          >
            New decision
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-copper/40"
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
                <Link href="/dashboard/api-keys" className="cursor-pointer">
                  API keys
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form
                  action="/auth/signout"
                  method="POST"
                  className="w-full"
                >
                  <button
                    type="submit"
                    className="w-full text-left text-sm font-sans cursor-pointer"
                  >
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </LiquidGlass>
  )
}
