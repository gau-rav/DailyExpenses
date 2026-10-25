import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OAuth2Client } from 'google-auth-library'
import {
  buildGmailAuthUrl,
  exchangeGmailCode,
  isGmailConfigured,
  refreshGmailAccessToken,
  revokeGmailToken,
  verifyGmailIdentity,
} from './gmailAuth.js'

const mockClientInstance = {
  generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1'),
  getToken: vi.fn().mockResolvedValue({ tokens: { access_token: 'mock-access', refresh_token: 'mock-refresh' } }),
  verifyIdToken: vi.fn().mockResolvedValue({
    getPayload: () => ({
      sub: 'google-sub-123',
      email: 'Test.User@Example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      email_verified: true,
    }),
  }),
  setCredentials: vi.fn(),
  refreshAccessToken: vi.fn().mockResolvedValue({
    credentials: { access_token: 'new-mock-access' },
  }),
}

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => mockClientInstance),
}))

const originalEnv = process.env

beforeEach(() => {
  process.env = {
    ...originalEnv,
    GOOGLE_GMAIL_CLIENT_ID: '123456789-abcdef.apps.googleusercontent.com',
    GOOGLE_GMAIL_CLIENT_SECRET: 'mock-secret',
    GOOGLE_GMAIL_REDIRECT_URI: 'http://localhost:8787/api/integrations/gmail/callback',
  }
})

afterEach(() => {
  process.env = originalEnv
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('gmailAuth', () => {
  describe('isGmailConfigured', () => {
    it('returns true when client ID and secret are valid', () => {
      expect(isGmailConfigured()).toBe(true)
    })

    it('returns false when client ID or secret is missing', () => {
      process.env.GOOGLE_GMAIL_CLIENT_ID = ''
      expect(isGmailConfigured()).toBe(false)

      process.env.GOOGLE_GMAIL_CLIENT_ID = '123.apps.googleusercontent.com'
      process.env.GOOGLE_GMAIL_CLIENT_SECRET = ''
      expect(isGmailConfigured()).toBe(false)
    })

    it('returns false when client ID starts with placeholder "your-"', () => {
      process.env.GOOGLE_GMAIL_CLIENT_ID = 'your-client-id.apps.googleusercontent.com'
      expect(isGmailConfigured()).toBe(false)
    })

    it('returns false when client ID does not end with .apps.googleusercontent.com', () => {
      process.env.GOOGLE_GMAIL_CLIENT_ID = '123456789.google.com'
      expect(isGmailConfigured()).toBe(false)
    })
  })

  describe('client guard', () => {
    it('throws if Gmail OAuth is not configured', () => {
      process.env.GOOGLE_GMAIL_CLIENT_ID = 'invalid'
      expect(() => buildGmailAuthUrl({ state: 's', codeChallenge: 'c' })).toThrow('Gmail OAuth is not configured')
    })
  })

  describe('buildGmailAuthUrl', () => {
    it('generates the auth URL with PKCE and offline access', () => {
      const url = buildGmailAuthUrl({ state: 'state-xyz', codeChallenge: 'challenge-abc', loginHint: 'test@example.com' })
      expect(url).toContain('https://accounts.google.com')

      expect(mockClientInstance.generateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
        access_type: 'offline',
        scope: expect.arrayContaining(['https://www.googleapis.com/auth/gmail.readonly']),
        state: 'state-xyz',
        code_challenge: 'challenge-abc',
        code_challenge_method: 'S256',
        prompt: 'consent',
        include_granted_scopes: true,
        login_hint: 'test@example.com',
      }))
    })

    it('requests the required identity and Gmail scopes', () => {
      buildGmailAuthUrl({ state: 's', codeChallenge: 'c' })
      expect(mockClientInstance.generateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
        scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'],
      }))
    })

    it('omits login_hint when none is provided', () => {
      buildGmailAuthUrl({ state: 's', codeChallenge: 'c' })
      const options = mockClientInstance.generateAuthUrl.mock.calls.at(-1)[0]
      expect(options).not.toHaveProperty('login_hint')
    })

    it('creates the OAuth client with the configured credentials', () => {
      buildGmailAuthUrl({ state: 's', codeChallenge: 'c' })
      expect(OAuth2Client).toHaveBeenCalledWith(
        process.env.GOOGLE_GMAIL_CLIENT_ID,
        process.env.GOOGLE_GMAIL_CLIENT_SECRET,
        process.env.GOOGLE_GMAIL_REDIRECT_URI,
      )
    })
  })

  describe('exchangeGmailCode', () => {
    it('exchanges code and PKCE verifier for tokens', async () => {
      const tokens = await exchangeGmailCode('auth-code', 'verifier-123')
      expect(tokens).toEqual({ access_token: 'mock-access', refresh_token: 'mock-refresh' })

      expect(mockClientInstance.getToken).toHaveBeenCalledWith({
        code: 'auth-code',
        codeVerifier: 'verifier-123',
        redirect_uri: process.env.GOOGLE_GMAIL_REDIRECT_URI,
      })
    })

    it('surfaces token exchange failures', async () => {
      mockClientInstance.getToken.mockRejectedValueOnce(new Error('invalid_grant'))
      await expect(exchangeGmailCode('bad-code', 'verifier')).rejects.toThrow('invalid_grant')
    })
  })

  describe('verifyGmailIdentity', () => {
    it('verifies ID token and returns normalized user payload', async () => {
      const identity = await verifyGmailIdentity({ id_token: 'mock-id-token' })
      expect(identity).toEqual({
        sub: 'google-sub-123',
        email: 'test.user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      })
      expect(mockClientInstance.verifyIdToken).toHaveBeenCalledWith({
        idToken: 'mock-id-token',
        audience: process.env.GOOGLE_GMAIL_CLIENT_ID,
      })
    })

    it('throws if id_token is missing', async () => {
      await expect(verifyGmailIdentity(null)).rejects.toThrow('Google did not return an identity token')
      await expect(verifyGmailIdentity({})).rejects.toThrow('Google did not return an identity token')
    })

    it('throws if the payload is missing a subject or email', async () => {
      mockClientInstance.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email: 'a@b.com', email_verified: true }),
      })
      await expect(verifyGmailIdentity({ id_token: 'token' })).rejects.toThrow('Google account information is incomplete')

      mockClientInstance.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ sub: '123', email_verified: true }),
      })
      await expect(verifyGmailIdentity({ id_token: 'token' })).rejects.toThrow('Google account information is incomplete')
    })

    it('throws if email is unverified', async () => {
      mockClientInstance.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ sub: '123', email: 'a@b.com', email_verified: false }),
      })

      await expect(verifyGmailIdentity({ id_token: 'token' })).rejects.toThrow('Your Google email is not verified')
    })

    it('falls back to the email for name and an empty picture', async () => {
      mockClientInstance.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ sub: '123', email: 'Fallback@Example.com', email_verified: true }),
      })

      await expect(verifyGmailIdentity({ id_token: 'token' })).resolves.toEqual({
        sub: '123',
        email: 'fallback@example.com',
        name: 'Fallback@Example.com',
        picture: '',
      })
    })
  })

  describe('refreshGmailAccessToken', () => {
    it('refreshes access token using refresh token', async () => {
      const creds = await refreshGmailAccessToken('mock-refresh')
      expect(creds).toEqual({ access_token: 'new-mock-access' })

      expect(mockClientInstance.setCredentials).toHaveBeenCalledWith({ refresh_token: 'mock-refresh' })
      expect(mockClientInstance.refreshAccessToken).toHaveBeenCalled()
    })

    it('throws if refresh token is missing', async () => {
      await expect(refreshGmailAccessToken('')).rejects.toThrow('Gmail refresh token is missing')
    })

    it('throws if Google does not return an access token', async () => {
      mockClientInstance.refreshAccessToken.mockResolvedValueOnce({ credentials: {} })
      await expect(refreshGmailAccessToken('mock-refresh')).rejects.toThrow('Google did not return an access token')
    })

    it('surfaces refresh failures', async () => {
      mockClientInstance.refreshAccessToken.mockRejectedValueOnce(new Error('invalid_grant'))
      await expect(refreshGmailAccessToken('stale-refresh')).rejects.toThrow('invalid_grant')
    })
  })

  describe('revokeGmailToken', () => {
    it('revokes token successfully via Google endpoint', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      const ok = await revokeGmailToken('token-to-revoke')
      expect(ok).toBe(true)
      expect(fetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/revoke', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'token=token-to-revoke',
      }))
    })

    it('returns false if token is empty', async () => {
      const ok = await revokeGmailToken('')
      expect(ok).toBe(false)
    })

    it('returns false if revocation request fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      const ok = await revokeGmailToken('bad-token')
      expect(ok).toBe(false)
    })

    it('returns false when the network request throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
      await expect(revokeGmailToken('token')).resolves.toBe(false)
    })
  })
})
