'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  sendSignInMagicLink,
  signInWithGoogle,
  type AuthState,
} from '@/app/actions/auth'

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

const initialState: AuthState = { status: 'idle' }

export function SignInForm() {
  const [state, formAction] = useActionState(sendSignInMagicLink, initialState)
  const [resetted, setResetted] = useState(false)

  useEffect(() => {
    if (state.status === 'error') {
      toast.error(state.message)
    }
  }, [state])

  const showSuccess = state.status === 'success' && !resetted

  if (showSuccess && state.status === 'success') {
    return (
      <div className="py-6 text-center space-y-4">
        <h2 className="font-display text-2xl font-light text-foreground">
          Check your email.
        </h2>
        <p className="text-sm text-muted-foreground font-sans leading-relaxed">
          We sent a magic link to{' '}
          <span className="text-foreground">{state.email}</span>. It expires in
          1 hour.
        </p>
        <button
          type="button"
          onClick={() => setResetted(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans underline underline-offset-2"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <form action={signInWithGoogle}>
            <GoogleButton />
          </form>
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-sans">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </>
      )}

      <form action={formAction} className="space-y-3">
        <div className="relative">
          <input
            type="email"
            name="email"
            required
            placeholder=" "
            id="email-signin"
            className="peer w-full h-12 rounded-[10px] border border-border bg-transparent px-4 pt-3 pb-1 text-sm font-sans text-foreground placeholder-transparent focus:outline-none focus:ring-2 focus:ring-accent-copper/40 focus:border-accent-copper/40 transition-colors"
          />
          <label
            htmlFor="email-signin"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-sans pointer-events-none transition-all duration-150 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"
          >
            Email address
          </label>
        </div>
        <SubmitButton variant="primary" size="lg" pendingLabel="Sending..." className="w-full">
          Send magic link
        </SubmitButton>
      </form>

      <p className="text-xs text-muted-foreground font-sans text-center mt-1">
        Forgot something? Just use the magic link.
      </p>

      <p className="text-center">
        <Link
          href="/signup"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
        >
          Don&apos;t have an account? Sign up
        </Link>
      </p>
    </div>
  )
}

function GoogleButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-12 rounded-[10px] border border-border bg-surface flex items-center justify-center gap-3 text-sm font-medium font-sans text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      Continue with Google
    </button>
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
