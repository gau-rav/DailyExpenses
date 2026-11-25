import { Router } from 'express'
import { createAdminAuthController } from '../controllers/adminAuthController.js'

export function createAdminAuthRouter(dependencies) {
  const router = Router()
  const controller = createAdminAuthController(dependencies)
  router.post(['/admin/auth/login', '/api/admin/auth/login'], controller.login)
  router.get(['/admin/auth/me', '/api/admin/auth/me'], controller.currentUser)
  router.post(['/admin/auth/logout', '/api/admin/auth/logout'], controller.logout)
  return router
}
