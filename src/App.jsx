import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, CalendarPlus, ChartNoAxesCombined, CircleCheck, Clock3, Eye, EyeOff, Home, MoreHorizontal, ReceiptText, Settings, Trash2 } from 'lucide-react'
import './App.css'
import { addExpense, DATA_MODE, deleteExpense as deleteRemoteExpense, fetchDeletedExpenses, fetchExpenses, getLastExpensesSource, isApiConfigured, purgeExpense, readExpenseCache, restoreExpense as restoreRemoteExpense, syncQueuedActions, updateExpense, writeExpenseCache } from './api/expensesApi'

const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Rent', 'Education', 'Other']
const defaultBudgets = { daily: 1500, weekly: 6500, monthly: 24000 }
const categoryMeta = { Food: ['#f4a261', '🍜'], Transport: ['#0d7377', '🚕'], Bills: ['#c67837', '🧾'], Shopping: ['#d88950', '🛍️'], Entertainment: ['#2f9c79', '🎧'], Health: ['#d96857', '💊'], Rent: ['#0a5c5f', '🏠'], Education: ['#398f89', '📚'], Other: ['#94a3b8', '✦'] }
const nav = [['dashboard', 'Overview', '⌂'], ['expenses', 'All expenses', '▤'], ['due', 'Due today', '◷'], ['calendar', 'Calendar', '□'], ['budgets', 'Budgets & reports', '◒'], ['trash', 'Trash', '⌫']]
const mobileMorePages = [
  { id: 'due', label: 'Due today', Icon: Clock3 },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'budgets', label: 'Budgets & reports', Icon: ChartNoAxesCombined },
  { id: 'trash', label: 'Trash', Icon: Trash2 },
  { id: 'settings', label: 'Settings', Icon: Settings },
]
const indiaDate = (date) => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}` }
const today = indiaDate(new Date())
const todayDateLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
const todayDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(new Date())
const todayMonth = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }).format(new Date()).toUpperCase()
const currentMonthLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' }).format(new Date())
const indiaGreeting = () => { const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date())); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night' }
const dateOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return indiaDate(d) }
const seedExpenses = [
  { id: 1, title: 'Weekly groceries', amount: 86.42, category: 'Food', payment: 'Card', date: today, dueDate: today, notes: 'Fresh produce and pantry staples', recurring: true, status: 'Due Today' },
  { id: 2, title: 'Electricity bill', amount: 124.00, category: 'Bills', payment: 'Bank transfer', date: dateOffset(-2), dueDate: today, notes: 'September electricity', recurring: true, status: 'Due Today' },
  { id: 3, title: 'Apartment rent', amount: 1450.00, category: 'Rent', payment: 'Bank transfer', date: dateOffset(-9), dueDate: dateOffset(-3), notes: 'Monthly rent', recurring: true, status: 'Paid' },
  { id: 4, title: 'Metro pass', amount: 48.00, category: 'Transport', payment: 'Card', date: dateOffset(-1), dueDate: dateOffset(2), notes: 'Monthly metro pass', recurring: true, status: 'Upcoming' },
  { id: 5, title: 'Gym membership', amount: 32.00, category: 'Health', payment: 'Card', date: dateOffset(-4), dueDate: dateOffset(5), notes: '', recurring: true, status: 'Upcoming' },
  { id: 6, title: 'Streaming bundle', amount: 19.99, category: 'Entertainment', payment: 'Card', date: dateOffset(-11), dueDate: dateOffset(-2), notes: '', recurring: true, status: 'Overdue' },
  { id: 7, title: 'Coffee with Maya', amount: 7.50, category: 'Food', payment: 'Cash', date: dateOffset(-1), dueDate: dateOffset(-1), notes: '', recurring: false, status: 'Paid' },
  { id: 8, title: 'New running shoes', amount: 118.00, category: 'Shopping', payment: 'Card', date: dateOffset(-6), dueDate: dateOffset(-6), notes: '', recurring: false, status: 'Paid' },
]
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const readBudgetCache = (userId) => {
  try { return JSON.parse(localStorage.getItem(`penny-budgets:${userId}`) || 'null') } catch { return null }
}
const readLegacyBudgetCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem('penny-budgets') || 'null')
    if (!cached || ['daily', 'weekly', 'monthly'].some(key => !Number.isFinite(Number(cached[key])) || Number(cached[key]) < 0)) return null
    return { daily: Number(cached.daily), weekly: Number(cached.weekly), monthly: Number(cached.monthly) }
  } catch {
    return null
  }
}

function App() {
  const [authUser, setAuthUser] = useState(undefined)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('penny-theme') === 'dark' ? 'dark' : 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('penny-theme', theme)
  }, [theme])
  useEffect(() => {
    if (!profileOpen) return undefined

    const closeOnOutsidePointerDown = (event) => {
      const profileMenu = document.querySelector('.profile-menu')
      if (!profileMenu?.contains(event.target)) setProfileOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [profileOpen])
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(response => response.ok ? response.json() : null)
      .then(data => setAuthUser(data?.user || null))
      .catch(() => setAuthUser(null))
  }, [])
  const [expenses, setExpenses] = useState(() => { const saved = JSON.parse(localStorage.getItem('penny-expenses') || 'null'); const cached = readExpenseCache(); return saved || (cached.length ? cached : seedExpenses) })
  const [deleted, setDeleted] = useState(() => JSON.parse(localStorage.getItem('penny-trash') || '[]'))
  const [budgets, setBudgets] = useState(defaultBudgets)
  const [budgetUserLoaded, setBudgetUserLoaded] = useState('')
  const budgetsLoaded = Boolean(authUser && budgetUserLoaded === authUser.id)
  const [page, setPage] = useState('dashboard'), [formOpen, setFormOpen] = useState(false), [editing, setEditing] = useState(null), [deleteTarget, setDeleteTarget] = useState(null), [toast, setToast] = useState(''), [apiStatus, setApiStatus] = useState(isApiConfigured ? 'connecting' : 'offline')
  const [query, setQuery] = useState(''), [categoryFilter, setCategoryFilter] = useState('All categories'), [statusFilter, setStatusFilter] = useState('All statuses'), [sort, setSort] = useState('date'), [selected, setSelected] = useState([]), [month, setMonth] = useState(new Date())
  useEffect(() => {
    const handleMobileNavigation = (event) => setPage(event.detail)
    window.addEventListener('penny:navigate', handleMobileNavigation)
    return () => window.removeEventListener('penny:navigate', handleMobileNavigation)
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('penny:pagechange', { detail: page }))
  }, [page])
  useEffect(() => { localStorage.setItem('penny-expenses', JSON.stringify(expenses)); writeExpenseCache(expenses) }, [expenses]); useEffect(() => localStorage.setItem('penny-trash', JSON.stringify(deleted)), [deleted])
  useEffect(() => {
    if (!authUser) return undefined
    let active = true
    fetch('/api/budgets', { credentials: 'include' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load budget limits')
        if (data.hasSaved) return data.budgets

        const legacyBudgets = readLegacyBudgetCache()
        if (!legacyBudgets) return data.budgets
        const migrationResponse = await fetch('/api/budgets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ budgets: legacyBudgets }),
        })
        const migrationData = await migrationResponse.json().catch(() => ({}))
        if (!migrationResponse.ok || !migrationData.ok) {
          throw new Error(migrationData.error || 'Unable to migrate saved budget limits')
        }
        localStorage.removeItem('penny-budgets')
        return migrationData.budgets
      })
      .then(savedBudgets => {
        if (!active) return
        setBudgets(savedBudgets)
        localStorage.setItem(`penny-budgets:${authUser.id}`, JSON.stringify(savedBudgets))
        setBudgetUserLoaded(authUser.id)
      })
      .catch(error => {
        if (!active) return
        const cached = readBudgetCache(authUser.id)
        setBudgets(cached || defaultBudgets)
        setApiStatus('offline')
        setToast(cached ? 'Could not load account budgets. Showing this account’s saved device copy.' : error.message)
        setBudgetUserLoaded(authUser.id)
      })
    return () => { active = false }
  }, [authUser])
  useEffect(() => {
    if (!isApiConfigured) return undefined
    let active = true
    const refresh = async () => { await syncQueuedActions(); const remote = await fetchExpenses(); const remoteDeleted = await fetchDeletedExpenses(); if (active) { setExpenses(remote); if (remoteDeleted) setDeleted(remoteDeleted); setApiStatus(getLastExpensesSource() === 'remote' ? 'connected' : 'offline') } }
    refresh()
    const onOnline = () => refresh()
    window.addEventListener('online', onOnline)
    return () => { active = false; window.removeEventListener('online', onOnline) }
  }, [])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) } }, [toast])
  const dueToday = expenses.filter(e => e.dueDate === today && e.status !== 'Paid'), overdue = expenses.filter(e => e.status === 'Overdue'), upcoming = expenses.filter(e => e.dueDate > today && e.dueDate <= dateOffset(7) && e.status !== 'Paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4), monthExpenses = expenses.filter(e => e.date.slice(0, 7) === today.slice(0, 7)), todaySpend = expenses.filter(e => e.date === today && e.status === 'Paid').reduce((a, e) => a + e.amount, 0), monthSpend = monthExpenses.reduce((a, e) => a + e.amount, 0)
  const filtered = useMemo(() => expenses.filter(e => `${e.title} ${e.category} ${e.payment}`.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === 'All categories' || e.category === categoryFilter) && (statusFilter === 'All statuses' || e.status === statusFilter)).sort((a, b) => sort === 'amount' ? b.amount - a.amount : sort === 'category' ? a.category.localeCompare(b.category) : b.date.localeCompare(a.date)), [expenses, query, categoryFilter, statusFilter, sort])
  const notify = (message) => setToast(message)
  const saveBudgets = async (nextBudgets) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ budgets: nextBudgets }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to save budget limits')
      setBudgets(data.budgets)
      localStorage.setItem(`penny-budgets:${authUser.id}`, JSON.stringify(data.budgets))
      setApiStatus('connected')
      notify('Budget limits saved to your account')
      return true
    } catch (error) {
      setApiStatus('offline')
      notify(error.message || 'Unable to save budget limits')
      return false
    }
  }
  const openAdd = () => { setEditing(null); setFormOpen(true) }; const openEdit = (e) => { setEditing(e); setFormOpen(true) }
  const saveExpense = async (data) => {
    const payload = { ...data, amount: Number(data.amount), id: editing?.id || crypto.randomUUID() }
    const wasEditing = Boolean(editing)
    setExpenses(current => wasEditing ? current.map(e => e.id === payload.id ? payload : e) : [payload, ...current])
    setFormOpen(false); setEditing(null)
    try { const saved = wasEditing ? await updateExpense(payload) : await addExpense(payload); setExpenses(current => wasEditing ? current.map(e => e.id === saved.id ? saved : e) : current.map(e => e.id === payload.id ? saved : e)); setApiStatus('connected'); notify(wasEditing ? 'Expense updated' : 'Expense added') }
    catch { setApiStatus('offline'); notify('Saved locally. It will sync when you reconnect.') }
  }
  const moveToTrash = async (items) => {
    let serverError = ''
    let offline = false
    if (isApiConfigured) {
      for (const item of items) {
        try { await deleteRemoteExpense(item.id) }
        catch (error) {
          if (/not found|unsupported|invalid/i.test(error.message)) serverError = error.message
          else offline = true
        }
      }
    }
    if (serverError) { notify(`Delete failed: ${serverError}`); return }
    setDeleted(d => [...items, ...d]); setExpenses(e => e.filter(x => !items.some(i => i.id === x.id))); setSelected([]); setDeleteTarget(null)
    if (offline) { setApiStatus('offline'); notify('Deleted locally; MongoDB will sync when available.') }
    else notify(`${items.length} expense${items.length > 1 ? 's' : ''} moved to trash`)
  }
  const emptyTrash = async (items) => { let failed = false; for (const item of items) { try { await purgeExpense(item.id) } catch { failed = true; setApiStatus('offline') } } if (!failed) setDeleted([]); notify(failed ? 'Some trash items could not be deleted from MongoDB.' : 'Trash emptied permanently') }
  const deleteExpense = (expense) => expense.status === 'Due Today' ? setDeleteTarget({ type: 'single', items: [expense] }) : moveToTrash([expense])
  const handleBulkDelete = () => { const items = expenses.filter(e => selected.includes(e.id)); if (items.some(e => e.status === 'Due Today')) setDeleteTarget({ type: 'bulk', items }); else moveToTrash(items) }
  const markPaid = async (items) => { setExpenses(current => current.map(x => items.some(item => item.id === x.id) ? { ...x, status: 'Paid' } : x)); for (const item of items) { try { await updateExpense({ ...item, status: 'Paid' }) } catch { setApiStatus('offline') } } setDeleteTarget(null); notify('Marked as paid') }
  const exportCsv = () => { const rows = [['Title', 'Amount', 'Category', 'Payment', 'Date', 'Due date', 'Status'], ...expenses.map(e => [e.title, e.amount, e.category, e.payment, e.date, e.dueDate, e.status])]; const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'penny-expenses.csv'; a.click(); notify('CSV exported') }
  const common = { onAdd: openAdd, onEdit: openEdit, onDelete: deleteExpense }
  if (authUser === undefined) return <AuthScreen loading />
  if (!authUser) return <AuthScreen />
  const profileName = authUser.name || authUser.email.split('@')[0]
  const profileInitials = [authUser.firstName, authUser.lastName]
    .map(name => name?.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase() || profileName.slice(0, 2).toUpperCase()
  const greetingName = authUser.firstName || profileName.split(/\s+/)[0]
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); setProfileOpen(false); setAuthUser(null) }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/logo.jpg" alt="" />
        <div><strong>PaisaWise</strong><span>Track every paisa wisely.</span></div>
      </div>
      <nav>{nav.map(([id, label, icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><span className="nav-icon">{id === 'calendar' ? <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" /> : icon}</span>{label}{id === 'due' && dueToday.length > 0 && <b className="nav-count">{dueToday.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom">
        <button onClick={() => setPage('settings')}><span className="nav-icon">⚙</span>Settings</button>
        <div className="upgrade"><span className="spark">✦</span><div><strong>Make every rupee count</strong><small>You're doing great this month.</small></div></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><img className="brand-mark" src="/logo.jpg" alt="" /><strong>PaisaWise</strong></div>
        <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{page === 'dashboard' ? 'Overview' : nav.find(n => n[0] === page)?.[1] || 'Settings'}</strong></div>
        <div className="top-actions">
          <span className={`connection-status ${apiStatus}`}><i></i>{DATA_MODE === 'local' ? 'Local file' : apiStatus === 'connected' ? 'Synced' : apiStatus === 'connecting' ? 'Connecting' : 'Offline cache'}</span>
          <button className="icon-btn" aria-label="Notifications" onClick={() => notify(dueToday.length ? `${dueToday.length} expense(s) due today` : 'You are all caught up')}>♧<i></i></button>
          <div className="profile-menu">
            <button className="avatar avatar-top" aria-label={`Account: ${profileName}`} aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(open => !open)}>{profileInitials}</button>
            {profileOpen && <div className="profile-dropdown" role="menu"><strong>{profileName}</strong><span>{authUser.email}</span><button className="profile-logout" role="menuitem" onClick={logout}>Log out</button></div>}
          </div>
        </div>
      </header>
      <div className="content">
        {page === 'dashboard' && <Dashboard firstName={greetingName} dueToday={dueToday} overdue={overdue} upcoming={upcoming} todaySpend={todaySpend} monthSpend={monthSpend} monthExpenses={monthExpenses} budgets={budgets} money={money} onPage={setPage} {...common} />}
        {page === 'expenses' && <ExpensesPage expenses={filtered} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sort={sort} setSort={setSort} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} exportCsv={exportCsv} {...common} />}
        {page === 'due' && <DuePage expenses={dueToday} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} {...common} />}
        {page === 'calendar' && <CalendarPage month={month} setMonth={setMonth} expenses={expenses} onAdd={openAdd} />}
        {page === 'budgets' && <BudgetsPage budgets={budgets} budgetsLoaded={budgetsLoaded} onSaveBudgets={saveBudgets} expenses={expenses} monthSpend={monthSpend} money={money} exportCsv={exportCsv} />}
        {page === 'trash' && <TrashPage deleted={deleted} setDeleted={setDeleted} setExpenses={setExpenses} notify={notify} money={money} onRestore={async (item) => { try { await restoreRemoteExpense(item.id); setApiStatus('connected') } catch { setApiStatus('offline') } }} onPurge={emptyTrash} />}
        {page === 'settings' && <SettingsPage notify={notify} theme={theme} setTheme={setTheme} />}
      </div>
    </main>
    {formOpen && <ExpenseModal expense={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSave={saveExpense} />}
    {deleteTarget && <DeleteModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onPaid={() => markPaid(deleteTarget.items)} onDelete={() => moveToTrash(deleteTarget.items)} onPostpone={() => { setExpenses(e => e.map(x => deleteTarget.items.some(i => i.id === x.id) ? { ...x, status: 'Upcoming', dueDate: dateOffset(1) } : x)); setDeleteTarget(null); notify('Expense postponed until tomorrow') }} />}
    {toast && <div className="toast">✓ &nbsp;{toast}</div>}
  </div>
}
function AuthScreen({ loading = false }) {
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

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setPassword('')
    setCurrentPassword('')
    setVerifyPassword('')
    setShowPassword(false)
    setError('')
  }

  const submit = async (event) => {
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

function PageTitle({ eyebrow, title, subtitle, action }) { return <><div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div><MobileBottomNav /></> }
function Status({ value }) { return <span className={`status status-${value.toLowerCase().replace(' ', '-')}`}><i></i>{value}</span> }
function Category({ value }) { return <span className="category"><i style={{ background: categoryMeta[value]?.[0] }}></i>{value}</span> }
function Metric({ label, value, note, tone, icon }) { return <div className={`metric metric-${tone}`}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }
function MobileBottomNav() {
  const [activePage, setActivePage] = useState('dashboard')
  const [moreOpen, setMoreOpen] = useState(false)
  const navRef = useRef(null)
  const moreButtonRef = useRef(null)
  const moreActive = mobileMorePages.some(item => item.id === activePage)

  useEffect(() => {
    const syncActivePage = (event) => setActivePage(event.detail)
    window.addEventListener('penny:pagechange', syncActivePage)
    return () => window.removeEventListener('penny:pagechange', syncActivePage)
  }, [])

  useEffect(() => {
    if (!moreOpen) return undefined

    const closeOnOutsidePointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) setMoreOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false)
        moreButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [moreOpen])

  const navigate = (nextPage) => {
    setActivePage(nextPage)
    setMoreOpen(false)
    window.dispatchEvent(new CustomEvent('penny:navigate', { detail: nextPage }))
  }

  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation" ref={navRef}>
    {moreOpen && <div className="mobile-more-menu" role="menu">{mobileMorePages.map(({ id, label, Icon }) => <button key={id} type="button" role="menuitem" onClick={() => navigate(id)}><Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span>{id === 'due' && activePage === 'due' && <b>•</b>}</button>)}</div>}
    <button type="button" className={activePage === 'dashboard' ? 'active' : ''} aria-current={activePage === 'dashboard' ? 'page' : undefined} onClick={() => navigate('dashboard')}><Home size={22} strokeWidth={1.9} aria-hidden="true" /><span>Home</span></button>
    <button type="button" className={activePage === 'expenses' ? 'active' : ''} aria-current={activePage === 'expenses' ? 'page' : undefined} onClick={() => navigate('expenses')}><ReceiptText size={22} strokeWidth={1.9} aria-hidden="true" /><span>Expenses</span></button>
    <button ref={moreButtonRef} type="button" className={moreActive || moreOpen ? 'active' : ''} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}><MoreHorizontal size={22} strokeWidth={1.9} aria-hidden="true" /><span>More</span></button>
  </nav>
}
function ExpenseRow({ expense, compact, onEdit, onDelete }) { return <div className={`expense-row ${compact ? 'compact' : ''}`}><div className="expense-main"><div className="expense-icon" style={{ background: `${categoryMeta[expense.category]?.[0]}1c`, color: categoryMeta[expense.category]?.[0] }}>{categoryMeta[expense.category]?.[1]}</div><div><strong>{expense.title}</strong><span><Category value={expense.category} /> <b>·</b> {formatDate(expense.dueDate)}</span></div></div><div className="expense-side"><strong>{money(expense.amount)}</strong>{!compact && <Status value={expense.status} />}<button className="row-more" onClick={() => onEdit(expense)}>•••</button></div></div> }
function Empty({ text }) { return <div className="empty"><span>✦</span><p>{text}</p></div> }
function DashboardEmpty({ Icon, title, detail, action, onClick }) {
  return <div className="dashboard-empty">
    <span className="dashboard-empty-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
    <strong>{title}</strong>
    <p>{detail}</p>
    {action && <button className="text-btn" onClick={onClick}>{action} <span aria-hidden="true">→</span></button>}
  </div>
}
function MoreMenu({ label, items }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const closeOnOutsidePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="dots-menu" ref={menuRef}>
    <button ref={buttonRef} type="button" className="dots" aria-label={`${label} actions`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>•••</button>
    {open && <div className="dots-menu-popover" role="menu">{items.map(item => <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); item.onSelect() }}>{item.label}</button>)}</div>}
  </div>
}

function Dashboard({ firstName, dueToday, overdue, upcoming, todaySpend, monthSpend, monthExpenses, budgets, money, onPage, onAdd, onEdit, onDelete }) {
  const budgetMenu = [
    { label: 'Manage budgets', onSelect: () => onPage('budgets') },
    { label: 'View expenses', onSelect: () => onPage('expenses') },
  ]
  const categoryMenu = [
    { label: 'View full report', onSelect: () => onPage('budgets') },
    { label: 'Browse expenses', onSelect: () => onPage('expenses') },
  ]

  return <>
    <PageTitle eyebrow={todayDateLabel} title={`${indiaGreeting()}, ${firstName}`} subtitle="Here’s your money at a glance." action={<button className="primary-btn" onClick={onAdd}>＋ Add expense</button>} />
    <div className="metric-grid">
      <Metric label="Today's spending" value={money(todaySpend)} note={`${todaySpend ? 'On track' : 'No spending yet'} · ${money(budgets.daily - todaySpend)} left`} tone="blue" icon="◷" />
      <Metric label="This month's spending" value={money(monthSpend)} note={`${Math.round(monthSpend / budgets.monthly * 100)}% of monthly budget`} tone="violet" icon="▣" />
      <Metric label="Upcoming expenses" value={upcoming.length} note={`${money(upcoming.reduce((a, e) => a + e.amount, 0))} in the next 7 days`} tone="mint" icon="↗" />
      <Metric label="Overdue" value={overdue.length} note={overdue.length ? `${money(overdue.reduce((a, e) => a + e.amount, 0))} needs attention` : 'You’re all caught up'} tone="orange" icon="!" />
    </div>
    <div className="dashboard-grid">
      <section className="card due-card">
        <div className="section-head"><div><h2>Due today <span className="pill-yellow">{dueToday.length}</span></h2><p>Expenses that need your attention</p></div><button className="text-btn" onClick={() => onPage('due')}>View all <span>→</span></button></div>
        {dueToday.length ? dueToday.map(e => <ExpenseRow key={e.id} expense={e} onEdit={onEdit} onDelete={onDelete} />) : <DashboardEmpty Icon={CircleCheck} title="All clear for today" detail={upcoming.length ? `${upcoming.length} payment${upcoming.length === 1 ? '' : 's'} coming up this week.` : 'You have no payments that need attention today.'} action="Browse expenses" onClick={() => onPage('expenses')} />}
      </section>
      <section className="card budget-card">
        <div className="section-head"><div><h2>Budget overview</h2><p>{currentMonthLabel}</p></div><MoreMenu label="Budget overview" items={budgetMenu} /></div>
        <div className="budget-figure"><div className={`ring ${monthSpend > budgets.monthly ? 'over-budget' : ''}`} style={{ '--progress': `${budgets.monthly > 0 ? Math.min(monthSpend / budgets.monthly * 100, 100) : 0}%` }}><div><strong>{budgets.monthly > 0 ? Math.round(monthSpend / budgets.monthly * 100) : 0}%</strong><small>used</small></div></div><div><strong className={`big-number ${monthSpend > budgets.monthly ? 'is-over-budget' : ''}`}>{money(Math.abs(budgets.monthly - monthSpend))}</strong><span>{monthSpend > budgets.monthly ? 'over budget this month' : 'remaining this month'}</span></div></div>
        <div className="budget-line"><span>Monthly budget</span><strong>{money(budgets.monthly)}</strong></div>
        <div className={`progress ${monthSpend > budgets.monthly ? 'over-budget' : ''}`}><i style={{ width: `${budgets.monthly > 0 ? Math.min(monthSpend / budgets.monthly * 100, 100) : 0}%` }}></i></div>
        <button className="outline-btn full" onClick={() => onPage('budgets')}>Manage budgets</button>
      </section>
      <section className="card upcoming-card">
        <div className="section-head"><div><h2>Coming up</h2><p>Next 7 days</p></div><button className="text-btn" onClick={() => onPage('calendar')}>Calendar <span>→</span></button></div>
        {upcoming.length ? upcoming.map(e => <ExpenseRow key={e.id} expense={e} compact onEdit={onEdit} onDelete={onDelete} />) : <DashboardEmpty Icon={CalendarPlus} title="Nothing scheduled this week" detail="Add a due date to an expense and it will appear here." action="Add an expense" onClick={onAdd} />}
      </section>
      <section className="card chart-card">
        <div className="section-head"><div><h2>Spending by category</h2><p>{monthExpenses.length} expense{monthExpenses.length === 1 ? '' : 's'} this month</p></div><MoreMenu label="Spending by category" items={categoryMenu} /></div>
        {monthExpenses.length ? <CategoryChart expenses={monthExpenses} money={money} /> : <DashboardEmpty Icon={ChartNoAxesCombined} title="Your monthly report starts here" detail="Add an expense to see where your money goes." action="Browse expenses" onClick={() => onPage('expenses')} />}
        <button className="outline-btn full" onClick={() => onPage('budgets')}>View full report</button>
      </section>
    </div>
  </>
}
function ExpensesPage({ expenses, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, sort, setSort, selected, setSelected, onBulkDelete, onAdd, onEdit, onDelete, exportCsv }) { const allSelected = expenses.length > 0 && expenses.every(e => selected.includes(e.id)); return <><PageTitle eyebrow="Workspace / Expenses" title="All expenses" subtitle="Every transaction, all in one place." action={<button className="primary-btn" onClick={onAdd}>＋ Add expense</button>} /><section className="card table-card"><div className="toolbar"><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search expenses..." /></div><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All statuses</option>{['Paid', 'Due Today', 'Upcoming', 'Overdue', 'Pending'].map(s => <option key={s}>{s}</option>)}</select><select value={sort} onChange={e => setSort(e.target.value)}><option value="date">Newest first</option><option value="amount">Highest amount</option><option value="category">Category</option></select><button className="outline-btn export" onClick={exportCsv}>↥ Export</button></div>{selected.length > 0 && <div className="bulk-bar"><span>{selected.length} selected</span><button onClick={onBulkDelete}>Delete selected</button></div>}<div className="table-wrap"><table><thead><tr><th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : expenses.map(e => e.id))} /></th><th>Expense</th><th>Category</th><th>Date</th><th>Payment</th><th>Status</th><th className="align-right">Amount</th><th></th></tr></thead><tbody>{expenses.map(e => <tr key={e.id}><td><input type="checkbox" checked={selected.includes(e.id)} onChange={() => setSelected(s => s.includes(e.id) ? s.filter(id => id !== e.id) : [...s, e.id])} /></td><td><div className="table-expense"><span className="expense-icon" style={{ background: `${categoryMeta[e.category]?.[0]}1c` }}>{categoryMeta[e.category]?.[1]}</span><strong>{e.title}</strong></div></td><td><Category value={e.category} /></td><td>{formatDate(e.date)}</td><td>{e.payment}</td><td><Status value={e.status} /></td><td className="align-right amount-cell">{money(e.amount)}</td><td><button className="table-action" onClick={() => onEdit(e)}>Edit</button><button className="table-delete" onClick={() => onDelete(e)}>×</button></td></tr>)}</tbody></table>{!expenses.length && <Empty text="No expenses match your filters." />}</div></section></> }
function DuePage({ expenses, selected, setSelected, onBulkDelete, onEdit, onDelete }) { return <><PageTitle eyebrow="Workspace / Due today" title="Due today" subtitle="Stay ahead of every payment." action={expenses.length > 0 && <button className="danger-btn" onClick={onBulkDelete}>Delete selected</button>} /><div className="due-banner"><div className="calendar-small">{todayDay}<span>{todayMonth}</span></div><div><strong>{expenses.length ? `${expenses.length} expenses need attention` : 'You’re all caught up'}</strong><p>{expenses.length ? 'Review them below and mark as paid when you’re done.' : 'No payments are due today.'}</p></div><strong className="due-total">{money(expenses.reduce((a, e) => a + e.amount, 0))}</strong></div><section className="card due-list"><div className="list-head"><label><input type="checkbox" checked={expenses.length > 0 && expenses.every(e => selected.includes(e.id))} onChange={() => setSelected(expenses.every(e => selected.includes(e.id)) ? [] : expenses.map(e => e.id))} /> Select all</label><span>{expenses.length} items</span></div>{expenses.map(e => <div className="due-item" key={e.id}><input type="checkbox" checked={selected.includes(e.id)} onChange={() => setSelected(s => s.includes(e.id) ? s.filter(id => id !== e.id) : [...s, e.id])} /><ExpenseRow expense={e} onEdit={onEdit} onDelete={onDelete} /></div>)}{!expenses.length && <Empty text="No expenses due today." />}</section></> }
function CalendarPage({ month, setMonth, expenses, onAdd }) { const year = month.getFullYear(), m = month.getMonth(), first = new Date(year, m, 1).getDay(), days = new Date(year, m + 1, 0).getDate(), cells = Array.from({ length: first + days }, (_, i) => i < first ? null : i - first + 1); const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`; return <><PageTitle eyebrow="Workspace / Calendar" title="Calendar" subtitle="See your spending and due dates at a glance." action={<button className="primary-btn" onClick={onAdd}>＋ Add expense</button>} /><section className="card calendar-card"><div className="calendar-header"><button className="circle-btn" onClick={() => setMonth(new Date(year, m - 1, 1))}>‹</button><h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><button className="circle-btn" onClick={() => setMonth(new Date(year, m + 1, 1))}>›</button><button className="outline-btn today-btn" onClick={() => setMonth(new Date())}>Today</button></div><div className="weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}</div><div className="calendar-grid">{cells.map((day, i) => { const date = day ? `${monthKey}-${String(day).padStart(2, '0')}` : ''; const items = expenses.filter(e => e.dueDate === date); return <div className={`calendar-day ${date === today ? 'is-today' : ''}`} key={i}>{day && <><span className="day-num">{day}</span>{items.slice(0, 2).map(e => <div className="cal-event" style={{ borderLeftColor: categoryMeta[e.category]?.[0] }} key={e.id}>{e.title} <b>{money(e.amount)}</b></div>)}{items.length > 2 && <small>+{items.length - 2} more</small>}</>}</div> })}</div></section></> }
function CategoryChart({ expenses, money }) { const totals = categories.map(c => ({ name: c, value: expenses.filter(e => e.category === c).reduce((a, e) => a + e.amount, 0) })).filter(x => x.value).sort((a, b) => b.value - a.value).slice(0, 4); const max = Math.max(...totals.map(x => x.value), 1); return <div className="chart-list">{totals.length ? totals.map(x => <div className="bar-row" key={x.name}><span><i style={{ background: categoryMeta[x.name][0] }}></i>{x.name}</span><div className="bar"><i style={{ background: categoryMeta[x.name][0], width: `${x.value / max * 100}%` }}></i></div><strong>{money(x.value)}</strong></div>) : <Empty text="Add expenses to see your report." />}</div> }
function BudgetsPage({ budgets, budgetsLoaded, onSaveBudgets, expenses, monthSpend, money, exportCsv }) {
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
        {['daily', 'weekly', 'monthly'].map(k => <label className="budget-input" key={k}><span><strong>{k[0].toUpperCase() + k.slice(1)} budget</strong><small>{k === 'daily' ? 'Resets every day' : k === 'weekly' ? 'Resets every Monday' : 'Resets on the 1st'}</small></span><div><span>₹</span><input type="number" min="0" max="1000000000" step="1" value={currentDraft[k]} disabled={!budgetsLoaded || saving} onChange={e => { setDraft({ ...currentDraft, [k]: Number(e.target.value) }); setDirty(true) }} /></div></label>)}
        <button className="primary-btn" disabled={!budgetsLoaded || saving} onClick={save}>{saving ? 'Saving…' : budgetsLoaded ? 'Save budget limits' : 'Loading budget limits…'}</button>
      </section>
      <section className="card report-card">
        <div className="section-head"><div><h2>Spending by category</h2><p>{currentMonthLabel} · {money(monthSpend)} total</p></div><MoreMenu label="Spending by category" items={reportMenu} /></div>
        <CategoryChart expenses={expenses} money={money} />
        <div className="report-note"><span>✦</span><p>Your biggest category is <strong>{expenses[0]?.category || 'Food'}</strong>. Keep going — small choices add up.</p></div>
      </section>
    </div>
  </>
}
function TrashPage({ deleted, setDeleted, setExpenses, notify, money, onRestore, onPurge }) { const restore = async e => { setExpenses(x => [e, ...x]); setDeleted(x => x.filter(i => i.id !== e.id)); await onRestore(e); notify('Expense restored') }; const clear = () => { if (confirm('Permanently delete all trashed expenses?')) onPurge(deleted) }; return <><PageTitle eyebrow="Workspace / Trash" title="Trash" subtitle="Restore something you deleted by mistake." action={deleted.length > 0 && <button className="outline-btn" onClick={clear}>Empty trash</button>} /><section className="card table-card trash-card">{deleted.length ? deleted.map(e => <div className="trash-row" key={e.id}><div><strong>{e.title}</strong><span>{formatDate(e.date)} · {money(e.amount)}</span></div><button className="outline-btn" onClick={() => restore(e)}>Restore</button></div>) : <Empty text="Trash is empty." />}</section></> }
function SettingsPage({ notify, theme, setTheme }) {
  const [notifications, setNotifications] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const updatePassword = async (event) => {
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
      <div className="section-head">
        <div><h2>Update password</h2><p>Confirm your current password before choosing a new one.</p></div>
      </div>
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
function ExpenseModal({ expense, onClose, onSave }) { const [data, setData] = useState(expense || { title: '', amount: '', category: 'Food', payment: 'Card', date: today, dueDate: today, notes: '', recurring: false, status: 'Paid' }); const [errors, setErrors] = useState({}); const update = (k, v) => setData({ ...data, [k]: v }); const submit = e => { e.preventDefault(); const next = {}; if (!data.title.trim()) next.title = 'Enter a title'; if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero'; if (!data.dueDate) next.dueDate = 'Choose a due date'; if (Object.keys(next).length) return setErrors(next); onSave({ ...data, amount: Number(data.amount), status: data.status || 'Paid' }) }; return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><div><div className="eyebrow">{expense ? 'Update transaction' : 'New transaction'}</div><h2>{expense ? 'Edit expense' : 'Add expense'}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div><div className="form-grid"><label className="full-field">Title<input autoFocus value={data.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Weekly groceries" />{errors.title && <em>{errors.title}</em>}</label><label>Amount<div className="input-prefix"><span>₹</span><input type="number" step="0.01" value={data.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00" /></div>{errors.amount && <em>{errors.amount}</em>}</label><label>Category<select value={data.category} onChange={e => update('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Payment method<select value={data.payment} onChange={e => update('payment', e.target.value)}><option>Card</option><option>Cash</option><option>Bank transfer</option><option>UPI</option></select></label><label>Status<select value={data.status} onChange={e => update('status', e.target.value)}>{['Pending', 'Paid', 'Due Today', 'Upcoming', 'Overdue'].map(s => <option key={s}>{s}</option>)}</select></label><label>Date<input type="date" value={data.date} onChange={e => update('date', e.target.value)} /></label><label>Due date<input type="date" value={data.dueDate} onChange={e => update('dueDate', e.target.value)} />{errors.dueDate && <em>{errors.dueDate}</em>}</label><label className="full-field">Notes<textarea value={data.notes} onChange={e => update('notes', e.target.value)} placeholder="Add a note (optional)" /></label><label className="check-label full-field"><input type="checkbox" checked={data.recurring} onChange={e => update('recurring', e.target.checked)} /> This is a recurring expense</label></div><div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn">{expense ? 'Save changes' : 'Add expense'}</button></div></form></div> }
function DeleteModal({ target, onClose, onPaid, onDelete, onPostpone }) { return <div className="modal-backdrop"><div className="modal delete-modal"><div className="delete-icon">!</div><h2>{target.type === 'bulk' ? `What should we do with ${target.items.length} expenses?` : 'This expense is due today'}</h2><p>Choose what happens next. You can mark it as paid, remove it, or move it to tomorrow.</p><div className="delete-options"><button className="paid-option" onClick={onPaid}><span>✓</span><div><strong>Mark as Paid</strong><small>Keep it in your expense history</small></div></button><button className="delete-option" onClick={onDelete}><span>⌫</span><div><strong>Delete</strong><small>Move it to trash</small></div></button><button className="postpone-option" onClick={onPostpone}><span>◷</span><div><strong>Postpone</strong><small>Move due date to tomorrow</small></div></button></div><button className="text-btn center-btn" onClick={onClose}>Cancel</button></div></div> }
export default App
