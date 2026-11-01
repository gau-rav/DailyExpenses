import { describe, expect, it } from 'vitest'
import { normalizeEmail, validateCredentials } from './authRules.js'

describe('auth rules', () => {
  it('normalizes email casing and surrounding whitespace', () => {
    expect(normalizeEmail('  User@Example.com  ')).toBe('user@example.com')
    expect(normalizeEmail(null)).toBe('')
  })

  it('validates required fields, email format, and password limits', () => {
    expect(validateCredentials('', '')).toBe('Email and password are required')
    expect(validateCredentials('invalid', 'password123')).toBe('Enter a valid email address')
    expect(validateCredentials('user@example.com', 'short')).toBe('Password must be at least 8 characters')
    expect(validateCredentials('user@example.com', 'x'.repeat(129))).toBe('Password must be 128 characters or fewer')
    expect(validateCredentials('user@example.com', 'valid-pass')).toBe('')
  })

  it('rejects email addresses exceeding the supported length', () => {
    expect(validateCredentials(`${'a'.repeat(243)}@example.com`, 'valid-pass')).toBe('Enter a valid email address')
  })
})
