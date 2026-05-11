import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { deliberationRun } from '@/inngest/functions/deliberation-run'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [deliberationRun],
  // signingKey is read automatically from INNGEST_SIGNING_KEY env var
})
