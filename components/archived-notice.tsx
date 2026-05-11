import { LiquidGlass } from '@/components/ui/liquid-glass'

export function ArchivedNotice() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <LiquidGlass className="p-10 max-w-md w-full text-center space-y-4">
        <h1 className="font-display text-2xl font-light text-foreground">Archived.</h1>
        <p className="text-sm text-muted-foreground font-sans">This decision is archived.</p>
        <button className="rounded-full border border-border px-5 py-2 text-sm font-sans text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
          Restore
        </button>
      </LiquidGlass>
    </div>
  )
}
