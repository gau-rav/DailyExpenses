import { describe, expect, it } from 'vitest'
import { cycleDateInMonth, getCycleDateForSettings, getMonthlyCycleRange, getPreviousMonthStart, previewCycleRange } from './monthlyCycleRules.js'

describe('monthly cycle rules', () => {
  it('calculates previous month start across year boundaries', () => {
    expect(getPreviousMonthStart('2026-01-30')).toBe('2025-12-01')
  })

  it('clamps a cycle day to the last day of the target month', () => {
    expect(cycleDateInMonth(2026, 1, 31)).toBe('2026-02-28')
    expect(cycleDateInMonth(2024, 1, 31)).toBe('2024-02-29')
  })

  it('uses calendar months when no custom cycle date exists', () => {
    expect(getMonthlyCycleRange(null, '2026-02-12')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('resolves custom cycles before or after their monthly anchor', () => {
    expect(getMonthlyCycleRange('2026-01-15', '2026-02-10')).toEqual({ start: '2026-01-15', end: '2026-02-14' })
    expect(getMonthlyCycleRange('2026-01-15', '2026-02-20')).toEqual({ start: '2026-02-15', end: '2026-03-14' })
  })

  it('clamps month-end custom cycles when finding the active range', () => {
    expect(getMonthlyCycleRange('2026-01-31', '2026-02-28')).toEqual({ start: '2026-02-28', end: '2026-03-30' })
  })

  it('previews a cycle and selects the proper settings date', () => {
    expect(previewCycleRange('2026-01-31')).toEqual({ start: '2026-01-31', end: '2026-02-27' })
    expect(getCycleDateForSettings(null, '2026-01-15')).toBe('2026-01-01')
    expect(getCycleDateForSettings('2026-02-15', '2026-01-15')).toBe('2026-02-15')
    expect(getCycleDateForSettings('2026-01-05', '2026-01-15')).toBe('2026-01-05')
  })
})
