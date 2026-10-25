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

export function syncGmail() {
  return request('/api/integrations/gmail/sync', { method: 'POST' })
}

export function disconnectGmail() {
  return request('/api/integrations/gmail', { method: 'DELETE' })
}
