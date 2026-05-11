export type Provider = 'anthropic' | 'google'
export type ModelTier = 'light' | 'heavy' | 'validation'

export const MODELS: Record<Provider, Record<ModelTier, string>> = {
  anthropic: {
    light: 'claude-sonnet-4-6',
    heavy: 'claude-opus-4-7',
    validation: 'claude-haiku-4-5-20251001',
  },
  google: {
    light: 'gemini-2.5-flash',
    heavy: 'gemini-2.5-pro',
    validation: 'gemini-2.5-flash',
  },
} as const
