import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import DashboardPage from './DashboardPage.jsx'

afterEach(cleanup)

const props = {
  firstName: 'Ava',
  today: '2026-10-24',
  todaySpend: 380,
  monthSpend: 9800,
  monthCommitted: 5600,
  monthExpenses: [{ id: '1', title: 'Groceries', amount: 500, category: 'Food', date: '2026-10-01', status: 'Paid' }],
  cycleRange: { start: '2026-10-01', end: '2026-10-31' },
  cycleLabel: '1 Oct – 31 Oct',
  budgets: { daily: 1500, weekly: 6500, monthly: 24000 },
  dueToday: [],
  overdue: [],
  upcoming: [],
  onPage: vi.fn(),
  onQuickAdd: vi.fn(),
}

describe('DashboardPage', () => {
  it('renders the new greeting, pace card, and quick add action', () => {
    render(<DashboardPage {...props} />)
    expect(screen.getByRole('heading', { name: /Good morning|Good afternoon|Good evening|Good night, Ava/i })).toBeInTheDocument()
    expect(screen.getByText('Your daily pace')).toBeInTheDocument()
    expect(screen.getByText(/of budget used/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument()
  })

  it('shows today and cycle spending summaries', () => {
    render(<DashboardPage {...props} />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Bills due today')).toBeInTheDocument()
    expect(screen.getByText('Committed this cycle')).toBeInTheDocument()
  })

  it('shows the bills radar empty state when no bills are due', () => {
    render(<DashboardPage {...props} />)
    expect(screen.getByText('Bills radar')).toBeInTheDocument()
    expect(screen.getByText(/No bills in the next 7 days/i)).toBeInTheDocument()
  })

  it('shows upcoming bills in the radar', () => {
    render(<DashboardPage {...props} upcoming={[{ id: 'bill', title: 'Rent', amount: 12000, category: 'Rent', dueDate: '2026-10-25', status: 'Upcoming' }]} />)
    expect(screen.getByText('Bills radar')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
  })
})
