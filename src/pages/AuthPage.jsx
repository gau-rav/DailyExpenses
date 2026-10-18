import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function AuthPage({ loading = false }) {
  const [mode, setMode] = useState('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const changeMode = nextMode => {
    setMode(nextMode)
    setPassword('')
    setCurrentPassword('')
    setVerifyPassword('')
    setShowPassword(false)
    setError('')
  }

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (mode !== 'login' && password !== verifyPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const endpoint = mode === 'register' ? 'register' : mode === 'reset' ? 'password/reset' : 'login'
      const body = mode === 'reset'
        ? { email, currentPassword, newPassword: password, verifyPassword }
        : { email, password, ...(mode === 'register' ? { firstName, lastName, verifyPassword } : {}) }
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || (mode === 'register' ? 'Unable to create account' : mode === 'reset' ? 'Unable to reset password' : 'Unable to sign in'))
      window.location.reload()
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="splash-screen" aria-label="Loading PaisaWise">
    <img src="/logo_message.jpg" alt="PaisaWise — Track every paisa wisely" />
    <div className="splash-loader" role="status" aria-label="Loading">
      <span className="splash-ring" aria-hidden="true" />
      <span className="splash-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  </main>

  const title = mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Change your password' : 'Welcome back'
  const subtitle = mode === 'register'
    ? 'Start tracking your spending in minutes.'
    : mode === 'reset'
    ? 'Confirm your current password to set a new one.'
    : 'Sign in to continue tracking every paisa.'
  const submitLabel = mode === 'register' ? 'Create account' : mode === 'reset' ? 'Update password' : 'Sign in'

  return <main className="auth-screen">
    <section className="auth-card">
      <div className="auth-brand">
        <img className="brand-mark auth-mark" src="/logo.jpg" alt="PaisaWise logo" />
        <div>
          <strong>PaisaWise</strong>
          <span>Track every paisa wisely.</span>
        </div>
      </div>

      {mode === 'reset' ? (
        <button type="button" className="auth-back" onClick={() => changeMode('login')} aria-label="Back to sign in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to sign in</span>
        </button>
      ) : (
        <div className="auth-mode-switch" role="tablist" aria-label="Authentication options">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Sign up</button>
        </div>
      )}

      <div className="auth-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <form onSubmit={submit}>
        {error && <div className="auth-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>}
        {mode === 'register' && (
          <div className="auth-names">
            <label className="auth-field">First name
              <span className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input type="text" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" maxLength={60} autoFocus required />
              </span>
            </label>
            <label className="auth-field">Last name
              <span className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input type="text" value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" maxLength={60} required />
              </span>
            </label>
          </div>
        )}
        <label className="auth-field">Email
          <span className="auth-input-wrap">
            <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} autoFocus={mode === 'login'} required />
          </span>
        </label>
        {mode === 'reset' && <label className="auth-field">Current password
          <span className="auth-input-wrap">
            <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" autoFocus required />
          </span>
        </label>}
        <label className="auth-field">{mode === 'reset' ? 'New password' : 'Password'}
          <span className="auth-input-wrap">
            <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required />
            <button className="password-visibility" type="button" aria-label={showPassword ? 'Hide password' : 'View password'} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)}>
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </span>
          {mode !== 'login' && <span className="auth-hint">At least 8 characters.</span>}
        </label>
        {mode !== 'login' && <label className="auth-field">Verify password
          <span className="auth-input-wrap">
            <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input type="password" value={verifyPassword} onChange={event => setVerifyPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
          </span>
        </label>}
        <button className="primary-btn auth-button" disabled={submitting}>
          {submitting ? <>
            <svg className="auth-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Please wait…</span>
          </> : submitLabel}
        </button>
        <div className="auth-links">
          {mode === 'login' ? <button type="button" onClick={() => changeMode('reset')}>Forgot password?</button> : mode === 'reset' ? <span className="auth-muted">Email recovery is coming soon.</span> : null}
        </div>
      </form>
    </section>
  </main>
}
