export function dailyPace({ monthSpend, monthlyBudget, cycleStart, cycleEnd, today }) {
  const start = new Date(cycleStart)
  const end = new Date(cycleEnd)
  const now = new Date(today || new Date())
  const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1)
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.round((now - start) / (1000 * 60 * 60 * 24)) + 1))
  const daysLeft = Math.max(0, totalDays - elapsedDays)

  const hasBudget = monthlyBudget > 0
  const budget = monthlyBudget || 0
  const spent = monthSpend || 0
  const percent = budget > 0 ? (spent / budget) * 100 : 0
  const expectedPercent = (elapsedDays / totalDays) * 100
  const remaining = Math.max(0, budget - spent)
  const over = spent > budget
  const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : remaining

  let status = 'normal'
  if (percent > expectedPercent + 10) status = 'fast'
  else if (percent < expectedPercent - 10) status = 'slow'

  return {
    hasBudget,
    budget,
    spent,
    percent,
    expectedPercent,
    remaining,
    over,
    totalDays,
    elapsedDays,
    daysLeft,
    dailyAllowance,
    status,
  }
}

export const clampPercent = value => Math.max(0, Math.min(100, Math.round(value)))

export const spendProgress = (spent, budget) => {
  const safeSpent = Number.isFinite(Number(spent)) ? Number(spent) : 0
  const safeBudget = Number.isFinite(Number(budget)) ? Number(budget) : 0
  const percent = safeBudget > 0 ? (safeSpent / safeBudget) * 100 : 0
  return {
    spent: safeSpent,
    budget: safeBudget,
    percent,
    clampedPercent: clampPercent(percent),
    remaining: Math.max(0, safeBudget - safeSpent),
    over: safeBudget > 0 && safeSpent > safeBudget,
    hasBudget: safeBudget > 0,
  }
}

export const budgetThreshold = (spent, budget) => {
  if (!budget || budget <= 0) return null
  const percent = (spent / budget) * 100
  return [80, 70, 60].find(threshold => percent >= threshold) || null
}
