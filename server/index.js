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
import { OAuth2Client } from 'google-auth-library'
import { connectDatabase, createExpense, createPasswordUser, createSession, deleteExpense, deleteGmailAccount, deleteSession, deleteUserSessions, findGmailAccountBySub, getBudgetLimits, getGmailAccount, getGmailStatus, getMonthlyCycle, getUserByEmail, getUserBySession, getUserCurrency, listExpenses, listIngestMessages, pruneSessions, purgeExpense, restoreExpense, saveBudgetLimits, saveGmailAccount, saveIngestSettings, saveMonthlyCycle, saveUserCurrency, setPasswordHash, updateExpense, upsertGoogleUser } from './db.js'
import { acceptIngestMessage, getIngestStatus, ignoreIngestMessage, IngestError } from './ingest.js'
import { buildGmailAuthUrl, exchangeGmailCode, isGmailConfigured, revokeGmailToken, verifyGmailIdentity } from './gmailAuth.js'
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from './gmailTokenCrypto.js'
import { GmailSyncError, syncAllGmailAccounts, syncGmailForUser } from './gmailSync.js'

const app = express()
const port = Number(process.env.PORT || process.env.AUTH_PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookie = 'penny_session'
const dummyEmail = (process.env.AUTH_DUMMY_EMAIL || '').trim().toLowerCase()
const dummyPassword = process.env.AUTH_DUMMY_PASSWORD || ''
const distPath = path.join(process.cwd(), 'dist')
const scrypt = promisify(crypto.scrypt)

const appUrl = process.env.APP_URL || 'http://localhost:5173'
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/google/callback`
const googleConfigured = Boolean(
  googleClientId && googleClientSecret
  && googleClientId.endsWith('.apps.googleusercontent.com')
  && !googleClientId.startsWith('your-'),
)
const googleClient = googleConfigured
  ? new OAuth2Client(googleClientId, googleClientSecret, googleRedirectUri)
  : null
const oauthStateCookie = 'penny_oauth_state'
const oauthVerifierCookie = 'penny_oauth_verifier'
const oauthReturnCookie = 'penny_oauth_return'
const gmailStateCookie = 'penny_gmail_state'
const gmailVerifierCookie = 'penny_gmail_verifier'
const gmailReturnCookie = 'penny_gmail_return'
const gmailUserCookie = 'penny_gmail_user'

class AuthFlowError extends Error {}

app.use((req, _res, next) => {
  req.url = req.url.replace(/^\/\.netlify\/functions\/api(?=\/|\?)/, '/api')
  next()
})

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
  const serialized = serialize(name, value, { ...cookieOptions(options.maxAge), ...options })
  const existing = res.getHeader('Set-Cookie')
  if (!existing) {
    res.setHeader('Set-Cookie', serialized)
  } else {
    res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, serialized] : [existing, serialized])
  }
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 })
}

function getCookie(req, name) {
  return parse(req.headers.cookie || '')[name]
}

// Keep the OAuth return origin limited to the app that started the flow.
function sanitizeReturnUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.origin
  } catch {
    return ''
  }
}

function valuesEqual(left, right) {
  const first = Buffer.from(String(left || ''))
  const second = Buffer.from(String(right || ''))
  return first.length === second.length && crypto.timingSafeEqual(first, second)
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

app.post('/api/auth/password/change', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })

    const currentPassword = String(req.body?.currentPassword || '')
    const newPassword = String(req.body?.newPassword || '')
    const validationError = validateCredentials(user.email, newPassword)
    if (validationError) return res.status(400).json({ ok: false, error: validationError })
    if (!currentPassword) return res.status(400).json({ ok: false, error: 'Current password is required' })
    if (newPassword !== String(req.body?.verifyPassword || '')) {
      return res.status(400).json({ ok: false, error: 'Passwords do not match' })
    }
    if (!user.password_hash || !await verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ ok: false, error: 'Current password is incorrect' })
    }

    await setPasswordHash(user.id, await hashPassword(newPassword))
    await deleteUserSessions(user.id)
    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.json({ ok: true })
  } catch (error) {
    console.error('Authenticated password change failed', error)
    res.status(500).json({ ok: false, error: 'Unable to update password' })
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

app.get(['/auth/providers', '/api/auth/providers'], (_req, res) => {
  res.json({ ok: true, providers: { google: Boolean(googleClient) } })
})

app.get(['/auth/google', '/api/auth/google'], (req, res) => {
  if (!googleClient) return res.status(503).json({ ok: false, error: 'Google sign-in is not configured on the server' })

  const state = crypto.randomBytes(24).toString('base64url')
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  const returnTo = sanitizeReturnUrl(req.get('referer') || req.get('origin')) || appUrl

  setCookie(res, oauthStateCookie, state, { maxAge: 600 })
  setCookie(res, oauthVerifierCookie, codeVerifier, { maxAge: 600 })
  setCookie(res, oauthReturnCookie, returnTo, { maxAge: 600 })

  res.redirect(googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }))
})

app.get(['/auth/google/callback', '/api/auth/google/callback'], async (req, res) => {
  const returnTo = sanitizeReturnUrl(getCookie(req, oauthReturnCookie)) || appUrl
  try {
    if (!googleClient) throw new AuthFlowError('Google sign-in is not configured')

    const { code, state, error } = req.query
    const savedState = getCookie(req, oauthStateCookie)
    const codeVerifier = getCookie(req, oauthVerifierCookie)
    clearCookie(res, oauthStateCookie)
    clearCookie(res, oauthVerifierCookie)
    clearCookie(res, oauthReturnCookie)

    if (error) throw new AuthFlowError('Google sign-in was cancelled')
    if (!code || !state || !savedState) throw new AuthFlowError('Invalid sign-in request')
    const receivedState = Buffer.from(String(state))
    const expectedState = Buffer.from(String(savedState))
    if (receivedState.length !== expectedState.length || !crypto.timingSafeEqual(receivedState, expectedState)) {
      throw new AuthFlowError('Invalid sign-in request')
    }
    if (!codeVerifier) throw new AuthFlowError('Sign-in session expired, please try again')

    const { tokens } = await googleClient.getToken({ code, codeVerifier, redirect_uri: googleRedirectUri })
    if (!tokens.id_token) throw new AuthFlowError('Google did not return an identity token')
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: googleClientId })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) throw new AuthFlowError('Google account information is incomplete')
    if (!payload.email_verified) throw new AuthFlowError('Your Google email is not verified')

    const user = await upsertGoogleUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || '',
      emailVerified: true,
    })
    const session = await createSession(user.id)
    setCookie(res, sessionCookie, session.rawToken, { maxAge: 60 * 60 * 24 * 7 })
    res.redirect(returnTo)
  } catch (error) {
    console.error('Google OAuth callback failed', error)
    const message = error instanceof AuthFlowError ? error.message : 'Google sign-in failed'
    res.redirect(`${returnTo}?authError=${encodeURIComponent(message)}`)
  }
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

app.get([
  '/api/current-monthly-cycle',
  '/current-monthly-cycle',
  '/api/settings/current-monthly-cycle',
  '/settings/current-monthly-cycle',
  '/api/settings/monthly-cycle',
  '/settings/monthly-cycle',
], async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    res.json({ ok: true, monthlyCycle: await getMonthlyCycle(user.id) })
  } catch (error) {
    console.error('Monthly cycle read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to load monthly cycle settings' })
  }
})

app.post([
  '/api/current-monthly-cycle',
  '/current-monthly-cycle',
  '/api/settings/current-monthly-cycle',
  '/settings/current-monthly-cycle',
  '/api/settings/monthly-cycle',
  '/settings/monthly-cycle',
], async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const startDate = req.body?.startDate
    if (startDate !== null && !isValidCycleStartDate(startDate)) {
      return res.status(400).json({ ok: false, error: 'Choose a cycle start date from the first of last month onward' })
    }
    res.json({ ok: true, monthlyCycle: await saveMonthlyCycle(user.id, startDate) })
  } catch (error) {
    console.error('Monthly cycle save failed', error)
    res.status(500).json({ ok: false, error: 'Unable to save monthly cycle settings' })
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

app.get('/api/user-settings', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    res.json({ ok: true, ...await getUserCurrency(user.id) })
  } catch (error) {
    console.error('User settings read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to load user settings' })
  }
})

app.put('/api/user-settings', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    res.json({ ok: true, ...await saveUserCurrency(user.id, req.body?.currency) })
  } catch (error) {
    console.error('User settings save failed', error)
    res.status(400).json({ ok: false, error: error.message || 'Unable to save user settings' })
  }
})

app.get('/api/integrations/status', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const [status, gmail] = await Promise.all([getIngestStatus(user.id), getGmailStatus(user.id)])
    res.json({
      ok: true,
      ...status,
      gmail: {
        ...gmail,
        configured: isGmailConfigured() && isTokenEncryptionConfigured(),
      },
    })
  } catch (error) {
    console.error('Ingest status read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to load email capture status' })
  }
})

app.get('/api/integrations/messages', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const status = String(req.query.status || 'pending')
    if (!['pending', 'added', 'ignored', 'all'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid message status' })
    }
    const messages = await listIngestMessages(user.id, status, req.query.limit)
    res.json({ ok: true, messages })
  } catch (error) {
    console.error('Ingest messages read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to load captured emails' })
  }
})

app.post('/api/integrations/messages/:id', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const action = String(req.body?.action || '')
    let result
    if (action === 'accept') result = await acceptIngestMessage(user.id, req.params.id, req.body?.expense)
    else if (action === 'ignore') result = await ignoreIngestMessage(user.id, req.params.id)
    else return res.status(400).json({ ok: false, error: 'Action must be accept or ignore' })
    res.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof IngestError) return res.status(error.status).json({ ok: false, error: error.message })
    console.error('Ingest message update failed', error)
    res.status(400).json({ ok: false, error: error.message || 'Unable to update captured email' })
  }
})

app.put('/api/integrations/settings', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const { enabled, autoAdd } = req.body || {}
    if (enabled === undefined && autoAdd === undefined) {
      return res.status(400).json({ ok: false, error: 'Provide enabled or autoAdd' })
    }
    if ((enabled !== undefined && typeof enabled !== 'boolean') || (autoAdd !== undefined && typeof autoAdd !== 'boolean')) {
      return res.status(400).json({ ok: false, error: 'Settings must be true or false' })
    }
    res.json({ ok: true, settings: await saveIngestSettings(user.id, { enabled, autoAdd }) })
  } catch (error) {
    console.error('Ingest settings save failed', error)
    res.status(500).json({ ok: false, error: 'Unable to save email capture settings' })
  }
})

app.get('/api/integrations/gmail/connect', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    if (!isGmailConfigured()) return res.status(503).json({ ok: false, error: 'Gmail OAuth is not configured on the server' })
    if (!isTokenEncryptionConfigured()) return res.status(503).json({ ok: false, error: 'TOKEN_ENCRYPTION_KEY is not configured on the server' })

    const state = crypto.randomBytes(24).toString('base64url')
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    const returnTo = sanitizeReturnUrl(req.get('referer') || req.get('origin')) || appUrl

    setCookie(res, gmailStateCookie, state, { maxAge: 600 })
    setCookie(res, gmailVerifierCookie, codeVerifier, { maxAge: 600 })
    setCookie(res, gmailReturnCookie, returnTo, { maxAge: 600 })
    setCookie(res, gmailUserCookie, user.id, { maxAge: 600 })

    res.redirect(buildGmailAuthUrl({ state, codeChallenge, loginHint: user.email }))
  } catch (error) {
    console.error('Gmail connect failed', error)
    res.status(500).json({ ok: false, error: 'Unable to start Gmail connection' })
  }
})

app.get('/api/integrations/gmail/callback', async (req, res) => {
  const returnTo = sanitizeReturnUrl(getCookie(req, gmailReturnCookie)) || appUrl
  const settingsUrl = `${returnTo.replace(/\/+$/, '')}/settings`
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) throw new AuthFlowError('Sign in to connect Gmail')
    if (!isGmailConfigured()) throw new AuthFlowError('Gmail OAuth is not configured on the server')
    if (!isTokenEncryptionConfigured()) throw new AuthFlowError('Token encryption is not configured on the server')

    const { code, state, error } = req.query
    const savedState = getCookie(req, gmailStateCookie)
    const codeVerifier = getCookie(req, gmailVerifierCookie)
    const savedUser = getCookie(req, gmailUserCookie)
    clearCookie(res, gmailStateCookie)
    clearCookie(res, gmailVerifierCookie)
    clearCookie(res, gmailReturnCookie)
    clearCookie(res, gmailUserCookie)

    if (error) throw new AuthFlowError('Gmail connection was cancelled')
    if (!code || !state || !savedState) throw new AuthFlowError('Invalid Gmail connection request')
    if (!valuesEqual(state, savedState)) throw new AuthFlowError('Invalid Gmail connection request')
    if (!codeVerifier) throw new AuthFlowError('Gmail connection session expired, please try again')
    if (!valuesEqual(savedUser, user.id)) throw new AuthFlowError('Gmail connection session changed, please try again')

    const tokens = await exchangeGmailCode(String(code), codeVerifier)
    const identity = await verifyGmailIdentity(tokens)
    const linked = await findGmailAccountBySub(identity.sub)
    if (linked && linked.user_id !== user.id) {
      throw new AuthFlowError('That Gmail account is already connected to another PaisaWise account')
    }

    const existing = await getGmailAccount(user.id)
    const refreshTokenEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : ''
    if (!refreshTokenEnc && !existing?.refresh_token_enc) {
      throw new AuthFlowError('Google did not return a refresh token. Please try connecting again')
    }

    await saveGmailAccount(user.id, {
      googleSub: identity.sub,
      email: identity.email,
      scopes: tokens.scope ? String(tokens.scope).split(' ') : [],
      refreshTokenEnc,
    })
    await saveIngestSettings(user.id, { enabled: true })
    res.redirect(`${settingsUrl}?gmail=connected`)
  } catch (error) {
    console.error('Gmail OAuth callback failed', error)
    const message = error instanceof AuthFlowError ? error.message : 'Gmail connection failed'
    clearCookie(res, gmailStateCookie)
    clearCookie(res, gmailVerifierCookie)
    clearCookie(res, gmailReturnCookie)
    clearCookie(res, gmailUserCookie)
    res.redirect(`${settingsUrl}?gmailError=${encodeURIComponent(message)}`)
  }
})

app.get('/api/integrations/gmail/status', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    res.json({
      ok: true,
      gmail: {
        ...await getGmailStatus(user.id),
        configured: isGmailConfigured() && isTokenEncryptionConfigured(),
      },
    })
  } catch (error) {
    console.error('Gmail status read failed', error)
    res.status(500).json({ ok: false, error: 'Unable to load Gmail status' })
  }
})

app.post('/api/integrations/gmail/sync', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const result = await syncGmailForUser(user.id)
    res.json({ ok: true, ...result, gmail: await getGmailStatus(user.id) })
  } catch (error) {
    if (error instanceof GmailSyncError) return res.status(error.status).json({ ok: false, error: error.message })
    console.error('Gmail sync failed', error)
    res.status(500).json({ ok: false, error: 'Unable to sync Gmail' })
  }
})

app.delete('/api/integrations/gmail', async (req, res) => {
  try {
    const user = await getUserBySession(getCookie(req, sessionCookie))
    if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
    const account = await getGmailAccount(user.id)
    if (account?.refresh_token_enc) {
      try {
        await revokeGmailToken(decryptToken(account.refresh_token_enc))
      } catch (error) {
        console.error('Gmail token revocation failed', error)
      }
    }
    await deleteGmailAccount(user.id)
    res.json({
      ok: true,
      gmail: {
        ...await getGmailStatus(user.id),
        configured: isGmailConfigured() && isTokenEncryptionConfigured(),
      },
    })
  } catch (error) {
    console.error('Gmail disconnect failed', error)
    res.status(500).json({ ok: false, error: 'Unable to disconnect Gmail' })
  }
})

app.post('/api/internal/gmail/sync', async (req, res) => {
  const secret = String(process.env.GMAIL_SYNC_SECRET || '')
  if (!secret) return res.status(503).json({ ok: false, error: 'GMAIL_SYNC_SECRET is not configured' })
  if (!valuesEqual(req.get('authorization'), `Bearer ${secret}`)) {
    return res.status(401).json({ ok: false, error: 'Invalid sync secret' })
  }
  try {
    const result = await syncAllGmailAccounts()
    res.json({
      ok: true,
      accounts: result.accounts,
      imported: result.imported,
      ignored: result.ignored,
      duplicates: result.duplicates,
      failed: result.failed,
    })
  } catch (error) {
    console.error('Scheduled Gmail sync failed', error)
    res.status(500).json({ ok: false, error: 'Unable to sync Gmail accounts' })
  }
})

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: `API route not found: ${req.method} ${req.originalUrl}` })
})

if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path !== '/api' && !req.path.startsWith('/api/') && !req.path.startsWith('/auth') && req.path !== '/health') {
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

function isValidCycleStartDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const currentDate = `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`
  const [year, month] = currentDate.slice(0, 7).split('-').map(Number)
  const minimumDate = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10)
  return value >= minimumDate
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
