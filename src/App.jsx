import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Bell, CalendarDays, CheckCircle, Clock3, House, Mail, Plus, ReceiptText, Settings, Sparkles, Trash2 } from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useExpenses } from './features/expenses/hooks/useExpenses.js'
import { useBudgets } from './features/budgets/hooks/useBudgets.js'
import { useAuth } from './features/auth/hooks/useAuth.js'
import { useCurrencyPreference } from './features/settings/hooks/useCurrencyPreference.js'
import { useMonthlyCycle } from './features/settings/hooks/useMonthlyCycle.js'
import { useIngestStatus } from './features/inbox/hooks/useIngestStatus.js'
import { today, dateOffset } from './utils/appData'
import { getMonthlyCycleRange, cycleRangeLabel } from './features/settings/domain/monthlyCycleRules.js'
import PwaInstallButton from './components/PwaInstallButton'
import MobileBottomNav from './components/MobileBottomNav'
import { ExpenseModal, DeleteModal } from './components/Modal'
import { pageByPath, pagePaths, primaryNavigation, routeLabels } from './routes'
import Onboarding from './components/Onboarding'
import QuickAddSheet from './components/QuickAddSheet'
import SiteFooter from './components/SiteFooter'

const AuthPage = lazy(() => import('./features/auth/pages/AuthPage.jsx'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage.jsx'))
const ExpensesPage = lazy(() => import('./features/expenses/pages/ExpensesPage.jsx'))
const InboxPage = lazy(() => import('./features/inbox/pages/InboxPage.jsx'))
const DuePage = lazy(() => import('./features/due/pages/DuePage.jsx'))
const CalendarPage = lazy(() => import('./features/calendar/pages/CalendarPage.jsx'))
const BudgetsPage = lazy(() => import('./features/budgets/pages/BudgetsPage.jsx'))
const TrashPage = lazy(() => import('./features/expenses/pages/TrashPage.jsx'))
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage.jsx'))
const BillsPage = lazy(() => import('./features/due/pages/BillsPage.jsx'))
const PageLoading = ({ label = 'Loading pageâ€¦', fullScreen = false }) => (
  <div className={`page-loading${fullScreen ? ' page-loading-screen' : ''}`} role="status" aria-live="polite">
    <span className="page-loading-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
)
function App() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(() => localStorage.getItem('penny-onboarding-complete') !== '1')
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageByPath[location.pathname] || 'dashboard'
  const legalKind = location.pathname === pagePaths.privacy ? 'privacy' : location.pathname === pagePaths.terms ? 'terms' : null
  const setPage = nextPage => navigate(pagePaths[nextPage] || '/')
  const { authUser, logout } = useAuth()
  const { ingestStatus, refreshIngestStatus } = useIngestStatus(Boolean(authUser))
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
    const meta = document.getElementById('theme-color')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#fdf8f0')
    }
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
  const [formOpen, setFormOpen] = useState(false), [editing, setEditing] = useState(null), [addDate, setAddDate] = useState(null), [deleteTarget, setDeleteTarget] = useState(null), [toast, setToast] = useState('')
  const notify = useCallback(message => setToast(message), [])
  const { apiStatus, deleted, emptyTrash, exportCsv, expenses, markPaid: markExpensesPaid, moveToTrash: moveExpensesToTrash, refreshExpenses, restoreFromTrash, saveExpense: persistExpense, selected, setApiStatus, setDeleted, setExpenses, setSelected } = useExpenses({ notify })
  const [month, setMonth] = useState(new Date())
  const { budgets, budgetsLoaded, saveBudgets } = useBudgets(authUser?.id, { setApiStatus, setToast })
  const { monthlyCycleStartDate, monthlyCycleLoaded, saveMonthlyCycle } = useMonthlyCycle(authUser?.id, { setApiStatus, setToast })
  const { currency, changeCurrency } = useCurrencyPreference(authUser?.id, { setToast })
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) } }, [toast])
  const cycleRange = getMonthlyCycleRange(monthlyCycleStartDate)
  const monthExpenses = expenses.filter(e => e.date >= cycleRange.start && e.date <= cycleRange.end)
  const todaySpend = expenses.filter(e => e.date === today && e.status === 'Paid').reduce((a, e) => a + e.amount, 0)
  const monthSpend = monthExpenses.reduce((a, e) => a + e.amount, 0)
  const monthCommitted = monthExpenses.filter(e => e.status !== 'Paid').reduce((a, e) => a + e.amount, 0)
  const dueToday = expenses.filter(e => e.dueDate === today && e.status !== 'Paid')
  const upcoming = expenses.filter(e => e.dueDate > today && e.dueDate <= dateOffset(7) && e.status !== 'Paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4)
  const cycleLabel = cycleRangeLabel(cycleRange)
  const quickAddExpense = async data => {
    setQuickAddOpen(false)
    await persistExpense(data, null)
  }

  const openAdd = (date) => { setEditing(null); setAddDate(typeof date === 'string' ? date : null); setFormOpen(true) }; const openEdit = (e) => { setEditing(e); setAddDate(null); setFormOpen(true) }
  const saveExpense = async data => {
    const currentEditing = editing
    setFormOpen(false)
    setEditing(null)
    setAddDate(null)
    await persistExpense(data, currentEditing)
  }
  const moveToTrash = items => moveExpensesToTrash(items, () => setDeleteTarget(null))
  const deleteExpense = expense => expense.status === 'Due Today'
    ? setDeleteTarget({ type: 'single', items: [expense] })
    : moveToTrash([expense])
  const handleBulkDelete = () => {
    const items = expenses.filter(expense => selected.includes(expense.id))
    if (items.some(expense => expense.status === 'Due Today')) setDeleteTarget({ type: 'bulk', items })
    else moveToTrash(items)
  }
  const markPaid = items => markExpensesPaid(items, () => setDeleteTarget(null))
  const common = { onAdd: openAdd, onEdit: openEdit, onDelete: deleteExpense }
  if (legalKind) return <Suspense fallback={<PageLoading label="Loading legal informationâ€¦" fullScreen />}><LegalPage kind={legalKind} /></Suspense>
  if (authUser === undefined) return <Suspense fallback={<PageLoading label="Loading PaisaWiseâ€¦" fullScreen />}><AuthPage loading /></Suspense>
  if (!authUser) return <Suspense fallback={<PageLoading label="Loading sign inâ€¦" fullScreen />}><AuthPage /></Suspense>
  const profileName = authUser.name || authUser.email.split('@')[0]
  const profileInitials = [authUser.firstName, authUser.lastName]
    .map(name => name?.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase() || profileName.slice(0, 2).toUpperCase()
  const greetingName = authUser.firstName || profileName.split(/\s+/)[0]
  const handleLogout = async () => { await logout(); setProfileOpen(false) }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-mark" src="/logo.jpg" alt="" />
        <div><strong>PaisaWise</strong><span>Track every paisa wisely.</span></div>
      </div>
      <nav>{primaryNavigation.map(({ id, label, path }) => {
        const Icon = { dashboard: House, expenses: ReceiptText, bills: CheckCircle, inbox: Mail, due: Clock3, calendar: CalendarDays, budgets: ReceiptText, trash: Trash2 }[id]
        const badge = id === 'inbox' ? ingestStatus.pendingCount : id === 'due' ? dueToday.length : 0
        return <NavLink key={id} to={path} end={id === 'dashboard'} className={({ isActive }) => isActive ? 'active' : ''}><span className="nav-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>{label}{badge > 0 && <b className="nav-count">{badge}</b>}</NavLink>
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
              refreshExpenses().then(() => notify('Forced sync completed'))
            }
          }}>
            <i></i>
            {apiStatus === 'connected' ? 'Synced' : apiStatus === 'connecting' ? 'Connectingâ€¦' : 'Offline'}
            {apiStatus === 'offline' && (
              <span className="sync-retry" aria-label="Try again">âŸ³</span>
            )}
          </button>
          <button className="icon-btn" aria-label="Notifications" onClick={() => notify(dueToday.length ? `${dueToday.length} expense(s) due today` : 'You are all caught up')}>
            <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
            <i></i>
          </button>
          <div className="profile-menu">
            <button className="avatar avatar-top" aria-label={`Account: ${profileName}`} aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(open => !open)}>{profileInitials}</button>
            {profileOpen && <div className="profile-dropdown" role="menu"><strong>{profileName}</strong><span>{authUser.email}</span><button className="profile-logout" role="menuitem" onClick={handleLogout}>Log out</button></div>}
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
            <Route path="/" element={<DashboardPage firstName={greetingName} today={today} todaySpend={todaySpend} monthSpend={monthSpend} monthCommitted={monthCommitted} monthExpenses={monthExpenses} cycleRange={cycleRange} cycleLabel={cycleLabel} budgets={budgets} dueToday={dueToday} overdue={[]} upcoming={upcoming} onPage={setPage} onQuickAdd={() => setQuickAddOpen(true)} />} />
            <Route path="/expenses" element={<ExpensesPage expenses={expenses} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} exportCsv={exportCsv} onQuickAdd={() => setQuickAddOpen(true)} {...common} />} />
            <Route path="/inbox" element={<InboxPage notify={notify} onChanged={refreshIngestStatus} onExpenseAdded={expense => { if (expense) setExpenses(current => [expense, ...current]) }} />} />
            <Route path="/bills" element={<BillsPage expenses={expenses} today={today} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} onEdit={openEdit} onMarkAsPaid={markPaid} budgets={budgets} monthSpend={monthSpend} onQuickAdd={() => setQuickAddOpen(true)} />} />
            <Route path="/due" element={<DuePage expenses={dueToday} selected={selected} setSelected={setSelected} onBulkDelete={handleBulkDelete} onMarkAsPaid={markPaid} budgets={budgets} monthSpend={monthSpend} {...common} />} />
            <Route path="/calendar" element={<CalendarPage month={month} setMonth={setMonth} expenses={expenses} today={today} budgets={budgets} onAdd={openAdd} onAddForDate={openAdd} />} />
            <Route path="/budgets" element={<BudgetsPage budgets={budgets} budgetsLoaded={budgetsLoaded} onSaveBudgets={saveBudgets} expenses={monthExpenses} monthSpend={monthSpend} cycleStart={cycleRange.start} cycleEnd={cycleRange.end} today={today} cycleLabel={cycleLabel} exportCsv={exportCsv} />} />
            <Route path="/trash" element={<TrashPage deleted={deleted} setDeleted={setDeleted} setExpenses={setExpenses} notify={notify} onRestore={restoreFromTrash} onPurge={emptyTrash} />} />
            <Route path="/settings" element={monthlyCycleLoaded ? <SettingsPage notify={notify} theme={theme} setTheme={setTheme} currency={currency} setCurrency={changeCurrency} monthlyCycleStartDate={monthlyCycleStartDate} onSaveMonthlyCycle={saveMonthlyCycle} installPrompt={installPrompt} setInstallPrompt={setInstallPrompt} appInstalled={appInstalled} setAppInstalled={setAppInstalled} ingestStatus={ingestStatus} refreshIngestStatus={refreshIngestStatus} /> : <PageLoading label="Loading your settingsâ€¦" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <SiteFooter />
    </main>
    <MobileBottomNav activePage={page} pendingCount={ingestStatus.pendingCount} />
    {!['/settings', '/trash', '/inbox'].includes(location.pathname) && <button className="mobile-add-button" type="button" aria-label={location.pathname === '/bills' ? 'Add bill' : 'Add expense'} onClick={location.pathname === '/bills' ? () => setQuickAddOpen(true) : openAdd}>
      <span className="fab-label">{location.pathname === '/bills' ? 'Add bill' : 'Add expense'}</span>
      <Plus size={24} strokeWidth={2} aria-hidden="true" />
    </button>}
    <QuickAddSheet
      open={quickAddOpen}
      onClose={() => setQuickAddOpen(false)}
      onSave={async expense => { await quickAddExpense(expense); setQuickAddOpen(false) }}
    />
    <Onboarding
      open={Boolean(authUser) && onboardingOpen}
      firstName={greetingName}
      onSaveBudgets={saveBudgets}
      onQuickAdd={() => { setOnboardingOpen(false); setQuickAddOpen(true) }}
      onDone={() => { localStorage.setItem('penny-onboarding-complete', '1'); setOnboardingOpen(false) }}
    />
    {formOpen && <ExpenseModal key={editing?.id || 'new'} expense={editing} defaultDate={addDate} onClose={() => { setFormOpen(false); setEditing(null); setAddDate(null) }} onSave={saveExpense} />}
    {deleteTarget && <DeleteModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onPaid={() => markPaid(deleteTarget.items)} onDelete={() => moveToTrash(deleteTarget.items)} onPostpone={() => { setExpenses(e => e.map(x => deleteTarget.items.some(i => i.id === x.id) ? { ...x, status: 'Upcoming', dueDate: dateOffset(1) } : x)); setDeleteTarget(null); notify('Expense postponed until tomorrow') }} />}
    {toast && <div className="toast">âœ“ &nbsp;{toast}</div>}
  </div>
}
export default App
