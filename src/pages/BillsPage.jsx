import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Plus, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTitle, ExpenseRow, Empty } from '../components/PageComponents'
import { getTodayDay, getTodayMonth, money } from '../utils/appData'
import { splitBills } from '../utils/moneyMath'

const FILTERS = [
  { id: 'all', label: 'All unpaid' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
  { id: 'soon', label: 'Next 7 days' },
]

export default function BillsPage({ expenses, today, selected, setSelected, onBulkDelete, onEdit, onMarkAsPaid, budgets, monthSpend, onQuickAdd }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)

  const groups = useMemo(() => splitBills(expenses, today, 7), [expenses, today])
  const allUnpaid = [...groups.overdue, ...groups.today, ...groups.soon]
  const activeExpenses = activeFilter === 'all' ? allUnpaid : groups[activeFilter] || []
  const totalDue = allUnpaid.reduce((sum, expense) => sum + expense.amount, 0)
  const selectedExpenses = activeExpenses.filter(expense => selected.includes(expense.id))
  const selectedAmount = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const remainingBudget = Math.max(0, budgets.monthly - monthSpend)
  const hasBudget = budgets.monthly > 0
  const wouldExceedBudget = hasBudget && selectedAmount > remainingBudget
  const allSelected = activeExpenses.length > 0 && activeExpenses.every(expense => selected.includes(expense.id))

  const monthPrefix = today.slice(0, 7)
  const monthBills = expenses.filter(expense => String(expense.dueDate || '').startsWith(monthPrefix))
  const paidCount = monthBills.filter(expense => expense.status === 'Paid').length
  const billProgress = monthBills.length ? Math.round((paidCount / monthBills.length) * 100) : 0

  const toggleSelect = id => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])

  const paySelected = async () => {
    if (!selectedExpenses.length) return
    setIsProcessingBatch(true)
    try {
      await onMarkAsPaid(selectedExpenses)
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const guidance = !hasBudget
    ? { tone: 'info', text: 'Set a monthly limit to see how bills affect your budget.' }
    : remainingBudget <= 0
      ? { tone: 'danger', text: 'This month\'s limit is fully used. Paying now will push you over.' }
      : totalDue > remainingBudget
        ? { tone: 'warning', text: `${money(totalDue - remainingBudget)} of these bills sit beyond your remaining budget.` }
        : { tone: 'success', text: `You can clear every bill and still have ${money(remainingBudget - totalDue)} left.` }

  return <>
    <PageTitle
      eyebrow="Upcoming payments"
      title="Bills"
      subtitle="Everything due today, overdue, and in the next 7 days."
      action={<button className="primary-btn page-add-button" onClick={() => onQuickAdd()}><Plus size={16} strokeWidth={2.2} aria-hidden="true" /><span>Add bill</span></button>}
    />

    <div className="bills-hero card">
      <div className="calendar-small" aria-hidden="true">{getTodayDay()}<span>{getTodayMonth()}</span></div>
      <div className="bills-hero-copy">
        <strong>{allUnpaid.length ? `${allUnpaid.length} bill${allUnpaid.length === 1 ? '' : 's'} need${allUnpaid.length === 1 ? 's' : ''} attention` : 'You are all caught up'}</strong>
        <p>{allUnpaid.length ? `${money(totalDue)} due · ${groups.overdue.length} overdue` : 'No unpaid bills in the next 7 days.'}</p>
        <div className="progress-indicator">
          <div className="progress-labels">
            <span>{paidCount} paid this month</span>
            <span>{Math.max(0, monthBills.length - paidCount)} pending</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${billProgress}%` }} /></div>
        </div>
      </div>
      <strong className="bills-hero-total">{money(totalDue)}</strong>
    </div>

    <div className={`budget-guidance ${guidance.tone} bills-guidance`}>
      <div className="guidance-icon">
        {guidance.tone === 'success' ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
      </div>
      <div className="guidance-content">
        <strong>Budget check</strong>
        <p>{guidance.text}</p>
        {selectedAmount > 0 && <small>{money(selectedAmount)} selected{wouldExceedBudget ? ` · ${money(selectedAmount - remainingBudget)} over the remaining limit` : ''}</small>}
      </div>
      <button type="button" className={`${wouldExceedBudget ? 'danger-btn' : 'primary-btn'} guidance-action`} onClick={paySelected} disabled={isProcessingBatch || selectedExpenses.length === 0}>
        {isProcessingBatch ? 'Paying…' : selectedExpenses.length ? `Pay ${selectedExpenses.length}` : 'Select bills'}
      </button>
    </div>

    {allUnpaid.length > 0 && <div className="filter-chip-row bills-filters" role="group" aria-label="Filter bills">
      {FILTERS.map(filter => {
        const count = filter.id === 'all' ? allUnpaid.length : (groups[filter.id] || []).length
        if (filter.id !== 'all' && count === 0) return null
        return <button
          key={filter.id}
          type="button"
          className={`chip ${activeFilter === filter.id ? 'active' : ''}`}
          aria-pressed={activeFilter === filter.id}
          onClick={() => { setActiveFilter(filter.id); setSelected([]) }}
        >
          {filter.label} <b>{count}</b>
        </button>
      })}
    </div>}

    <section className="card due-list">
      <div className="list-head">
        <label>
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : activeExpenses.map(expense => expense.id))} disabled={activeExpenses.length === 0} />
          <span>Select all</span>
        </label>
        <div className="list-summary">
          <span>{activeExpenses.length} item{activeExpenses.length === 1 ? '' : 's'} · {money(activeExpenses.reduce((sum, expense) => sum + expense.amount, 0))}</span>
          {selected.length > 0 && <span className="selected-summary">{selected.length} selected</span>}
        </div>
      </div>

      {activeExpenses.map(expense => <div className={`due-item ${selected.includes(expense.id) ? 'selected' : ''}`} key={expense.id}>
        <input type="checkbox" checked={selected.includes(expense.id)} onChange={() => toggleSelect(expense.id)} aria-label={`Select ${expense.title}`} />
        <ExpenseRow expense={expense} onEdit={onEdit} />
        <div className="due-item-actions">
          <button type="button" className="outline-btn due-pay" onClick={() => onMarkAsPaid([expense])}>Mark paid</button>
        </div>
      </div>)}

      {!activeExpenses.length && <Empty text={allUnpaid.length ? 'Nothing in this filter.' : 'No bills due in the next week. Add one to plan ahead.'} />}

      {activeExpenses.length > 0 && <div className="due-footer">
        {selected.length > 0 && <button type="button" className="text-btn" onClick={onBulkDelete}>Delete {selected.length} selected</button>}
        <button type="button" className="text-btn" onClick={() => onQuickAdd()}>Add a bill <Plus size={14} aria-hidden="true" /></button>
      </div>}
    </section>

    {remainingBudget >= 0 && hasBudget && <p className="bills-note">
      <WalletCards size={15} aria-hidden="true" />
      Remaining monthly limit: <strong>{money(remainingBudget)}</strong>
      <Link to="/budgets" className="text-btn">Adjust <ArrowRight size={13} aria-hidden="true" /></Link>
    </p>}
  </>
}
