import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const variants = cva('relative rounded-[14px]', {
  variants: {
    variant: {
      default: '',
      prominent: '',
      subtle: '',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface LiquidGlassProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof variants> {
  interactive?: boolean
}

const blurMap = { default: '28px', prominent: '40px', subtle: '16px' } as const

export function LiquidGlass({
  className,
  variant = 'default',
  interactive = false,
  children,
  style,
  ...props
}: LiquidGlassProps) {
  const blur = blurMap[variant ?? 'default']
  return (
    <div
      className={cn(
        variants({ variant }),
        'border',
        interactive &&
          'transition-all duration-200 hover:scale-[1.005]',
        className
      )}
      style={{
        backdropFilter: `blur(${blur}) saturate(180%)`,
        WebkitBackdropFilter: `blur(${blur}) saturate(180%)`,
        background: 'var(--glass-bg)',
        borderColor: interactive
          ? undefined
          : 'var(--glass-border)',
        boxShadow:
          'inset 0 1px 0 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.04)',
        ...style,
      }}
      {...props}
    >
      {/* Liquid warp overlay — distorts only the glass surface, not content */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
        style={{
          filter: 'url(#liquid-glass-warp)',
          opacity: 0.3,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'var(--glass-warp-bg)' }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
