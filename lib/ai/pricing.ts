// Verify against https://www.anthropic.com/pricing — update as Anthropic changes rates.
export const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
}

export function getCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = PRICING[model]
  if (!rates) return 0
  return (rates.input * inputTokens + rates.output * outputTokens) / 1_000_000
}
