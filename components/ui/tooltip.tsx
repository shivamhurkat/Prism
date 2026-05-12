'use client'

import * as React from 'react'
import { Tooltip as RadixTooltip } from 'radix-ui'

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RadixTooltip.Provider delayDuration={300}>{children}</RadixTooltip.Provider>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <RadixTooltip.Root>{children}</RadixTooltip.Root>
}

export function TooltipTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <RadixTooltip.Trigger asChild={asChild}>{children}</RadixTooltip.Trigger>
}

export function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={6}
        className={[
          'z-50 max-w-xs rounded-[10px] bg-foreground px-3 py-2 text-xs font-sans text-background shadow-lg',
          'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
        <RadixTooltip.Arrow className="fill-foreground" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  )
}
