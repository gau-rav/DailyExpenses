import { daysBetween } from '../../../shared/utils/dateMath.js'

export const splitBills = (expenses, asOf, horizon = 7) => {
  const groups = { overdue: [], today: [], soon: [] }
  expenses.forEach(expense => {
    if (expense.status === 'Paid') return
    const due = String(expense.dueDate || '').slice(0, 10)
    if (!due) return
    if (due < asOf) groups.overdue.push(expense)
    else if (due === asOf) groups.today.push(expense)
    else if (daysBetween(asOf, due) <= horizon) groups.soon.push(expense)
  })
  groups.overdue.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
  groups.soon.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
  return groups
}
