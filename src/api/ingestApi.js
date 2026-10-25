async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

export function fetchIngestStatus() {
  return request('/api/integrations/status')
}

export function fetchIngestMessages(status = 'pending') {
  return request(`/api/integrations/messages?status=${encodeURIComponent(status)}`)
}

export function acceptIngestMessage(id, expense) {
  return request(`/api/integrations/messages/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'accept', expense }),
  })
}

export function ignoreIngestMessage(id) {
  return request(`/api/integrations/messages/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'ignore' }),
  })
}

export function saveIngestSettings(settings) {
  return request('/api/integrations/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
