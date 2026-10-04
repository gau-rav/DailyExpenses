import { Empty, PageTitle } from '../components/PageComponents'
import { formatDate, money } from '../utils/appData'

export default function TrashPage({ deleted, setDeleted, setExpenses, notify, onRestore, onPurge }) {
  const restore = async expense => {
    setExpenses(current => [expense, ...current])
    setDeleted(current => current.filter(item => item.id !== expense.id))
    await onRestore(expense)
    notify('Expense restored')
  }
  const clear = () => {
    if (confirm('Permanently delete all trashed expenses?')) onPurge(deleted)
  }

  return <>
    <PageTitle eyebrow="Workspace / Trash" title="Trash" subtitle="Restore something you deleted by mistake." action={deleted.length > 0 && <button className="outline-btn" onClick={clear}>Empty trash</button>} />
    <section className="card table-card trash-card">
      {deleted.length ? deleted.map(expense => <div className="trash-row" key={expense.id}><div><strong>{expense.title}</strong><span>{formatDate(expense.date)} · {money(expense.amount)}</span></div><button className="outline-btn" onClick={() => restore(expense)}>Restore</button></div>) : <Empty text="Trash is empty." />}
    </section>
  </>
}
