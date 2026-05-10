import pdf from 'pdf-parse'

const TEXT_CAP = 200_000

export async function extractPdf(buffer: Buffer): Promise<string> {
  const result = await pdf(buffer)
  return (result.text || '').trim().slice(0, TEXT_CAP)
}