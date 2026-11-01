import { useCallback, useEffect, useState } from 'react'
import { seedExpenses } from '../../../utils/appData.js'
import {
  addExpense,
  deleteExpense,
  fetchDeletedExpenses,
  fetchExpenses,
  getLastExpensesSource,
  purgeExpense,
  readExpenseCache,
  restoreExpense,
  syncQueuedActions,
  updateExpense,
  writeExpenseCache,
} from '../services/expensesService.js'

/** @typedef {{id: string | number, title: string, amount: number, category: string, payment: string, date: string, dueDate: string, status: string, notes?: string, recurring?: boolean, deletedAt?: string}} Expense */

/** @returns {Expense[]} */
function readInitialExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem('penny-expenses') || 'null')
    const cached = readExpenseCache()
    return saved || (cached.length ? cached : seedExpenses)
  } catch {
    const cached = readExpenseCache()
    return cached.length ? cached : seedExpenses
  }
}

/** @returns {Expense[]} */
function readDeletedExpenses() {
  try { return JSON.parse(localStorage.getItem('penny-trash') || '[]') } catch { return [] }
}

/** @param {{notify: (message: string) => void}} options */
export function useExpenses({ notify }) {
  const [expenses, setExpenses] = useState(readInitialExpenses)
  const [deleted, setDeleted] = useState(readDeletedExpenses)
  const [selected, setSelected] = useState([])
  const [apiStatus, setApiStatus] = useState('connecting')

  /** @type {(isActive?: () => boolean) => Promise<Expense[]>} */
  const loadExpenses = useCallback(async isActive => {
    await syncQueuedActions()
    const remoteExpenses = await fetchExpenses()
    const remoteDeleted = await fetchDeletedExpenses()
    if (isActive && !isActive()) return remoteExpenses

    setExpenses(remoteExpenses)
    if (remoteDeleted) setDeleted(remoteDeleted)
    setApiStatus(getLastExpensesSource() === 'remote' ? 'connected' : 'offline')
    return remoteExpenses
  }, [])

  const refreshExpenses = useCallback(() => loadExpenses(undefined), [loadExpenses])

/** @type {(data: Partial<Expense>, editing?: Expense | null) => Promise<void>} */
  const saveExpense = useCallback(async (data, editing) => {
    const payload = { ...data, amount: Number(data.amount), id: editing?.id || data.id || crypto.randomUUID() }
    const wasEditing = Boolean(editing)
    setExpenses(current => wasEditing
      ? current.map(expense => String(expense.id) === String(payload.id) ? { ...expense, ...payload } : expense)
      : [payload, ...current])

    try {
      const saved = wasEditing ? await updateExpense(payload) : await addExpense(payload)
      if (saved) {
        setExpenses(current => current.map(expense =>
          String(expense.id) === String(payload.id) || String(expense.id) === String(saved.id)
            ? { ...payload, ...saved }
            : expense))
      }
      setApiStatus('connected')
      notify(wasEditing ? 'Expense updated' : 'Expense added')
    } catch {
      setApiStatus('offline')
      notify('Saved locally. It will sync when you reconnect.')
    }
  }, [notify])

/** @type {(items: Expense[], onComplete?: () => void) => Promise<void>} */
  const moveToTrash = useCallback(async (items, onComplete) => {
    let serverError = ''
    let offline = false
    for (const item of items) {
      try {
        await deleteExpense(item.id)
      } catch (error) {
        if (/not found|unsupported|invalid/i.test(error.message)) serverError = error.message
        else offline = true
      }
    }
    if (serverError) {
      notify(`Delete failed: ${serverError}`)
      return
    }

    setDeleted(current => [...items, ...current])
    setExpenses(current => current.filter(expense => !items.some(item => item.id === expense.id)))
    setSelected([])
    onComplete?.()
    if (offline) {
      setApiStatus('offline')
      notify('Deleted locally; MongoDB will sync when available.')
    } else {
      notify(`${items.length} expense${items.length > 1 ? 's' : ''} moved to trash`)
    }
  }, [notify])

/** @type {(items: Expense[]) => Promise<void>} */
  const emptyTrash = useCallback(async items => {
    let failed = false
    for (const item of items) {
      try {
        await purgeExpense(item.id)
      } catch {
        failed = true
        setApiStatus('offline')
      }
    }
    if (!failed) setDeleted([])
    notify(failed ? 'Some trash items could not be deleted from MongoDB.' : 'Trash emptied permanently')
  }, [notify])

/** @type {(items: Expense[], onComplete?: () => void) => Promise<void>} */
  const markPaid = useCallback(async (items, onComplete) => {
    setExpenses(current => current.map(expense =>
      items.some(item => item.id === expense.id) ? { ...expense, status: 'Paid' } : expense))
    for (const item of items) {
      try {
        await updateExpense({ ...item, status: 'Paid' })
      } catch {
        setApiStatus('offline')
      }
    }
    onComplete?.()
    notify('Marked as paid')
  }, [notify])

  const restoreFromTrash = useCallback(async item => {
    try {
      await restoreExpense(item.id)
      setApiStatus('connected')
    } catch {
      setApiStatus('offline')
    }
  }, [])

  const exportCsv = useCallback(() => {
    const rows = [
      ['Title', 'Amount', 'Category', 'Payment', 'Date', 'Due date', 'Status'],
      ...expenses.map(expense => [expense.title, expense.amount, expense.category, expense.payment, expense.date, expense.dueDate, expense.status]),
    ]
    const blob = new Blob([rows.map(row => row.join(',')).join('\n')], { type: 'text/csv' })
    const anchor = document.createElement('a')
    const url = URL.createObjectURL(blob)
    anchor.href = url
    anchor.download = 'penny-expenses.csv'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    notify('CSV exported')
  }, [expenses, notify])

  useEffect(() => {
    localStorage.setItem('penny-expenses', JSON.stringify(expenses))
    writeExpenseCache(expenses)
  }, [expenses])

  useEffect(() => {
    localStorage.setItem('penny-trash', JSON.stringify(deleted))
  }, [deleted])

  useEffect(() => {
    let active = true
    const refresh = () => loadExpenses(() => active)
    refresh()
    window.addEventListener('online', refresh)
    return () => {
      active = false
      window.removeEventListener('online', refresh)
    }
  }, [loadExpenses])

  return {
    apiStatus,
    deleted,
    emptyTrash,
    exportCsv,
    expenses,
    markPaid,
    moveToTrash,
    refreshExpenses,
    restoreFromTrash,
    saveExpense,
    selected,
    setApiStatus,
    setDeleted,
    setExpenses,
    setSelected,
  }
}
