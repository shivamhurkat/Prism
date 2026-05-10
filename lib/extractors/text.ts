const TEXT_CAP = 200_000

export function extractText(buffer: Buffer): string {
  return new TextDecoder('utf-8').decode(buffer).slice(0, TEXT_CAP)
}
