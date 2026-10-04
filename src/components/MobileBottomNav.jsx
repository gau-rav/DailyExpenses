import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, Clock3, House, MoreHorizontal, ReceiptText, Settings, Trash2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { pagePaths } from '../routes'

const morePages = [
  { id: 'due', label: 'Due today', Icon: Clock3 },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'budgets', label: 'Budgets & reports', Icon: ChartNoAxesCombined },
  { id: 'trash', label: 'Trash', Icon: Trash2 },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export default function MobileBottomNav({ activePage }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const navRef = useRef(null)
  const moreButtonRef = useRef(null)
  const moreActive = morePages.some(item => item.id === activePage)

  useEffect(() => {
    if (!moreOpen) return undefined
    const closeOnOutsidePointerDown = event => {
      if (!navRef.current?.contains(event.target)) setMoreOpen(false)
    }
    const closeOnEscape = event => {
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

  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation" ref={navRef}>
    {moreOpen && <div className="mobile-more-menu" role="menu">{morePages.map(({ id, label, Icon }) => <NavLink key={id} to={pagePaths[id]} role="menuitem" onClick={() => setMoreOpen(false)}><Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span>{id === activePage && <b>•</b>}</NavLink>)}</div>}
    <NavLink to={pagePaths.dashboard} end className={({ isActive }) => isActive ? 'active' : ''}><House size={22} strokeWidth={1.9} aria-hidden="true" /><span>Home</span></NavLink>
    <NavLink to={pagePaths.expenses} className={({ isActive }) => isActive ? 'active' : ''}><ReceiptText size={22} strokeWidth={1.9} aria-hidden="true" /><span>Expenses</span></NavLink>
    <button ref={moreButtonRef} type="button" className={moreActive || moreOpen ? 'active' : ''} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}><MoreHorizontal size={22} strokeWidth={1.9} aria-hidden="true" /><span>More</span></button>
  </nav>
}
