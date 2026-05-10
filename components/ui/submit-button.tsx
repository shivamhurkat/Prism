'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubmitButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'default' | 'lg'
  pendingLabel?: string
  className?: string
  disabled?: boolean
}

export function SubmitButton({
  children,
  variant = 'primary',
  size = 'default',
  pendingLabel,
  className,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  const [showPendingLabel, setShowPendingLabel] = useState(false)

  useEffect(() => {
    if (!pending) {
      setShowPendingLabel(false)
      return
    }
    const timer = setTimeout(() => setShowPendingLabel(true), 500)
    return () => clearTimeout(timer)
  }, [pending])

  const label = pending && showPendingLabel && pendingLabel ? pendingLabel : children

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        'flex items-center justify-center gap-2 font-sans font-medium transition-all duration-150',
        size === 'lg' ? 'h-12 text-sm' : 'h-11 text-sm',
        variant === 'primary'
          ? 'rounded-full bg-accent-copper text-white hover:opacity-90'
          : 'rounded-[10px] border border-border text-foreground hover:bg-surface/50',
        (pending || disabled) && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  )
}
