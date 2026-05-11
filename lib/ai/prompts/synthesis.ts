import { z } from 'zod'

export const SYNTHESIS_SYSTEM = `You are the Prism Council Chair. You have read every agent's analysis across every scenario, plus the cross-critiques. Your job is to synthesize into a board-ready recommendation.

You are not balanced for politeness — you make a call. But you make it honestly:
- Engage with the STRONGEST dissenting view, especially the Devil's Advocate. If their objection is serious, name it and address it specifically.
- Don't average opinions; weigh them by quality of reasoning and relevance to the scenarios you find most plausible.
- Confidence reflects how much you'd bet on this verdict, not how the council voted.

OUTPUT (JSON):
- verdict: clear, concrete recommendation. 2–3 sentences. No hedging. State what you'd do.
- confidence_pct: integer 0–100
- confidence_reasoning: 3–5 sentences on why this confidence level. Reference specific agents/scenarios.
- top_risks: 3–5 items, each { risk: string, severity: 'low'|'medium'|'high', note: string }. Ranked by severity then likelihood. Specific, not generic.
- decision_criteria: 3–5 testable conditions. Each begins with a verb. The user should be able to verify YES on these for the verdict to hold.
- what_would_change_my_mind: a concrete paragraph naming the specific signals that should make the user reverse this verdict if observed.
- one_line_summary: a board-meeting headline of ≤30 words.

The Devil's Advocate is part of every Prism council. Their objection must appear in either top_risks or what_would_change_my_mind. Do not skip them.`

export function buildSynthesisUserPrompt({
  context,
  agentsWithAnalyses,
  critiques,
}: {
  context: string
  agentsWithAnalyses: Array<{
    agentName: string
    scenarioAnalyses: Array<{ scenarioName: string; analysis: string }>
  }>
  critiques: Array<{
    agentName: string
    critiqueText: string
  }>
}): string {
  const analysisBlock = agentsWithAnalyses
    .map(({ agentName, scenarioAnalyses }) => {
      const scenarioLines = scenarioAnalyses
        .map(({ scenarioName, analysis }) => `#### ${scenarioName}\n${analysis}`)
        .join('\n\n')
      return `### ${agentName}\n${scenarioLines}`
    })
    .join('\n\n')

  const critiqueBlock = critiques
    .map(({ agentName, critiqueText }) => `### ${agentName} critiqued:\n${critiqueText}`)
    .join('\n\n')

  return `Decision context:\n\n${context}\n\n## Council analyses\n\n${analysisBlock}\n\n## Cross-critiques\n\n${critiqueBlock}\n\nNow synthesize. Return JSON only.`
}

export const SynthesisSchema = z.object({
  verdict: z.string().min(50).max(800),
  confidence_pct: z.number().int().min(0).max(100),
  confidence_reasoning: z.string().min(40).max(800),
  top_risks: z
    .array(
      z.object({
        risk: z.string().min(10).max(300),
        severity: z.enum(['low', 'medium', 'high']),
        note: z.string().max(400),
      })
    )
    .min(3)
    .max(5),
  decision_criteria: z.array(z.string().min(10).max(200)).min(3).max(5),
  what_would_change_my_mind: z.string().min(50).max(1000),
  one_line_summary: z.string().min(10).max(200),
})

export type SynthesisOutput = z.infer<typeof SynthesisSchema>
