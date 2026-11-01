import { describe, expect, it } from 'vitest'
import { normalizeExpense } from './expenseNormalization.js'

describe('normalizeExpense', () => {
  it('normalizes date-only values, amounts, and recurring flags', () => {
    expect(normalizeExpense({ date: '2026-01-15', dueDate: '2026-01-18', amount: '45.5', recurring: 'TRUE' })).toMatchObject({
      date: '2026-01-15',
      dueDate: '2026-01-18',
      amount: 45.5,
      recurring: true,
      splitExpense: { enabled: false, payments: [] },
    })
  })

  it('converts timestamps in the India timezone and clears invalid dates', () => {
    expect(normalizeExpense({ date: '2026-01-15T20:00:00Z', dueDate: 'not-a-date' })).toMatchObject({
      date: '2026-01-16',
      dueDate: '',
    })
  })

  it('prefers splitPayments and trims, converts, and filters payment rows', () => {
    expect(normalizeExpense({
      splitPayments: [{ name: '  Asha ', amount: '20' }, { name: '', amount: 0 }, { name: '', amount: '5' }],
      splitExpense: { enabled: true, payments: [{ name: 'ignored', amount: 9 }] },
    })).toMatchObject({
      splitExpense: { enabled: true, payments: [{ name: 'Asha', amount: 20 }, { name: '', amount: 5 }] },
      splitPayments: [{ name: 'Asha', amount: 20 }, { name: '', amount: 5 }],
    })
  })

  it('uses the nested payment list and derives enabled when no flag exists', () => {
    expect(normalizeExpense({ splitExpense: { payments: [{ name: 'Ravi', amount: 30 }] } })).toMatchObject({
      splitExpense: { enabled: true, payments: [{ name: 'Ravi', amount: 30 }] },
    })
  })

  it('preserves an explicit disabled split flag', () => {
    expect(normalizeExpense({ splitExpense: { enabled: false, payments: [{ name: 'Ravi', amount: 30 }] } }).splitExpense.enabled).toBe(false)
  })
})
