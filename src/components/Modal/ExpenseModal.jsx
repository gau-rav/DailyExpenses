import { useState } from 'react'
import { categories, today } from '../../utils/appData'

export default function ExpenseModal({ expense, onClose, onSave }) {
  const [data, setData] = useState(expense || {
    title: '',
    amount: '',
    category: 'Grocery',
    payment: 'Card',
    date: today,
    dueDate: today,
    notes: '',
    recurring: false,
    status: 'Paid',
    splitExpense: { enabled: false, payments: [] }
  })
  const [expanded, setExpanded] = useState(false)
  const [errors, setErrors] = useState({})

  const update = (k, v) => setData({ ...data, [k]: v })

  const submit = e => {
    e.preventDefault()
    const next = {}
    if (!data.title.trim()) next.title = 'Enter a title'
    if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero'
    if (!data.dueDate) next.dueDate = 'Choose a due date'
    if (Object.keys(next).length) return setErrors(next)

    const submitData = { ...data, amount: Number(data.amount), status: data.status || 'Paid' }

    // Add split payments if enabled
    if (data.splitExpense.enabled) {
      submitData.splitPayments = data.splitExpense.payments
    }

    onSave(submitData)
  }

  const toggleExpanded = () => setExpanded(!expanded)
  const renderDetailSection = (title, content, isOpen) => (
    <div className={`detail-section ${isOpen ? 'open' : ''}`}>
      <button type="button" className="detail-toggle" onClick={() => setExpanded(!expanded)}>
        <span>{title}</span>
        <span className={`toggle-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="detail-content">{content}</div>}
    </div>
  )

  const paymentOptions = ['Card', 'Cash', 'UPI', 'Bank transfer']
  const statusOptions = ['Pending', 'Paid', 'Due Today', 'Upcoming', 'Overdue']

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{expense ? 'Update transaction' : 'New transaction'}</div>
            <h2>{expense ? 'Edit expense' : 'Add expense'}</h2>
          </div>
          <button type="button" className="close" onClick={onClose}>×</button>
        </div>

        {/* Minimal field set always visible */}
        <div className="form-grid minimal-grid">
          <label className="full-field" autoFocus>
            Title
            <input
              value={data.title}
              onChange={e => update('title', e.target.value)}
              placeholder="e.g. Weekly groceries"
              onClick={() => setExpanded(false)}
            />
            {errors.title && <em>{errors.title}</em>}
          </label>

          <label>
            Amount
            <div className="input-prefix">
              <span>₹</span>
              <input
                type="number"
                step="0.01"
                value={data.amount}
                onChange={e => update('amount', e.target.value)}
                placeholder="0.00"
                onClick={() => setExpanded(false)}
              />
            </div>
            {errors.amount && <em>{errors.amount}</em>}
          </label>

          <label>
            Category
            <select
              value={data.category}
              onChange={e => update('category', e.target.value)}
              onClick={() => setExpanded(false)}
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <label>
            Notes
            <textarea
              value={data.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Add a note (optional)"
              placeholderAlwaysAbove={true}
            />
          </label>
        </div>

        {/* Expandable detail fields */}
        {(expanded || expense) && (
          <div className="detail-fields expanded">
            {renderDetailSection('Payment method', (
              <select value={data.payment} onChange={e => update('payment', e.target.value)}>
                {paymentOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            ), expanded)}

            {renderDetailSection('Status', (
              <select value={data.status} onChange={e => update('status', e.target.value)}>
                {statusOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            ), expanded)}

            {renderDetailSection('Date', (
              <input type="date" value={data.date} onChange={e => update('date', e.target.value)} />
            ), expanded)}

            {renderDetailSection('Due date', (
              <>
                <input type="date" value={data.dueDate} onChange={e => update('dueDate', e.target.value)} />
                {errors.dueDate && <em>{errors.dueDate}</em>}
              </>
            ), expanded)}

            <label className="check-label full-field">
              <input
                type="checkbox"
                checked={data.recurring}
                onChange={e => update('recurring', e.checked)}
              />
              This is a recurring expense
            </label>

            {renderDetailSection('Split expense', (
              <>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={data.splitExpense.enabled}
                    onChange={e => update('splitExpense', { ...data.splitExpense, enabled: e.checked })}
                  />
                  Split this expense
                </label>
                {data.splitExpense.enabled && (
                  <>
                    <small>Add each payer's share</small>
                    {data.splitExpense.payments.map((payment, idx) => (
                      <div key={idx} className="split-payment-row">
                        <input
                          type="text"
                          placeholder="Payer name"
                          value={payment.name}
                          onChange={e => {
                            const newPayments = [...data.splitExpense.payments]
                            newPayments[idx] = { ...payment, name: e.target.value }
                            update('splitExpense', { ...data.splitExpense, payments: newPayments })
                          }}
                        />
                        <div className="input-prefix">
                          <span>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={payment.amount}
                            onChange={e => {
                              const newPayments = [...data.splitExpense.payments]
                              newPayments[idx] = { ...payment, amount: e.target.value }
                              update('splitExpense', { ...data.splitExpense, payments: newPayments })
                            }}
                          />
                        </div>
                        {idx > 0 && (
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => {
                              const newPayments = data.splitExpense.payments.filter((_, i) => i !== idx)
                              update('splitExpense', { ...data.splitExpense, payments: newPayments })
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="add-split-btn"
                      onClick={() => update('splitExpense', {
                        ...data.splitExpense,
                        payments: [...data.splitExpense.payments, { name: '', amount: '' }]
                      })}
                    >
                      + Add payer
                    </button>
                    {/* Split payment summary */}
                    {(() => {
                      const paid = parseFloat(data.splitExpense.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))
                      const remaining = data.amount - paid
                      return (
                        <div className="split-summary">
                          <div className="split-row">
                            <span>Total split amount</span>
                            <strong>{money(paid)}</strong>
                          </div>
                          <div className={`split-row ${remaining > 0 ? '' : 'success'}`}>
                            <span>{remaining > 0 ? 'Remaining' : 'Fully paid'}</span>
                            <strong>{remaining > 0 ? money(remaining) : money(0)}</strong>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </>
            ), expanded)}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="outline-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="expand-btn" onClick={toggleExpanded}>
            {expanded ? '✓ Save' : '… More fields'}
          </button>
        </div>
      </form>
    </div>
  )
}
