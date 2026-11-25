import { Router } from 'express'
import { createAdminController } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/adminAuth.js'

export function createAdminRouter(dependencies) {
  const router = Router()
  const controller = createAdminController(dependencies)
  const adminOnly = requireAdmin(dependencies.getAdminUserFromRequest)
  
  router.get(['/admin/overview', '/api/admin/overview'], adminOnly, controller.overview)
  router.get(['/admin/users', '/api/admin/users'], adminOnly, controller.listUsers)
  router.get(['/admin/users/:userId', '/api/admin/users/:userId'], adminOnly, controller.getUser)
  router.get(['/admin/users/:userId/expenses', '/api/admin/users/:userId/expenses'], adminOnly, controller.getUserExpenses)
  router.get(['/admin/audit', '/api/admin/audit'], adminOnly, controller.getAuditLogs)
  
  return router
}
