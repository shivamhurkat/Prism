import { inngest } from '@/inngest/client'
import * as run from '@/lib/db/run-helpers'
import { processAnalysisTask, processCritiqueTask, processSynthesisTask } from '@/lib/ai/run-processor'
import { buildDecisionContext } from '@/lib/ai/context'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const deliberationRun = inngest.createFunction(
  {
    id: 'deliberation-run',
    name: 'Deliberation Run',
    triggers: [{ event: 'deliberation/start' }],
    concurrency: { limit: 5 },
    retries: 1,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: any) => {
    const { runId, decisionId, userId } = event.data as {
      runId: string
      decisionId: string
      userId: string
    }

    const bundle = await step.run('load-context', async () => {
      const full = await run.getDecisionWithChildren(decisionId)
      const contextText = buildDecisionContext({
        decision: full.decision,
        files: full.files,
        clarifications: full.clarifications,
      })
      return { ...full, contextText }
    })

    await step.run('mark-running', async () => {
      await run.markRunRunning(runId)
    })

    // Analysis pass — batches of 4 in parallel
    await step.run('analysis-pass', async () => {
      const tasks = await run.getRunTasks(runId, 'analysis', 'pending')
      const BATCH = 4
      for (let i = 0; i < tasks.length; i += BATCH) {
        const r = await run.getRun(runId)
        if (r.status === 'cancelled') return
        const batch = tasks.slice(i, i + BATCH)
        await Promise.all(batch.map(t => processAnalysisTask(t, userId, decisionId, bundle)))
        await run.recomputeRunProgress(runId)
      }
    })

    // Cancellation gate after analysis
    const afterAnalysis = await run.getRun(runId)
    if (afterAnalysis.status === 'cancelled') return

    // Critique pass — batches of 4 in parallel
    await step.run('critique-pass', async () => {
      const tasks = await run.getRunTasks(runId, 'critique', 'pending')
      const BATCH = 4
      for (let i = 0; i < tasks.length; i += BATCH) {
        const r = await run.getRun(runId)
        if (r.status === 'cancelled') return
        const batch = tasks.slice(i, i + BATCH)
        await Promise.all(batch.map(t => processCritiqueTask(t, userId, decisionId, bundle)))
        await run.recomputeRunProgress(runId)
      }
    })

    // Cancellation gate after critique
    const afterCritique = await run.getRun(runId)
    if (afterCritique.status === 'cancelled') return

    // Synthesis — single task
    const synthesisResult = await step.run('synthesis', async () => {
      await run.markRunSynthesizing(runId)
      const task = await run.getSynthesisTask(runId)
      return await processSynthesisTask(task, userId, decisionId, bundle)
    })

    if (!synthesisResult?.ok) {
      await step.run('mark-failed', async () => {
        const errorMsg = (synthesisResult as { ok: false; error: string })?.error || 'Synthesis failed'
        await run.markRunFailed(runId, errorMsg)
        const supabase = getServiceClient()
        await supabase.from('decisions').update({ status: 'failed' }).eq('id', decisionId)
      })
      return
    }

    await step.run('mark-complete', async () => {
      await run.markRunCompleted(runId)
      await run.markDecisionCompleted(decisionId)
    })
  }
)
