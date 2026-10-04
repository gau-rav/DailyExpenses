import { PageTitle, ExpenseRow, Empty } from '../components/PageComponents'
import { todayDay, todayMonth, money } from '../utils/appData'

export default function DuePage({ expenses, selected, setSelected, onBulkDelete, onEdit }) {
  const allSelected = expenses.length > 0 && expenses.every(expense => selected.includes(expense.id))

  return <>
    <PageTitle eyebrow="Workspace / Due today" title="Due today" subtitle="Stay ahead of every payment." action={expenses.length > 0 && <button className="danger-btn" onClick={onBulkDelete}>Delete selected</button>} />
    <div className="due-banner">
      <div className="calendar-small">{todayDay}<span>{todayMonth}</span></div>
      <div><strong>{expenses.length ? `${expenses.length} expenses need attention` : 'You’re all caught up'}</strong><p>{expenses.length ? 'Review them below and mark as paid when you’re done.' : 'No payments are due today.'}</p></div>
      <strong className="due-total">{money(expenses.reduce((total, expense) => total + expense.amount, 0))}</strong>
    </div>
    <section className="card due-list">
      <div className="list-head"><label><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : expenses.map(expense => expense.id))} /> Select all</label><span>{expenses.length} items</span></div>
      {expenses.map(expense => <div className="due-item" key={expense.id}><input type="checkbox" checked={selected.includes(expense.id)} onChange={() => setSelected(current => current.includes(expense.id) ? current.filter(id => id !== expense.id) : [...current, expense.id])} /><ExpenseRow expense={expense} onEdit={onEdit} /></div>)}
      {!expenses.length && <Empty text="No expenses due today." />}
    </section>
  </>
}
