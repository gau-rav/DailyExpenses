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
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) throw new Error(data.error || `MongoDB request failed (${response.status})`)
  return data.result
}

function queue(payload) {
  writeQueue([...readQueue(), { ...payload, queuedAt: new Date().toISOString() }])
}

function dateOnly(value) {
  if (!value) return ''
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(parsed)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function normalizeExpense(expense) {
  const rawPayments = Array.isArray(expense.splitPayments)
    ? expense.splitPayments
    : (Array.isArray(expense.splitExpense?.payments) ? expense.splitExpense.payments : [])

  const splitPayments = rawPayments.map(p => ({
    name: String(p?.name || '').trim(),
    amount: Number(p?.amount || 0),
  })).filter(p => p.name || p.amount > 0)

  const isSplitEnabled = Boolean(
    expense.splitExpense?.enabled !== undefined
      ? expense.splitExpense.enabled
      : (splitPayments.length > 0)
  )

  const splitExpense = {
    enabled: isSplitEnabled,
    payments: splitPayments,
  }

  return {
    ...expense,
    date: dateOnly(expense.date),
    dueDate: dateOnly(expense.dueDate),
    amount: Number(expense.amount || 0),
    recurring: expense.recurring === true || String(expense.recurring).toLowerCase() === 'true',
    splitExpense,
    splitPayments,
  }
}

export async function fetchExpenses() {
  try {
    const response = await fetch(API_URL, { credentials: 'include' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.ok) throw new Error(data.error || `Unable to read MongoDB expenses (${response.status})`)
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
    const response = await fetch(`${API_URL}?includeDeleted=true`, { credentials: 'include' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.ok) throw new Error(data.error || `Unable to read deleted expenses (${response.status})`)
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
