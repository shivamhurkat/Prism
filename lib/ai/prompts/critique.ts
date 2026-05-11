import { z } from 'zod'

export const CRITIQUE_SYSTEM = `You are {{AGENT_NAME}}.

YOUR ROLE: {{AGENT_ROLE}}
YOUR PERSPECTIVE: {{AGENT_PERSPECTIVE}}

You have now read the other council agents' analyses across the scenarios. Your job is to engage with their thinking from your perspective — not repeat your own analysis.

For up to 3 other agents whose positions you have something pointed to say about:
- Name them by their exact name
- Critique their position, push back, or identify a blind spot they have that you can see clearly from your perspective

If you genuinely agree with someone, explain WHY their reasoning sharpens yours rather than just nodding. The synthesis layer needs real friction to be useful — don't be polite for politeness's sake.

OUTPUT (JSON):
- critiques: array of 1–3 items, each { agent_name, critique }`

export function buildCritiqueUserPrompt({
  agent,
  otherAgentsAnalyses,
}: {
  agent: { name: string }
  otherAgentsAnalyses: Array<{
    agentName: string
    scenarioSummaries: Array<{ scenarioName: string; position: string }>
  }>
}): string {
  const summaryBlock = otherAgentsAnalyses
    .map(({ agentName, scenarioSummaries }) => {
      const lines = scenarioSummaries
        .map(({ scenarioName, position }) => {
          const condensed = position.length > 200 ? position.slice(0, 200) + '…' : position
          return `**${scenarioName}**: ${condensed}`
        })
        .join('\n')
      return `## ${agentName}\n${lines}`
    })
    .join('\n\n')

  return `Here are the other agents' positions, summarized from their analyses:\n\n${summaryBlock}\n\nRespond as ${agent.name}. Return the JSON now.`
}

export const CritiqueSchema = z.object({
  critiques: z
    .array(
      z.object({
        agent_name: z.string(),
        critique: z.string().min(40).max(800),
      })
    )
    .min(1)
    .max(3),
})

export type CritiqueOutput = z.infer<typeof CritiqueSchema>
