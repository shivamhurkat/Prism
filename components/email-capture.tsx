'use client'

import { useState } from 'react'

export function EmailCapture() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="py-3 text-center">
        <p className="font-display text-lg font-light text-foreground">
          You're on the list.
        </p>
        <p className="text-sm text-muted-foreground mt-1 font-sans">
          We'll be in touch before the next cohort opens.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 h-12 rounded-[10px] border border-border bg-transparent px-4 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40"
      />
      <button
        type="submit"
        className="h-12 rounded-full px-6 text-sm font-medium font-sans bg-accent-copper text-white hover:opacity-90 transition-opacity duration-150 whitespace-nowrap"
      >
        Secure your seat
      </button>
    </form>
  )
}
