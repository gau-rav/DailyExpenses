import { indiaDate } from '../../../shared/utils/indiaDate.js'

function dateOnly(value) {
  if (!value) return ''
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : indiaDate(parsed)
}

export function normalizeExpense(expense) {
  const rawPayments = Array.isArray(expense.splitPayments)
    ? expense.splitPayments
    : (Array.isArray(expense.splitExpense?.payments) ? expense.splitExpense.payments : [])

  const splitPayments = rawPayments.map(payment => ({
    name: String(payment?.name || '').trim(),
    amount: Number(payment?.amount || 0),
  })).filter(payment => payment.name || payment.amount > 0)

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
