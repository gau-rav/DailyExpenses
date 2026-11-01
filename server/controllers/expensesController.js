import { applyExpenseAction, readExpenses } from '../services/expensesService.js'

export function createExpensesController({ getUserFromRequest }) {
  return {
    getExpenses: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const includeDeleted = req.query.includeDeleted === 'true'
        res.json({ ok: true, ...await readExpenses(user.id, includeDeleted) })
      } catch (error) {
        console.error('Expense read failed', error)
        res.status(500).json({ ok: false, error: 'Unable to read expenses' })
      }
    },
    saveExpense: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const result = await applyExpenseAction(user.id, req.body)
        res.json({ ok: true, result })
      } catch (error) {
        console.error('Expense write failed', error)
        res.status(400).json({ ok: false, error: error.message || 'Unable to save expense' })
      }
    },
  }
}
