import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import './navigation.css'
import { addExpense, DATA_MODE, deleteExpense as deleteRemoteExpense, fetchDeletedExpenses, fetchExpenses, getLastExpensesSource, isApiConfigured, purgeExpense, readExpenseCache, restoreExpense as restoreRemoteExpense, syncQueuedActions, updateExpense, writeExpenseCache } from './api/expensesApi'
import { categories, seedExpenses, defaultBudgets, today, dateOffset, getMonthlyCycleRange, cycleRangeLabel, money } from './utils/appData'
import AuthPage from './pages/AuthPage'
import MobileBottomNav from './components/MobileBottomNav'
import { pageByPath, pagePaths, primaryNavigation, routeLabels } from './routes'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const DuePage = lazy(() => import('./pages/DuePage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
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
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageByPath[location.pathname] || 'dashboard'
  const setPage = nextPage => navigate(pagePaths[nextPage] || '/')
  const [authUser, setAuthUser] = useState(undefined)
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('penny-theme') === 'dark' ? 'dark' : 'light')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [appInstalled, setAppInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
  useEffect(() => {
    const captureInstallPrompt = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const markInstalled = () => {
      setAppInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Unable to register the PaisaWise service worker:', error)
    })
  }, [])
  useEffect(() => {
    if (!authUser) return undefined
    const mobileViewport = window.matchMedia('(max-width: 720px)')
    const confirmMobileExit = event => {
      if (!mobileViewport.matches) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', confirmMobileExit)
    return () => window.removeEventListener('beforeunload', confirmMobileExit)
  }, [authUser])
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
  const [monthlyCycleStartDate, setMonthlyCycleStartDate] = useState(null)
  const [monthlyCycleOwnerId, setMonthlyCycleOwnerId] = useState('')
  const monthlyCycleLoaded = Boolean(authUser && monthlyCycleOwnerId === authUser.id)
  const [formOpen, setFormOpen] = useState(false), [editing, setEditing] = useState(null), [deleteTarget, setDeleteTarget] = useState(null), [toast, setToast] = useState(''), [apiStatus, setApiStatus] = useState(isApiConfigured ? 'connecting' : 'offline')
  const [query, setQuery] = useState(''), [categoryFilter, setCategoryFilter] = useState('All categories'), [statusFilter, setStatusFilter] = useState('All statuses'), [sort, setSort] = useState('date'), [selected, setSelected] = useState([]), [month, setMonth] = useState(new Date())
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
    if (!authUser) return undefined
    let active = true
    fetch('/api/current-monthly-cycle', { credentials: 'include', cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load monthly cycle settings')
        if (active) setMonthlyCycleStartDate(data.monthlyCycle?.startDate || null)
      })
      .catch(error => {
        if (!active) return
        setApiStatus('offline')
        setToast(error.message || 'Unable to load monthly cycle settings')
      })
      .finally(() => {
        if (active) setMonthlyCycleOwnerId(authUser.id)
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
  const cycleRange = getMonthlyCycleRange(monthlyCycleStartDate)
  const dueToday = expenses.filter(e => e.dueDate === today && e.status !== 'Paid'), overdue = expenses.filter(e => e.status === 'Overdue'), upcoming = expenses.filter(e => e.dueDate > today && e.dueDate <= dateOffset(7) && e.status !== 'Paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4), monthExpenses = expenses.filter(e => e.date >= cycleRange.start && e.date <= cycleRange.end), todaySpend = expenses.filter(e => e.date === today && e.status === 'Paid').reduce((a, e) => a + e.amount, 0), monthSpend = monthExpenses.reduce((a, e) => a + e.amount, 0), cycleLabel = cycleRangeLabel(cycleRange)
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
  const saveMonthlyCycle = async (startDate) => {
    try {
      const response = await fetch('/api/current-monthly-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to save monthly cycle settings')
      setMonthlyCycleStartDate(data.monthlyCycle.startDate)
      setApiStatus('connected')
      notify(startDate ? 'Spending cycle saved' : 'Calendar month cycle restored')
      return true
    } catch (error) {
      setApiStatus('offline')
      notify(error.message || 'Unable to save monthly cycle settings')
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
  if (authUser === undefined) return <AuthPage loading />
  if (!authUser) return <AuthPage />
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
      <nav>{primaryNavigation.map(({ id, label, icon, path }) => <NavLink key={id} to={path} end={id === 'dashboard'} className={({ isActive }) => isActive ? 'active' : ''}><span className="nav-icon">{id === 'calendar' ? <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" /> : icon}</span>{label}{id === 'due' && dueToday.length > 0 && <b className="nav-count">{dueToday.length}</b>}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <NavLink to={pagePaths.settings} className={({ isActive }) => isActive ? 'active' : ''}><span className="nav-icon">⚙</span>Settings</NavLink>
        <div className="upgrade"><span className="spark">✦</span><div><strong>Make every rupee count</strong><small>You're doing great this month.</small></div></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><img className="brand-mark" src="/logo.jpg" alt="" /><strong>PaisaWise</strong></div>
        <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{routeLabels[page] || 'Overview'}</strong></div>
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
        <Suspense fallback={<div className="settings-loading" role="status">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage firstName={greetingName} dueToday={dueToday} overdue={overdue} upcoming={upcoming} todaySpend={todaySpend} monthSpend={monthSpend} monthExpenses={monthExpenses} cycleRange={cycleRange} cycleLabel={cycleLabel} budgets={budgets} money={money} onPage={setPage} {...common} />} />
            <Route path="/expenses" element={<ExpensesPage key={`${query}|${categoryFilter}|${statusFilter}|${sort}`} expenses={filtered} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sort={sort} setSort={setSort} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} exportCsv={exportCsv} {...common} />} />
            <Route path="/due" element={<DuePage expenses={dueToday} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} {...common} />} />
            <Route path="/calendar" element={<CalendarPage month={month} setMonth={setMonth} expenses={expenses} onAdd={openAdd} />} />
            <Route path="/budgets" element={<BudgetsPage budgets={budgets} budgetsLoaded={budgetsLoaded} onSaveBudgets={saveBudgets} expenses={expenses} monthSpend={monthSpend} cycleLabel={cycleLabel} money={money} exportCsv={exportCsv} />} />
            <Route path="/trash" element={<TrashPage deleted={deleted} setDeleted={setDeleted} setExpenses={setExpenses} notify={notify} onRestore={async item => { try { await restoreRemoteExpense(item.id); setApiStatus('connected') } catch { setApiStatus('offline') } }} onPurge={emptyTrash} />} />
            <Route path="/settings" element={monthlyCycleLoaded ? <SettingsPage notify={notify} theme={theme} setTheme={setTheme} monthlyCycleStartDate={monthlyCycleStartDate} onSaveMonthlyCycle={saveMonthlyCycle} installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} appInstalled={appInstalled} setAppInstalled={setAppInstalled} /> : <div className="settings-loading" role="status">Loading your settings…</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </main>
    <MobileBottomNav activePage={page} />
    <button className="mobile-add-button" type="button" aria-label="Add expense" onClick={openAdd}>
      <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
    </button>
    {formOpen && <ExpenseModal expense={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSave={saveExpense} />}
    {deleteTarget && <DeleteModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onPaid={() => markPaid(deleteTarget.items)} onDelete={() => moveToTrash(deleteTarget.items)} onPostpone={() => { setExpenses(e => e.map(x => deleteTarget.items.some(i => i.id === x.id) ? { ...x, status: 'Upcoming', dueDate: dateOffset(1) } : x)); setDeleteTarget(null); notify('Expense postponed until tomorrow') }} />}
    {toast && <div className="toast">✓ &nbsp;{toast}</div>}
  </div>
}
function ExpenseModal({ expense, onClose, onSave }) { const [data, setData] = useState(expense || { title: '', amount: '', category: 'Grocery', payment: 'Card', date: today, dueDate: today, notes: '', recurring: false, status: 'Paid' }); const [errors, setErrors] = useState({}); const update = (k, v) => setData({ ...data, [k]: v }); const submit = e => { e.preventDefault(); const next = {}; if (!data.title.trim()) next.title = 'Enter a title'; if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero'; if (!data.dueDate) next.dueDate = 'Choose a due date'; if (Object.keys(next).length) return setErrors(next); onSave({ ...data, amount: Number(data.amount), status: data.status || 'Paid' }) }; return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><div><div className="eyebrow">{expense ? 'Update transaction' : 'New transaction'}</div><h2>{expense ? 'Edit expense' : 'Add expense'}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div><div className="form-grid"><label className="full-field">Title<input autoFocus value={data.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Weekly groceries" />{errors.title && <em>{errors.title}</em>}</label><label>Amount<div className="input-prefix"><span>₹</span><input type="number" step="0.01" value={data.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00" /></div>{errors.amount && <em>{errors.amount}</em>}</label><label>Category<select value={data.category} onChange={e => update('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Payment method<select value={data.payment} onChange={e => update('payment', e.target.value)}><option>Card</option><option>Cash</option><option>Bank transfer</option><option>UPI</option></select></label><label>Status<select value={data.status} onChange={e => update('status', e.target.value)}>{['Pending', 'Paid', 'Due Today', 'Upcoming', 'Overdue'].map(s => <option key={s}>{s}</option>)}</select></label><label>Date<input type="date" value={data.date} onChange={e => update('date', e.target.value)} /></label><label>Due date<input type="date" value={data.dueDate} onChange={e => update('dueDate', e.target.value)} />{errors.dueDate && <em>{errors.dueDate}</em>}</label><label className="full-field">Notes<textarea value={data.notes} onChange={e => update('notes', e.target.value)} placeholder="Add a note (optional)" /></label><label className="check-label full-field"><input type="checkbox" checked={data.recurring} onChange={e => update('recurring', e.target.checked)} /> This is a recurring expense</label></div><div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn">{expense ? 'Save changes' : 'Add expense'}</button></div></form></div> }
function DeleteModal({ target, onClose, onPaid, onDelete, onPostpone }) { return <div className="modal-backdrop"><div className="modal delete-modal"><div className="delete-icon">!</div><h2>{target.type === 'bulk' ? `What should we do with ${target.items.length} expenses?` : 'This expense is due today'}</h2><p>Choose what happens next. You can mark it as paid, remove it, or move it to tomorrow.</p><div className="delete-options"><button className="paid-option" onClick={onPaid}><span>✓</span><div><strong>Mark as Paid</strong><small>Keep it in your expense history</small></div></button><button className="delete-option" onClick={onDelete}><span>⌫</span><div><strong>Delete</strong><small>Move it to trash</small></div></button><button className="postpone-option" onClick={onPostpone}><span>◷</span><div><strong>Postpone</strong><small>Move due date to tomorrow</small></div></button></div><button className="text-btn center-btn" onClick={onClose}>Cancel</button></div></div> }
export default App
