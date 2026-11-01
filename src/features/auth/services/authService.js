export async function fetchCurrentUser() {
  const response = await fetch('/api/auth/me', { credentials: 'include' })
  return response.ok ? response.json() : null
}

export function endCurrentSession() {
  return fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}
