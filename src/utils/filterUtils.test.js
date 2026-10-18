import { describe, it, expect } from 'vitest'
import {
  getDueTodayFilter,
  getCategoryFilter,
  getTopCategoryFilters,
  generateDuePageFilters,
} from './filterUtils.js'

const localDate = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('getDueTodayFilter', () => {
  it('counts expenses due today that are not paid', () => {
    const filter = getDueTodayFilter([
      { dueDate: new Date(), status: 'Pending' },
      { dueDate: new Date(), status: 'Due Today' },
      { dueDate: new Date(), status: 'Paid' },
      { dueDate: new Date(Date.now() + 3 * 86400000), status: 'Upcoming' },
    ])

    expect(filter).toEqual({
      id: 'due-today',
      label: 'Due today (2)',
      icon: '⚡',
      query: { status: 'Due Today' },
    })
  })

  it('reports zero when nothing is due today', () => {
    const filter = getDueTodayFilter([{ dueDate: new Date(Date.now() + 5 * 86400000), status: 'Upcoming' }])
    expect(filter.label).toBe('Due today (0)')
  })
})

describe('getCategoryFilter', () => {
  it('builds a category filter descriptor', () => {
    expect(getCategoryFilter('Food')).toEqual({
      id: 'category-Food',
      label: 'Food',
      icon: '🏷️',
      query: { category: 'Food' },
    })
  })
})

describe('getTopCategoryFilters', () => {
  const expenses = [
    { date: localDate(-1), category: 'Food' },
    { date: localDate(-2), category: 'Food' },
    { date: localDate(-3), category: 'Food' },
    { date: localDate(-4), category: 'Transport' },
    { date: localDate(-5), category: 'Transport' },
    { date: localDate(-60), category: 'Bills' },
    { date: localDate(-1) },
    { category: 'Shopping' },
  ]

  it('orders categories by frequency within the last month', () => {
    const filters = getTopCategoryFilters(expenses)
    expect(filters.map(f => f.label)).toEqual(['Food', 'Transport'])
  })

  it('respects the limit', () => {
    const filters = getTopCategoryFilters(expenses, 1)
    expect(filters).toHaveLength(1)
    expect(filters[0].id).toBe('category-Food')
  })

  it('ignores expenses without a date or category, and old ones', () => {
    const filters = getTopCategoryFilters(expenses, 5)
    expect(filters.map(f => f.label)).not.toContain('Bills')
    expect(filters).toHaveLength(2)
  })
})

describe('generateDuePageFilters', () => {
  it('returns the due-today filter followed by top categories', () => {
    const filters = generateDuePageFilters([
      { dueDate: new Date(), status: 'Pending', date: localDate(-1), category: 'Food' },
      { dueDate: new Date(), status: 'Pending', date: localDate(-2), category: 'Bills' },
    ])

    expect(filters[0].id).toBe('due-today')
    expect(filters.length).toBeGreaterThan(1)
    expect(filters.every(Boolean)).toBe(true)
  })
})
