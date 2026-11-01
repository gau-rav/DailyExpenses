import { describe, expect, it } from 'vitest'
import { budgetThreshold, dailyPace, spendProgress } from './budgetRules.js'

describe('budgetThreshold', () => {
  it('returns the highest crossed threshold and handles missing budgets', () => {
    expect(budgetThreshold(800, 1000)).toBe(80)
    expect(budgetThreshold(750, 1000)).toBe(70)
    expect(budgetThreshold(650, 1000)).toBe(60)
    expect(budgetThreshold(599, 1000)).toBeNull()
    expect(budgetThreshold(100, 0)).toBeNull()
  })
})

describe('spendProgress', () => {
  it('calculates remaining budget and clamped progress', () => {
    expect(spendProgress(125, 500)).toMatchObject({ spent: 125, budget: 500, percent: 25, clampedPercent: 25, remaining: 375, over: false, hasBudget: true })
  })

  it('sanitizes non-numeric inputs and detects overspending', () => {
    expect(spendProgress('bad', 'bad')).toMatchObject({ spent: 0, budget: 0, percent: 0, remaining: 0, over: false, hasBudget: false })
    expect(spendProgress(120, 100)).toMatchObject({ percent: 120, clampedPercent: 100, remaining: 0, over: true })
  })
})

describe('dailyPace', () => {
  const cycle = { cycleStart: '2026-01-01', cycleEnd: '2026-01-10', today: '2026-01-05' }

  it('calculates elapsed/remaining days, allowance, and pace status', () => {
    expect(dailyPace({ ...cycle, monthSpend: 7000, monthlyBudget: 10000 })).toMatchObject({
      totalDays: 10, elapsedDays: 5, daysLeft: 5, dailyAllowance: 600, status: 'fast',
    })
    expect(dailyPace({ ...cycle, monthSpend: 3000, monthlyBudget: 10000 }).status).toBe('slow')
  })

  it('uses the remaining balance as allowance on the last cycle day', () => {
    expect(dailyPace({ cycleStart: '2026-01-01', cycleEnd: '2026-01-10', today: '2026-01-10', monthSpend: 400, monthlyBudget: 1000 })).toMatchObject({ daysLeft: 0, dailyAllowance: 600 })
  })
})
