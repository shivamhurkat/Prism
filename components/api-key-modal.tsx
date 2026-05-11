'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ApiKeyForm } from '@/components/api-key-form'

interface ApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ApiKeyModal({ open, onOpenChange, onSuccess }: ApiKeyModalProps) {
  function handleSuccess() {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 border-0 bg-transparent shadow-none">
        <LiquidGlass variant="prominent" className="p-8 w-full">
          <DialogHeader className="mb-6 space-y-2">
            <DialogTitle className="font-display text-2xl font-light text-foreground leading-snug">
              Connect your Anthropic key.
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-sans leading-relaxed">
              Prism uses your own Claude API key. Your data stays yours, costs stay
              transparent. The key is encrypted at rest and never leaves Prism&apos;s
              servers.
            </DialogDescription>
          </DialogHeader>
          <ApiKeyForm
            initialStatus={{ hasKey: false }}
            onSuccess={handleSuccess}
          />
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  )
}
