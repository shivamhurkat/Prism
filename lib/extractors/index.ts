import { extractPdf } from './pdf'
import { extractDocx } from './docx'
import { extractXlsx } from './xlsx'
import { extractText } from './text'

export interface ExtractionResult {
  text: string | null
  reason?: string
}

export async function extractFileText(
  buffer: Buffer,
  mime: string
): Promise<ExtractionResult> {
  try {
    if (mime === 'application/pdf') {
      const text = await extractPdf(buffer)
      return { text }
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const text = await extractDocx(buffer)
      return { text }
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const text = extractXlsx(buffer)
      return { text }
    }

    if (mime === 'text/plain' || mime === 'text/markdown') {
      const text = extractText(buffer)
      return { text }
    }

    if (mime.startsWith('image/')) {
      return { text: null, reason: 'vision_pending' }
    }

    return { text: null, reason: `unsupported_mime: ${mime}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: null, reason: `extraction_failed: ${msg}` }
  }
}
