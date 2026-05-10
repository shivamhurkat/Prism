import { LiquidGlass } from '@/components/ui/liquid-glass'

export default function DecisionDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        {/* Breadcrumb skeleton */}
        <div className="mb-8">
          <div className="h-4 w-24 rounded-[6px] bg-border animate-pulse" />
        </div>

        <LiquidGlass className="p-8 space-y-6">
          {/* Title + status row */}
          <div className="flex items-start justify-between gap-4">
            <div className="h-9 w-2/3 rounded-[10px] bg-border animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-border animate-pulse shrink-0" />
          </div>

          {/* Question skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-[8px] bg-border animate-pulse" />
            <div className="h-4 w-5/6 rounded-[8px] bg-border animate-pulse" />
            <div className="h-4 w-3/4 rounded-[8px] bg-border animate-pulse" />
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            {/* Section heading skeleton */}
            <div className="h-7 w-40 rounded-[8px] bg-border animate-pulse" />
            <div className="h-4 w-96 rounded-[6px] bg-border animate-pulse" />

            {/* Dropzone skeleton */}
            <div className="h-36 w-full rounded-[14px] bg-border animate-pulse" />

            {/* File row skeletons */}
            {[1, 2].map((i) => (
              <LiquidGlass key={i} variant="subtle" className="px-4 py-3 flex items-center gap-3">
                <div className="h-5 w-5 rounded-[4px] bg-border animate-pulse shrink-0" />
                <div className="flex-1 h-4 rounded-[6px] bg-border animate-pulse" />
                <div className="h-4 w-14 rounded-[6px] bg-border animate-pulse" />
                <div className="h-5 w-14 rounded-full bg-border animate-pulse" />
              </LiquidGlass>
            ))}
          </div>
        </LiquidGlass>
      </div>
    </div>
  )
}
