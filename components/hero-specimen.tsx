'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { LiquidGlass } from '@/components/ui/liquid-glass'

const HEATMAP: number[] = [
  0.9, 0.7, 0.4,
  0.6, 0.85, 0.3,
  0.75, 0.5, 0.65,
  0.4, 0.8, 0.55,
]

const AGENTS = [
  { label: 'C', title: 'Customer' },
  { label: 'I', title: 'Investor' },
  { label: 'E', title: 'Employee' },
  { label: 'D', title: "Devil's Advocate" },
]

function heatColor(v: number): string {
  if (v >= 0.75) return 'rgba(200,116,42,0.85)'
  if (v >= 0.55) return 'rgba(200,116,42,0.5)'
  if (v >= 0.35) return 'rgba(161,161,161,0.3)'
  return 'rgba(161,161,161,0.15)'
}

export function HeroSpecimen() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 400,
    damping: 30,
  })
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [6, -6]), {
    stiffness: 400,
    damping: 30,
  })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    rawX.set((e.clientX - rect.left) / rect.width - 0.5)
    rawY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center"
      style={{ perspective: '1200px' }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="w-full max-w-[420px]"
      >
        <LiquidGlass variant="prominent" className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Decision Analysis
            </span>
            <span className="text-xs font-mono text-accent-copper">Live</span>
          </div>

          {/* Verdict */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-sans">Verdict</p>
            <p className="font-display text-lg font-light leading-snug text-foreground">
              Lean: build villas.{' '}
              <span className="text-accent-copper font-normal">68% confidence.</span>
            </p>
          </div>

          {/* Scenario heatmap */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-sans">Scenario heatmap</p>
            <div className="grid grid-cols-3 gap-1.5">
              {HEATMAP.map((v, i) => (
                <div
                  key={i}
                  className="h-7 rounded-[6px] transition-opacity"
                  style={{ background: heatColor(v) }}
                  title={`${Math.round(v * 100)}%`}
                />
              ))}
            </div>
          </div>

          {/* Agent council */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-sans">Council</p>
            <div className="flex gap-3">
              {AGENTS.map(({ label, title }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div
                    className="size-9 rounded-full flex items-center justify-center text-sm font-mono font-medium border"
                    style={{
                      background: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {label}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-sans leading-none">
                    {title.split("'")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground font-sans">
              <span>Analysis progress</span>
              <span>87%</span>
            </div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-copper"
                style={{ width: '87%' }}
              />
            </div>
          </div>
        </LiquidGlass>
      </motion.div>
    </div>
  )
}
