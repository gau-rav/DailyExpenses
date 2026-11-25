export async function adminLogin(email, password) {
  const res = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function adminMe() {
  const res = await fetch('/api/admin/auth/me', { credentials: 'include' })
  return res.json()
}

export async function adminLogout() {
  const res = await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
  return res.json()
}

export async function getAdminOverview() {
  const res = await fetch('/api/admin/overview', { credentials: 'include' })
  return res.json()
}

export async function getAdminUsers(params = {}) {
  const q = new URLSearchParams()
  if (params.limit) q.set('limit', params.limit)
  if (params.skip) q.set('skip', params.skip)
  if (params.search) q.set('search', params.search)
  if (params.role) q.set('role', params.role)
  const res = await fetch(`/api/admin/users?${q.toString()}`, { credentials: 'include' })
  return res.json()
}

export async function getAdminUser(userId) {
  const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' })
  return res.json()
}

export async function getAdminUserExpenses(userId, includeDeleted = false) {
  const q = includeDeleted ? '?includeDeleted=true' : ''
  const res = await fetch(`/api/admin/users/${userId}/expenses${q}`, { credentials: 'include' })
  return res.json()
}
