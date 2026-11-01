import { Router } from 'express'
import { createAuthController } from '../controllers/authController.js'

export function createAuthRouter(dependencies) {
  const router = Router()
  const controller = createAuthController(dependencies)
  router.post(['/auth/register', '/api/auth/register'], controller.register)
  router.post(['/auth/login', '/api/auth/login'], controller.login)
  router.post(['/auth/password/reset', '/api/auth/password/reset'], controller.resetPassword)
  router.post('/api/auth/password/change', controller.changePassword)
  router.get(['/auth/me', '/api/auth/me'], controller.currentUser)
  router.post(['/auth/logout', '/api/auth/logout'], controller.logout)
  return router
}
