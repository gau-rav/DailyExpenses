import { useState } from 'react'
import { Download, Sparkles } from 'lucide-react'
import { CategoryChart, MoreMenu, PageTitle } from '../components/PageComponents'
import { currencySymbol, fromINRInput, toINR } from '../utils/currency'

export default function BudgetsPage({ budgets, budgetsLoaded, onSaveBudgets, expenses, monthSpend, cycleLabel, money, exportCsv }) {
  // Warning banner state
  const [warningBanner, setWarningBanner] = useState(undefined) // undefined, threshold, or 'resolved'

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

  // Warning banner HTML component
  const WarningBannerHTML = warningBanner && warningBanner !== 'resolved' ? (
    <div
      className="budget-guidance warning"
      onClick={() => setWarningBanner('resolved')}
      role="button"
      tabIndex={0}
    >
      <div className="guidance-icon">⚠️</div>
      <div className="guidance-content">
        <strong>Budget alert: {warningBanner.threshold}% used</strong>
        <p>Only {money(warningBanner.totalRemaining)} remaining for the rest of the month</p>
        <small>Tap to acknowledge this warning</small>
      </div>
    </div>
  ) : null

  // Check warning banner on mount
  if (budgetsLoaded && warningBanner === undefined && budgets.monthly > 0 && monthSpend > 0) {
    const percentage = (monthSpend / budgets.monthly) * 100
    const thresholds = [60, 70, 80]
    const nextThreshold = thresholds.find(t => t < percentage) || null

    if (nextThreshold) {
      const totalRemaining = Math.round(budgets.monthly * (nextThreshold - percentage) / 100)
      setWarningBanner({ threshold: nextThreshold, totalRemaining })
    }
  }

  return budgetsLoaded
    ? <>
        <PageTitle eyebrow="Workspace / Planning" title="Budgets & reports" subtitle="Give your money a plan." action={<button className="outline-btn export" onClick={exportCsv}><Download size={14} aria-hidden="true" /><span>Export CSV</span></button>} />

        {/* One-time warning banner */}
        {WarningBannerHTML}

        <div className="budget-layout">
          <section className="card budget-settings">
            <div className="section-head">
              <div>
                <h2>Spending limits</h2>
                <p>Set a limit and stay in control.</p>
              </div>
              <span className={`status ${monthSpend >= budgets.monthly ? 'status-overbudget' : budgets.monthly > 0 ? 'status-paid' : 'status-neutral'}`}>
                <i></i>
                {monthSpend >= budgets.monthly ? 'Over budget' : budgets.monthly > 0 ? 'On track' : 'No limit'}
              </span>
            </div>

            {['daily', 'weekly', 'monthly'].map(key => (
              <label className="budget-input" key={key}>
                <span>
                  <strong>{key[0].toUpperCase() + key.slice(1)} budget</strong>
                  <small>
                    {key === 'daily' ? 'Resets every day'
                      : key === 'weekly' ? 'Resets every Monday'
                      : 'Resets on the 1st'}
                  </small>
                </span>
                <div>
                  <span>{currencySymbol()}</span>
                  <input
                    type="number"
                    min="0"
                    max="1000000000"
                    step="0.01"
                    value={fromINRInput(currentDraft[key])}
                    disabled={!budgetsLoaded || saving}
                    onChange={event => { setDraft({ ...currentDraft, [key]: toINR(event.target.value) }); setDirty(true) }}
                  />
                </div>
              </label>
            ))}

            {warningBanner && warningBanner !== 'resolved' && (
              <button
                type="button"
                className="warning-reset"
                onClick={() => setWarningBanner('resolved')}
              >
                Acknowledge budget warnings
              </button>
            )}

            <button className="primary-btn" disabled={!budgetsLoaded || saving} onClick={save}>
              {saving ? 'Saving…' : budgetsLoaded ? 'Save budget limits' : 'Loading budget limits…'}
            </button>
          </section>

          <section className="card report-card">
            <div className="section-head">
              <div>
                <h2>Spending by category</h2>
                <p>{cycleLabel} · {money(monthSpend)} total</p>
              </div>
              <MoreMenu label="Spending by category" items={reportMenu} />
            </div>
            <CategoryChart expenses={expenses} />
            <div className="report-note">
              <span><Sparkles size={16} aria-hidden="true" /></span>
              <p>Your biggest category is <strong>{expenses[0]?.category || 'Food'}</strong>. Keep going — small choices add up.</p>
            </div>
          </section>
        </div>
      </>
    : <div className="page-loading page-loading-screen" role="status" aria-live="polite">
        <span className="page-loading-spinner" aria-hidden="true" />
        <span>Loading your budgets…</span>
      </div>
}