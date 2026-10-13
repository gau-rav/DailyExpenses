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
    status: 'Paid'
  })
  const [errors, setErrors] = useState({})

  const update = (k, v) => setData({ ...data, [k]: v })

  const submit = e => {
    e.preventDefault()
    const next = {}
    if (!data.title.trim()) next.title = 'Enter a title'
    if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero'
    if (!data.dueDate) next.dueDate = 'Choose a due date'
    if (Object.keys(next).length) return setErrors(next)
    onSave({ ...data, amount: Number(data.amount), status: data.status || 'Paid' })
  }

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
        <div className="form-grid">
          <label className="full-field">
            Title
            <input autoFocus value={data.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Weekly groceries" />
            {errors.title && <em>{errors.title}</em>}
          </label>
          <label>
            Amount
            <div className="input-prefix">
              <span>₹</span>
              <input type="number" step="0.01" value={data.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00" />
            </div>
            {errors.amount && <em>{errors.amount}</em>}
          </label>
          <label>
            Category
            <select value={data.category} onChange={e => update('category', e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Payment method
            <select value={data.payment} onChange={e => update('payment', e.target.value)}>
              <option>Card</option>
              <option>Cash</option>
              <option>Bank transfer</option>
              <option>UPI</option>
            </select>
          </label>
          <label>
            Status
            <select value={data.status} onChange={e => update('status', e.target.value)}>
              {['Pending', 'Paid', 'Due Today', 'Upcoming', 'Overdue'].map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={data.date} onChange={e => update('date', e.target.value)} />
          </label>
          <label>
            Due date
            <input type="date" value={data.dueDate} onChange={e => update('dueDate', e.target.value)} />
            {errors.dueDate && <em>{errors.dueDate}</em>}
          </label>
          <label className="full-field">
            Notes
            <textarea value={data.notes} onChange={e => update('notes', e.target.value)} placeholder="Add a note (optional)" />
          </label>
          <label className="check-label full-field">
            <input type="checkbox" checked={data.recurring} onChange={e => update('recurring', e.checked)} />
            This is a recurring expense
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="outline-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn">{expense ? 'Save changes' : 'Add expense'}</button>
        </div>
      </form>
    </div>
  )
}