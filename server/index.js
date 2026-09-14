import dotenv from 'dotenv'

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
})
dotenv.config()
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OAuth2Client } from 'google-auth-library'
import { parse, serialize } from 'cookie'
import { connectDatabase, createExpense, createSession, deleteExpense, deleteSession, getUserBySession, listExpenses, pruneSessions, purgeExpense, restoreExpense, updateExpense, upsertGoogleUser } from './db.js'

const app = express()
const port = Number(process.env.PORT || process.env.AUTH_PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookie = 'penny_session'
const oauthStateCookie = 'penny_oauth_state'
const oauthVerifierCookie = 'penny_oauth_verifier'
const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/google/callback`
const client = clientId && clientSecret ? new OAuth2Client(clientId, clientSecret, redirectUri) : null
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distPath = path.join(projectRoot, 'dist')

app.use(express.json({ limit: '32kb' }))

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

function requireConfig(res) {
  if (!client) {
    res.status(503).json({ error: 'Google OAuth is not configured on the server' })
    return false
  }
  return true
}

app.get(['/auth/google', '/api/auth/google'], async (req, res) => {
  if (!requireConfig(res)) return

  const state = crypto.randomBytes(24).toString('base64url')
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  setCookie(res, oauthStateCookie, state, { maxAge: 600 })
  setCookie(res, oauthVerifierCookie, codeVerifier, { maxAge: 600 })

  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })

  res.redirect(url)
})

app.get(['/auth/google/callback', '/api/auth/google/callback'], async (req, res) => {
  try {
    if (!requireConfig(res)) return
    const { code, state, error } = req.query
    const savedState = getCookie(req, oauthStateCookie)
    const codeVerifier = getCookie(req, oauthVerifierCookie)
    clearCookie(res, oauthStateCookie)
    clearCookie(res, oauthVerifierCookie)

    if (error) throw new Error(`Google authorization failed: ${error}`)
    if (!code || !state || !savedState || !crypto.timingSafeEqual(Buffer.from(String(state)), Buffer.from(String(savedState)))) {
      throw new Error('Invalid OAuth state')
    }
    if (!codeVerifier) throw new Error('OAuth verifier is missing or expired')

    const { tokens } = await client.getToken({ code, codeVerifier, redirect_uri: redirectUri })
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new Error('Google account email is not verified')

    const user = await upsertGoogleUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || '',
      emailVerified: Boolean(payload.email_verified),
    })
    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.redirect(process.env.APP_URL || 'http://localhost:5173')
  } catch (error) {
    console.error('Google OAuth callback failed', error)
    res.redirect(`${process.env.APP_URL || 'http://localhost:5173'}?authError=${encodeURIComponent(error.message || 'Authentication failed')}`)
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
