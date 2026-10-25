import { useEffect, useState } from 'react'
import { Check, MailOpen, Pencil, X } from 'lucide-react'
import { PageTitle } from '../components/PageComponents'
import { ExpenseModal } from '../components/Modal'
import { formatDate, money } from '../utils/appData'
import { acceptIngestMessage, fetchIngestMessages, ignoreIngestMessage } from '../api/ingestApi'

const tabs = [
  { id: 'pending', label: 'Needs review' },
  { id: 'added', label: 'Added' },
  { id: 'ignored', label: 'Ignored' },
]

const warningLabels = {
  missing_merchant: 'No merchant name found — add a title before saving',
  foreign_currency: 'Foreign currency — confirm the rupee amount',
  date_from_email: 'Date taken from the email received time',
}

export default function InboxPage({ notify, onChanged, onExpenseAdded }) {
  const [status, setStatus] = useState('pending')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let active = true
    fetchIngestMessages(status)
      .then(data => { if (active) { setMessages(data.messages); setError('') } })
      .catch(loadError => { if (active) setError(loadError.message || 'Unable to load captured emails') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status])

  const changeTab = next => {
    if (next === status) return
    setLoading(true)
    setError('')
    setStatus(next)
  }

  const removeMessage = id => setMessages(current => current.filter(message => message.id !== id))

  const accept = async (message, expense) => {
    setBusyId(message.id)
    try {
      const data = await acceptIngestMessage(message.id, expense)
      removeMessage(message.id)
      notify('Added to expenses')
      onExpenseAdded?.(data.expense)
      await onChanged?.()
    } catch (error) {
      notify(error.message || 'Unable to add this email')
    } finally {
      setBusyId('')
      setEditing(null)
    }
  }

  const ignore = async message => {
    setBusyId(message.id)
    try {
      await ignoreIngestMessage(message.id)
      removeMessage(message.id)
      notify('Email ignored')
      await onChanged?.()
    } catch (error) {
      notify(error.message || 'Unable to ignore this email')
    } finally {
      setBusyId('')
    }
  }

  return <>
    <PageTitle eyebrow="Captured from Gmail" title="Email inbox" subtitle="Bank and card alerts captured from your Gmail, ready to review." />
    <section className="card inbox-card">
      <div className="inbox-tabs" role="tablist">
        {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={status === tab.id} className={status === tab.id ? 'active' : ''} onClick={() => changeTab(tab.id)}>{tab.label}</button>)}
      </div>

      {loading ? <div className="inbox-empty">Loading captured emails…</div> : error ? <div className="inbox-empty">
        <MailOpen size={26} strokeWidth={1.6} aria-hidden="true" />
        <strong>Could not load captured emails</strong>
        <span>{error}</span>
      </div> : messages.length === 0 ? <div className="inbox-empty">
        <MailOpen size={26} strokeWidth={1.6} aria-hidden="true" />
        <strong>{status === 'pending' ? 'Nothing to review' : status === 'added' ? 'No added emails yet' : 'No ignored emails yet'}</strong>
        <span>{status === 'pending' ? 'New bank alert emails will appear here for review.' : 'Emails you action from this inbox are listed here.'}</span>
      </div> : <div className="inbox-list">
        {messages.map(message => {
          const parsed = message.parsed || {}
          const busy = busyId === message.id
          return <article className="inbox-item" key={message.id}>
            <div className="inbox-item-main">
              <div className="inbox-item-head">
                <strong>{parsed.title || message.bank || 'Email transaction'}</strong>
                {parsed.amount ? <b>{money(parsed.amount)}</b> : null}
              </div>
              <div className="inbox-meta">
                {parsed.date && <span>{formatDate(parsed.date)}</span>}
                {parsed.category && <span>{parsed.category}</span>}
                {parsed.payment && <span>{parsed.payment}</span>}
                {message.bank && <span>{message.bank}</span>}
                {status !== 'pending' && <span className={`inbox-status ${message.status}`}>{message.status === 'added' ? 'Added' : message.status === 'ignored' ? 'Ignored' : message.status}</span>}
              </div>
              <p className="inbox-subject">{message.subject || message.sender || 'Bank alert'}</p>
              {status === 'pending' && message.confidence > 0 && <small className="inbox-confidence">{Math.round(message.confidence * 100)}% confident</small>}
              {status === 'pending' && message.warnings?.length > 0 && <ul className="inbox-warnings">{message.warnings.map(warning => <li key={warning}>{warningLabels[warning] || warning}</li>)}</ul>}
            </div>
            {status === 'pending' && <div className="inbox-actions">
              <button className="primary-btn" type="button" disabled={busy} onClick={() => accept(message)}><Check size={15} aria-hidden="true" /> Add</button>
              <button className="outline-btn" type="button" disabled={busy} onClick={() => setEditing(message)}><Pencil size={14} aria-hidden="true" /> Edit</button>
              <button className="outline-btn danger" type="button" disabled={busy} onClick={() => ignore(message)}><X size={14} aria-hidden="true" /> Ignore</button>
            </div>}
          </article>
        })}
      </div>}
    </section>
    {editing && <ExpenseModal key={editing.id} expense={{ ...editing.parsed, notes: `Imported from ${editing.bank || 'email'} email`, status: 'Paid' }} onClose={() => setEditing(null)} onSave={data => accept(editing, data)} />}
  </>
}
