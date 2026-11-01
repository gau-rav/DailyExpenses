import { createExpense, deleteExpense, listExpenses, purgeExpense, restoreExpense, updateExpense } from '../repositories/expensesRepository.js'

export async function readExpenses(userId, includeDeleted) {
  return {
    expenses: await listExpenses(userId, false),
    deleted: includeDeleted ? await listExpenses(userId, true) : [],
  }
}

export async function applyExpenseAction(userId, input) {
  const { action, expense, id } = input || {}
  if (action === 'add') return createExpense(userId, expense)
  if (action === 'update') return updateExpense(userId, expense)
  if (action === 'delete') return deleteExpense(userId, id)
  if (action === 'restore') return restoreExpense(userId, id)
  if (action === 'purge') return purgeExpense(userId, id)
  throw new Error('Unsupported action')
}
