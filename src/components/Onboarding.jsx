import { useState } from 'react'
import { ArrowRight, Check, Lock, Sparkles } from 'lucide-react'
import AppDialog from './ui/AppDialog'
import { currencySymbol, toINR } from '../utils/currency'
import { defaultBudgets } from '../utils/appData'

export default function Onboarding({ open, firstName, onSaveBudgets, onQuickAdd, onDone }) {
  const [step, setStep] = useState(0)
  const [monthly, setMonthly] = useState('')
  const [saving, setSaving] = useState(false)

  const finish = () => {
    setSaving(false)
    onDone()
  }

  const saveBudget = async () => {
    const value = toINR(monthly)
    if (!value || Number(value) <= 0) return
    setSaving(true)
    const saved = await onSaveBudgets({ ...defaultBudgets, monthly: Number(value) })
    if (saved) finish()
    else setSaving(false)
  }

  return <AppDialog
    open={open}
    onOpenChange={next => { if (!next) finish() }}
    title="Welcome to PaisaWise"
    hideTitle
    variant="center"
    className="onboarding"
  >
    <div className="onboarding-progress" aria-hidden="true">
      {[0, 1, 2].map(index => <i key={index} className={index <= step ? 'done' : ''} />)}
    </div>

    {step === 0 && <div className="onboarding-step">
      <span className="onboarding-icon"><Sparkles size={26} aria-hidden="true" /></span>
      <h2>Money, minus the spreadsheet</h2>
      <p>Welcome{firstName ? `, ${firstName}` : ''}. Log a UPI payment in two taps and always know what is safe to spend today.</p>
      <ul className="onboarding-points">
        <li><Check size={16} aria-hidden="true" /> Built for UPI-era spending</li>
        <li><Lock size={16} aria-hidden="true" /> No bank login required</li>
        <li><Check size={16} aria-hidden="true" /> Works offline once installed</li>
      </ul>
      <div className="onboarding-actions onboarding-actions-stacked">
        <button type="button" className="primary-btn" onClick={() => setStep(1)}>Get started <ArrowRight size={16} aria-hidden="true" /></button>
        <button type="button" className="text-btn" onClick={finish}>Skip for now</button>
      </div>
    </div>}

    {step === 1 && <div className="onboarding-step">
      <span className="onboarding-icon">1</span>
      <h2>Set a monthly spending limit</h2>
      <p>This powers your daily pace and the “safe to spend” number. You can change it any time in Budgets.</p>
      <label className="onboarding-field">
        Monthly limit
        <div className="input-prefix">
          <span>{currencySymbol()}</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step="100"
            value={monthly}
            onChange={event => setMonthly(event.target.value)}
            placeholder="24000"
          />
        </div>
      </label>
      <small className="onboarding-hint">Not sure? Start with what you usually spend, then adjust.</small>
      <div className="onboarding-actions">
        <button type="button" className="outline-btn" onClick={() => setStep(2)}>Skip</button>
        <button type="button" className="primary-btn" disabled={saving || !(Number(monthly) > 0)} onClick={saveBudget}>
          {saving ? 'Saving…' : 'Save limit'}
        </button>
      </div>
    </div>}

    {step === 2 && <div className="onboarding-step">
      <span className="onboarding-icon">2</span>
      <h2>Log your first expense</h2>
      <p>Two taps: amount, then save. Category defaults to Grocery and payment to UPI — edit any time.</p>
      <div className="onboarding-preview" aria-hidden="true">
        <span>{currencySymbol()}0</span>
        <div><i>Grocery</i><i>UPI</i></div>
      </div>
      <div className="onboarding-actions">
        <button type="button" className="outline-btn" onClick={() => setStep(1)}>Back</button>
        <button type="button" className="primary-btn" onClick={() => { finish(); onQuickAdd() }}>
          Add expense <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>}

    <div className="onboarding-foot">
      <span>{step + 1} of 3</span>
      <span>Amounts stay private to your account.</span>
    </div>
  </AppDialog>
}
