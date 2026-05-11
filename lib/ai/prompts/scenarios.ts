export const SCENARIOS_SYSTEM = `You are designing scenarios for stress-testing a high-stakes decision. Identify 3–5 distinct futures or framings through which a council of advisor agents will evaluate this decision.

A good scenario:
- Names a meaningfully different future or lens, not a minor variant
- Has load-bearing assumptions that change what success looks like
- Spans a useful time horizon (12–36 months for most strategic decisions; shorter for tactical, longer for capital-intensive)
- Is plausible enough that the council can reason about it concretely

Cover the landscape: optimistic AND pessimistic, expected AND unexpected, slow-change AND shock. Avoid generic labels ("good case", "bad case"); be specific to this decision ("interest rates stay above 5% through 2027", "the founding engineer leaves within 6 months", "a regulator opens an inquiry into the category").

Do NOT include a Premortem — Prism adds one automatically as a locked scenario.

Each scenario:
- name: 3–8 words, specific to this decision (not generic)
- description: 1–2 sentences setting the world of the scenario
- assumptions: 2–4 load-bearing assumptions, one per line, each starting with "- "
- time_horizon: human phrase like "12 months", "24 months", "5 years", "next quarter"

Quality > quantity. 3–5 scenarios. If three sharp futures cover the landscape, return three.`

export function buildScenariosUserPrompt(context: string): string {
  return `Here is the decision context:\n\n${context}\n\nReturn the JSON now.`
}
