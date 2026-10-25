import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, House, MoreHorizontal, ReceiptText, Settings, Trash2, WalletCards } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { pagePaths } from '../routes'

const primaryTabs = [
  { id: 'dashboard', label: 'Home', Icon: House },
  { id: 'expenses', label: 'Expenses', Icon: ReceiptText },
  { id: 'bills', label: 'Bills', Icon: WalletCards },
  { id: 'budgets', label: 'Budgets', Icon: ChartNoAxesCombined },
]

const morePages = [
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
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
    {moreOpen && <div className="mobile-more-menu" role="menu">
      {morePages.map(({ id, label, Icon }) => (
        <NavLink key={id} to={pagePaths[id]} role="menuitem" onClick={() => setMoreOpen(false)}>
          <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
          {id === activePage && <b aria-hidden="true">•</b>}
        </NavLink>
      ))}
    </div>}
    {primaryTabs.map(({ id, label, Icon }) => (
      <NavLink
        key={id}
        to={pagePaths[id]}
        end={id === 'dashboard'}
        className={({ isActive }) => isActive ? 'active' : ''}
        aria-current={activePage === id ? 'page' : undefined}
      >
        <span className="tab-icon"><Icon size={22} strokeWidth={1.9} aria-hidden="true" /></span>
        <span>{label}</span>
      </NavLink>
    ))}
    <button
      ref={moreButtonRef}
      type="button"
      className={moreActive || moreOpen ? 'active' : ''}
      aria-haspopup="menu"
      aria-expanded={moreOpen}
      onClick={() => setMoreOpen(open => !open)}
    >
      <span className="tab-icon"><MoreHorizontal size={22} strokeWidth={1.9} aria-hidden="true" /></span>
      <span>More</span>
    </button>
  </nav>
}
