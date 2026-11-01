import { useState } from 'react'
import { ArrowRight, Delete, Sparkles } from 'lucide-react'
import AppDialog from './ui/AppDialog'
import { categories, categoryMeta, today } from '../utils/appData'
import { currencySymbol, toINR } from '../utils/currency'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del']

export default function QuickAddSheet({ open, onClose, onSave, defaultDate }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Grocery')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [saving, setSaving] = useState(false)

  const numericAmount = Number(amount || 0)
  const canSave = numericAmount > 0 && !saving

  const press = key => {
    if (key === 'del') return setAmount(current => current.slice(0, -1))
    if (key === '.' && amount.includes('.')) return
    setAmount(current => {
      const next = `${current}${key}`
      if (next.includes('.')) {
        const [, decimals = ''] = next.split('.')
        if (decimals.length > 2) return current
      }
      if (next.replace('.', '').length > 9) return current
      return next === '.' ? '0.' : next.replace(/^0(?=\d)/, '')
    })
  }

  const reset = () => {
    setAmount('')
    setCategory('Grocery')
    setNote('')
    setShowNote(false)
    setSaving(false)
  }

  const submit = async () => {
    if (!canSave) return
    setSaving(true)
    const date = defaultDate || today
    try {
      await onSave({
        title: note.trim() || category,
        amount: toINR(numericAmount),
        category,
        payment: 'UPI',
        date,
        dueDate: date,
        status: 'Paid',
        notes: note.trim(),
        recurring: false,
      })
      reset()
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return <AppDialog
    open={open}
    onOpenChange={next => { if (!next) { reset(); onClose() } }}
    title="Quick add"
    description="Log a payment in two taps. Edit details later from Expenses."
    variant="sheet"
    className="quick-add"
  >
    <div className="quick-add-amount" aria-live="polite">
      <span className="quick-add-currency">{currencySymbol()}</span>
      <span>
        {amount || '0'}
      </span>
    </div>

    <div className="quick-add-categories" role="group" aria-label="Category">
      {categories.map(name => (
        <button
          key={name}
          type="button"
          className={`quick-category ${category === name ? 'active' : ''}`}
          aria-pressed={category === name}
          onClick={() => setCategory(name)}
        >
          <span aria-hidden="true">{categoryMeta[name]?.[1]}</span>
          {name}
        </button>
      ))}
    </div>

    {showNote
      ? <label className="quick-add-note">
          <span className="sr-only">Note</span>
          <input
            autoFocus
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="What was this for? (optional)"
            maxLength={80}
          />
        </label>
      : <button type="button" className="quick-add-note-toggle" onClick={() => setShowNote(true)}>
          <Sparkles size={14} aria-hidden="true" />
          Add a note
        </button>}

    <div className="quick-add-keypad" role="group" aria-label="Amount keypad">
      {KEYS.map(key => <button
        key={key}
        type="button"
        className={key === 'del' ? 'key-del' : ''}
        aria-label={key === 'del' ? 'Delete last digit' : key}
        onClick={() => press(key)}
      >
        {key === 'del' ? <Delete size={20} aria-hidden="true" /> : key}
      </button>)}
    </div>

    <button type="button" className="primary-btn quick-add-save" disabled={!canSave} onClick={submit}>
      {saving ? 'Saving…' : <>Add {numericAmount > 0 ? `${currencySymbol()}${amount}` : 'expense'} <ArrowRight size={16} aria-hidden="true" /></>}
    </button>
  </AppDialog>
}
