import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
})
dotenv.config()

const mongoUri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB_NAME || 'penny_expenses'

let client
let database

export async function connectDatabase() {
  if (!mongoUri) throw new Error('MONGODB_URI is not configured')

  client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  database = client.db(databaseName)

  // Partial index keeps password-only users (no google_sub) alongside Google users.
  await database.collection('users').dropIndex('google_sub_1').catch(() => {})
  await database.collection('users').createIndex({ google_sub: 1 }, { unique: true, partialFilterExpression: { google_sub: { $type: 'string' } } })
  await database.collection('users').createIndex({ email: 1 }, { unique: true })
  await database.collection('sessions').createIndex({ token_hash: 1 }, { unique: true })
  await database.collection('sessions').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  await database.collection('expenses').createIndex({ user_id: 1, id: 1 }, { unique: true })
  await database.collection('expenses').createIndex({ user_id: 1, deletedAt: 1 })
  await database.collection('budgets').createIndex({ user_id: 1 }, { unique: true })
  await database.collection('user_settings').createIndex({ user_id: 1 }, { unique: true })
  await database.collection('ingest_messages').createIndex({ user_id: 1, external_id: 1 }, { unique: true })
  await database.collection('ingest_messages').createIndex({ user_id: 1, status: 1, created_at: -1 })
  await database.collection('gmail_accounts').createIndex({ user_id: 1 }, { unique: true })
  await database.collection('gmail_accounts').createIndex(
    { google_sub: 1 },
    { unique: true, partialFilterExpression: { google_sub: { $type: 'string' } } },
  )
  await database.collection('gmail_accounts').createIndex({ status: 1, last_sync_at: 1 })

  console.log(`Connected to MongoDB database: ${databaseName}`)
}

export async function closeDatabase() {
  if (!client) return
  await client.close()
  client = undefined
  database = undefined
}

function users() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('users')
}

function sessions() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('sessions')
}

function budgets() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('budgets')
}

function userSettings() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('user_settings')
}

function ingestMessages() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('ingest_messages')
}

function gmailAccounts() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('gmail_accounts')
}

export async function upsertGoogleUser(profile) {
  const now = new Date()
  const email = String(profile.email || '').trim().toLowerCase()
  const name = String(profile.name || email).trim() || email
  const picture = profile.picture || ''
  const emailVerified = profile.emailVerified !== false

  const bySub = await users().findOne({ google_sub: profile.sub })
  if (bySub) {
    const updated = { email, name, picture: picture || bySub.picture || '', email_verified: emailVerified, updated_at: now }
    await users().updateOne({ _id: bySub._id }, { $set: updated })
    return { ...bySub, ...updated }
  }

  // Link Google to an existing password account that owns the same verified email.
  const byEmail = await users().findOne({ email })
  if (byEmail) {
    const updated = {
      google_sub: profile.sub,
      picture: byEmail.picture || picture,
      email_verified: emailVerified,
      updated_at: now,
    }
    await users().updateOne({ _id: byEmail._id }, { $set: updated })
    return { ...byEmail, ...updated }
  }

  const nameParts = name.split(/\s+/)
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' '),
    picture,
    google_sub: profile.sub,
    auth_provider: 'google',
    email_verified: emailVerified,
    created_at: now,
    updated_at: now,
  }

  await users().insertOne(user)
  return user
}

export async function getUserByEmail(email) {
  return users().findOne({ email })
}

export async function createPasswordUser(email, passwordHash, firstName = email.split('@')[0], lastName = '') {
  const now = new Date()
  const name = [firstName, lastName].filter(Boolean).join(' ')
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    first_name: firstName,
    last_name: lastName,
    picture: '',
    auth_provider: 'password',
    email_verified: false,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  }

  await users().insertOne(user)
  return user
}

export async function setPasswordHash(userId, passwordHash) {
  await users().updateOne(
    { id: userId },
    { $set: { password_hash: passwordHash, auth_provider: 'password', updated_at: new Date() } },
  )
}

export async function createSession(userId, ttlSeconds = 60 * 60 * 24 * 7) {
  const rawToken = crypto.randomBytes(32).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + ttlSeconds * 1000)

  await sessions().insertOne({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: hashToken(rawToken),
    expires_at: expires,
    created_at: now,
  })

  return { rawToken, expires }
}

export async function getUserBySession(rawToken) {
  if (!rawToken) return null

  const session = await sessions().findOne({
    token_hash: hashToken(rawToken),
    expires_at: { $gt: new Date() },
  })

  if (!session) return null
  return users().findOne({ id: session.user_id })
}

export async function deleteSession(rawToken) {
  if (rawToken) await sessions().deleteOne({ token_hash: hashToken(rawToken) })
}

export async function deleteUserSessions(userId) {
  await sessions().deleteMany({ user_id: userId })
}

export async function pruneSessions() {
  await sessions().deleteMany({ expires_at: { $lte: new Date() } })
}

export async function getIngestSettings(userId) {
  const [saved, gmail] = await Promise.all([
    userSettings().findOne({ user_id: userId }, {
      projection: {
        ingest_enabled: 1,
        ingest_auto_add: 1,
      },
    }),
    gmailAccounts().findOne({ user_id: userId }, {
      projection: { refresh_token_enc: 1, status: 1 },
    }),
  ])
  const gmailConnected = Boolean(gmail?.refresh_token_enc) && gmail?.status !== 'needs_reauth'
  return {
    enabled: gmailConnected && saved?.ingest_enabled !== false,
    autoAdd: saved?.ingest_auto_add === true,
    connected: gmailConnected,
  }
}

export async function saveIngestSettings(userId, settings) {
  const update = { updated_at: new Date() }
  if (typeof settings.enabled === 'boolean') update.ingest_enabled = settings.enabled
  if (typeof settings.autoAdd === 'boolean') update.ingest_auto_add = settings.autoAdd
  await userSettings().updateOne({ user_id: userId }, { $set: update }, { upsert: true })
  return getIngestSettings(userId)
}

export async function saveGmailAccount(userId, account) {
  const now = new Date()
  const set = {
    google_sub: String(account.googleSub || ''),
    gmail_email: String(account.email || '').toLowerCase(),
    scopes: Array.isArray(account.scopes) ? account.scopes.map(String) : [],
    status: 'connected',
    last_error: '',
    last_internal_date: 0,
    updated_at: now,
  }
  if (account.refreshTokenEnc) set.refresh_token_enc = account.refreshTokenEnc
  return gmailAccounts().findOneAndUpdate(
    { user_id: userId },
    {
      $set: set,
      $setOnInsert: {
        user_id: userId,
        last_sync_at: null,
        created_at: now,
      },
    },
    { upsert: true, returnDocument: 'after' },
  )
}

export async function getGmailAccount(userId) {
  return gmailAccounts().findOne({ user_id: userId })
}

export async function findGmailAccountBySub(googleSub) {
  const sub = String(googleSub || '').trim()
  if (!sub) return null
  return gmailAccounts().findOne({ google_sub: sub })
}

export async function getGmailStatus(userId) {
  const account = await getGmailAccount(userId)
  if (!account) {
    return {
      connected: false,
      email: '',
      status: 'disconnected',
      lastSyncAt: '',
      lastError: '',
      syncInProgress: false,
    }
  }
  const lockUntil = account.sync_lock_until instanceof Date ? account.sync_lock_until.getTime() : 0
  return {
    connected: Boolean(account.refresh_token_enc),
    email: account.gmail_email || '',
    status: account.status || 'connected',
    lastSyncAt: timestamp(account.last_sync_at),
    lastError: account.last_error || '',
    syncInProgress: lockUntil > Date.now(),
  }
}

export async function deleteGmailAccount(userId) {
  const account = await gmailAccounts().findOneAndDelete({ user_id: userId })
  await userSettings().updateOne(
    { user_id: userId },
    { $set: { ingest_enabled: false, updated_at: new Date() } },
  )
  return account
}

export async function listGmailAccountsForSync(limit = 50) {
  return gmailAccounts()
    .find({ refresh_token_enc: { $type: 'string' }, status: { $ne: 'needs_reauth' } })
    .limit(Math.max(1, Math.min(500, Number(limit) || 50)))
    .toArray()
}

export async function claimGmailSync(userId, lockMs = 10 * 60 * 1000) {
  const now = new Date()
  const lockUntil = new Date(now.getTime() + lockMs)
  return gmailAccounts().findOneAndUpdate(
    {
      user_id: userId,
      status: { $ne: 'needs_reauth' },
      $or: [
        { sync_lock_until: { $exists: false } },
        { sync_lock_until: { $lte: now } },
      ],
    },
    { $set: { sync_lock_until: lockUntil, updated_at: now } },
    { returnDocument: 'after' },
  )
}

export async function finishGmailSync(userId, result = {}) {
  const now = new Date()
  const set = {
    status: result.status || 'connected',
    last_error: String(result.error || '').slice(0, 300),
    last_sync_at: now,
    updated_at: now,
  }
  if (Number.isFinite(result.lastInternalDate) && result.lastInternalDate > 0) {
    set.last_internal_date = result.lastInternalDate
  }
  await gmailAccounts().updateOne(
    { user_id: userId },
    { $set: set, $unset: { sync_lock_until: '' } },
  )
}

export async function markGmailNeedsReauth(userId, message) {
  await gmailAccounts().updateOne(
    { user_id: userId },
    {
      $set: {
        status: 'needs_reauth',
        last_error: String(message || 'Reconnect Gmail to continue syncing').slice(0, 300),
        updated_at: new Date(),
      },
      $unset: { sync_lock_until: '' },
    },
  )
}

export async function insertIngestMessage(userId, message) {
  const now = new Date()
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    external_id: String(message.externalId),
    sender: String(message.sender || ''),
    subject: String(message.subject || ''),
    received_at: message.receivedAt instanceof Date ? message.receivedAt : now,
    parsed: message.parsed || null,
    confidence: Number(message.confidence || 0),
    warnings: Array.isArray(message.warnings) ? message.warnings : [],
    status: message.status || 'pending',
    reason: String(message.reason || ''),
    bank: String(message.bank || ''),
    expense_id: '',
    created_at: now,
    updated_at: now,
  }

  try {
    await ingestMessages().insertOne(row)
    return { message: publicIngestMessage(row), duplicate: false }
  } catch (error) {
    if (error.code !== 11000) throw error
    const existing = await ingestMessages().findOne({ user_id: userId, external_id: row.external_id })
    if (!existing) throw error
    return { message: publicIngestMessage(existing), duplicate: true }
  }
}

export async function listIngestMessages(userId, status = 'pending', limit = 50) {
  const query = { user_id: userId }
  if (status && status !== 'all') query.status = status
  const rows = await ingestMessages()
    .find(query)
    .sort({ created_at: -1 })
    .limit(Math.max(1, Math.min(200, Number(limit) || 50)))
    .toArray()
  return rows.map(publicIngestMessage)
}

export async function countIngestMessages(userId, status = 'pending') {
  const query = { user_id: userId }
  if (status && status !== 'all') query.status = status
  return ingestMessages().countDocuments(query)
}

export async function getIngestMessage(userId, id) {
  return ingestMessages().findOne({ user_id: userId, id: String(id) })
}

export async function claimIngestMessage(userId, id) {
  return ingestMessages().findOneAndUpdate(
    { user_id: userId, id: String(id), status: 'pending' },
    { $set: { status: 'processing', updated_at: new Date() } },
    { returnDocument: 'after' },
  )
}

export async function releaseIngestMessage(userId, id) {
  await ingestMessages().updateOne(
    { user_id: userId, id: String(id), status: 'processing' },
    { $set: { status: 'pending', updated_at: new Date() } },
  )
}

export async function finishIngestMessage(userId, id, status, expenseId = '') {
  const result = await ingestMessages().findOneAndUpdate(
    { user_id: userId, id: String(id) },
    { $set: { status, expense_id: String(expenseId || ''), updated_at: new Date() } },
    { returnDocument: 'after' },
  )
  if (!result) throw new Error('Email message not found')
  return publicIngestMessage(result)
}

function publicIngestMessage(message) {
  const value = { ...message }
  delete value._id
  delete value.user_id
  return {
    ...value,
    received_at: timestamp(value.received_at),
    created_at: timestamp(value.created_at),
    updated_at: timestamp(value.updated_at),
  }
}

export async function getBudgetLimits(userId) {
  const saved = await budgets().findOne({ user_id: userId })
  return {
    budgets: saved ? { daily: saved.daily, weekly: saved.weekly, monthly: saved.monthly } : { daily: 1500, weekly: 6500, monthly: 24000 },
    hasSaved: Boolean(saved),
  }
}

export async function saveBudgetLimits(userId, limits) {
  const saved = {
    user_id: userId,
    daily: limits.daily,
    weekly: limits.weekly,
    monthly: limits.monthly,
    updated_at: new Date(),
  }
  await budgets().updateOne({ user_id: userId }, { $set: saved }, { upsert: true })
  return { daily: saved.daily, weekly: saved.weekly, monthly: saved.monthly }
}

export async function getMonthlyCycle(userId) {
  const now = new Date()
  await userSettings().updateOne(
    { user_id: userId },
    {
      $setOnInsert: {
        user_id: userId,
        monthly_cycle_start: null,
        created_at: now,
        updated_at: now,
      },
    },
    { upsert: true },
  )
  await userSettings().updateOne(
    { user_id: userId, monthly_cycle_start: { $exists: false } },
    { $set: { monthly_cycle_start: null, updated_at: now } },
  )
  const saved = await userSettings().findOne({ user_id: userId }, { projection: { monthly_cycle_start: 1 } })
  return { startDate: saved?.monthly_cycle_start || null }
}

export async function saveMonthlyCycle(userId, startDate) {
  await userSettings().updateOne(
    { user_id: userId },
    { $set: { monthly_cycle_start: startDate, updated_at: new Date() } },
    { upsert: true },
  )
  return { startDate }
}

export const CURRENCY_CODES = ['INR', 'USD', 'EUR', 'GBP']

export async function getUserCurrency(userId) {
  const saved = await userSettings().findOne({ user_id: userId }, { projection: { currency: 1 } })
  const currency = CURRENCY_CODES.includes(saved?.currency) ? saved.currency : 'INR'
  return { currency }
}

export async function saveUserCurrency(userId, currency) {
  if (!CURRENCY_CODES.includes(currency)) throw new Error('Unsupported currency')
  await userSettings().updateOne(
    { user_id: userId },
    { $set: { currency, updated_at: new Date() } },
    { upsert: true },
  )
  return { currency }
}

function expenses() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('expenses')
}

export async function listExpenses(userId, deleted = false) {
  const rows = await expenses().find({ user_id: userId, deletedAt: deleted ? { $ne: '' } : '' }).sort({ date: -1, createdAt: -1 }).toArray()
  return rows.map(publicExpense)
}

export async function createExpense(userId, input) {
  if (!input || typeof input !== 'object') throw new Error('Expense data is required')
  if (!String(input.title || '').trim()) throw new Error('Expense title is required')
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) throw new Error('Expense amount must be greater than zero')
  if (!input.date || !input.dueDate) throw new Error('Expense date and due date are required')
  const expense = normalizeExpense({
    ...input,
    id: input.id || crypto.randomUUID(),
    user_id: userId,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: '',
  })
  await expenses().insertOne(expense)
  return publicExpense(expense)
}

function idQuery(userId, id) {
  const ids = [id, String(id)]
  if (Number.isInteger(Number(id))) ids.push(Number(id))
  return { user_id: userId, id: { $in: ids } }
}

export async function updateExpense(userId, input) {
  if (!input?.id) throw new Error('Expense id is required')
  if (!String(input.title || '').trim()) throw new Error('Expense title is required')
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) throw new Error('Expense amount must be greater than zero')
  if (!input.date || !input.dueDate) throw new Error('Expense date and due date are required')
  const updated = normalizeExpense({ ...input, user_id: userId, updatedAt: new Date().toISOString() })
  const result = await expenses().findOneAndUpdate(idQuery(userId, input.id), { $set: updated }, { returnDocument: 'after' })
  if (!result) throw new Error('Expense not found')
  return publicExpense(result)
}

export async function deleteExpense(userId, id) {
  const now = new Date().toISOString()
  const result = await expenses().findOneAndUpdate(idQuery(userId, id), { $set: { deletedAt: now, updatedAt: now } }, { returnDocument: 'after' })
  if (!result) throw new Error('Expense not found')
  return publicExpense(result)
}

export async function restoreExpense(userId, id) {
  const result = await expenses().findOneAndUpdate(idQuery(userId, id), { $set: { deletedAt: '', updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })
  if (!result) throw new Error('Expense not found')
  return publicExpense(result)
}

export async function purgeExpense(userId, id) {
  const result = await expenses().deleteOne(idQuery(userId, id))
  if (!result.deletedCount) throw new Error('Expense not found')
  return { id, deleted: true, permanent: true }
}

function normalizeExpense(expense) {
  const rawPayments = Array.isArray(expense.splitPayments)
    ? expense.splitPayments
    : (Array.isArray(expense.splitExpense?.payments) ? expense.splitExpense.payments : [])

  const splitPayments = rawPayments.map(p => ({
    name: String(p?.name || '').trim(),
    amount: Number(p?.amount || 0),
  })).filter(p => p.name || p.amount > 0)

  const isSplitEnabled = Boolean(
    expense.splitExpense?.enabled !== undefined
      ? expense.splitExpense.enabled
      : (splitPayments.length > 0)
  )

  const splitExpense = {
    enabled: isSplitEnabled,
    payments: splitPayments,
  }

  return {
    id: String(expense.id || ''),
    user_id: String(expense.user_id || ''),
    title: String(expense.title || '').trim(),
    amount: Number(expense.amount || 0),
    category: String(expense.category || ''),
    payment: String(expense.payment || ''),
    date: dateOnly(expense.date),
    dueDate: dateOnly(expense.dueDate),
    notes: String(expense.notes || ''),
    recurring: expense.recurring === true || String(expense.recurring).toLowerCase() === 'true',
    status: String(expense.status || 'Pending'),
    splitExpense,
    splitPayments,
    createdAt: timestamp(expense.createdAt),
    updatedAt: timestamp(expense.updatedAt),
    deletedAt: timestamp(expense.deletedAt),
  }
}

function publicExpense(expense) {
  const publicValue = { ...normalizeExpense(expense) }
  delete publicValue._id
  delete publicValue.user_id
  return publicValue
}

function dateOnly(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const match = text.match(/^(\d{4}-\d{2}-\d{2})T/)
  return match ? match[1] : ''
}

function timestamp(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  const text = String(value)
  const parsed = new Date(text)
  return isNaN(parsed.getTime()) ? text : parsed.toISOString()
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
