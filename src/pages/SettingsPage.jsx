import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { PageTitle } from '../components/PageComponents'
import { cycleRangeLabel, getCycleDateForSettings, getMonthlyCycleRange, getPreviousMonthStart, previewCycleRange } from '../utils/appData'

export default function SettingsPage({ notify, theme, setTheme, monthlyCycleStartDate, onSaveMonthlyCycle }) {
  const [notifications, setNotifications] = useState(true)
  const [cycleDraft, setCycleDraft] = useState(() => getCycleDateForSettings(monthlyCycleStartDate))
  const [cycleSaving, setCycleSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const saveCycle = async startDate => {
    setCycleSaving(true)
    try {
      if (await onSaveMonthlyCycle(startDate)) setCycleDraft(getCycleDateForSettings(startDate))
    } finally {
      setCycleSaving(false)
    }
  }

  const updatePassword = async event => {
    event.preventDefault()
    setPasswordError('')
    if (newPassword !== verifyPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('Choose a new password different from your current password')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, verifyPassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to update password')
      setCurrentPassword('')
      setNewPassword('')
      setVerifyPassword('')
      notify('Password updated successfully')
    } catch (error) {
      setPasswordError(error.message || 'Unable to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  return <>
    <PageTitle eyebrow="Workspace / Settings" title="Settings" subtitle="Make PaisaWise feel like yours." />
    <section className="card cycle-settings">
      <div className="section-head">
        <div><h2>Monthly spending cycle</h2><p>Current cycle: {cycleRangeLabel(getMonthlyCycleRange(monthlyCycleStartDate))}</p></div>
        <CalendarDays size={20} aria-hidden="true" />
      </div>
      <label className="cycle-date-field" htmlFor="monthly-cycle-start">Cycle starts on
        <input id="monthly-cycle-start" type="date" min={getPreviousMonthStart()} value={cycleDraft} disabled={cycleSaving} onChange={event => setCycleDraft(event.target.value)} />
      </label>
      <p className="cycle-help">
        {cycleDraft
          ? `Next cycle: ${cycleRangeLabel(previewCycleRange(cycleDraft))}. It will repeat monthly on day ${Number(cycleDraft.slice(-2))}.`
          : `Default calendar cycle: ${cycleRangeLabel(getMonthlyCycleRange(null))}. It resets on the first day of every month.`}
      </p>
      <div className="cycle-actions">
        <button className="primary-btn" type="button" disabled={cycleSaving || !cycleDraft || cycleDraft < getPreviousMonthStart()} onClick={() => saveCycle(cycleDraft)}>{cycleSaving ? 'Saving…' : 'Save cycle'}</button>
        <button className="outline-btn" type="button" disabled={cycleSaving || !monthlyCycleStartDate} onClick={() => { setCycleDraft(getCycleDateForSettings(null)); saveCycle(null) }}>Use calendar month</button>
      </div>
    </section>
    <section className="card settings-card">
      <div className="setting-row">
        <div><strong>Appearance</strong><p>Choose a light or dark look for your workspace.</p></div>
        <button className={`toggle ${theme === 'dark' ? 'on' : ''}`} type="button" role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><i></i></button>
      </div>
      <div className="setting-row">
        <div><strong>Notifications</strong><p>Get reminders for upcoming and overdue expenses.</p></div>
        <button className={`toggle ${notifications ? 'on' : ''}`} onClick={() => setNotifications(!notifications)}><i></i></button>
      </div>
      <div className="setting-row">
        <div><strong>Currency</strong><p>Used across all budgets and reports.</p></div>
        <select defaultValue="INR"><option>INR — Indian Rupee</option><option>USD — US Dollar</option><option>EUR — Euro</option><option>GBP — Pound Sterling</option></select>
      </div>
      <div className="setting-row">
        <div><strong>Test reminder</strong><p>Preview how a PaisaWise reminder looks.</p></div>
        <button className="outline-btn" onClick={() => notify('Reminder: electricity bill is due today')}>Send test</button>
      </div>
    </section>
    <section className="card password-settings">
      <div className="section-head"><div><h2>Update password</h2><p>Confirm your current password before choosing a new one.</p></div></div>
      <form onSubmit={updatePassword}>
        {passwordError && <div className="auth-error" role="alert">{passwordError}</div>}
        <label className="auth-field">Current password<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
        <label className="auth-field">New password<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        <label className="auth-field">Verify new password<input type="password" value={verifyPassword} onChange={event => setVerifyPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        <button className="primary-btn" type="submit" disabled={passwordSaving}>{passwordSaving ? 'Updating…' : 'Update password'}</button>
      </form>
    </section>
  </>
}
