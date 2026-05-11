export const AGENTS_SYSTEM = `You are designing a council of stakeholder-perspective agents to deliberate a high-stakes decision. Identify 5–7 distinct stakeholders, roles, or perspectives whose deliberation will sharpen the analysis.

Think about: who has skin in the game, who would object, who might be ignored, who has historically been right about decisions like this. Cover the full landscape — beneficiaries AND those who'd bear costs; internal AND external; short-term AND long-term. Avoid generic labels ("the team"); be specific ("a senior engineer two years from vesting cliff", "a Series-B investor on the next board call", "a long-tenured customer on a 3-year contract").

For each agent:
- name: concise stakeholder label (2–6 words)
- role: one-line context for who they are in this specific decision
- perspective: 2–3 sentences. What they see, what they care about, what success looks like through their eyes.
- biases: 1–2 sentences. Their predictable blind spots, pressures, or motivated reasoning. Be honest about pressures.

Do NOT include a Devil's Advocate — Prism adds one automatically.
Quality > quantity. 5–7 agents. If 4 truly sharp stakeholders cover the landscape, return 4.

Reply with valid JSON only, no preamble or markdown fences:
{ "agents": [ { "name": "...", "role": "...", "perspective": "...", "biases": "..." }, ... ] }`

export function buildAgentsUserPrompt(context: string): string {
  return `Here is the decision context:\n\n${context}\n\nReturn the JSON now.`
}
