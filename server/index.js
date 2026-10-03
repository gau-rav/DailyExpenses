import dotenv from 'dotenv'

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
})
dotenv.config()
import express from 'express'
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { parse, serialize } from 'cookie'
import { connectDatabase, createExpense, createPasswordUser, createSession, deleteExpense, deleteSession, deleteUserSessions, getBudgetLimits, getUserByEmail, getUserBySession, listExpenses, pruneSessions, purgeExpense, restoreExpense, saveBudgetLimits, setPasswordHash, updateExpense } from './db.js'

const app = express()
const port = Number(process.env.PORT || process.env.AUTH_PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookie = 'penny_session'
const dummyEmail = (process.env.AUTH_DUMMY_EMAIL || '').trim().toLowerCase()
const dummyPassword = process.env.AUTH_DUMMY_PASSWORD || ''
const distPath = path.join(process.cwd(), 'dist')
const scrypt = promisify(crypto.scrypt)

// Accept JSON from the React client, including older cached builds that sent
// the payload as text/plain during the Google Sheets integration.
app.use(express.json({ limit: '32kb', type: ['application/json', 'text/plain'] }))
app.use((req, _res, next) => {
  if (req.body && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) return next()

  const eventBody = req.netlifyBody || req.apiGateway?.event?.body || req.body
  if (!eventBody) return next()

  try {
    const bodyText = Buffer.isBuffer(eventBody) ? eventBody.toString('utf8') : eventBody
    req.body = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText
  } catch {
    req.body = {}
  }
  next()
})

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge }),
  }
}

function setCookie(res, name, value, options = {}) {
  res.setHeader('Set-Cookie', serialize(name, value, { ...cookieOptions(options.maxAge), ...options }))
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 })
}

function getCookie(req, name) {
  return parse(req.headers.cookie || '')[name]
}

app.post(['/auth/register', '/api/auth/register'], async (req, res) => {
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

    const user = await createPasswordUser(email, await hashPassword(password), firstName, lastName)
    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.status(201).json({ ok: true, user: publicUser(user) })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ ok: false, error: 'An account with this email already exists' })
    console.error('Email registration failed', error)
    res.status(500).json({ ok: false, error: 'Unable to create account' })
  }
})

app.post(['/auth/login', '/api/auth/login'], async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password are required' })

    let user = await getUserByEmail(email)
    if (!user && email === dummyEmail && password === dummyPassword) {
      user = await createPasswordUser(email, await hashPassword(password))
    }
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid email or password' })

    if (user.password_hash) {
      if (!await verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ ok: false, error: 'Invalid email or password' })
      }
    } else if (email === dummyEmail && password === dummyPassword) {
      await setPasswordHash(user.id, await hashPassword(password))
    } else {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' })
    }

    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.json({ ok: true, user: publicUser(user) })
  } catch (error) {
    console.error('Email login failed', error)
    res.status(500).json({ ok: false, error: 'Unable to sign in' })
  }
})

app.post(['/auth/password/reset', '/api/auth/password/reset'], async (req, res) => {
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

    const user = await getUserByEmail(email)
    if (!user?.password_hash || !await verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ ok: false, error: 'Email or current password is incorrect' })
    }

    await setPasswordHash(user.id, await hashPassword(newPassword))
    await deleteUserSessions(user.id)
    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.json({ ok: true, user: publicUser(user) })
  } catch (error) {
    console.error('Password reset failed', error)
    res.status(500).json({ ok: false, error: 'Unable to reset password' })
  }
})

app.get(['/auth/me', '/api/auth/me'], async (req, res) => {
  const user = await getUserBySession(getCookie(req, sessionCookie))
  if (!user) return res.status(401).json({ authenticated: false })
  res.json({ authenticated: true, user: publicUser(user) })
})

app.post(['/auth/logout', '/api/auth/logout'], async (req, res) => {
  await deleteSession(getCookie(req, sessionCookie))
  clearCookie(res, sessionCookie)
  res.json({ ok: true })
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.get('/api/budgets', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    res.json({ ok: true, ...await getBudgetLimits(user.id) })
  } catch (error) {
    console.error('Budget read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to load budget limits' })
  }
})

app.put('/api/budgets', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const limits = validateBudgetLimits(req.body?.budgets)
    if (!limits) return res.status(400).json({ ok: false, error: 'Enter valid daily, weekly, and monthly budget limits' })
    res.json({ ok: true, budgets: await saveBudgetLimits(user.id, limits) })
  } catch (error) {
    console.error('Budget save failed', error)
    res.status(500).json({ ok: false, error: 'Unable to save budget limits' })
  }
})

app.get('/api/expenses', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const deleted = req.query.includeDeleted === 'true'
    res.json({ ok: true, expenses: await listExpenses(user.id, false), deleted: deleted ? await listExpenses(user.id, true) : [] })
  } catch (error) {
    console.error('Expense read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to read expenses' })
  }
})

app.post('/api/expenses', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const { action, expense, id } = req.body || {}
    let result
    if (action === 'add') result = await createExpense(user.id, expense)
    else if (action === 'update') result = await updateExpense(user.id, expense)
    else if (action === 'delete') result = await deleteExpense(user.id, id)
    else if (action === 'restore') result = await restoreExpense(user.id, id)
    else if (action === 'purge') result = await purgeExpense(user.id, id)
    else throw new Error('Unsupported action')
    res.json({ ok: true, result })
  } catch (error) {
    console.error('Expense write failed', error)
    res.status(400).json({ ok: false, error: error.message || 'Unable to save expense' })
  }
})

if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/auth') && req.path !== '/health') {
      return res.sendFile(path.join(distPath, 'index.html'))
    }
    next()
  })
}

setInterval(() => pruneSessions().catch(error => console.error('Session cleanup failed', error)), 60 * 60 * 1000).unref()

export { app }

if (process.env.NETLIFY !== 'true') {
  connectDatabase()
    .then(() => app.listen(port, () => console.log(`Auth server listening on http://localhost:${port}`)))
    .catch(error => {
      console.error('MongoDB connection failed', error)
      process.exitCode = 1
    })
}

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

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function validateCredentials(email, password) {
  if (!email || !password) return 'Email and password are required'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password must be 128 characters or fewer'
  return ''
}

function validateBudgetLimits(value) {
  if (!value || typeof value !== 'object') return null
  const keys = ['daily', 'weekly', 'monthly']
  const limits = Object.fromEntries(keys.map(key => [key, Number(value[key])]))
  if (keys.some(key => !Number.isFinite(limits[key]) || limits[key] < 0 || limits[key] > 1_000_000_000)) return null
  return limits
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, storedKey] = String(storedHash).split(':')
  if (algorithm !== 'scrypt' || !salt || !/^[a-f\d]{128}$/i.test(storedKey || '')) return false
  const derivedKey = await scrypt(password, salt, 64)
  return crypto.timingSafeEqual(derivedKey, Buffer.from(storedKey, 'hex'))
}
