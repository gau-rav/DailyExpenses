import { getUserByEmail, getUserByAdminSession, createAdminSession, deleteAdminSession, logAdminAction } from '../repositories/authRepository.js'
import { verifyPassword } from '../services/passwordService.js'

const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_FAILURES = 8
const loginFailures = new Map()

function loginKey(req, email) {
  // Express does not trust forwarded headers by default, so req.ip is the
  // direct peer unless the deployment explicitly opts into proxy trust.
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${email}`
}

function isLoginThrottled(key) {
  const record = loginFailures.get(key)
  if (!record) return false
  if (record.resetAt <= Date.now()) {
    loginFailures.delete(key)
    return false
  }
  return record.failures >= MAX_LOGIN_FAILURES
}

function recordLoginFailure(key) {
  const now = Date.now()
  const record = loginFailures.get(key)
  if (!record || record.resetAt <= now) {
    loginFailures.set(key, { failures: 1, resetAt: now + LOGIN_WINDOW_MS })
  } else {
    record.failures += 1
  }
  // Prevent stale keys from growing without bound in a long-running process.
  if (loginFailures.size > 10_000) {
    for (const [storedKey, storedRecord] of loginFailures) {
      if (storedRecord.resetAt <= now) loginFailures.delete(storedKey)
    }
  }
}

function clearLoginFailures(key) {
  loginFailures.delete(key)
}

function publicAdminUser(user) {
  const nameParts = String(user.name || '').trim().split(/\s+/)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.first_name || nameParts[0] || '',
    lastName: user.last_name || nameParts.slice(1).join(' '),
    picture: user.picture || '',
    role: user.role || 'admin',
  }
}

export function createAdminAuthController({ getAdminSessionToken, adminSessionCookie, setCookie, clearCookie }) {
  return {
    login: async (req, res) => {
      try {
        const email = String(req.body?.email || '').trim().toLowerCase()
        const password = String(req.body?.password || '')
        if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password are required' })
        const key = loginKey(req, email)
        if (isLoginThrottled(key)) {
          res.set('Retry-After', String(Math.ceil((loginFailures.get(key).resetAt - Date.now()) / 1000)))
          return res.status(429).json({ ok: false, error: 'Too many failed attempts. Try again later.' })
        }

        const user = await getUserByEmail(email)
        if (!user || user.role !== 'admin') {
          recordLoginFailure(key)
          await logAdminAction({ adminId: null, action: 'admin_login_failed', ip: req.ip, userAgent: req.headers['user-agent'], details: { email } })
          return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
        }
        if (!user.password_hash) {
          recordLoginFailure(key)
          await logAdminAction({ adminId: user.id, action: 'admin_login_failed', ip: req.ip, userAgent: req.headers['user-agent'], details: { reason: 'no_password_hash' } })
          return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
        }
        const valid = await verifyPassword(password, user.password_hash)
        if (!valid) {
          recordLoginFailure(key)
          await logAdminAction({ adminId: user.id, action: 'admin_login_failed', ip: req.ip, userAgent: req.headers['user-agent'] })
          return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
        }

        clearLoginFailures(key)
        const session = await createAdminSession(user.id)
        setCookie(res, adminSessionCookie, session.rawToken, { maxAge: ADMIN_SESSION_MAX_AGE })
        await logAdminAction({ adminId: user.id, action: 'admin_login_success', ip: req.ip, userAgent: req.headers['user-agent'] })
        res.json({ ok: true, user: publicAdminUser(user) })
      } catch (error) {
        console.error('Admin login failed', error)
        res.status(500).json({ ok: false, error: 'Unable to sign in as admin' })
      }
    },
    currentUser: async (req, res) => {
      const user = await getAdminUserFromRequestSafe(req, getAdminSessionToken)
      if (!user || user.role !== 'admin') return res.status(401).json({ authenticated: false })
      res.json({ authenticated: true, user: publicAdminUser(user) })
    },
    logout: async (req, res) => {
      try {
        const token = getAdminSessionToken(req)
        if (token) {
          const user = await getUserByAdminSession(token)
          if (user) await logAdminAction({ adminId: user.id, action: 'admin_logout', ip: req.ip, userAgent: req.headers['user-agent'] })
        }
        await deleteAdminSession(token)
        clearCookie(res, adminSessionCookie)
        res.json({ ok: true })
      } catch (error) {
        console.error('Admin logout failed', error)
        res.status(500).json({ ok: false, error: 'Unable to logout' })
      }
    },
  }
}

async function getAdminUserFromRequestSafe(req, getAdminSessionToken) {
  return getUserByAdminSession(getAdminSessionToken(req))
}

export { publicAdminUser }
