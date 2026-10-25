import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MoreHorizontal, Sparkles } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Link } from 'react-router-dom'
import { categories, categoryMeta, formatDate, money } from '../utils/appData'

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
        <i></i>
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
  return <div className={`influence-card influence-${type}`}>
    <div className="influence-icon">{icon}</div>
    <div className="influence-content">
      <h3>{title}</h3>
      <p className="influence-insight">{insight}</p>
      {actionText && <Link to={to} className="influence-action">
        {actionText} <ArrowRight size={14} aria-hidden="true" />
      </Link>}
    </div>
  </div>
}

// Status - Enhanced badge with strong visual differentiation
export function Status({ value }) {
  const status = value.toLowerCase().replace(' ', '-')

  return <span className={`status status-${status}`}><i></i>{value}</span>
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

// CategoryDonut - Compact category breakdown for mobile
export function CategoryDonut({ expenses }) {
  const totals = categories.map(category => ({ name: category, value: expenses.filter(expense => expense.category === category).reduce((total, expense) => total + expense.amount, 0) })).filter(item => item.value).sort((a, b) => b.value - a.value).slice(0, 4)
  const total = totals.reduce((sum, item) => sum + item.value, 0)

  if (!totals.length) return <Empty text="Add expenses to see your report." />

  return <div className="category-donut">
    <div className="category-donut-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={totals} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke="none">
            {totals.map(item => <Cell key={item.name} fill={categoryMeta[item.name][0]} />)}
          </Pie>
          <Tooltip formatter={value => money(value)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="category-donut-center"><strong>{money(total)}</strong><span>total</span></div>
    </div>
    <ul className="category-donut-legend">
      {totals.map(item => <li key={item.name}><i style={{ background: categoryMeta[item.name][0] }}></i><span>{item.name}</span><strong>{money(item.value)}</strong></li>)}
    </ul>
  </div>
}
