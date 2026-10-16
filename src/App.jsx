import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, ChartNoAxesCombined, Clock3, House, Plus, ReceiptText, Settings, Sparkles, Trash2 } from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { addExpense, DATA_MODE, deleteExpense as deleteRemoteExpense, fetchDeletedExpenses, fetchExpenses, getLastExpensesSource, isApiConfigured, purgeExpense, readExpenseCache, restoreExpense as restoreRemoteExpense, syncQueuedActions, updateExpense, writeExpenseCache } from './api/expensesApi'
import { categories, seedExpenses, defaultBudgets, today, dateOffset, getMonthlyCycleRange, cycleRangeLabel, money } from './utils/appData'
import PwaInstallButton from './components/PwaInstallButton'
import MobileBottomNav from './components/MobileBottomNav'
import { ExpenseModal, DeleteModal } from './components/Modal'
import { pageByPath, pagePaths, primaryNavigation, routeLabels } from './routes'

const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const DuePage = lazy(() => import('./pages/DuePage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PageLoading = ({ label = 'Loading page…', fullScreen = false }) => (
  <div className={`page-loading${fullScreen ? ' page-loading-screen' : ''}`} role="status" aria-live="polite">
    <span className="page-loading-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
)
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
    const guardKey = '__paisaWiseExitGuard'
    let guardIndex = null
    let exitConfirmed = false
    const ensureExitGuard = () => {
      if (!mobileViewport.matches) return
      const currentState = window.history.state || {}
      if (currentState[guardKey]) {
        guardIndex = currentState.idx
        return
      }
      const currentIndex = Number.isInteger(currentState.idx) ? currentState.idx : 0
      guardIndex = currentIndex + 1
      window.history.pushState(
        { ...currentState, idx: guardIndex, [guardKey]: true },
        '',
        window.location.href,
      )
    }
    const confirmMobileExit = event => {
      if (exitConfirmed || !mobileViewport.matches || guardIndex === null) return
      const targetIndex = event.state?.idx
      if (!Number.isInteger(targetIndex) || targetIndex >= guardIndex) return
      if (window.confirm('Are you sure you want to exit PaisaWise?')) {
        exitConfirmed = true
        window.history.back()
      } else {
        window.history.forward()
      }
    }
    ensureExitGuard()
    window.addEventListener('popstate', confirmMobileExit)
    mobileViewport.addEventListener('change', ensureExitGuard)
    return () => {
      window.removeEventListener('popstate', confirmMobileExit)
      mobileViewport.removeEventListener('change', ensureExitGuard)
    }
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
  if (authUser === undefined) return <Suspense fallback={<PageLoading label="Loading PaisaWise…" fullScreen />}><AuthPage loading /></Suspense>
  if (!authUser) return <Suspense fallback={<PageLoading label="Loading sign in…" fullScreen />}><AuthPage /></Suspense>
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
      <nav>{primaryNavigation.map(({ id, label, path }) => {
        const Icon = { dashboard: House, expenses: ReceiptText, due: Clock3, calendar: CalendarDays, budgets: ChartNoAxesCombined, trash: Trash2 }[id]
        return <NavLink key={id} to={path} end={id === 'dashboard'} className={({ isActive }) => isActive ? 'active' : ''}><span className="nav-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>{label}{id === 'due' && dueToday.length > 0 && <b className="nav-count">{dueToday.length}</b>}</NavLink>
      })}</nav>
      <div className="sidebar-bottom">
        <NavLink to={pagePaths.settings} className={({ isActive }) => isActive ? 'active' : ''}><span className="nav-icon"><Settings size={18} strokeWidth={1.8} aria-hidden="true" /></span>Settings</NavLink>
        <div className="upgrade"><span className="spark"><Sparkles size={20} aria-hidden="true" /></span><div><strong>Make every rupee count</strong><small>You're doing great this month.</small></div></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><img className="brand-mark" src="/logo.jpg" alt="" /><strong>PaisaWise</strong></div>
        <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{routeLabels[page] || 'Overview'}</strong></div>
        <div className="top-actions">
          <button className={`connection-status ${apiStatus} sync-indicator`} title="Sync status" onClick={() => {
            if (apiStatus === 'offline' || apiStatus === 'connecting') {
              syncQueuedActions().then(() => {
                syncExpenses()
                notify('Forced sync completed')
              })
            }
          }}>
            <i></i>
            {DATA_MODE === 'local' ? 'Local file' : apiStatus === 'connected' ? 'Synced' : apiStatus === 'connecting' ? 'Connecting…' : 'Offline'}
            {apiStatus === 'offline' && (
              <span className="sync-retry" aria-label="Try again">⟳</span>
            )}
          </button>
          <button className="icon-btn" aria-label="Notifications" onClick={() => notify(dueToday.length ? `${dueToday.length} expense(s) due today` : 'You are all caught up')}><Bell size={19} aria-hidden="true" /><i></i></button>
          <div className="profile-menu">
            <button className="avatar avatar-top" aria-label={`Account: ${profileName}`} aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(open => !open)}>{profileInitials}</button>
            {profileOpen && <div className="profile-dropdown" role="menu"><strong>{profileName}</strong><span>{authUser.email}</span><button className="profile-logout" role="menuitem" onClick={logout}>Log out</button></div>}
          </div>
        </div>
      </header>
      {page === 'dashboard' && !appInstalled && <section className="card pwa-install-banner">
        <strong>Install PaisaWise</strong>
        <PwaInstallButton installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} installed={appInstalled} setInstalled={setAppInstalled} />
      </section>}
      <div className="content">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<DashboardPage firstName={greetingName} dueToday={dueToday} overdue={overdue} upcoming={upcoming} todaySpend={todaySpend} monthSpend={monthSpend} monthExpenses={monthExpenses} cycleRange={cycleRange} cycleLabel={cycleLabel} budgets={budgets} money={money} onPage={setPage} {...common} />} />
            <Route path="/expenses" element={<ExpensesPage key={`${query}|${categoryFilter}|${statusFilter}|${sort}`} expenses={filtered} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sort={sort} setSort={setSort} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} exportCsv={exportCsv} {...common} />} />
            <Route path="/due" element={<DuePage expenses={dueToday} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} onMarkAsPaid={markPaid} budgets={budgets} monthSpend={monthSpend} {...common} />} />
            <Route path="/calendar" element={<CalendarPage month={month} setMonth={setMonth} expenses={expenses} onAdd={openAdd} budgets={budgets} monthSpend={monthSpend} />} />
            <Route path="/budgets" element={<BudgetsPage budgets={budgets} budgetsLoaded={budgetsLoaded} onSaveBudgets={saveBudgets} expenses={expenses} monthSpend={monthSpend} cycleLabel={cycleLabel} money={money} exportCsv={exportCsv} />} />
            <Route path="/trash" element={<TrashPage deleted={deleted} setDeleted={setDeleted} setExpenses={setExpenses} notify={notify} onRestore={async item => { try { await restoreRemoteExpense(item.id); setApiStatus('connected') } catch { setApiStatus('offline') } }} onPurge={emptyTrash} />} />
            <Route path="/settings" element={monthlyCycleLoaded ? <SettingsPage notify={notify} theme={theme} setTheme={setTheme} monthlyCycleStartDate={monthlyCycleStartDate} onSaveMonthlyCycle={saveMonthlyCycle} installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} appInstalled={appInstalled} setAppInstalled={setAppInstalled} /> : <PageLoading label="Loading your settings…" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </main>
    <MobileBottomNav activePage={page} />
    <button className="mobile-add-button" type="button" aria-label="Add expense" onClick={openAdd}>
      <span className="fab-label">Add expense</span>
      <Plus size={24} strokeWidth={2} aria-hidden="true" />
    </button>
    {formOpen && <ExpenseModal expense={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSave={saveExpense} />}
    {deleteTarget && <DeleteModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onPaid={() => markPaid(deleteTarget.items)} onDelete={() => moveToTrash(deleteTarget.items)} onPostpone={() => { setExpenses(e => e.map(x => deleteTarget.items.some(i => i.id === x.id) ? { ...x, status: 'Upcoming', dueDate: dateOffset(1) } : x)); setDeleteTarget(null); notify('Expense postponed until tomorrow') }} />}
    {toast && <div className="toast">✓ &nbsp;{toast}</div>}
  </div>
}
export default App
