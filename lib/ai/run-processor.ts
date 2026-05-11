import 'server-only'
import { callJsonModel } from '@/lib/ai/call'
import {
  ANALYSIS_SYSTEM,
  buildAnalysisUserPrompt,
  AnalysisSchema,
  type AnalysisOutput,
} from '@/lib/ai/prompts/analysis'
import {
  CRITIQUE_SYSTEM,
  buildCritiqueUserPrompt,
  CritiqueSchema,
} from '@/lib/ai/prompts/critique'
import {
  SYNTHESIS_SYSTEM,
  buildSynthesisUserPrompt,
  SynthesisSchema,
} from '@/lib/ai/prompts/synthesis'
import {
  updateTaskRunning,
  updateTaskCompleted,
  updateTaskFailed,
  getRunTasks,
  insertRunSynthesis,
} from '@/lib/db/run-helpers'
import type { RunTaskRow } from '@/lib/db/run-helpers'

type ContextBundle = {
  decision: { id: string; title: string; question: string | null; context_text: string | null }
  files: Array<{ file_name: string; extracted_text: string | null; parse_skipped_reason: string | null }>
  agents: Array<{ id: string; name: string; role: string | null; perspective: string | null; biases: string | null; locked: boolean; position: number }>
  scenarios: Array<{ id: string; name: string; description: string | null; assumptions: string | null; time_horizon: string | null; locked: boolean; position: number }>
  clarifications: Array<{ question: string; user_answer: string | null }>
  contextText: string
}

function fillSystemPlaceholders(
  template: string,
  agent: { name: string; role: string | null; perspective: string | null; biases: string | null }
): string {
  return template
    .replace(/\{\{AGENT_NAME\}\}/g, agent.name)
    .replace(/\{\{AGENT_ROLE\}\}/g, agent.role ?? '')
    .replace(/\{\{AGENT_PERSPECTIVE\}\}/g, agent.perspective ?? '')
    .replace(/\{\{AGENT_BIASES\}\}/g, agent.biases ?? '')
}

export async function processAnalysisTask(
  task: RunTaskRow,
  userId: string,
  decisionId: string,
  bundle: ContextBundle
): Promise<void> {
  const startMs = Date.now()

  const agent = bundle.agents.find(a => a.id === task.agent_charter_id)
  const scenario = bundle.scenarios.find(s => s.id === task.scenario_id)

  if (!agent || !scenario) {
    await updateTaskFailed(task.id, 'Agent or scenario not found in context bundle')
    return
  }

  console.log('[run-task] analysis', `${agent.name}×${scenario.name}`, 'start')
  await updateTaskRunning(task.id)

  const system = fillSystemPlaceholders(ANALYSIS_SYSTEM, agent)
  const user = buildAnalysisUserPrompt({ context: bundle.contextText, agent, scenario })

  try {
    const { data, usage } = await callJsonModel({
      userId,
      decisionId,
      kind: 'analysis',
      modelTier: 'heavy',
      system,
      user,
      schema: AnalysisSchema,
      schemaName: 'AgentAnalysis',
    })

    await updateTaskCompleted(task.id, {
      output: JSON.stringify(data),
      input_tokens: usage.input,
      output_tokens: usage.output,
    })

    const durationMs = Date.now() - startMs
    console.log('[run-task] analysis', task.id, 'done', `${durationMs}ms`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[run-task] analysis', task.id, 'failed', msg)
    await updateTaskFailed(task.id, msg)
    // Do not rethrow — let other tasks continue
  }
}

export async function processCritiqueTask(
  task: RunTaskRow,
  userId: string,
  decisionId: string,
  bundle: ContextBundle
): Promise<void> {
  const startMs = Date.now()

  const agent = bundle.agents.find(a => a.id === task.agent_charter_id)
  if (!agent) {
    await updateTaskFailed(task.id, 'Agent not found in context bundle')
    return
  }

  console.log('[run-task] critique', agent.name, 'start')
  await updateTaskRunning(task.id)

  // Gather all completed analysis tasks for OTHER agents
  const allAnalysisTasks = await getRunTasks(task.run_id, 'analysis', 'completed')
  const otherAgentIds = bundle.agents.filter(a => a.id !== agent.id).map(a => a.id)

  const otherAgentsAnalyses = otherAgentIds
    .map(agentId => {
      const otherAgent = bundle.agents.find(a => a.id === agentId)
      if (!otherAgent) return null

      const agentTasks = allAnalysisTasks.filter(t => t.agent_charter_id === agentId)
      const scenarioSummaries = agentTasks.map(t => {
        const scenario = bundle.scenarios.find(s => s.id === t.scenario_id)
        let position = ''
        if (t.output) {
          try {
            const parsed = JSON.parse(t.output) as AnalysisOutput
            position = parsed.position
          } catch {
            position = t.output.slice(0, 200)
          }
        }
        return { scenarioName: scenario?.name ?? 'Unknown', position }
      })

      return { agentName: otherAgent.name, scenarioSummaries }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (otherAgentsAnalyses.length === 0) {
    // No other agents completed — still run with empty context
    otherAgentsAnalyses.push({ agentName: '(no other analyses available yet)', scenarioSummaries: [] })
  }

  const system = fillSystemPlaceholders(CRITIQUE_SYSTEM, agent)
  const user = buildCritiqueUserPrompt({ agent, otherAgentsAnalyses })

  try {
    const { data, usage } = await callJsonModel({
      userId,
      decisionId,
      kind: 'critique',
      modelTier: 'heavy',
      system,
      user,
      schema: CritiqueSchema,
      schemaName: 'AgentCritique',
    })

    await updateTaskCompleted(task.id, {
      output: JSON.stringify(data),
      input_tokens: usage.input,
      output_tokens: usage.output,
    })

    const durationMs = Date.now() - startMs
    console.log('[run-task] critique', task.id, 'done', `${durationMs}ms`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[run-task] critique', task.id, 'failed', msg)
    await updateTaskFailed(task.id, msg)
    // Do not rethrow — let other tasks continue
  }
}

export async function processSynthesisTask(
  task: RunTaskRow,
  userId: string,
  decisionId: string,
  bundle: ContextBundle
): Promise<{ ok: true } | { ok: false; error: string }> {
  const startMs = Date.now()

  console.log('[run-task] synthesis', task.id, 'start')
  await updateTaskRunning(task.id)

  const allAnalysisTasks = await getRunTasks(task.run_id, 'analysis', 'completed')
  const allCritiqueTasks = await getRunTasks(task.run_id, 'critique', 'completed')

  // Build agentsWithAnalyses
  const agentsWithAnalyses = bundle.agents.map(agent => {
    const agentTasks = allAnalysisTasks.filter(t => t.agent_charter_id === agent.id)
    const scenarioAnalyses = agentTasks.map(t => {
      const scenario = bundle.scenarios.find(s => s.id === t.scenario_id)
      let analysis = t.output ?? ''
      if (t.output) {
        try {
          const parsed = JSON.parse(t.output) as AnalysisOutput
          analysis = [
            `Position: ${parsed.position}`,
            `What they see: ${parsed.what_you_see}`,
            `Concerns: ${parsed.concerns}`,
            `Conditions: ${parsed.conditions}`,
            `Confidence: ${parsed.confidence} — ${parsed.confidence_reasoning}`,
          ].join('\n')
        } catch {
          analysis = t.output
        }
      }
      return { scenarioName: scenario?.name ?? 'Unknown', analysis }
    })
    return { agentName: agent.name, scenarioAnalyses }
  })

  // Build critiques
  const critiques = allCritiqueTasks.map(t => {
    const agent = bundle.agents.find(a => a.id === t.agent_charter_id)
    let critiqueText = t.output ?? ''
    if (t.output) {
      try {
        const parsed = JSON.parse(t.output) as { critiques: Array<{ agent_name: string; critique: string }> }
        critiqueText = parsed.critiques
          .map(c => `${c.agent_name}: ${c.critique}`)
          .join('\n\n')
      } catch {
        critiqueText = t.output
      }
    }
    return { agentName: agent?.name ?? 'Unknown', critiqueText }
  })

  const attemptSynthesis = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = buildSynthesisUserPrompt({
      context: bundle.contextText,
      agentsWithAnalyses,
      critiques,
    })

    try {
      const { data, usage } = await callJsonModel({
        userId,
        decisionId,
        kind: 'synthesis',
        modelTier: 'heavy',
        system: SYNTHESIS_SYSTEM,
        user,
        schema: SynthesisSchema,
        schemaName: 'CouncilSynthesis',
      })

      await insertRunSynthesis({
        run_id: task.run_id,
        verdict: data.verdict,
        confidence_pct: data.confidence_pct,
        confidence_reasoning: data.confidence_reasoning,
        top_risks: data.top_risks,
        decision_criteria: data.decision_criteria,
        what_would_change_my_mind: data.what_would_change_my_mind,
        summary_text: data.one_line_summary,
      })

      await updateTaskCompleted(task.id, {
        output: JSON.stringify(data),
        input_tokens: usage.input,
        output_tokens: usage.output,
      })

      const durationMs = Date.now() - startMs
      console.log('[run-task] synthesis', task.id, 'done', `${durationMs}ms`)
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: msg }
    }
  }

  const first = await attemptSynthesis()
  if (first.ok) return first

  // One retry on synthesis failure
  console.log('[run-task] synthesis', task.id, 'retrying after failure:', first.error)
  const second = await attemptSynthesis()
  if (second.ok) return second

  console.log('[run-task] synthesis', task.id, 'failed', second.error)
  await updateTaskFailed(task.id, second.error)
  return { ok: false, error: second.error }
}
