import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte (64 hex char) value')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(ciphertext, 'base64')

  if (buf.length < 28) throw new Error('Malformed ciphertext: too short')

  const iv = buf.subarray(0, 12)
  const authTag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function maskApiKey(plaintext: string): string {
  const last4 = plaintext.slice(-4)
  if (plaintext.startsWith('sk-ant')) return `sk-ant-...••••••${last4}`
  return `...••••••${last4}`
}
