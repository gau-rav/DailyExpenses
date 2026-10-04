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

  const title = mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome to PaisaWise'
  const submitLabel = mode === 'register' ? 'Create account' : mode === 'reset' ? 'Update password' : 'Sign in'

  return <main className="auth-screen">
    <section className="auth-card">
      <img className="brand-mark auth-mark" src="/logo.jpg" alt="PaisaWise logo" />
      <h1>{title}</h1>
      <div className="auth-mode-switch" aria-label="Authentication options">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Sign in</button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Register</button>
      </div>
      <form onSubmit={submit}>
        <p>{mode === 'register' ? 'Create an account with your email and password.' : mode === 'reset' ? 'Enter your current password to set a new one. Email recovery will be added later.' : 'Sign in with your email and password.'}</p>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {mode === 'register' && <>
          <label className="auth-field">First name<input type="text" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" maxLength={60} required /></label>
          <label className="auth-field">Last name<input type="text" value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" maxLength={60} required /></label>
        </>}
        <label className="auth-field">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
        {mode === 'reset' && <label className="auth-field">Current password<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>}
        <label className="auth-field">{mode === 'reset' ? 'New password' : 'Password'}<span className="password-input-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required /><button className="password-visibility" type="button" aria-label={showPassword ? 'Hide password' : 'View password'} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span></label>
        {mode !== 'login' && <label className="auth-field">Verify password<input type="password" value={verifyPassword} onChange={event => setVerifyPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label>}
        <button className="primary-btn auth-button" disabled={submitting}>{submitting ? 'Please wait…' : submitLabel}</button>
        <div className="auth-links">
          {mode === 'login' ? <button type="button" onClick={() => changeMode('reset')}>Forgot password?</button> : <button type="button" onClick={() => changeMode('login')}>Back to sign in</button>}
          {mode === 'register' && <span>Password recovery currently requires your existing password.</span>}
        </div>
      </form>
    </section>
  </main>
}
