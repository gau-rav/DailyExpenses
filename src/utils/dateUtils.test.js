import { describe, it, expect } from 'vitest'
import {
  validateDateString,
  daysDifference,
  relativeDate,
  cycleRangeLabel,
  isPastDate,
  isToday,
  isFutureDate,
  formatDateFull,
} from './dateUtils.js'

describe('validateDateString', () => {
  it('returns valid YYYY-MM-DD strings unchanged', () => {
    expect(validateDateString('2026-01-15')).toBe('2026-01-15')
  })

  it('returns an empty string for falsy, malformed, or non-numeric input', () => {
    expect(validateDateString('')).toBe('')
    expect(validateDateString(null)).toBe('')
    expect(validateDateString('2026/01/15')).toBe('')
    expect(validateDateString('2026-01')).toBe('')
    expect(validateDateString('abcd-ef-gh')).toBe('')
  })

  it('only checks numeric shape, not calendar validity', () => {
    expect(validateDateString('2026-13-45')).toBe('2026-13-45')
  })
})

describe('daysDifference', () => {
  it('counts whole days between two dates', () => {
    expect(daysDifference('2026-01-01', '2026-01-05')).toBe(4)
    expect(daysDifference('2026-01-05', '2026-01-01')).toBe(-4)
    expect(daysDifference('2026-01-01', '2026-01-01')).toBe(0)
  })
})

describe('relativeDate', () => {
  const today = '2026-01-15'

  it('labels past, today, and near-future dates', () => {
    expect(relativeDate('2026-01-10', today)).toBe('Overdue')
    expect(relativeDate('2026-01-15', today)).toBe('Due today')
    expect(relativeDate('2026-01-16', today)).toBe('Tomorrow')
    expect(relativeDate('2026-01-22', today)).toBe('Next week')
    expect(relativeDate('2026-02-14', today)).toBe('In 30 days')
  })

  it('falls back to a month/day label beyond 30 days', () => {
    const label = relativeDate('2026-03-15', '2026-01-01')
    expect(label).toMatch(/Mar/)
    expect(label).not.toContain('In ')
  })
})

describe('cycleRangeLabel', () => {
  it('formats the month/year of both ends of the range', () => {
    expect(cycleRangeLabel({ start: '2026-01-05', end: '2026-02-04' })).toBe('1/2026 — 2/2026')
  })
})

describe('date predicates', () => {
  it('isPastDate is true for clearly past dates and false for future ones', () => {
    expect(isPastDate('2000-01-01')).toBe(true)
    expect(isPastDate('2999-01-01')).toBe(false)
  })

  it('isToday matches the current ISO date only', () => {
    const now = new Date().toISOString().split('T')[0]
    expect(isToday(now)).toBe(true)
    expect(isToday('2000-01-01')).toBe(false)
  })

  it('isFutureDate is true only for future dates', () => {
    expect(isFutureDate('2999-01-01')).toBe(true)
    expect(isFutureDate('2000-01-01')).toBe(false)
  })
})

describe('formatDateFull', () => {
  it('formats a long date in the Asia/Kolkata timezone', () => {
    expect(formatDateFull('2026-01-15')).toBe('Thursday, 15 January 2026')
  })
})
