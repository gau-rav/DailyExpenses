import { useEffect, useState } from 'react'
import { CalendarDays, KeyRound, Link2, Mail, RefreshCw, Unplug } from 'lucide-react'
import { PageTitle } from '../components/PageComponents'
import PwaInstallButton from '../components/PwaInstallButton'
import { cycleRangeLabel, formatTimestamp, getCycleDateForSettings, getMonthlyCycleRange, getPreviousMonthStart, previewCycleRange } from '../utils/appData'
import { CURRENCIES } from '../utils/currency'
import { saveIngestSettings } from '../api/ingestApi'
import { disconnectGmail, syncGmail } from '../api/gmailApi'

export default function SettingsPage({ notify, theme, setTheme, currency, setCurrency, monthlyCycleStartDate, onSaveMonthlyCycle, installPrompt, setInstallPrompt, appInstalled, setAppInstalled, ingestStatus = {}, refreshIngestStatus }) {
  const [cycleDraft, setCycleDraft] = useState(() => getCycleDateForSettings(monthlyCycleStartDate))
  const [cycleSaving, setCycleSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [ingestBusy, setIngestBusy] = useState('')
  const [gmailBusy, setGmailBusy] = useState('')
  const gmail = ingestStatus.gmail || { connected: false, configured: false, loaded: false, email: '', status: 'disconnected', lastSyncAt: '', lastError: '', syncInProgress: false }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('gmailError')
    const connected = params.get('gmail')
    if (!error && connected !== 'connected') return
    refreshIngestStatus?.()
    notify(error || 'Gmail connected')
    params.delete('gmailError')
    params.delete('gmail')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [notify, refreshIngestStatus])

  const updateIngestSetting = async changes => {
    setIngestBusy('settings')
    try {
      await saveIngestSettings(changes)
      await refreshIngestStatus?.()
      notify('Email capture settings saved')
    } catch (error) {
      notify(error.message || 'Unable to save email capture settings')
    } finally {
      setIngestBusy('')
    }
  }

  const connectGmail = () => {
    window.location.assign('/api/integrations/gmail/connect')
  }

  const syncGmailNow = async () => {
    setGmailBusy('sync')
    try {
      const data = await syncGmail()
      await refreshIngestStatus?.()
      notify(`Gmail sync complete — ${data.imported || 0} captured, ${data.duplicates || 0} already seen`)
    } catch (error) {
      notify(error.message || 'Unable to sync Gmail')
    } finally {
      setGmailBusy('')
    }
  }

  const removeGmail = async () => {
    if (!window.confirm('Disconnect Gmail? PaisaWise will stop reading bank alert emails until you reconnect.')) return
    setGmailBusy('disconnect')
    try {
      await disconnectGmail()
      await refreshIngestStatus?.()
      notify('Gmail disconnected')
    } catch (error) {
      notify(error.message || 'Unable to disconnect Gmail')
    } finally {
      setGmailBusy('')
    }
  }

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
    <PageTitle eyebrow="Your workspace" title="Settings" subtitle="Make PaisaWise feel like yours." />
    {!appInstalled && <section className="card pwa-install-setting">
      <div><strong>Install PaisaWise</strong><p>Add the app to your home screen for quick access.</p></div>
      <PwaInstallButton installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} installed={appInstalled} setInstalled={setAppInstalled} />
    </section>}
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
        <div><strong>Currency</strong><p>Display currency only — amounts are always stored in rupees.</p></div>
        <select value={currency} onChange={event => setCurrency(event.target.value)}>
          {CURRENCIES.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
      </div>
      <div className="setting-row">
        <div><strong>Test reminder</strong><p>Preview how a PaisaWise reminder looks.</p></div>
        <button className="outline-btn" onClick={() => notify('Reminder: electricity bill is due today')}>Send test</button>
      </div>
    </section>
    <section className="card ingest-settings">
      <div className="section-head">
        <div><h2>Email auto-capture</h2><p>Connect Gmail so bank and card alerts become expenses automatically.</p></div>
        <Mail size={20} aria-hidden="true" />
      </div>
      <div className="gmail-connection">
        <div className="gmail-connection-head">
          <span className={`gmail-connection-icon${gmail.connected && gmail.status !== 'needs_reauth' ? ' connected' : ''}`}><Mail size={18} aria-hidden="true" /></span>
          <div className="gmail-connection-copy">
            <strong>{gmail.connected && gmail.status !== 'needs_reauth' ? 'Gmail connected' : gmail.status === 'needs_reauth' ? 'Reconnect Gmail' : 'Connect Gmail'}</strong>
            <span>{gmail.connected && gmail.status !== 'needs_reauth'
              ? `${gmail.email || 'Google account'} · Last sync ${gmail.lastSyncAt ? formatTimestamp(gmail.lastSyncAt) : 'not yet'}`
              : gmail.status === 'needs_reauth'
                ? 'Gmail access expired. Reconnect to resume capturing bank alerts.'
                : 'Read bank alert emails from your Gmail account. Raw email bodies are never stored.'}</span>
          </div>
        </div>
        {gmail.connected && gmail.status !== 'needs_reauth'
          ? <div className="gmail-actions">
            <button className="primary-btn" type="button" disabled={gmailBusy === 'sync' || gmail.syncInProgress} onClick={syncGmailNow}><RefreshCw size={14} aria-hidden="true" /> {gmailBusy === 'sync' || gmail.syncInProgress ? 'Syncing…' : 'Sync now'}</button>
            <button className="outline-btn danger" type="button" disabled={gmailBusy === 'disconnect'} onClick={removeGmail}><Unplug size={14} aria-hidden="true" /> Disconnect</button>
          </div>
          : <button className="primary-btn" type="button" disabled={!gmail.configured} onClick={connectGmail}><Link2 size={14} aria-hidden="true" /> {gmail.status === 'needs_reauth' ? 'Reconnect Gmail' : 'Connect Gmail'}</button>}
        {gmail.loaded === false && <p className="ingest-hint">Checking Gmail connection…</p>}
        {gmail.loaded !== false && !gmail.configured && <p className="ingest-hint"><KeyRound size={14} aria-hidden="true" /> Gmail OAuth is not configured on this server. Add the Google OAuth environment variables first.</p>}
        {gmail.status === 'error' && gmail.lastError && <p className="ingest-hint">{gmail.lastError}</p>}
      </div>
      <div className="setting-row">
        <div><strong>Capture emails</strong><p>Accept new bank alert emails from your connected Gmail.</p></div>
        <button className={`toggle ${ingestStatus.enabled ? 'on' : ''}`} type="button" role="switch" aria-checked={Boolean(ingestStatus.enabled)} aria-label="Capture emails" disabled={!ingestStatus.connected || ingestBusy === 'settings'} onClick={() => updateIngestSetting({ enabled: !ingestStatus.enabled })}><i></i></button>
      </div>
      <div className="setting-row">
        <div><strong>Add automatically</strong><p>When off, captured transactions wait in the inbox. High-confidence INR debits are added directly.</p></div>
        <button className={`toggle ${ingestStatus.autoAdd ? 'on' : ''}`} type="button" role="switch" aria-checked={Boolean(ingestStatus.autoAdd)} aria-label="Add automatically" disabled={ingestBusy === 'settings'} onClick={() => updateIngestSetting({ autoAdd: !ingestStatus.autoAdd })}><i></i></button>
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
