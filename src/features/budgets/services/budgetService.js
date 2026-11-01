import { requestJson } from '../../../services/api/requestJson.js'

const API_URL = '/api/budgets'

export function readBudgetCache(userId) {
  try { return JSON.parse(localStorage.getItem(`penny-budgets:${userId}`) || 'null') } catch { return null }
}

function readLegacyBudgetCache() {
  try {
    const cached = JSON.parse(localStorage.getItem('penny-budgets') || 'null')
    if (!cached || ['daily', 'weekly', 'monthly'].some(key => !Number.isFinite(Number(cached[key])) || Number(cached[key]) < 0)) return null
    return { daily: Number(cached.daily), weekly: Number(cached.weekly), monthly: Number(cached.monthly) }
  } catch {
    return null
  }
}

function cacheBudgets(userId, budgets) {
  localStorage.setItem(`penny-budgets:${userId}`, JSON.stringify(budgets))
}

export async function loadBudgets(userId) {
  const data = await requestJson(API_URL, {}, status => `Unable to load budget limits (${status})`)
  if (data.hasSaved) {
    cacheBudgets(userId, data.budgets)
    return data.budgets
  }

  const legacyBudgets = readLegacyBudgetCache()
  if (!legacyBudgets) {
    cacheBudgets(userId, data.budgets)
    return data.budgets
  }

  const migration = await requestJson(API_URL, {
    method: 'PUT',
    body: JSON.stringify({ budgets: legacyBudgets }),
  }, status => `Unable to migrate saved budget limits (${status})`)
  localStorage.removeItem('penny-budgets')
  cacheBudgets(userId, migration.budgets)
  return migration.budgets
}

export async function saveBudgets(userId, budgets) {
  const data = await requestJson(API_URL, {
    method: 'PUT',
    body: JSON.stringify({ budgets }),
  }, status => `Unable to save budget limits (${status})`)
  cacheBudgets(userId, data.budgets)
  return data.budgets
}
