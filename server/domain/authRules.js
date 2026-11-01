export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function validateCredentials(email, password) {
  if (!email || !password) return 'Email and password are required'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password must be 128 characters or fewer'
  return ''
}
