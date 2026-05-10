import { LiquidGlass } from '@/components/ui/liquid-glass'

export default function CallbackLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <LiquidGlass variant="subtle" className="p-10 flex flex-col items-center gap-5 max-w-xs w-full text-center">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-accent-copper border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-sans text-muted-foreground">Convening your session&hellip;</p>
      </LiquidGlass>
    </div>
  )
}
