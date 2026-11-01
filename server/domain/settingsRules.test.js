import { describe, expect, it } from 'vitest'
import { isValidCycleStartDate, validateBudgetLimits } from './settingsRules.js'

describe('validateBudgetLimits', () => {
  it('converts valid numeric strings to numbers', () => {
    expect(validateBudgetLimits({ daily: '10', weekly: 20, monthly: '30' })).toEqual({ daily: 10, weekly: 20, monthly: 30 })
  })

  it('rejects missing, non-numeric, negative, and excessive limits', () => {
    expect(validateBudgetLimits(null)).toBeNull()
    expect(validateBudgetLimits({ daily: 1, weekly: 2 })).toBeNull()
    expect(validateBudgetLimits({ daily: 'nope', weekly: 2, monthly: 3 })).toBeNull()
    expect(validateBudgetLimits({ daily: -1, weekly: 2, monthly: 3 })).toBeNull()
    expect(validateBudgetLimits({ daily: 1, weekly: 2, monthly: 1_000_000_001 })).toBeNull()
  })
})

describe('isValidCycleStartDate', () => {
  it('accepts a calendar date in the current month or later', () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
    const year = parts.find(part => part.type === 'year').value
    const month = parts.find(part => part.type === 'month').value
    expect(isValidCycleStartDate(`${year}-${month}-01`)).toBe(true)
    expect(isValidCycleStartDate('2099-12-01')).toBe(true)
  })

  it('rejects malformed, impossible, and too-old dates', () => {
    expect(isValidCycleStartDate(null)).toBe(false)
    expect(isValidCycleStartDate('2026-2-01')).toBe(false)
    expect(isValidCycleStartDate('2026-02-30')).toBe(false)
    expect(isValidCycleStartDate('2000-01-01')).toBe(false)
  })
})
