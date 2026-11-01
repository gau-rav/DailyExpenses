import { Router } from 'express'
import { createAccountSettingsController } from '../controllers/accountSettingsController.js'

export function createAccountSettingsRouter(dependencies) {
  const router = Router()
  const controller = createAccountSettingsController(dependencies)

  router.get('/api/budgets', controller.getBudgets)
  router.put('/api/budgets', controller.saveBudgets)
  router.get([
    '/api/current-monthly-cycle',
    '/current-monthly-cycle',
    '/api/settings/current-monthly-cycle',
    '/settings/current-monthly-cycle',
    '/api/settings/monthly-cycle',
    '/settings/monthly-cycle',
  ], controller.getMonthlyCycle)
  router.post([
    '/api/current-monthly-cycle',
    '/current-monthly-cycle',
    '/api/settings/current-monthly-cycle',
    '/settings/current-monthly-cycle',
    '/api/settings/monthly-cycle',
    '/settings/monthly-cycle',
  ], controller.saveMonthlyCycle)
  router.get('/api/user-settings', controller.getCurrency)
  router.put('/api/user-settings', controller.saveCurrency)

  return router
}
