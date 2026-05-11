'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      <DialogContent className="sm:max-w-[560px] p-0 border-0 bg-transparent shadow-none">
        <LiquidGlass variant="prominent" className="p-8 w-full">
          <DialogHeader className="mb-4 space-y-2">
            <DialogTitle className="font-display text-2xl font-light text-foreground leading-snug">
              Connect your API key.
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-sans leading-relaxed">
              Anthropic (Claude) gives the highest quality output. Google (Gemini) is much cheaper for testing. You can connect both and switch later.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="anthropic">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="anthropic" className="flex-1">Anthropic</TabsTrigger>
              <TabsTrigger value="google" className="flex-1">Google Gemini</TabsTrigger>
            </TabsList>
            <TabsContent value="anthropic">
              <ApiKeyForm
                provider="anthropic"
                initialStatus={{ hasKey: false }}
                onSuccess={handleSuccess}
              />
            </TabsContent>
            <TabsContent value="google">
              <ApiKeyForm
                provider="google"
                initialStatus={{ hasKey: false }}
                onSuccess={handleSuccess}
              />
            </TabsContent>
          </Tabs>
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  )
}
