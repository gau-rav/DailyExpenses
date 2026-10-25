import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BillsPage from './BillsPage.jsx'

vi.mock('../../utils/appData', () => ({
  money: vi.fn(amount => `₹${Number(amount).toLocaleString('en-IN')}`),
  getTodayDay: vi.fn(() => '25'),
  getTodayMonth: vi.fn(() => 'OCT'),
  formatDate: vi.fn(() => '24 Oct')
}))

vi.mock('../../utils/currency', () => ({
  toINR: vi.fn(value => value.toString()),
  fromINRInput: vi.fn(input => input)
}))

describe('BillsPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('displays bills list with all expected columns', () => {
    const expenses = [
      { id: '1', title: 'Electricity bill', amount: 1800, category: 'Bills', dueDate: '2026-10-29', status: 'Upcoming', recurring: true },
      { id: '2', title: 'Rent', amount: 12000, category: 'Rent', dueDate: '2026-10-25', status: 'Upcoming', recurring: true }
    ]

    render(<MemoryRouter><BillsPage expenses={expenses} today="2026-10-25" selected={[]} setSelected={vi.fn()} onBulkDelete={vi.fn()} onEdit={vi.fn()} onMarkAsPaid={vi.fn()} budgets={{ monthly: 24000 }} monthSpend={0} onQuickAdd={vi.fn()} /></MemoryRouter>)

    expect(screen.getByText(/Electricity bill/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Rent/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/₹1,800/i)).toBeInTheDocument()
    expect(screen.getByText(/₹12,000/i)).toBeInTheDocument()
  })

  it('shows empty state when no bills match', () => {
    render(<MemoryRouter><BillsPage expenses={[]} today="2026-10-25" selected={[]} setSelected={vi.fn()} onBulkDelete={vi.fn()} onEdit={vi.fn()} onMarkAsPaid={vi.fn()} budgets={{ monthly: 24000 }} monthSpend={0} onQuickAdd={vi.fn()} /></MemoryRouter>)

    expect(screen.getByText(/No bills due in the next week/i)).toBeInTheDocument()
  })

  it('displays total due amount', async () => {
    const expenses = [
      { id: '1', title: 'Electricity bill', amount: 1800, category: 'Bills', dueDate: '2026-10-29', status: 'Due Today' },
      { id: '2', title: 'Rent', amount: 12000, category: 'Rent', dueDate: '2026-10-25', status: 'Upcoming' }
    ]

    render(<MemoryRouter><BillsPage expenses={expenses} today="2026-10-25" selected={[]} setSelected={vi.fn()} onBulkDelete={vi.fn()} onEdit={vi.fn()} onMarkAsPaid={vi.fn()} budgets={{ monthly: 24000 }} monthSpend={0} onQuickAdd={vi.fn()} /></MemoryRouter>)

    expect(screen.getAllByText(/₹13,800/i)[0]).toBeInTheDocument()
  })
})
