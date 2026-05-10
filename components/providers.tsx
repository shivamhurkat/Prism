'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AppProgressBar } from 'next-nprogress-bar'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="bottom-right" />
      <AppProgressBar height="2px" color="#C8742A" options={{ showSpinner: false }} shallowRouting />
    </ThemeProvider>
  )
}
