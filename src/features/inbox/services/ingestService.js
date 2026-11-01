import { requestJson } from '../../../services/api/requestJson.js'

export function fetchIngestStatus() {
  return requestJson('/api/integrations/status')
}

export function fetchIngestMessages(status = 'pending') {
  return requestJson(`/api/integrations/messages?status=${encodeURIComponent(status)}`)
}

export function acceptIngestMessage(id, expense) {
  return requestJson(`/api/integrations/messages/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'accept', expense }),
  })
}

export function ignoreIngestMessage(id) {
  return requestJson(`/api/integrations/messages/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'ignore' }),
  })
}

export function saveIngestSettings(settings) {
  return requestJson('/api/integrations/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
