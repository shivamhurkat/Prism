'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { completeOnboarding, type OnboardingState } from '@/app/actions/onboarding'

interface OnboardingModalProps {
  initialName: string
}

const initialState: OnboardingState = { status: 'idle' }

export function OnboardingModal({ initialName }: OnboardingModalProps) {
  const [state, formAction] = useActionState(completeOnboarding, initialState)

  // After success, revalidatePath causes server re-render which drops this modal.
  // Show a brief "settling" state in case of rerender delay.
  if (state.status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/50 dark:bg-black/50">
        <div className="text-muted-foreground font-sans text-sm flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Setting up your workspace…
        </div>
      </div>
    )
  }

  const errors = state.status === 'error' ? state.errors : {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/30 dark:bg-black/50"
      // No onClick — not dismissable by backdrop click
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-[640px]"
      >
        <LiquidGlass variant="prominent" className="p-10 relative">
          {/* Header */}
          <div>
            <h1 className="font-display text-3xl font-light text-foreground">
              Welcome to Prism.
            </h1>
            <p className="mt-2 text-base text-muted-foreground font-sans">
              A few details before we convene your council.
            </p>
          </div>

          {/* Root error */}
          {errors._root && (
            <p className="mt-4 text-sm text-destructive font-sans">{errors._root}</p>
          )}

          {/* Form */}
          <form action={formAction} className="mt-8 flex flex-col gap-5">
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name" className="font-sans text-sm text-foreground">
                Full name
              </Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={initialName}
                required
                placeholder="Your name"
                className="h-11 rounded-[10px] border-border bg-transparent font-sans text-sm"
                aria-invalid={!!errors.full_name}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive font-sans">{errors.full_name}</p>
              )}
            </div>

            {/* Company name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company_name" className="font-sans text-sm text-foreground">
                Company name
              </Label>
              <Input
                id="company_name"
                name="company_name"
                type="text"
                required
                placeholder="Acme Inc."
                className="h-11 rounded-[10px] border-border bg-transparent font-sans text-sm"
                aria-invalid={!!errors.company_name}
              />
              {errors.company_name && (
                <p className="text-xs text-destructive font-sans">{errors.company_name}</p>
              )}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role" className="font-sans text-sm text-foreground">
                Your role
              </Label>
              <Input
                id="role"
                name="role"
                type="text"
                required
                placeholder="Founder, CEO, GM, VP, etc."
                className="h-11 rounded-[10px] border-border bg-transparent font-sans text-sm"
                aria-invalid={!!errors.role}
              />
              {errors.role && (
                <p className="text-xs text-destructive font-sans">{errors.role}</p>
              )}
            </div>

            {/* Team size */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-sans text-sm text-foreground">Team size</Label>
              <Select name="team_size" required>
                <SelectTrigger
                  className="h-11 rounded-[10px] border-border bg-transparent font-sans text-sm"
                  aria-invalid={!!errors.team_size}
                >
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Just me">Just me</SelectItem>
                  <SelectItem value="2–10">2–10</SelectItem>
                  <SelectItem value="11–50">11–50</SelectItem>
                  <SelectItem value="51–200">51–200</SelectItem>
                  <SelectItem value="200+">200+</SelectItem>
                </SelectContent>
              </Select>
              {errors.team_size && (
                <p className="text-xs text-destructive font-sans">{errors.team_size}</p>
              )}
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-sans text-sm text-foreground">Industry</Label>
              <Select name="industry" required>
                <SelectTrigger
                  className="h-11 rounded-[10px] border-border bg-transparent font-sans text-sm"
                  aria-invalid={!!errors.industry}
                >
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SaaS / Software">SaaS / Software</SelectItem>
                  <SelectItem value="E-commerce / Retail">E-commerce / Retail</SelectItem>
                  <SelectItem value="Real estate">Real estate</SelectItem>
                  <SelectItem value="Fintech / Financial services">Fintech / Financial services</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Professional services">Professional services</SelectItem>
                  <SelectItem value="Media / Content">Media / Content</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.industry && (
                <p className="text-xs text-destructive font-sans">{errors.industry}</p>
              )}
            </div>

            {/* Primary use case */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-sans text-sm text-foreground">
                Primary use case for Prism
              </Label>
              <Select name="primary_use_case" required>
                <SelectTrigger
                  className="h-11 rounded-[10px] border-border bg-transparent font-sans text-sm"
                  aria-invalid={!!errors.primary_use_case}
                >
                  <SelectValue placeholder="Select use case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Strategic planning">Strategic planning</SelectItem>
                  <SelectItem value="Hiring & team decisions">Hiring &amp; team decisions</SelectItem>
                  <SelectItem value="Investment & capital decisions">Investment &amp; capital decisions</SelectItem>
                  <SelectItem value="Build vs buy / outsource">Build vs buy / outsource</SelectItem>
                  <SelectItem value="Crisis & turnaround calls">Crisis &amp; turnaround calls</SelectItem>
                  <SelectItem value="Multiple — exploring">Multiple — exploring</SelectItem>
                </SelectContent>
              </Select>
              {errors.primary_use_case && (
                <p className="text-xs text-destructive font-sans">{errors.primary_use_case}</p>
              )}
            </div>

            <SubmitButton />

            <p className="text-xs text-muted-foreground font-sans text-center -mt-1">
              You can update these later in Settings.
            </p>
          </form>

          {/* Sign out — bottom-right */}
          <div className="mt-6 flex justify-end">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                Sign out
              </button>
            </form>
          </div>
        </LiquidGlass>
      </motion.div>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full h-12 rounded-full bg-accent-copper text-white text-sm font-sans font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Convene my council
    </button>
  )
}
