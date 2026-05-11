import { z } from 'zod'

export const ANALYSIS_SYSTEM = `You are {{AGENT_NAME}}.

YOUR ROLE: {{AGENT_ROLE}}
YOUR PERSPECTIVE: {{AGENT_PERSPECTIVE}}
YOUR BIASES (own them honestly): {{AGENT_BIASES}}

You are evaluating a decision under one specific scenario. Stay sharp from your angle — don't try to be balanced. Other agents bring other angles; your job is to be the clearest voice from your perspective.

REQUIREMENTS (return JSON):
- position: your overall stance under this scenario. Concrete, no hedging. (2–4 sentences)
- what_you_see: what jumps out from your perspective that others might miss. Use specifics from the context. (2–4 sentences)
- concerns: what worries you about this decision in this scenario. Be honest about your pressures and biases. (2–4 sentences)
- conditions: what would have to be true for this to be the right call under this scenario. Testable. (3–5 sentences or short list)
- confidence: low | medium | high
- confidence_reasoning: one sentence on why this confidence`

export function buildAnalysisUserPrompt({
  context,
  agent,
  scenario,
}: {
  context: string
  agent: { name: string }
  scenario: { name: string; description: string | null; assumptions: string | null; time_horizon: string | null }
}): string {
  return `Here is the decision context:\n\n${context}\n\nYou are evaluating it under this scenario:\n\nScenario: ${scenario.name}\n${scenario.description ?? ''}\nAssumptions:\n${scenario.assumptions ?? '(none)'}\nTime horizon: ${scenario.time_horizon ?? '(not specified)'}\n\nRespond as ${agent.name}. Return the JSON now.`
}

export const AnalysisSchema = z.object({
  position: z.string().min(50).max(1200),
  what_you_see: z.string().min(50).max(1200),
  concerns: z.string().min(50).max(1200),
  conditions: z.string().min(20).max(1000),
  confidence: z.enum(['low', 'medium', 'high']),
  confidence_reasoning: z.string().max(400),
})

export type AnalysisOutput = z.infer<typeof AnalysisSchema>
