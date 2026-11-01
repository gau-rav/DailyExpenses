import { Router } from 'express'
import { createIngestController } from '../controllers/ingestController.js'

export function createIngestRouter(dependencies) {
  const router = Router()
  const controller = createIngestController(dependencies)
  router.get('/api/integrations/status', controller.getStatus)
  router.get('/api/integrations/messages', controller.getMessages)
  router.post('/api/integrations/messages/:id', controller.updateMessage)
  router.put('/api/integrations/settings', controller.saveSettings)
  return router
}
