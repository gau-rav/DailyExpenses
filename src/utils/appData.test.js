import { describe, it, expect } from 'vitest'
import {
  categories,
  defaultBudgets,
  categoryMeta,
  indiaDate,
  dateOffset,
  today,
  formatUtcDate,
  getPreviousMonthStart,
  cycleDateInMonth,
  getMonthlyCycleRange,
  cycleRangeLabel,
  cycleHeaderLabel,
  previewCycleRange,
  getCycleDateForSettings,
  indiaGreeting,
  formatDate,
  formatTimestamp,
  money,
} from './appData.js'

describe('static data', () => {
  it('exposes the expected categories and default budgets', () => {
    expect(categories).toContain('Food')
    expect(categories).toContain('Other')
    expect(defaultBudgets).toEqual({ daily: 1500, weekly: 6500, monthly: 24000 })
    expect(categoryMeta.Food).toHaveLength(2)
  })
})

describe('indiaDate', () => {
  it('formats in the Asia/Kolkata timezone', () => {
    expect(indiaDate(new Date('2026-01-15T10:00:00Z'))).toBe('2026-01-15')
    expect(indiaDate(new Date('2026-01-15T20:00:00Z'))).toBe('2026-01-16')
  })

  it('dateOffset(0) matches today', () => {
    expect(dateOffset(0)).toBe(today)
  })
})

describe('formatUtcDate / getPreviousMonthStart', () => {
  it('formats a UTC date', () => {
    expect(formatUtcDate(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05')
  })

  it('returns the first of the previous month', () => {
    expect(getPreviousMonthStart('2026-03-15')).toBe('2026-02-01')
    expect(getPreviousMonthStart('2026-01-10')).toBe('2025-12-01')
  })
})

describe('cycleDateInMonth', () => {
  it('builds a date in the given month', () => {
    expect(cycleDateInMonth(2026, 0, 5)).toBe('2026-01-05')
  })

  it('clamps the day to the last day of the month', () => {
    expect(cycleDateInMonth(2026, 1, 31)).toBe('2026-02-28')
    expect(cycleDateInMonth(2024, 1, 31)).toBe('2024-02-29')
  })
})

describe('getMonthlyCycleRange', () => {
  it('uses the calendar month when no cycle start date is set', () => {
    expect(getMonthlyCycleRange(null, '2026-01-15')).toEqual({ start: '2026-01-01', end: '2026-01-31' })
  })

  it('uses the calendar month when asOf is before the cycle start', () => {
    expect(getMonthlyCycleRange('2026-02-05', '2026-01-15')).toEqual({ start: '2026-01-01', end: '2026-01-31' })
  })

  it('resolves the cycle containing asOf for a custom start day', () => {
    expect(getMonthlyCycleRange('2026-01-05', '2026-01-15')).toEqual({ start: '2026-01-05', end: '2026-02-04' })
  })
})

describe('cycle labels', () => {
  it('cycleRangeLabel renders short month/day of both ends', () => {
    expect(cycleRangeLabel({ start: '2026-01-05', end: '2026-02-04' })).toBe('5 Jan – 4 Feb')
  })

  it('cycleHeaderLabel renders day + month, spelling September as "Sept"', () => {
    expect(cycleHeaderLabel({ start: '2026-01-05', end: '2026-02-04' })).toBe('5 Jan – 4 Feb')
    expect(cycleHeaderLabel({ start: '2026-09-01', end: '2026-09-30' })).toBe('1 Sept – 30 Sept')
  })
})

describe('previewCycleRange', () => {
  it('returns the range that starts on the given date', () => {
    expect(previewCycleRange('2026-01-05')).toEqual({ start: '2026-01-05', end: '2026-02-04' })
  })

  it('falls back to the current calendar month when no date is given', () => {
    const range = previewCycleRange('')
    expect(range.start.endsWith('-01')).toBe(true)
  })
})

describe('getCycleDateForSettings', () => {
  it('defaults to the first of the current month when no start date is set', () => {
    expect(getCycleDateForSettings(null, '2026-01-15')).toBe('2026-01-01')
    expect(getCycleDateForSettings(null, '2026-12-31')).toBe('2026-12-01')
  })

  it('keeps a future start date as-is', () => {
    expect(getCycleDateForSettings('2026-03-01', '2026-01-15')).toBe('2026-03-01')
  })

  it('resolves to the active cycle start for a past start date', () => {
    expect(getCycleDateForSettings('2026-01-05', '2026-01-15')).toBe('2026-01-05')
  })
})

describe('formatting helpers', () => {
  it('indiaGreeting returns one of the four greetings', () => {
    expect(['Good morning', 'Good afternoon', 'Good evening', 'Good night']).toContain(indiaGreeting())
  })

  it('formatDate renders a short month/day', () => {
    expect(formatDate('2026-01-15')).toBe('Jan 15')
  })

  it('formatTimestamp formats ISO timestamps (and date-only values) with a year', () => {
    expect(formatTimestamp('2026-01-11T00:00:00.000Z')).toBe('Jan 11, 2026')
    expect(formatTimestamp('2026-01-11T20:00:00.000Z')).toBe('Jan 12, 2026')
    expect(formatTimestamp('2026-01-11')).toBe('Jan 11, 2026')
  })

  it('formatTimestamp returns an empty string for empty or invalid values', () => {
    expect(formatTimestamp('')).toBe('')
    expect(formatTimestamp(null)).toBe('')
    expect(formatTimestamp('not-a-date')).toBe('')
  })

  it('money formats via the currency module', () => {
    expect(money(1500)).toContain('1,500.00')
  })
})
