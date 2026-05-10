'use client'

import { useState } from 'react'

export function ContextBlock({ text }: { text: string }) {
  const [showFull, setShowFull] = useState(false)
  const isLong = text.length > 300

  return (
    <div className="rounded-[10px] border border-border bg-surface/40 px-4 py-3 space-y-2">
      <p className="text-xs font-sans text-muted-foreground uppercase tracking-wide">
        Written context
      </p>
      <div className={isLong && !showFull ? 'relative max-h-40 overflow-hidden' : ''}>
        <p className="text-sm font-sans text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {showFull ? text : text.slice(0, 300)}
        </p>
        {isLong && !showFull && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface/40 to-transparent" />
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="text-xs text-accent-copper font-sans underline underline-offset-2"
        >
          {showFull ? 'Show less' : 'Show full'}
        </button>
      )}
    </div>
  )
}
