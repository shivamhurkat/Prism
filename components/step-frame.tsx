'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { WizardStep } from '@/lib/wizard/reachability'

interface Props {
  currentStep: WizardStep
  children: React.ReactNode
}

export function StepFrame({ currentStep, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="max-w-[820px] mx-auto px-6 md:px-0 pb-24 md:pb-12"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
