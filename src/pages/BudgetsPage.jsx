import { useState } from 'react'
import { CategoryChart, MoreMenu, PageTitle } from '../components/PageComponents'

export default function BudgetsPage({ budgets, budgetsLoaded, onSaveBudgets, expenses, monthSpend, cycleLabel, money, exportCsv }) {
  const [draft, setDraft] = useState(budgets)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const currentDraft = dirty ? draft : budgets
  const reportMenu = [
    { label: 'Export expenses CSV', onSelect: exportCsv },
    { label: 'Print this page', onSelect: () => window.print() },
  ]

  const save = async () => {
    setSaving(true)
    try {
      if (await onSaveBudgets(currentDraft)) {
        setDraft(currentDraft)
        setDirty(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return <>
    <PageTitle eyebrow="Workspace / Planning" title="Budgets & reports" subtitle="Give your money a plan." action={<button className="outline-btn export" onClick={exportCsv}>↥ Export CSV</button>} />
    <div className="budget-layout">
      <section className="card budget-settings">
        <div className="section-head"><div><h2>Spending limits</h2><p>Set a limit and stay in control.</p></div><span className="status status-paid"><i></i>On track</span></div>
        {['daily', 'weekly', 'monthly'].map(key => <label className="budget-input" key={key}>
          <span><strong>{key[0].toUpperCase() + key.slice(1)} budget</strong><small>{key === 'daily' ? 'Resets every day' : key === 'weekly' ? 'Resets every Monday' : 'Resets on the 1st'}</small></span>
          <div><span>₹</span><input type="number" min="0" max="1000000000" step="1" value={currentDraft[key]} disabled={!budgetsLoaded || saving} onChange={event => { setDraft({ ...currentDraft, [key]: Number(event.target.value) }); setDirty(true) }} /></div>
        </label>)}
        <button className="primary-btn" disabled={!budgetsLoaded || saving} onClick={save}>{saving ? 'Saving…' : budgetsLoaded ? 'Save budget limits' : 'Loading budget limits…'}</button>
      </section>
      <section className="card report-card">
        <div className="section-head"><div><h2>Spending by category</h2><p>{cycleLabel} · {money(monthSpend)} total</p></div><MoreMenu label="Spending by category" items={reportMenu} /></div>
        <CategoryChart expenses={expenses} />
        <div className="report-note"><span>✦</span><p>Your biggest category is <strong>{expenses[0]?.category || 'Food'}</strong>. Keep going — small choices add up.</p></div>
      </section>
    </div>
  </>
}
