import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GmailSyncError,
  buildGmailQuery,
  fetchGmailMessage,
  listGmailMessageIds,
  syncAllGmailAccounts,
  syncGmailForUser,
} from './gmailSync.js'
import * as db from './db.js'
import { refreshGmailAccessToken } from './gmailAuth.js'
import { extractGmailMessage } from './gmailExtract.js'
import { decryptToken } from './gmailTokenCrypto.js'
import { ingestEmail } from './ingest.js'

vi.mock('./db.js', () => ({
  claimGmailSync: vi.fn(),
  finishGmailSync: vi.fn(),
  getGmailAccount: vi.fn(),
  getIngestSettings: vi.fn(),
  listGmailAccountsForSync: vi.fn(),
  markGmailNeedsReauth: vi.fn(),
}))

vi.mock('./gmailAuth.js', () => ({
  refreshGmailAccessToken: vi.fn(),
}))

vi.mock('./gmailExtract.js', () => ({
  extractGmailMessage: vi.fn(),
}))

vi.mock('./gmailTokenCrypto.js', () => ({
  decryptToken: vi.fn(),
}))

vi.mock('./ingest.js', () => ({
  ingestEmail: vi.fn(),
}))

const originalLookback = process.env.GMAIL_INITIAL_LOOKBACK_DAYS
const originalQuery = process.env.GMAIL_QUERY

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const connectedAccount = {
  user_id: 'user-1',
  status: 'connected',
  refresh_token_enc: 'encrypted-refresh',
  last_internal_date: 0,
}

function stubGmailFetch() {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const token = String(options.headers?.Authorization || '').replace('Bearer ', '')
    if (token === 'error-token') return jsonResponse({ error: 'boom' }, 500)
    if (String(url).includes('/messages?')) return jsonResponse({ messages: [{ id: `${token}-1` }] })
    return jsonResponse({ id: `${token}-1`, internalDate: '1710000000000' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.clearAllMocks()
  db.getIngestSettings.mockResolvedValue({ enabled: true, autoAdd: false })
  db.finishGmailSync.mockResolvedValue({})
  db.markGmailNeedsReauth.mockResolvedValue({})
  db.claimGmailSync.mockResolvedValue(null)
  decryptToken.mockImplementation(value => value)
  refreshGmailAccessToken.mockResolvedValue({ access_token: 'access-token' })
  extractGmailMessage.mockReturnValue({ text: 'Rs 100 debited at Amazon' })
  ingestEmail.mockResolvedValue({ message: { status: 'pending' }, duplicate: false })
})

afterEach(() => {
  if (originalLookback === undefined) delete process.env.GMAIL_INITIAL_LOOKBACK_DAYS
  else process.env.GMAIL_INITIAL_LOOKBACK_DAYS = originalLookback
  if (originalQuery === undefined) delete process.env.GMAIL_QUERY
  else process.env.GMAIL_QUERY = originalQuery
  vi.unstubAllGlobals()
})

describe('buildGmailQuery', () => {
  it('uses the initial lookback for a new connection', () => {
    process.env.GMAIL_INITIAL_LOOKBACK_DAYS = '7'
    delete process.env.GMAIL_QUERY
    const query = buildGmailQuery({ last_internal_date: 0 })
    expect(query).toContain('debited OR spent')
    expect(query).toContain('newer_than:7d')
  })

  it('uses a short overlap window after the first sync', () => {
    const query = buildGmailQuery({ last_internal_date: 1710000000000 })
    expect(query).toContain('newer_than:2d')
  })

  it('does not duplicate a configured window', () => {
    process.env.GMAIL_QUERY = 'newer_than:5d (debited OR spent)'
    expect(buildGmailQuery({ last_internal_date: 0 })).toBe('newer_than:5d (debited OR spent)')
  })
})

describe('Gmail API helpers', () => {
  it('paginates message IDs and caps the result count', async () => {
    const calls = []
    vi.stubGlobal('fetch', vi.fn(async url => {
      calls.push(String(url))
      const body = calls.length === 1
        ? { messages: [{ id: 'one' }, { id: 'two' }], nextPageToken: 'next-page' }
        : { messages: [{ id: 'three' }, { id: 'four' }] }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    const ids = await listGmailMessageIds('access-token', 'newer_than:2d', 3)
    expect(ids).toEqual(['one', 'two', 'three'])
    expect(calls[0]).toContain('maxResults=3')
    expect(calls[1]).toContain('pageToken=next-page')
  })

  it('encodes message IDs and surfaces API failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      expect(String(url)).toContain('/messages/id%2Fwith%20space?format=full')
      return new Response(JSON.stringify({ error: 'nope' }), { status: 404 })
    }))

    await expect(fetchGmailMessage('access-token', 'id/with space')).rejects.toThrow('Gmail API request failed (404)')
  })
})

describe('syncGmailForUser', () => {
  it('throws 404 when Gmail is not connected', async () => {
    db.getGmailAccount.mockResolvedValue(null)
    await expect(syncGmailForUser('user-1')).rejects.toMatchObject({ status: 404, message: 'Gmail is not connected' })
  })

  it('throws 409 when the account needs to reconnect', async () => {
    db.getGmailAccount.mockResolvedValue({ ...connectedAccount, status: 'needs_reauth' })
    await expect(syncGmailForUser('user-1')).rejects.toMatchObject({ status: 409 })
  })

  it('throws 409 when a sync is already running', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(null)
    await expect(syncGmailForUser('user-1')).rejects.toMatchObject({ status: 409, message: 'A Gmail sync is already running' })
  })

  it('skips accounts with auto-capture disabled', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(connectedAccount)
    db.getIngestSettings.mockResolvedValue({ enabled: false })

    const result = await syncGmailForUser('user-1')

    expect(result).toEqual({ skipped: 'disabled' })
    expect(refreshGmailAccessToken).not.toHaveBeenCalled()
    expect(db.finishGmailSync).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'connected' }))
  })

  it('imports new messages and records the last internal date', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(connectedAccount)
    const fetchMock = stubGmailFetch()

    const result = await syncGmailForUser('user-1')

    expect(result).toEqual({
      imported: 1,
      ignored: 0,
      duplicates: 0,
      scanned: 1,
      lastInternalDate: 1710000000000,
    })
    expect(ingestEmail).toHaveBeenCalledWith('user-1', expect.objectContaining({ text: 'Rs 100 debited at Amazon' }))
    expect(db.finishGmailSync).toHaveBeenCalledWith('user-1', {
      lastInternalDate: 1710000000000,
      status: 'connected',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('gmail.googleapis.com/gmail/v1/users/me/messages'),
      expect.objectContaining({ headers: { Authorization: 'Bearer access-token' } }),
    )
  })

  it('counts duplicates and ignored messages separately', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(connectedAccount)
    extractGmailMessage.mockImplementation(message => ({ text: `Rs 100 debited ${message.id}` }))
    ingestEmail.mockImplementation(async (_userId, input) => (
      input.text.endsWith('a') ? { duplicate: true, autoAdded: false } : { message: { status: 'ignored' }, autoAdded: false }
    ))
    vi.stubGlobal('fetch', vi.fn(async url => {
      const value = String(url)
      if (value.includes('/messages?')) return jsonResponse({ messages: [{ id: 'a' }, { id: 'b' }] })
      if (value.includes('/messages/a')) return jsonResponse({ id: 'a', internalDate: '1710000000001' })
      return jsonResponse({ id: 'b', internalDate: '1710000000002' })
    }))

    const result = await syncGmailForUser('user-1')

    expect(result).toMatchObject({ imported: 0, ignored: 1, duplicates: 1, scanned: 2 })
    expect(db.finishGmailSync).toHaveBeenCalledWith('user-1', {
      lastInternalDate: 1710000000002,
      status: 'connected',
    })
  })

  it('skips messages that 404 or have no extractable text', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(connectedAccount)
    extractGmailMessage.mockReturnValue({ text: '' })
    vi.stubGlobal('fetch', vi.fn(async url => {
      const value = String(url)
      if (value.includes('/messages?')) return jsonResponse({ messages: [{ id: 'gone' }, { id: 'empty' }] })
      if (value.includes('/messages/gone')) return jsonResponse({ error: 'missing' }, 404)
      return jsonResponse({ id: 'empty', internalDate: '1710000000003' })
    }))

    const result = await syncGmailForUser('user-1')

    expect(result).toMatchObject({ imported: 0, ignored: 0, duplicates: 0, scanned: 2 })
    expect(ingestEmail).not.toHaveBeenCalled()
  })

  it('marks the account for reconnection when the token is invalid', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(connectedAccount)
    refreshGmailAccessToken.mockRejectedValue(new Error('invalid_grant'))

    await expect(syncGmailForUser('user-1')).rejects.toMatchObject({
      status: 409,
      message: 'Gmail access expired. Reconnect Gmail to continue.',
    })
    expect(db.markGmailNeedsReauth).toHaveBeenCalledWith('user-1', 'Reconnect Gmail to continue syncing')
  })

  it('records sync errors and rethrows them', async () => {
    db.getGmailAccount.mockResolvedValue(connectedAccount)
    db.claimGmailSync.mockResolvedValue(connectedAccount)
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, 500)))

    await expect(syncGmailForUser('user-1')).rejects.toBeInstanceOf(GmailSyncError)
    expect(db.finishGmailSync).toHaveBeenCalledWith('user-1', expect.objectContaining({
      status: 'error',
      error: 'Gmail API request failed (500)',
    }))
  })
})

describe('syncAllGmailAccounts', () => {
  it('skips accounts that are currently locked', async () => {
    db.listGmailAccountsForSync.mockResolvedValue([
      { user_id: 'locked', refresh_token_enc: 'enc-locked' },
      { user_id: 'user-1', refresh_token_enc: 'enc-user' },
    ])
    db.claimGmailSync.mockImplementation(async userId => (
      userId === 'locked' ? null : { ...connectedAccount, user_id: 'user-1' }
    ))
    stubGmailFetch()

    const result = await syncAllGmailAccounts()

    expect(result).toMatchObject({ accounts: 2, imported: 1, failed: 0 })
    expect(result.results).toEqual([
      { userId: 'locked', skipped: 'locked' },
      expect.objectContaining({ userId: 'user-1', imported: 1 }),
    ])
  })

  it('aggregates success, reauth, and failure results', async () => {
    const accounts = [
      { user_id: 'user-1', refresh_token_enc: 'ok' },
      { user_id: 'user-2', refresh_token_enc: 'reauth' },
      { user_id: 'user-3', refresh_token_enc: 'error-token' },
    ]
    db.listGmailAccountsForSync.mockResolvedValue(accounts)
    db.claimGmailSync.mockImplementation(async userId => accounts.find(account => account.user_id === userId))
    db.getGmailAccount.mockResolvedValue(null)
    refreshGmailAccessToken.mockImplementation(async token => {
      if (token === 'reauth') throw new Error('invalid_grant')
      return { access_token: token }
    })

    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      const token = String(options.headers?.Authorization || '').replace('Bearer ', '')
      if (token === 'error-token') return jsonResponse({ error: 'boom' }, 500)
      if (String(url).includes('/messages?')) return jsonResponse({ messages: [{ id: `${token}-1` }] })
      return jsonResponse({ id: `${token}-1`, internalDate: '1710000000000' })
    }))

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await syncAllGmailAccounts()

    expect(result).toMatchObject({ accounts: 3, imported: 1, ignored: 0, duplicates: 0, failed: 2 })
    expect(result.results).toEqual([
      expect.objectContaining({ userId: 'user-1', imported: 1 }),
      { userId: 'user-2', status: 'needs_reauth' },
      { userId: 'user-3', status: 'error' },
    ])
    expect(db.markGmailNeedsReauth).toHaveBeenCalledWith('user-2', 'Reconnect Gmail to continue syncing')
    expect(db.finishGmailSync).toHaveBeenCalledWith('user-3', expect.objectContaining({ status: 'error' }))
    errorSpy.mockRestore()
  })
})
