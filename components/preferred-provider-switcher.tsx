'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { setPreferredProvider } from '@/app/actions/api-keys'
import { MODELS } from '@/lib/ai/models'
import type { Provider } from '@/lib/ai/models'
import { cn } from '@/lib/utils'

interface Props {
  current: Provider
}

const OPTIONS: { value: Provider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google Gemini' },
]

export function PreferredProviderSwitcher({ current }: Props) {
  const [preferred, setPreferred] = useState<Provider>(current)
  const [isPending, startTransition] = useTransition()

  function handleSwitch(provider: Provider) {
    if (provider === preferred || isPending) return
    const previous = preferred
    setPreferred(provider) // optimistic
    startTransition(async () => {
      const result = await setPreferredProvider(provider)
      if ('error' in result) {
        setPreferred(previous)
        toast.error('Could not switch provider.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
        Default provider for AI calls
      </p>
      <div className="inline-flex rounded-[10px] border border-border overflow-hidden">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={isPending}
            onClick={() => handleSwitch(opt.value)}
            className={cn(
              'px-4 py-2 text-sm font-sans transition-colors relative flex items-center gap-1.5',
              preferred === opt.value
                ? 'bg-accent-copper text-white'
                : 'text-muted-foreground hover:text-foreground bg-transparent',
              'disabled:opacity-60'
            )}
          >
            {isPending && preferred === opt.value && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-sans">
        Light tasks → {MODELS[preferred].light}. Heavy tasks → {MODELS[preferred].heavy}. Switch any time.
      </p>
    </div>
  )
}
