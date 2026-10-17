import { useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { categories, today, money } from '../../utils/appData'

const getInitialData = (item) => {
  const rawPayments = Array.isArray(item?.splitPayments)
    ? item.splitPayments
    : (Array.isArray(item?.splitExpense?.payments) ? item.splitExpense.payments : [])

  const payments = rawPayments.map(p => ({
    name: p?.name || '',
    amount: p?.amount !== undefined && p?.amount !== null ? p.amount : ''
  }))

  const isEnabled = Boolean(item?.splitExpense?.enabled ?? (payments.length > 0))

  return {
    id: item?.id,
    title: item?.title || '',
    amount: item?.amount !== undefined && item?.amount !== null ? item.amount : '',
    category: item?.category || 'Grocery',
    payment: item?.payment || 'Card',
    date: item?.date ? String(item.date).slice(0, 10) : today,
    dueDate: (item?.dueDate || item?.date || today).slice(0, 10),
    notes: item?.notes || '',
    recurring: Boolean(item?.recurring),
    status: item?.status || 'Paid',
    splitExpense: {
      enabled: isEnabled,
      payments: payments.length > 0 ? payments : (isEnabled ? [{ name: '', amount: '' }] : [])
    }
  }
}

export default function ExpenseModal({ expense, onClose, onSave }) {
  const [data, setData] = useState(() => getInitialData(expense))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setData(getInitialData(expense))
    setErrors({})
  }, [expense])

  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }))

  const submit = e => {
    e.preventDefault()
    const next = {}
    if (!String(data.title || '').trim()) next.title = 'Enter a title'
    if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero'
    if (!data.dueDate) next.dueDate = 'Choose a due date'
    if (Object.keys(next).length) return setErrors(next)

    const isSplit = Boolean(data.splitExpense?.enabled)
    const validPayments = isSplit
      ? (data.splitExpense.payments || []).map(p => ({
          name: String(p.name || '').trim(),
          amount: Number(p.amount || 0)
        })).filter(p => p.name || p.amount > 0)
      : []

    const submitData = {
      ...data,
      title: String(data.title).trim(),
      amount: Number(data.amount),
      status: data.status || 'Paid',
      dueDate: data.dueDate || data.date || today,
      splitExpense: {
        enabled: isSplit,
        payments: validPayments
      },
      splitPayments: validPayments
    }

    onSave(submitData)
  }

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
          <button type="button" className="close" aria-label="Close" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>

        <div className="form-grid">
          <label className="full-field" autoFocus>
            Title
            <input
              value={data.title}
              onChange={e => update('title', e.target.value)}
              placeholder="e.g. Weekly groceries"
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
              />
            </div>
            {errors.amount && <em>{errors.amount}</em>}
          </label>

          <label>
            Category
            <select
              value={data.category}
              onChange={e => update('category', e.target.value)}
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <label>
            Payment method
            <select
              value={data.payment}
              onChange={e => update('payment', e.target.value)}
            >
              {paymentOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Status
            <select
              value={data.status}
              onChange={e => update('status', e.target.value)}
            >
              {statusOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Date
            <input
              type="date"
              value={data.date}
              onChange={e => update('date', e.target.value)}
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              value={data.dueDate}
              onChange={e => update('dueDate', e.target.value)}
            />
            {errors.dueDate && <em>{errors.dueDate}</em>}
          </label>

          <label className="full-field">
            Notes
            <textarea
              value={data.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Add a note (optional)"
            />
          </label>

          <label className="check-label full-field">
            <input
              type="checkbox"
              checked={data.recurring}
              onChange={e => update('recurring', e.target.checked)}
            />
            This is a recurring expense
          </label>

          <div className="full-field split-section-wrap" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px' }}>
            <label className="check-label">
              <input
                type="checkbox"
                checked={Boolean(data.splitExpense?.enabled)}
                onChange={e => {
                  const enabled = e.target.checked
                  const currentPayments = data.splitExpense?.payments || []
                  const payments = enabled && currentPayments.length === 0 ? [{ name: '', amount: '' }] : currentPayments
                  update('splitExpense', { enabled, payments })
                }}
              />
              Split this expense among multiple payers
            </label>

            {data.splitExpense?.enabled && (
              <div className="split-payments" style={{ marginTop: '12px' }}>
                <small>Add each payer's share</small>
                {(data.splitExpense.payments || []).map((payment, idx) => (
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
                    {idx >= 0 && (
                      <button
                        type="button"
                        className="remove-btn"
                        aria-label="Remove payer"
                        onClick={() => {
                          const newPayments = data.splitExpense.payments.filter((_, i) => i !== idx)
                          update('splitExpense', { ...data.splitExpense, payments: newPayments })
                        }}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="add-split-btn"
                  onClick={() => update('splitExpense', {
                    ...data.splitExpense,
                    payments: [...(data.splitExpense.payments || []), { name: '', amount: '' }]
                  })}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Add payer</span>
                </button>
                {/* Split payment summary */}
                {(() => {
                  const paid = parseFloat((data.splitExpense.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))
                  const total = parseFloat(data.amount || 0)
                  const remaining = total - paid
                  return (
                    <div className="split-summary">
                      <div className="split-row">
                        <span>Total split amount</span>
                        <strong>{money(paid)}</strong>
                      </div>
                      <div className={`split-row ${remaining <= 0 ? 'success' : ''}`}>
                        <span>{remaining <= 0 ? 'Fully allocated' : 'Remaining'}</span>
                        <strong>{money(remaining > 0 ? remaining : 0)}</strong>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="outline-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-btn" style={{ padding: '10px 20px', gap: '6px' }}>
            <Check size={16} aria-hidden="true" />
            <span>Save</span>
          </button>
        </div>
      </form>
    </div>
  )
}
