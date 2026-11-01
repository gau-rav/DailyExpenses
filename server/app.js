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
import { OAuth2Client } from 'google-auth-library'
import { createSession, getUserBySession, pruneSessions, upsertGoogleUser } from './repositories/authRepository.js'
import { deleteGmailAccount, findGmailAccountBySub, getGmailAccount, getGmailStatus, saveGmailAccount } from './repositories/gmailRepository.js'
import { buildGmailAuthUrl, exchangeGmailCode, isGmailConfigured, revokeGmailToken, verifyGmailIdentity } from './services/gmailAuthService.js'
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from './gmailTokenCrypto.js'
import { GmailSyncError, syncAllGmailAccounts, syncGmailForUser } from './services/gmailSyncService.js'
import { saveIngestPreferences } from './services/ingestService.js'
import { createAccountSettingsRouter } from './routes/accountSettingsRoutes.js'
import { createAuthRouter } from './routes/authRoutes.js'
import { createExpensesRouter } from './routes/expensesRoutes.js'
import { createIngestRouter } from './routes/ingestRoutes.js'

const app = express()
const port = Number(process.env.PORT || process.env.AUTH_PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const sessionCookie = 'penny_session'
const dummyEmail = (process.env.AUTH_DUMMY_EMAIL || '').trim().toLowerCase()
const dummyPassword = process.env.AUTH_DUMMY_PASSWORD || ''
const distPath = path.join(process.cwd(), 'dist')

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

const routeDependencies = {
  getUserFromRequest: req => getUserBySession(getCookie(req, sessionCookie)),
  getSessionToken: req => getCookie(req, sessionCookie),
  sessionCookie,
  setCookie,
  clearCookie,
  dummyEmail,
  dummyPassword,
}
app.use(createAuthRouter(routeDependencies))
app.use(createAccountSettingsRouter(routeDependencies))
app.use(createExpensesRouter(routeDependencies))
app.use(createIngestRouter(routeDependencies))

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
    await saveIngestPreferences(user.id, { enabled: true })
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









