import dotenv from 'dotenv'

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
})
dotenv.config()
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { parse, serialize } from 'cookie'
import { connectDatabase, createExpense, createSession, deleteExpense, deleteSession, getUserBySession, listExpenses, pruneSessions, purgeExpense, restoreExpense, updateExpense, upsertPasswordUser } from './db.js'

const app = express()
const port = Number(process.env.PORT || process.env.AUTH_PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookie = 'penny_session'
const dummyEmail = (process.env.AUTH_DUMMY_EMAIL || 'shikha99135@gmail.com').trim().toLowerCase()
const dummyPassword = process.env.AUTH_DUMMY_PASSWORD || 'penny123'
const distPath = path.join(process.cwd(), 'dist')

// Accept JSON from the React client, including older cached builds that sent
// the payload as text/plain during the Google Sheets integration.
app.use(express.json({ limit: '32kb', type: ['application/json', 'text/plain'] }))

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

/* Temporarily disabled: Google OAuth routes are intentionally commented out.
   Restore this block when email authentication is ready to be replaced by OAuth. */

app.post(['/auth/login', '/api/auth/login'], async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password are required' })
    if (email !== dummyEmail || password !== dummyPassword) return res.status(401).json({ ok: false, error: 'Invalid email or password' })

    const user = await upsertPasswordUser(email, 'Shikha')
    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.json({ ok: true, user: publicUser(user) })
  } catch (error) {
    console.error('Email login failed', error)
    res.status(500).json({ ok: false, error: 'Unable to sign in' })
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
  return { id: user.id, email: user.email, name: user.name, picture: user.picture || '' }
}
