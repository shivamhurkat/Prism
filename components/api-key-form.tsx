'use client'

import { useState, useTransition, useActionState } from 'react'
import { Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { saveApiKey, deleteApiKey } from '@/app/actions/api-keys'
import type { Provider } from '@/lib/ai/models'
import type { SingleKeyStatus } from '@/app/actions/api-keys'

const PROVIDER_META: Record<Provider, { placeholder: string; helpUrl: string; helpLabel: string }> = {
  anthropic: {
    placeholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpLabel: 'Anthropic Console →',
  },
  google: {
    placeholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpLabel: 'Google AI Studio →',
  },
}

interface ApiKeyFormProps {
  provider: Provider
  initialStatus: SingleKeyStatus
  onSuccess?: () => void
}

export function ApiKeyForm({ provider, initialStatus, onSuccess }: ApiKeyFormProps) {
  const [status, setStatus] = useState(initialStatus)
  const [showForm, setShowForm] = useState(!initialStatus.hasKey)
  const [showKey, setShowKey] = useState(false)
  const [isDeleting, startDelete] = useTransition()
  const meta = PROVIDER_META[provider]

  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await saveApiKey(formData)
      if ('error' in result) {
        toast.error(result.error === 'invalid_key'
          ? 'Invalid API key — check your console.'
          : result.error === 'rate_limited'
          ? 'API key is rate limited. Try again shortly.'
          : result.error)
        return result
      }
      setStatus({ hasKey: true, masked: result.masked, lastValidatedAt: new Date().toISOString() })
      setShowForm(false)
      toast.success('API key connected.')
      onSuccess?.()
      return result
    },
    null
  )

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteApiKey(provider)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setStatus({ hasKey: false })
      setShowForm(true)
      toast.success('API key disconnected.')
    })
  }

  if (status.hasKey && !showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />
          <span className="text-sm font-sans text-[#16A34A] font-medium">Connected</span>
        </div>
        {status.masked && (
          <p className="font-mono text-sm text-muted-foreground">{status.masked}</p>
        )}
        {status.lastValidatedAt && (
          <p className="text-xs text-muted-foreground font-sans">
            Last validated {formatRelative(status.lastValidatedAt)}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
          >
            Replace key
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={isDeleting}
                className="flex items-center gap-1.5 text-sm font-sans text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Disconnect
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect this key?</AlertDialogTitle>
                <AlertDialogDescription>
                  AI features will stop working until you connect a new one.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="provider" value={provider} />
      <div className="space-y-2">
        <div className="relative">
          <input
            name="apiKey"
            type={showKey ? 'text' : 'password'}
            placeholder={meta.placeholder}
            autoComplete="off"
            className="w-full h-11 rounded-[10px] border border-border bg-surface px-4 pr-12 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground font-sans">
          <a
            href={meta.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline underline-offset-2"
          >
            {meta.helpLabel}
          </a>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton variant="primary" pendingLabel="Validating..." className="px-6" disabled={isPending}>
          Connect key
        </SubmitButton>
        {status.hasKey && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
