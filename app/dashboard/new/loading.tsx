import { LiquidGlass } from '@/components/ui/liquid-glass'

export default function NewDecisionLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[760px] mx-auto px-6 py-12">
        {/* Breadcrumb skeleton */}
        <div className="mb-8">
          <div className="h-4 w-24 rounded-[6px] bg-border animate-pulse" />
        </div>

        {/* Headline skeleton */}
        <div className="mb-10 space-y-2">
          <div className="h-10 w-56 rounded-[10px] bg-border animate-pulse" />
          <div className="h-4 w-72 rounded-[8px] bg-border animate-pulse" />
        </div>

        {/* Form card skeleton */}
        <LiquidGlass className="p-8 space-y-6">
          {/* Title field */}
          <div className="space-y-1.5">
            <div className="h-4 w-10 rounded-[6px] bg-border animate-pulse" />
            <div className="h-11 w-full rounded-[10px] bg-border animate-pulse" />
          </div>

          {/* Question field */}
          <div className="space-y-1.5">
            <div className="h-4 w-52 rounded-[6px] bg-border animate-pulse" />
            <div className="h-36 w-full rounded-[10px] bg-border animate-pulse" />
          </div>

          {/* Context toggle */}
          <div className="h-4 w-48 rounded-[6px] bg-border animate-pulse" />

          {/* Buttons */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-11 rounded-[10px] bg-border animate-pulse" />
            <div className="flex-1 h-11 rounded-full bg-border animate-pulse" />
          </div>
        </LiquidGlass>
      </div>
    </div>
  )
}
