'use client'

import { Brain, Sparkles } from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ApiKeyForm } from '@/components/api-key-form'
import type { Provider } from '@/lib/ai/models'
import type { SingleKeyStatus } from '@/app/actions/api-keys'

const PROVIDER_DISPLAY: Record<Provider, { label: string; Icon: typeof Brain }> = {
  anthropic: { label: 'Anthropic (Claude)', Icon: Brain },
  google: { label: 'Google (Gemini)', Icon: Sparkles },
}

interface ProviderCardProps {
  provider: Provider
  status: SingleKeyStatus
}

export function ProviderCard({ provider, status }: ProviderCardProps) {
  const { label, Icon } = PROVIDER_DISPLAY[provider]

  return (
    <LiquidGlass variant="subtle" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent-copper shrink-0" />
          <span className="font-display text-[16px] font-light text-foreground">{label}</span>
        </div>
        {status.hasKey ? (
          <span className="text-xs font-sans text-success font-medium">Connected</span>
        ) : (
          <span className="text-xs font-sans text-muted-foreground">Not connected</span>
        )}
      </div>
      <ApiKeyForm provider={provider} initialStatus={status} />
    </LiquidGlass>
  )
}
