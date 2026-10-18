import { describe, it, expect } from 'vitest'
import {
  validateExpense,
  validateEmail,
  validateBudget,
  validatePositiveNumber,
  validateRequired,
} from './validationUtils.js'

describe('validateExpense', () => {
  it('returns no errors for a complete expense', () => {
    expect(validateExpense({ title: 'Rent', amount: 1200, dueDate: '2026-02-01' })).toEqual({})
  })

  it('flags a missing or whitespace title', () => {
    expect(validateExpense({ amount: 1, dueDate: '2026-02-01' }).title).toBe('Enter a title')
    expect(validateExpense({ title: '   ', amount: 1, dueDate: '2026-02-01' }).title).toBe('Enter a title')
  })

  it('flags a non-positive or non-numeric amount', () => {
    const base = { title: 'Rent', dueDate: '2026-02-01' }
    expect(validateExpense({ ...base, amount: 0 }).amount).toBe('Enter an amount greater than zero')
    expect(validateExpense({ ...base, amount: -5 }).amount).toBe('Enter an amount greater than zero')
    expect(validateExpense({ ...base, amount: 'abc' }).amount).toBe('Enter an amount greater than zero')
  })

  it('flags a missing due date', () => {
    expect(validateExpense({ title: 'Rent', amount: 10 }).dueDate).toBe('Choose a due date')
  })

  it('handles a null payload', () => {
    const errors = validateExpense(null)
    expect(Object.keys(errors).sort()).toEqual(['amount', 'dueDate', 'title'])
  })
})

describe('validateEmail', () => {
  it('accepts a well-formed address', () => {
    expect(validateEmail('user@example.com')).toBe('')
  })

  it('rejects missing or malformed addresses', () => {
    expect(validateEmail('')).toBe('Enter a valid email address')
    expect(validateEmail('nope')).toBe('Enter a valid email address')
    expect(validateEmail('a@b')).toBe('Enter a valid email address')
    expect(validateEmail('a b@c.com')).toBe('Enter a valid email address')
  })

  it('rejects addresses longer than 254 characters', () => {
    const longEmail = `${'a'.repeat(250)}@b.com`
    expect(validateEmail(longEmail)).toBe('Email must be 254 characters or fewer')
  })
})

describe('validateBudget', () => {
  it('accepts finite non-negative limits', () => {
    expect(validateBudget({ daily: 100, weekly: 500, monthly: 2000 })).toBeNull()
    expect(validateBudget({ daily: 0, weekly: '6500', monthly: 1000000 })).toBeNull()
  })

  it('rejects negative, non-numeric, or oversized limits with the offending key', () => {
    expect(validateBudget({ daily: -1, weekly: 1, monthly: 1 })).toBe('Invalid daily budget')
    expect(validateBudget({ daily: 1, weekly: 'abc', monthly: 1 })).toBe('Invalid weekly budget')
    expect(validateBudget({ daily: 1, weekly: 1, monthly: 1_000_000_001 })).toBe('Invalid monthly budget')
  })
})

describe('validatePositiveNumber', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(validatePositiveNumber(5)).toBe('')
    expect(validatePositiveNumber('12.5')).toBe('')
  })

  it('rejects zero, negatives, and non-numbers', () => {
    expect(validatePositiveNumber(0)).toBe('Must be a positive number')
    expect(validatePositiveNumber(-3)).toBe('Must be a positive number')
    expect(validatePositiveNumber('abc')).toBe('Must be a positive number')
  })
})

describe('validateRequired', () => {
  it('accepts non-empty values', () => {
    expect(validateRequired('hello')).toBe('')
  })

  it('uses the field name in the error and defaults to "Field"', () => {
    expect(validateRequired('', 'Title')).toBe('Title is required')
    expect(validateRequired('  ')).toBe('Field is required')
  })
})
