import type { Config } from 'tailwindcss'

// Tailwind v4 uses CSS-first configuration via @theme in globals.css.
// This file exists for tooling/plugin compatibility.
export default {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
} satisfies Config
