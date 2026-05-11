import { MODELS, type Provider } from '@/lib/ai/models'
import { getCostUsd } from '@/lib/ai/pricing'

export interface RunEstimate {
  totalCalls: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCostUsd: number
  estimatedMinutes: number
  modelUsed: string
}

export function estimateRunCost({
  agentsCount,
  scenariosCount,
  contextChars,
  provider,
}: {
  agentsCount: number
  scenariosCount: number
  contextChars: number
  provider: Provider
}): RunEstimate {
  const contextTokens = Math.ceil(contextChars / 4)
  const analysisCalls = agentsCount * scenariosCount
  const critiqueCalls = agentsCount
  const totalCalls = analysisCalls + critiqueCalls + 1

  const estimatedInputTokens =
    analysisCalls * (contextTokens + 1200) +
    critiqueCalls * 3500 +
    9000

  const estimatedOutputTokens =
    analysisCalls * 1000 +
    critiqueCalls * 700 +
    3000

  const modelUsed = MODELS[provider].heavy
  const estimatedCostUsd =
    Math.ceil(getCostUsd(modelUsed, estimatedInputTokens, estimatedOutputTokens) * 100) / 100

  const estimatedMinutes = Math.max(2, Math.ceil((totalCalls * 25) / 60 / 3))

  return {
    totalCalls,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
    estimatedMinutes,
    modelUsed,
  }
}
