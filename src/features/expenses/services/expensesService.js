import { requestJson } from '../../../services/api/requestJson.js'
import { normalizeExpense } from '../domain/expenseNormalization.js'

const API_URL = '/api/expenses'
const CACHE_KEY = 'penny-expenses'
const QUEUE_KEY = 'penny-expense-sync-queue'
let lastExpensesSource = 'unknown'

export function getLastExpensesSource() {
  return lastExpensesSource
}

export function readExpenseCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') } catch { return [] }
}

export function writeExpenseCache(expenses) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(expenses))
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

async function request(payload) {
  const data = await requestJson(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, status => `MongoDB request failed (${status})`)
  return data.result
}

function queue(payload) {
  writeQueue([...readQueue(), { ...payload, queuedAt: new Date().toISOString() }])
}

export async function fetchExpenses() {
  try {
    const data = await requestJson(API_URL, {}, status => `Unable to read MongoDB expenses (${status})`)
    const expenses = data.expenses.map(normalizeExpense).filter(expense => !expense.deletedAt)
    writeExpenseCache(expenses)
    lastExpensesSource = 'remote'
    return expenses
  } catch (error) {
    console.warn('Using cached expenses:', error)
    lastExpensesSource = 'cache'
    return readExpenseCache()
  }
}

export async function fetchDeletedExpenses() {
  try {
    const data = await requestJson(`${API_URL}?includeDeleted=true`, {}, status => `Unable to read deleted expenses (${status})`)
    return (data.deleted || data.expenses || []).map(normalizeExpense).filter(expense => expense.deletedAt)
  } catch (error) {
    console.warn('Using cached deleted expenses:', error)
    return null
  }
}

export async function addExpense(expense) {
  const payload = { action: 'add', expense: normalizeExpense({ ...expense, id: expense.id || crypto.randomUUID() }) }
  try { return await request(payload) } catch (error) { queue(payload); throw error }
}

export async function updateExpense(expense) {
  const payload = { action: 'update', expense: normalizeExpense(expense) }
  try { return await request(payload) } catch (error) { queue(payload); throw error }
}

export async function deleteExpense(id) {
  const payload = { action: 'delete', id }
  try { return await request(payload) } catch (error) { queue(payload); throw error }
}

export async function restoreExpense(id) {
  const payload = { action: 'restore', id }
  try { return await request(payload) } catch (error) { queue(payload); throw error }
}

export async function purgeExpense(id) {
  const payload = { action: 'purge', id }
  try { return await request(payload) } catch (error) { queue(payload); throw error }
}

export async function syncQueuedActions() {
  const pending = readQueue()
  if (!pending.length) return true
  const remaining = []
  for (const payload of pending) {
    try { await request(payload) } catch { remaining.push(payload) }
  }
  writeQueue(remaining)
  return remaining.length === 0
}
