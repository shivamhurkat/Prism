const MAX_TOTAL_CHARS = 120_000

interface DecisionInput {
  title: string
  question: string | null
  context_text: string | null
}

interface FileInput {
  file_name: string
  extracted_text: string | null
  parse_skipped_reason: string | null
}

export function buildDecisionContext({
  decision,
  files,
}: {
  decision: DecisionInput
  files: FileInput[]
}): string {
  const sections: string[] = [
    `Decision title\n${decision.title}`,
    `The decision question\n${decision.question ?? '(none)'}`,
    `Additional written context\n${decision.context_text ?? '(none)'}`,
  ]

  const textFiles = files.filter(f => f.extracted_text !== null)
  const skippedFiles = files.filter(f => f.extracted_text === null && f.parse_skipped_reason)

  if (textFiles.length > 0 || skippedFiles.length > 0) {
    sections.push('Uploaded files')

    const fixedOverhead = sections.join('\n\n').length + 50
    const budgetForFiles = MAX_TOTAL_CHARS - fixedOverhead

    if (textFiles.length > 0) {
      const totalFileChars = textFiles.reduce((s, f) => s + (f.extracted_text?.length ?? 0), 0)
      const ratio = totalFileChars > budgetForFiles ? budgetForFiles / totalFileChars : 1

      for (const f of textFiles) {
        const raw = f.extracted_text!
        let content = raw
        if (ratio < 1) {
          const allowed = Math.floor(raw.length * ratio)
          content = raw.slice(0, allowed) + '\n[truncated]'
        }
        sections.push(`## ${f.file_name}\n${content}\n\n---`)
      }
    }

    for (const f of skippedFiles) {
      sections.push(`## ${f.file_name} — note: ${f.parse_skipped_reason}`)
    }
  }

  return sections.join('\n\n')
}
