import { Router } from 'express'
import { createExpensesController } from '../controllers/expensesController.js'

export function createExpensesRouter(dependencies) {
  const router = Router()
  const controller = createExpensesController(dependencies)
  router.get('/api/expenses', controller.getExpenses)
  router.post('/api/expenses', controller.saveExpense)
  return router
}
