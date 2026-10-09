import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, categoryMeta, formatDate, money } from '../utils/appData'

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

export function Status({ value }) {
  return <span className={`status status-${value.toLowerCase().replace(' ', '-')}`}><i></i>{value}</span>
}

export function Category({ value }) {
  return <span className="category"><i style={{ background: categoryMeta[value]?.[0] }}></i>{value}</span>
}

export function Metric({ label, value, note, tone, icon, to }) {
  return <Link to={to} className={`metric metric-${tone}`}>
    <div className="metric-icon">{icon}</div>
    <div className="metric-content"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </Link>
}

export function ExpenseRow({ expense, compact, onEdit }) {
  return <div className={`expense-row ${compact ? 'compact' : ''}`}>
    <div className="expense-main">
      <div className="expense-icon" style={{ background: `${categoryMeta[expense.category]?.[0]}1c`, color: categoryMeta[expense.category]?.[0] }}>{categoryMeta[expense.category]?.[1]}</div>
      <div><strong>{expense.title}</strong><span><Category value={expense.category} /> <b>·</b> {formatDate(expense.dueDate)}</span></div>
    </div>
    <div className="expense-side"><strong>{money(expense.amount)}</strong>{!compact && <Status value={expense.status} />}<button className="row-more" onClick={() => onEdit(expense)}>•••</button></div>
  </div>
}

export function Empty({ text }) {
  return <div className="empty"><span>✦</span><p>{text}</p></div>
}

export function DashboardEmpty({ Icon, title, detail, action, onClick }) {
  return <div className="dashboard-empty">
    <span className="dashboard-empty-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
    <strong>{title}</strong>
    <p>{detail}</p>
    {action && <button className="text-btn" onClick={onClick}>{action} <span aria-hidden="true">→</span></button>}
  </div>
}

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
    <button ref={buttonRef} type="button" className="dots" aria-label={`${label} actions`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>•••</button>
    {open && <div className="dots-menu-popover" role="menu">{items.map(item => <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); item.onSelect() }}>{item.label}</button>)}</div>}
  </div>
}

export function CategoryChart({ expenses }) {
  const totals = categories.map(category => ({ name: category, value: expenses.filter(expense => expense.category === category).reduce((total, expense) => total + expense.amount, 0) })).filter(item => item.value).sort((a, b) => b.value - a.value).slice(0, 4)
  const max = Math.max(...totals.map(item => item.value), 1)

  return <div className="chart-list">{totals.length ? totals.map(item => <div className="bar-row" key={item.name}><span><i style={{ background: categoryMeta[item.name][0] }}></i>{item.name}</span><div className="bar"><i style={{ background: categoryMeta[item.name][0], width: `${item.value / max * 100}%` }}></i></div><strong>{money(item.value)}</strong></div>) : <Empty text="Add expenses to see your report." />}</div>
}
