import { MODELS, type Provider } from '@/lib/ai/models'
import { getCostUsd } from '@/lib/ai/pricing'

export interface RunEstimate {
  totalCalls: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCostUsd: number
  estimatedMinutes: number
  modelsUsed: { analysis: string; synthesis: string }
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

  const analysisInputTokens = analysisCalls * (contextTokens + 1200) + critiqueCalls * 3500
  const analysisOutputTokens = analysisCalls * 1000 + critiqueCalls * 700

  const synthesisInputTokens = 9000
  const synthesisOutputTokens = 3000

  const estimatedInputTokens = analysisInputTokens + synthesisInputTokens
  const estimatedOutputTokens = analysisOutputTokens + synthesisOutputTokens

  const analysisModel = MODELS[provider].analysis
  const heavyModel = MODELS[provider].heavy

  const analysisCost = getCostUsd(analysisModel, analysisInputTokens, analysisOutputTokens)
  const synthesisCost = getCostUsd(heavyModel, synthesisInputTokens, synthesisOutputTokens)
  const estimatedCostUsd = Math.ceil((analysisCost + synthesisCost) * 100) / 100

  const estimatedMinutes = Math.max(2, Math.ceil((totalCalls * 25) / 60 / 3))

  return {
    totalCalls,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
    estimatedMinutes,
    modelsUsed: { analysis: analysisModel, synthesis: heavyModel },
  }
}
