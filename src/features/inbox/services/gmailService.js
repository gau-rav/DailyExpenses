import { requestJson } from '../../../services/api/requestJson.js'

export function syncGmail() {
  return requestJson('/api/integrations/gmail/sync', { method: 'POST' })
}

export function disconnectGmail() {
  return requestJson('/api/integrations/gmail', { method: 'DELETE' })
}
