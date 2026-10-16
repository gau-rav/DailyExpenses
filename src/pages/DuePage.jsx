import { useState } from 'react'
import { PageTitle, ExpenseRow, Empty } from '../components/PageComponents'
import { todayDay, todayMonth, money, dateOffset } from '../utils/appData'
import { generateDuePageFilters } from '../utils/filterUtils'

export default function DuePage({ expenses, selected, setSelected, onBulkDelete, onEdit, onMarkAsPaid, budgets, monthlyBudgetUsed, monthSpend }) {
  const allSelected = expenses.length > 0 && expenses.every(expense => selected.includes(expense.id))
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  // Generate filters based on expenses
  const filters = generateDuePageFilters(expenses)

  // Calculate totals
  const totalDueAmount = expenses.reduce((total, expense) => total + expense.amount, 0)
  const selectedAmount = expenses
    .filter(expense => selected.includes(expense.id))
    .reduce((total, expense) => total + expense.amount, 0)

  // Check if paying selected items would exceed remaining budget
  const remainingBudget = budgets.monthly - monthSpend
  const wouldExceedBudget = selectedAmount > remainingBudget && remainingBudget > 0
  const canAffordToPay = remainingBudget >= selectedAmount || remainingBudget <= 0

  // Calculate progress: paid vs total due (for future state tracking)
  const paidCount = expenses.filter(e => e.status === 'Paid').length
  const progressPercentage = expenses.length > 0 ? Math.round((paidCount / expenses.length) * 100) : 0

  // Handle batch payment
  const handleBatchPayment = async () => {
    if (selected.length === 0) {
      alert('Please select at least one expense to pay.')
      return
    }

    if (wouldExceedBudget && remainingBudget > 0) {
      const message = `Paying ₹${selectedAmount} would exceed your remaining monthly budget of ₹${remainingBudget}. \n\nPay anyway, or reduce the selection?`
      if (!window.confirm(message)) return
    }

    setIsProcessingBatch(true)
    try {
      const selectedExpenses = expenses.filter(expense => selected.includes(expense.id))
      await onMarkAsPaid(selectedExpenses)
      // Clear selection after successful payment
      setSelected([])
    } catch (error) {
      console.error('Batch payment failed:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessingBatch(false)
    }
  }

  // Get budget-friendly recommendations
  const getBudgetRecommendation = () => {
    if (remainingBudget <= 0) {
      return { type: 'danger', message: 'You have no budget left this month' }
    }
    if (wouldExceedBudget) {
      return { type: 'warning', message: `Paying all would exceed budget by ₹${selectedAmount - remainingBudget}` }
    }
    if (remainingBudget >= totalDueAmount) {
      return { type: 'success', message: `You can pay all bills and still have ₹${remainingBudget - totalDueAmount} left` }
    }
    return { type: 'info', message: `You have ₹${remainingBudget} left for bills this month` }
  }

  const budgetRecommendation = getBudgetRecommendation()

  return <>
    <PageTitle
      eyebrow="Workspace / Due today"
      title="Due today"
      subtitle="Stay ahead of every payment."
      action={expenses.length > 0 && (
        <div className="due-actions">
          {selected.length > 0 && (
            <>
              <button
                className={`primary-btn ${wouldExceedBudget ? 'danger-btn' : ''}`}
                onClick={handleBatchPayment}
                disabled={isProcessingBatch}
              >
                {isProcessingBatch ? 'Processing…' : `Pay ${selected.length} selected`}
              </button>
              <button
                className="outline-btn"
                onClick={onBulkDelete}
              >
                Delete {selected.length}
              </button>
            </>
          )}
        </div>
      )}
    />

    {/* Smart filter bar */}
    {expenses.length > 0 && (
      <div className="smart-filter-bar">
        <button
          className={`smart-filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <span className="filter-emoji">📋</span>
          All due ({expenses.length})
        </button>
        {filters.map(filter => (
          <button
            key={filter.id}
            className={`smart-filter-chip ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <span className="filter-emoji">{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>
    )}

    <div className="due-banner">
      <div className="calendar-small">{todayDay}<span>{todayMonth}</span></div>
      <div>
        <strong>{expenses.length ? `${expenses.length} expenses need attention` : 'You’re all caught up'}</strong>
        <p>{expenses.length ? `Total due: ${money(totalDueAmount)}` : 'No payments are due today.'}</p>

        {/* Progress indicator */}
        {expenses.length > 0 && (
          <div className="progress-indicator">
            <div className="progress-labels">
              <span>{paidCount} paid</span>
              <span>{expenses.length - paidCount} pending</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <strong className="due-total">{money(totalDueAmount)}</strong>
    </div>

    {/* Budget guidance card */}
    {expenses.length > 0 && (
      <section className={`budget-guidance ${budgetRecommendation.type}`}>
        <div className="guidance-icon">
          {budgetRecommendation.type === 'success' && '✅'}
          {budgetRecommendation.type === 'warning' && '⚠️'}
          {budgetRecommendation.type === 'danger' && '🚫'}
          {budgetRecommendation.type === 'info' && '💡'}
        </div>
        <div className="guidance-content">
          <strong>Budget check</strong>
          <p>{budgetRecommendation.message}</p>
          {wouldExceedBudget && selected.length > 0 && (
            <small>Select fewer items to stay within budget</small>
          )}
        </div>
        {remainingBudget > 0 && (
          <button
            className={`guidance-action ${wouldExceedBudget ? 'danger-btn' : 'primary-btn'}`}
            onClick={handleBatchPayment}
            disabled={isProcessingBatch || selected.length === 0}
          >
            {wouldExceedBudget ? 'Pay anyway' : 'Pay all selected'}
          </button>
        )}
      </section>
    )}

    <section className="card due-list">
      <div className="list-head">
        <label>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? [] : expenses.map(expense => expense.id))}
            disabled={expenses.length === 0}
          />
          <span>Select all</span>
        </label>
        <div className="list-summary">
          <span>{expenses.length} items · {money(totalDueAmount)}</span>
          {selected.length > 0 && (
            <span className="selected-summary">
              {selected.length} selected · {money(selectedAmount)}
            </span>
          )}
        </div>
      </div>

      {expenses.map(expense => {
        const isSelected = selected.includes(expense.id)
        const itemOverBudget = expense.amount > remainingBudget && remainingBudget > 0

        return (
          <div className={`due-item ${isSelected ? 'selected' : ''} ${itemOverBudget ? 'budget-warning' : ''}`} key={expense.id}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => setSelected(current =>
                current.includes(expense.id)
                  ? current.filter(id => id !== expense.id)
                  : [...current, expense.id]
              )}
            />
            <ExpenseRow expense={expense} onEdit={onEdit} />
            {itemOverBudget && (
              <div className="budget-hint" title={`This expense exceeds your remaining budget of ₹${remainingBudget}`}>
                ⚠️ Over budget
              </div>
            )}
          </div>
        )
      })}

      {!expenses.length && <Empty text="No expenses due today." />}
    </section>
  </>
}