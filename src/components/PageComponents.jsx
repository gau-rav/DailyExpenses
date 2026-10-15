import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MoreHorizontal, Sparkles, Clock3, TrendingUp, Star, CalendarDays, AlertTriangle, Filter } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { categories, categoryMeta, formatDate, money } from '../utils/appData'

// Quick Filter Bar Component
export function QuickFilterBar({ filters, activeFilter, onFilterChange }) {
  return <div className="quick-filter-bar">
    {filters.map(filter => (
      <button
        key={filter.id}
        className={`filter-chip ${activeFilter === filter.id ? 'active' : ''}`}
        onClick={() => onFilterChange(filter.id)}
      >
        {filter.icon} {filter.label}
      </button>
    ))}
  </div>
}

// PageTitle - Simple header component
export function PageTitle({ eyebrow, cycleLabel, title, subtitle, action }) {
  return <div className="page-title">
    <div>
      <div className="eyebrow">{eyebrow}{cycleLabel && <span className="current-cycle-label">Current cycle: {cycleLabel}</span>}</div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {action}
  </div>
}

// FinHealth Check - New component for alert + insights panel
export function FinHealthCheck({ monthlyBudget, monthSpend, biggestCategory, billsDue48h, expenses }) {
  const overBudget = monthSpend > monthlyBudget
  const percentUsed = monthlyBudget > 0 ? Math.round((monthSpend / monthlyBudget) * 100) : 0

  // Calculate total spend in biggest category
  const biggestCategoryTotal = biggestCategory && expenses?.length
    ? expenses.filter(e => e.category === biggestCategory).reduce((total, e) => total + e.amount, 0)
    : 0

  // Calculate bills due total
  const billsDue48hTotal = expenses?.length
    ? expenses.filter(e => {
        const daysUntilDue = (new Date(e.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
        return daysUntilDue >= 0 && daysUntilDue <= 2
      }).reduce((total, e) => total + e.amount, 0)
    : 0

  return <div className={`fin-health-check ${overBudget ? 'is-over-budget' : ''}`}>
    <div className="fin-health-header">
      <div className={`status-pill ${overBudget ? 'danger' : 'success'}`}>
        {overBudget ? <i></i> : <i></i>}
        <span>{overBudget ? 'Over budget' : 'On track'}</span>
      </div>
      <span className="fin-health-percent">{percentUsed}% used</span>
    </div>
    <div className={`fin-health-figure ${overBudget ? 'over-budget' : ''}`}>
      <strong>{money(Math.abs(monthlyBudget - monthSpend))}</strong>
      <span>{overBudget ? `over budget this month` : `remaining this month`}</span>
    </div>
    <div className="fin-health-insights">
      {biggestCategory && <div className="insight-item">
        <span className="insight-icon">🔥</span>
        <div>
          <strong>Biggest: {biggestCategory}</strong>
          <small>{money(biggestCategoryTotal)} spent</small>
        </div>
      </div>}
      {billsDue48h > 0 && <div className="insight-item">
        <span className="insight-icon">⚠️</span>
        <div>
          <strong>{billsDue48h} bill{'s' + (billsDue48h > 1 ? 's' : '')} due in 2 days</strong>
          <small>{money(billsDue48hTotal)} needs attention</small>
        </div>
      </div>}
    </div>
    <Link to="/budgets" className="fin-health-action">
      Get insight <ArrowRight size={14} aria-hidden="true" />
    </Link>
  </div>
}

// Influence Card - Shows guidance for money-saving decisions
export function InfluenceCard({ type, icon, title, insight, actionText, to }) {
  const navigate = useNavigate()
  const handleClick = () => to ? navigate(to) : undefined

  return <div className={`influence-card influence-${type}`}>
    <div className="influence-icon">{icon}</div>
    <div className="influence-content">
      <h3>{title}</h3>
      <p className="influence-insight">{insight}</p>
      {actionText && <Link to={to} onClick={handleClick} className="influence-action">
        {actionText} <ArrowRight size={14} aria-hidden="true" />
      </Link>}
    </div>
  </div>
}

// Favorites Card - Quick access to common categories
export function FavoritesCard({ myExpenses }) {
  // Calculate favorite categories by frequency
  const categoryCounts = {}
  myExpenses?.forEach(expense => {
    categoryCounts[expense.category] = (categoryCounts[expense.category] || 0) + 1
  })
  const sorted = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (sorted.length === 0) return null

  const getIcon = (category) => categoryMeta[category]?.[1] || '✦'

  return <div className="favorites-card">
    <div className="section-head">
      <div>
        <h2>Favorites</h2>
        <p>Quick access to your most used categories</p>
      </div>
    </div>
    <div className="favorites-list">
      {sorted.map(({ category, count }) => (
        <Link key={category} to="/expenses" className={`favorite-item ${category}`}>
          <div className="favorite-icon" style={{ background: `${categoryMeta[category]?.[0]}20` }}>
            {getIcon(category)}
          </div>
          <div className="favorite-content">
            <strong>{category}</strong>
            <small>{count} expense{count > 1 ? 's' : ''}</small>
          </div>
        </Link>
      ))}
    </div>
  </div>
}

// Status - Badge for expense status
export function Status({ value }) {
  return <span className={`status status-${value.toLowerCase().replace(' ', '-')}`}><i></i>{value}</span>
}

// Category - Category badge
export function Category({ value }) {
  return <span className="category"><i style={{ background: categoryMeta[value]?.[0] }}></i>{value}</span>
}

// Metric - KPI card
export function Metric({ label, value, note, tone, icon, to }) {
  return <Link to={to} className={`metric metric-${tone}`}>
    <div className="metric-icon">{icon}</div>
    <div className="metric-content"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </Link>
}

// ExpenseRow - Expense display row
export function ExpenseRow({ expense, compact, onEdit }) {
  return <div className={`expense-row ${compact ? 'compact' : ''}`}>
    <div className="expense-main">
      <div className="expense-icon" style={{ background: `${categoryMeta[expense.category]?.[0]}1c`, color: categoryMeta[expense.category]?.[0] }}>{categoryMeta[expense.category]?.[1]}</div>
      <div><strong>{expense.title}</strong><span><Category value={expense.category} /> <b>·</b> {formatDate(expense.dueDate)}</span></div>
    </div>
    <div className="expense-side"><strong>{money(expense.amount)}</strong>{!compact && <Status value={expense.status} />}<button className="row-more" aria-label={`Edit ${expense.title}`} onClick={() => onEdit(expense)}><MoreHorizontal size={18} aria-hidden="true" /></button></div>
  </div>
}

// Empty - Empty state component
export function Empty({ text }) {
  return <div className="empty"><span><Sparkles size={22} aria-hidden="true" /></span><p>{text}</p></div>
}

// DashboardEmpty - Dashboard-specific empty state
export function DashboardEmpty({ Icon, title, detail, action, onClick }) {
  return <div className="dashboard-empty">
    <span className="dashboard-empty-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
    <strong>{title}</strong>
    <p>{detail}</p>
    {action && <button className="text-btn" onClick={onClick}>{action} <ArrowRight size={14} aria-hidden="true" /></button>}
  </div>
}

// MoreMenu - Dropdown menu component
export function MoreMenu({ label, items }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePointerDown = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = event => {
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
    <button ref={buttonRef} type="button" className="dots" aria-label={`${label} actions`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><MoreHorizontal size={18} aria-hidden="true" /></button>
    {open && <div className="dots-menu-popover" role="menu">{items.map(item => <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); item.onSelect() }}>{item.label}</button>)}</div>}
  </div>
}

// CategoryChart - Category spending chart
export function CategoryChart({ expenses }) {
  const totals = categories.map(category => ({ name: category, value: expenses.filter(expense => expense.category === category).reduce((total, expense) => total + expense.amount, 0) })).filter(item => item.value).sort((a, b) => b.value - a.value).slice(0, 4)
  const max = Math.max(...totals.map(item => item.value), 1)

  return <div className="chart-list">{totals.length ? totals.map(item => <div className="bar-row" key={item.name}><span><i style={{ background: categoryMeta[item.name][0] }}></i>{item.name}</span><div className="bar"><i style={{ background: categoryMeta[item.name][0], width: `${item.value / max * 100}%` }}></i></div><strong>{money(item.value)}</strong></div>) : <Empty text="Add expenses to see your report." />}</div>
}