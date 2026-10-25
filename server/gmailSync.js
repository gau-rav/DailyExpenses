import {
  claimGmailSync,
  finishGmailSync,
  getGmailAccount,
  getIngestSettings,
  listGmailAccountsForSync,
  markGmailNeedsReauth,
} from './db.js'
import { refreshGmailAccessToken } from './gmailAuth.js'
import { extractGmailMessage } from './gmailExtract.js'
import { decryptToken } from './gmailTokenCrypto.js'
import { ingestEmail } from './ingest.js'

const DEFAULT_QUERY = '(debited OR spent OR "transaction alert" OR "transaction of" OR "has been charged" OR "withdrawn")'
const MAX_MESSAGES_PER_SYNC = 100
const SYNC_LOCK_MS = 10 * 60 * 1000
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export class GmailSyncError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
  }
}

export function buildGmailQuery(account) {
  const base = String(process.env.GMAIL_QUERY || DEFAULT_QUERY).trim() || DEFAULT_QUERY
  if (base.toLowerCase().includes('newer_than:')) return base
  const lastInternalDate = Number(account?.last_internal_date || 0)
  const days = lastInternalDate > 0
    ? 2
    : Math.max(1, Math.min(30, Number(process.env.GMAIL_INITIAL_LOOKBACK_DAYS) || 7))
  return `${base} newer_than:${days}d`
}

function isReauthError(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase()
  return text.includes('invalid_grant') || text.includes('gmail_unauthorized')
}

async function gmailRequest(accessToken, pathname) {
  const response = await fetch(`${GMAIL_API}${pathname}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const error = new GmailSyncError(`Gmail API request failed (${response.status})`, response.status)
    if (response.status === 401) error.code = 'GMAIL_UNAUTHORIZED'
    throw error
  }
  return response.json()
}

export async function listGmailMessageIds(accessToken, query, maxResults = MAX_MESSAGES_PER_SYNC) {
  const ids = []
  let pageToken = ''
  const limit = Math.max(1, Math.min(500, Number(maxResults) || MAX_MESSAGES_PER_SYNC))

  do {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(100, limit - ids.length)),
    })
    if (pageToken) params.set('pageToken', pageToken)
    const data = await gmailRequest(accessToken, `/messages?${params.toString()}`)
    for (const message of data.messages || []) {
      if (message?.id) ids.push(String(message.id))
      if (ids.length >= limit) break
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken && ids.length < limit)

  return ids
}

export async function fetchGmailMessage(accessToken, id) {
  return gmailRequest(accessToken, `/messages/${encodeURIComponent(id)}?format=full`)
}

async function syncGmailAccount(account) {
  const settings = await getIngestSettings(account.user_id)
  if (!settings.enabled) return { skipped: 'disabled' }

  const refreshToken = decryptToken(account.refresh_token_enc)
  const credentials = await refreshGmailAccessToken(refreshToken)
  const query = buildGmailQuery(account)
  const ids = await listGmailMessageIds(credentials.access_token, query)

  let lastInternalDate = Number(account.last_internal_date || 0)
  let imported = 0
  let ignored = 0
  let duplicates = 0

  for (const id of ids) {
    let message
    try {
      message = await fetchGmailMessage(credentials.access_token, id)
    } catch (error) {
      if (error.status === 404) continue
      throw error
    }
    const internalDate = Number(message?.internalDate || 0)
    if (internalDate > lastInternalDate) lastInternalDate = internalDate

    const extracted = extractGmailMessage(message)
    if (!extracted.text) continue

    const result = await ingestEmail(account.user_id, extracted)

    if (result.duplicate) duplicates += 1
    else if (result.message?.status === 'ignored') ignored += 1
    else imported += 1
  }

  return { imported, ignored, duplicates, lastInternalDate, scanned: ids.length }
}

export async function syncGmailForUser(userId) {
  const account = await getGmailAccount(userId)
  if (!account?.refresh_token_enc) throw new GmailSyncError('Gmail is not connected', 404)
  if (account.status === 'needs_reauth') throw new GmailSyncError('Reconnect Gmail to continue syncing', 409)
  const claimed = await claimGmailSync(userId, SYNC_LOCK_MS)
  if (!claimed) throw new GmailSyncError('A Gmail sync is already running', 409)

  try {
    const result = await syncGmailAccount(claimed)
    await finishGmailSync(userId, { lastInternalDate: result.lastInternalDate, status: 'connected' })
    return result
  } catch (error) {
    if (isReauthError(error)) {
      await markGmailNeedsReauth(userId, 'Reconnect Gmail to continue syncing')
      throw new GmailSyncError('Gmail access expired. Reconnect Gmail to continue.', 409)
    }
    await finishGmailSync(userId, { status: 'error', error: error.message || 'Gmail sync failed' })
    throw error
  }
}

export async function syncAllGmailAccounts(limit = 50) {
  const accounts = await listGmailAccountsForSync(limit)
  const results = []
  let imported = 0
  let ignored = 0
  let duplicates = 0
  let failed = 0

  for (const account of accounts) {
    const claimed = await claimGmailSync(account.user_id, SYNC_LOCK_MS)
    if (!claimed) {
      results.push({ userId: account.user_id, skipped: 'locked' })
      continue
    }

    try {
      const result = await syncGmailAccount(claimed)
      await finishGmailSync(account.user_id, { lastInternalDate: result.lastInternalDate, status: 'connected' })
      imported += result.imported || 0
      ignored += result.ignored || 0
      duplicates += result.duplicates || 0
      results.push({ userId: account.user_id, ...result })
    } catch (error) {
      failed += 1
      if (isReauthError(error)) {
        await markGmailNeedsReauth(account.user_id, 'Reconnect Gmail to continue syncing')
        results.push({ userId: account.user_id, status: 'needs_reauth' })
      } else {
        console.error('Gmail sync failed', { userId: account.user_id, message: error.message })
        await finishGmailSync(account.user_id, { status: 'error', error: error.message || 'Gmail sync failed' })
        results.push({ userId: account.user_id, status: 'error' })
      }
    }
  }

  return { accounts: accounts.length, imported, ignored, duplicates, failed, results }
}
