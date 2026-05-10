'use client'

import { useState } from 'react'
import Link from 'next/link'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSent(true)
  }

  if (sent) {
    return (
      <div className="py-6 text-center space-y-2">
        <p className="font-display text-xl font-light text-foreground">Check your inbox.</p>
        <p className="text-sm text-muted-foreground font-sans">
          Magic link sent to <span className="text-foreground">{email}</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Google */}
      <button
        type="button"
        className="w-full h-12 rounded-[10px] border border-border bg-surface flex items-center justify-center gap-3 text-sm font-medium font-sans text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-sans">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Magic link form */}
      <form onSubmit={handleMagicLink} className="space-y-3">
        <div className="relative">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            id="email-signup"
            className="peer w-full h-12 rounded-[10px] border border-border bg-transparent px-4 pt-3 pb-1 text-sm font-sans text-foreground placeholder-transparent focus:outline-none focus:ring-2 focus:ring-accent-copper/40 focus:border-accent-copper/40 transition-colors"
          />
          <label
            htmlFor="email-signup"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-sans pointer-events-none transition-all duration-150 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"
          >
            Email address
          </label>
        </div>
        <button
          type="submit"
          className="w-full h-12 rounded-full text-sm font-medium font-sans bg-accent-copper text-white hover:opacity-90 transition-opacity duration-150"
        >
          Send magic link
        </button>
      </form>

      <p className="text-center">
        <Link
          href="/signin"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
        >
          Already have an account? Sign in
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
