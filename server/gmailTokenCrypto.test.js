import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from './gmailTokenCrypto.js'

const originalKey = process.env.TOKEN_ENCRYPTION_KEY

describe('gmailTokenCrypto', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY
    else process.env.TOKEN_ENCRYPTION_KEY = originalKey
  })

  it('encrypts and decrypts a refresh token', () => {
    const token = '1//refresh-token-value'
    const encrypted = encryptToken(token)
    expect(encrypted).not.toContain(token)
    expect(encrypted.startsWith('v1:')).toBe(true)
    expect(decryptToken(encrypted)).toBe(token)
  })

  it('fails when the encryption key changes', () => {
    const encrypted = encryptToken('1//refresh-token-value')
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    expect(() => decryptToken(encrypted)).toThrow()
  })

  it('rejects malformed values', () => {
    expect(() => decryptToken('not-encrypted')).toThrow('Unsupported encrypted token format')
    expect(() => decryptToken('v1:a:b')).toThrow('Unsupported encrypted token format')
  })

  it('reports whether a valid key is configured', () => {
    expect(isTokenEncryptionConfigured()).toBe(true)
    process.env.TOKEN_ENCRYPTION_KEY = 'short'
    expect(isTokenEncryptionConfigured()).toBe(false)
  })
})
