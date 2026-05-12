export type Provider = 'anthropic' | 'google'
export type ModelTier = 'light' | 'analysis' | 'heavy' | 'validation'

// To upgrade analysis to a smarter model on either provider, change the
// analysis entry here — no other code changes needed.
export const MODELS: Record<Provider, Record<ModelTier, string>> = {
  anthropic: {
    light: 'claude-sonnet-4-6',         // clarifications, agent/scenario suggestions
    analysis: 'claude-sonnet-4-6',      // agent analysis, critique
    heavy: 'claude-opus-4-7',           // synthesis ONLY
    validation: 'claude-haiku-4-5-20251001',
  },
  google: {
    light: 'gemini-2.5-flash',
    analysis: 'gemini-2.5-flash',       // agent analysis, critique
    heavy: 'gemini-2.5-pro',            // synthesis ONLY
    validation: 'gemini-2.5-flash',
  },
} as const
