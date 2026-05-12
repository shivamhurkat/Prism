export function isTransientError(error: unknown): boolean {
  const err = error as Record<string, unknown> | null
  const status =
    (err?.statusCode as number | undefined) ??
    (err?.status as number | undefined) ??
    ((err?.cause as Record<string, unknown>)?.statusCode as number | undefined) ??
    ((err?.cause as Record<string, unknown>)?.status as number | undefined)

  if (status !== undefined && [429, 500, 502, 503, 504, 529].includes(status)) return true

  const message = String((err?.message as string | undefined) ?? '').toLowerCase()
  if (/overload|high demand|temporarily unavailable|rate.?limit|resource.exhausted|server is busy|503|529|please try again/.test(message)) return true

  return false
}

export async function callWithBackoff<T>(
  fn: () => Promise<T>,
  opts: {
    maxRetries?: number
    baseMs?: number
    capMs?: number
    label?: string
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void
  } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 4   // total attempts: maxRetries + 1 = 5
  const baseMs = opts.baseMs ?? 1500
  const capMs = opts.capMs ?? 30000
  let delay = baseMs
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const transient = isTransientError(err)
      if (attempt === maxRetries || !transient) throw err
      const jitter = Math.random() * 500
      const waitMs = Math.min(delay + jitter, capMs)
      opts.onRetry?.(attempt + 1, err, waitMs)
      const errMsg = ((err as Record<string, unknown>)?.message as string | undefined) ?? ''
      console.log(
        `[ai] retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(waitMs)}ms for ${opts.label ?? 'call'}: ${errMsg.slice(0, 120)}`
      )
      await new Promise((r) => setTimeout(r, waitMs))
      delay = Math.min(delay * 2, capMs)
    }
  }

  throw lastError
}
