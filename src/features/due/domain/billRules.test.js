import { describe, expect, it } from 'vitest'
import { splitBills } from './billRules.js'

describe('splitBills', () => {
  it('groups unpaid bills by due date and sorts date-based groups', () => {
    const laterOverdue = { id: 'late', dueDate: '2026-01-09', status: 'Upcoming' }
    const earlierOverdue = { id: 'early', dueDate: '2026-01-03', status: 'Overdue' }
    const dueToday = { id: 'today', dueDate: '2026-01-10', status: 'Due Today' }
    const soon = { id: 'soon', dueDate: '2026-01-12', status: 'Upcoming' }
    const paid = { id: 'paid', dueDate: '2026-01-10', status: 'Paid' }
    const noDate = { id: 'none', status: 'Upcoming' }

    expect(splitBills([laterOverdue, dueToday, soon, paid, noDate, earlierOverdue], '2026-01-10')).toEqual({
      overdue: [earlierOverdue, laterOverdue],
      today: [dueToday],
      soon: [soon],
    })
  })

  it('honors the upcoming horizon', () => {
    const atLimit = { id: 'at-limit', dueDate: '2026-01-17', status: 'Upcoming' }
    const beyond = { id: 'beyond', dueDate: '2026-01-18', status: 'Upcoming' }
    expect(splitBills([atLimit, beyond], '2026-01-10', 7).soon).toEqual([atLimit])
  })
})
