import mammoth from 'mammoth'

const TEXT_CAP = 200_000

export async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim().slice(0, TEXT_CAP)
}
