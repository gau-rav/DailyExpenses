import { OAuth2Client } from 'google-auth-library'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GMAIL_SCOPES = ['openid', 'email', 'profile', GMAIL_SCOPE]

function config() {
  return {
    clientId: String(process.env.GOOGLE_GMAIL_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_GMAIL_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.GOOGLE_GMAIL_REDIRECT_URI || `http://localhost:${process.env.PORT || process.env.AUTH_PORT || 8787}/api/integrations/gmail/callback`).trim(),
  }
}

export function isGmailConfigured() {
  const { clientId, clientSecret } = config()
  return Boolean(
    clientId && clientSecret
    && clientId.endsWith('.apps.googleusercontent.com')
    && !clientId.startsWith('your-'),
  )
}

function createClient() {
  const { clientId, clientSecret, redirectUri } = config()
  if (!isGmailConfigured()) throw new Error('Gmail OAuth is not configured')
  return new OAuth2Client(clientId, clientSecret, redirectUri)
}

export function buildGmailAuthUrl({ state, codeChallenge, loginHint = '' }) {
  const client = createClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    include_granted_scopes: true,
    prompt: 'consent',
    ...(loginHint ? { login_hint: loginHint } : {}),
  })
}

export async function exchangeGmailCode(code, codeVerifier) {
  const client = createClient()
  const { tokens } = await client.getToken({
    code,
    codeVerifier,
    redirect_uri: config().redirectUri,
  })
  return tokens
}

export async function verifyGmailIdentity(tokens) {
  if (!tokens?.id_token) throw new Error('Google did not return an identity token')
  const client = createClient()
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config().clientId,
  })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) throw new Error('Google account information is incomplete')
  if (!payload.email_verified) throw new Error('Your Google email is not verified')
  return {
    sub: payload.sub,
    email: String(payload.email).toLowerCase(),
    name: payload.name || payload.email,
    picture: payload.picture || '',
  }
}

export async function refreshGmailAccessToken(refreshToken) {
  if (!refreshToken) throw new Error('Gmail refresh token is missing')
  const client = createClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  if (!credentials?.access_token) throw new Error('Google did not return an access token')
  return credentials
}

export async function revokeGmailToken(token) {
  if (!token) return false
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    })
    return response.ok
  } catch {
    return false
  }
}
