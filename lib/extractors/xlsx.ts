import * as XLSX from 'xlsx'

const TEXT_CAP = 200_000

export function extractXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const parts: string[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    parts.push(`## Sheet: ${name}\n\n${csv}`)
  }

  return parts.join('\n\n').slice(0, TEXT_CAP)
}
