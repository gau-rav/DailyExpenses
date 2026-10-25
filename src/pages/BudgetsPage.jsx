import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Download, Sparkles, X } from 'lucide-react'
import { CategoryChart, PageTitle } from '../components/PageComponents'
import { ProgressRing } from '../components/ui/ProgressRing'
import { AnimatedMoney } from '../components/ui/AnimatedMoney'
import { budgetThreshold, dailyPace, spendProgress } from '../utils/moneyMath'
import { currencySymbol, fromINRInput, toINR } from '../utils/currency'
import { money as formatMoney } from '../utils/appData'

export default function BudgetsPage({ budgets, budgetsLoaded, onSaveBudgets, expenses, monthSpend, cycleStart, cycleEnd, today, cycleLabel, exportCsv }) {
  const [draft, setDraft] = useState(budgets)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dismissedThreshold, setDismissedThreshold] = useState(null)
  const currentDraft = dirty ? draft : budgets

  const progress = spendProgress(monthSpend, budgets.monthly)
  const pace = dailyPace({ monthSpend, monthlyBudget: budgets.monthly, cycleStart, cycleEnd, today })
  const threshold = budgetThreshold(monthSpend, budgets.monthly)
  const showAlert = threshold && threshold > Number(dismissedThreshold || 0)

  const breakdown = useMemo(() => {
    const totals = expenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + expense.amount
      return result
    }, {})
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [expenses])
  const topCategory = breakdown[0]

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

  if (!budgetsLoaded) return <div className="page-loading page-loading-screen" role="status" aria-live="polite">
    <span className="page-loading-spinner" aria-hidden="true" />
    <span>Loading your budgets…</span>
  </div>

  const tone = progress.over ? 'danger' : pace.status === 'fast' ? 'warn' : 'primary'

  return <>
    <PageTitle
      eyebrow="Planning"
      title="Budgets & reports"
      subtitle="One limit, a clear daily pace, no spreadsheet."
      action={<button className="outline-btn export" aria-label="Export CSV" onClick={exportCsv}><Download size={14} aria-hidden="true" /><span>Export CSV</span></button>}
    />

    {showAlert && <div className={`budget-guidance ${threshold >= 80 ? 'danger' : 'warning'}`}>
      <div className="guidance-icon"><AlertTriangle size={20} aria-hidden="true" /></div>
      <div className="guidance-content">
        <strong>{progress.over ? 'You are over your monthly limit' : `${threshold}% of your monthly limit used`}</strong>
        <p>{progress.over ? `You are ${formatMoney(progress.spent - progress.budget)} over this cycle.` : `${formatMoney(progress.remaining)} remains for the rest of the cycle.`}</p>
        <small>{progress.over ? 'No daily allowance left this cycle' : `${pace.daysLeft} day${pace.daysLeft === 1 ? '' : 's'} left · ${formatMoney(pace.dailyAllowance)}/day keeps you on pace`}</small>
      </div>
      <button type="button" className="icon-btn guidance-dismiss" aria-label="Dismiss budget alert" onClick={() => setDismissedThreshold(threshold)}><X size={16} aria-hidden="true" /></button>
    </div>}

    <div className="budget-layout">
      <section className="card budget-settings">
        <div className="section-head">
          <div>
            <h2>Spending limits</h2>
            <p>Your monthly limit drives the daily pace on Home.</p>
          </div>
          <span className={`status ${progress.over ? 'status-overbudget' : budgets.monthly > 0 ? 'status-paid' : 'status-neutral'}`}>
            <i />{progress.over ? 'Over budget' : budgets.monthly > 0 ? 'On track' : 'No limit'}
          </span>
        </div>

        {['monthly', 'weekly', 'daily'].map(key => (
          <label className={`budget-input ${key === 'monthly' ? 'budget-input-primary' : ''}`} key={key}>
            <span>
              <strong>{key === 'monthly' ? 'Monthly limit' : key === 'weekly' ? 'Weekly guide' : 'Daily guide'}</strong>
              <small>
                {key === 'daily' ? 'A soft target for each day'
                  : key === 'weekly' ? 'Resets every Monday'
                  : `Runs ${cycleLabel}`}
              </small>
            </span>
            <div>
              <span>{currencySymbol()}</span>
              <input
                type="number"
                min="0"
                max="1000000000"
                step="100"
                value={fromINRInput(currentDraft[key])}
                disabled={!budgetsLoaded || saving}
                onChange={event => { setDraft({ ...currentDraft, [key]: toINR(event.target.value) }); setDirty(true) }}
              />
            </div>
          </label>
        ))}

        <button className="primary-btn" disabled={!budgetsLoaded || saving || !dirty} onClick={save}>
          {saving ? 'Saving…' : dirty ? 'Save budget limits' : 'Saved'}
        </button>
      </section>

      <section className={`card budget-pace tone-${tone}`}>
        <div className="section-head">
          <div><h2>Cycle pace</h2><p>{cycleLabel}</p></div>
        </div>
        <div className="budget-pace-body">
          <ProgressRing value={progress.percent} tone={tone} size={132} stroke={9} label={`${Math.round(progress.percent)} percent of monthly limit used`}>
            <strong>{budgets.monthly > 0 ? `${Math.round(progress.percent)}%` : '—'}</strong>
            <span>used</span>
          </ProgressRing>
          <div className="budget-pace-copy">
            <span>{progress.over ? 'Over by' : 'Left to spend'}</span>
            <AnimatedMoney value={progress.over ? progress.spent - progress.budget : progress.remaining} className="budget-pace-number" />
            <small>{budgets.monthly > 0 ? (progress.over ? 'No daily allowance left this cycle' : `${formatMoney(pace.dailyAllowance)}/day for ${pace.daysLeft} day${pace.daysLeft === 1 ? '' : 's'}`) : 'Set a monthly limit to start pacing'}</small>
            <button type="button" className="text-btn" onClick={() => document.querySelector('.budget-input-primary input')?.focus()}>Adjust limit <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      <section className="card report-card">
        <div className="section-head">
          <div>
            <h2>Spending by category</h2>
            <p>{cycleLabel} · {formatMoney(monthSpend)} paid of {formatMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0))} logged</p>
          </div>
        </div>
        <CategoryChart expenses={expenses} />
        <div className="report-note">
          <span><Sparkles size={16} aria-hidden="true" /></span>
          <p>
            {topCategory
              ? <>Your biggest category is <strong>{topCategory[0]}</strong> at <strong>{formatMoney(topCategory[1])}</strong>. {expenses.length > 3 ? 'Small, repeated spends usually hide here.' : 'Add a few more expenses for a sharper read.'}</>
              : 'Add expenses to see where your money goes.'}
          </p>
        </div>
      </section>
    </div>
  </>
}
