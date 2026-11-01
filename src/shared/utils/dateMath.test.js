import { describe, expect, it } from 'vitest'
import { daysBetween } from './dateMath.js'

describe('daysBetween', () => {
  it('calculates whole calendar days independent of time components', () => {
    expect(daysBetween('2026-01-01T22:00:00Z', '2026-01-03T02:00:00Z')).toBe(2)
    expect(daysBetween('2026-01-03', '2026-01-01')).toBe(-2)
  })

  it('returns zero for missing dates', () => {
    expect(daysBetween('', '2026-01-01')).toBe(0)
    expect(daysBetween('2026-01-01', null)).toBe(0)
  })
})
