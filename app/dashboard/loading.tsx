import { LiquidGlass } from '@/components/ui/liquid-glass'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav skeleton */}
      <div className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-[16px]">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <div className="h-6 w-16 rounded-full bg-border animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 rounded-full bg-border animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-border animate-pulse" />
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          {/* Heading row skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-44 rounded-[10px] bg-border animate-pulse" />
            <div className="h-9 w-32 rounded-full bg-border animate-pulse" />
          </div>

          {/* Decision card skeletons */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <LiquidGlass key={i} className="px-6 py-5 flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-3/4 rounded-[8px] bg-border animate-pulse" />
                  <div className="h-4 w-1/2 rounded-[8px] bg-border animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="h-5 w-16 rounded-full bg-border animate-pulse" />
                  <div className="h-3 w-20 rounded-[6px] bg-border animate-pulse" />
                </div>
              </LiquidGlass>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
