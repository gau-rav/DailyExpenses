import crypto from 'node:crypto'

const VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

export function isTokenEncryptionConfigured() {
  try {
    encryptionKey()
    return true
  } catch {
    return false
  }
}

function encryptionKey() {
  const raw = String(process.env.TOKEN_ENCRYPTION_KEY || '').trim()
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not configured')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  return key
}

export function encryptToken(value) {
  const token = String(value || '')
  if (!token) throw new Error('Token value is required')
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':')
}

export function decryptToken(value) {
  const parts = String(value || '').split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error('Unsupported encrypted token format')
  const iv = Buffer.from(parts[1], 'base64url')
  const tag = Buffer.from(parts[2], 'base64url')
  const encrypted = Buffer.from(parts[3], 'base64url')
  if (iv.length !== IV_BYTES || tag.length !== 16 || !encrypted.length) {
    throw new Error('Encrypted token is malformed')
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
