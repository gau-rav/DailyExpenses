import { normalizeEmail, validateCredentials } from '../domain/authRules.js'
import { changePasswordAccount, loginPasswordAccount, logoutSession, registerPasswordAccount, resetPasswordAccount } from '../services/authService.js'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function publicUser(user) {
  const nameParts = String(user.name || '').trim().split(/\s+/)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.first_name || nameParts[0] || '',
    lastName: user.last_name || nameParts.slice(1).join(' '),
    picture: user.picture || '',
  }
}

export function createAuthController({ getUserFromRequest, getSessionToken, sessionCookie, setCookie, clearCookie, dummyEmail, dummyPassword }) {
  return {
    register: async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email)
        const password = String(req.body?.password || '')
        const firstName = String(req.body?.firstName || '').trim()
        const lastName = String(req.body?.lastName || '').trim()
        const validationError = validateCredentials(email, password)
        if (validationError) return res.status(400).json({ ok: false, error: validationError })
        if (!firstName || !lastName) return res.status(400).json({ ok: false, error: 'First name and last name are required' })
        if (firstName.length > 60 || lastName.length > 60) return res.status(400).json({ ok: false, error: 'Names must be 60 characters or fewer' })
        if (password !== String(req.body?.verifyPassword || '')) {
          return res.status(400).json({ ok: false, error: 'Passwords do not match' })
        }

        const { user, session } = await registerPasswordAccount(email, password, firstName, lastName)
        setCookie(res, sessionCookie, session.rawToken, { maxAge: SESSION_MAX_AGE })
        res.status(201).json({ ok: true, user: publicUser(user) })
      } catch (error) {
        if (error.code === 11000) return res.status(409).json({ ok: false, error: 'An account with this email already exists' })
        console.error('Email registration failed', error)
        res.status(500).json({ ok: false, error: 'Unable to create account' })
      }
    },
    login: async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email)
        const password = String(req.body?.password || '')
        if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password are required' })

        const result = await loginPasswordAccount(email, password, dummyEmail, dummyPassword)
        if (!result) return res.status(401).json({ ok: false, error: 'Invalid email or password' })
        setCookie(res, sessionCookie, result.session.rawToken, { maxAge: SESSION_MAX_AGE })
        res.json({ ok: true, user: publicUser(result.user) })
      } catch (error) {
        console.error('Email login failed', error)
        res.status(500).json({ ok: false, error: 'Unable to sign in' })
      }
    },
    resetPassword: async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email)
        const currentPassword = String(req.body?.currentPassword || '')
        const newPassword = String(req.body?.newPassword || '')
        const validationError = validateCredentials(email, newPassword)
        if (validationError) return res.status(400).json({ ok: false, error: validationError })
        if (!currentPassword) return res.status(400).json({ ok: false, error: 'Current password is required' })
        if (newPassword !== String(req.body?.verifyPassword || '')) {
          return res.status(400).json({ ok: false, error: 'Passwords do not match' })
        }

        const result = await resetPasswordAccount(email, currentPassword, newPassword)
        if (!result) return res.status(401).json({ ok: false, error: 'Email or current password is incorrect' })
        setCookie(res, sessionCookie, result.session.rawToken, { maxAge: SESSION_MAX_AGE })
        res.json({ ok: true, user: publicUser(result.user) })
      } catch (error) {
        console.error('Password reset failed', error)
        res.status(500).json({ ok: false, error: 'Unable to reset password' })
      }
    },
    changePassword: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const currentPassword = String(req.body?.currentPassword || '')
        const newPassword = String(req.body?.newPassword || '')
        const validationError = validateCredentials(user.email, newPassword)
        if (validationError) return res.status(400).json({ ok: false, error: validationError })
        if (!currentPassword) return res.status(400).json({ ok: false, error: 'Current password is required' })
        if (newPassword !== String(req.body?.verifyPassword || '')) {
          return res.status(400).json({ ok: false, error: 'Passwords do not match' })
        }
        const session = await changePasswordAccount(user, currentPassword, newPassword)
        if (!session) return res.status(401).json({ ok: false, error: 'Current password is incorrect' })
        setCookie(res, sessionCookie, session.rawToken, { maxAge: SESSION_MAX_AGE })
        res.json({ ok: true })
      } catch (error) {
        console.error('Authenticated password change failed', error)
        res.status(500).json({ ok: false, error: 'Unable to update password' })
      }
    },
    currentUser: async (req, res) => {
      const user = await getUserFromRequest(req)
      if (!user) return res.status(401).json({ authenticated: false })
      res.json({ authenticated: true, user: publicUser(user) })
    },
    logout: async (req, res) => {
      await logoutSession(getSessionToken(req))
      clearCookie(res, sessionCookie)
      res.json({ ok: true })
    },
  }
}
