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

  // Google OAuth is temporarily disabled. Keep this partial index so password-only
  // users can coexist with any legacy Google users already in the database.
  await database.collection('users').dropIndex('google_sub_1').catch(() => {})
  await database.collection('users').createIndex({ google_sub: 1 }, { unique: true, partialFilterExpression: { google_sub: { $type: 'string' } } })
  await database.collection('users').createIndex({ email: 1 }, { unique: true })
  await database.collection('sessions').createIndex({ token_hash: 1 }, { unique: true })
  await database.collection('sessions').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  await database.collection('expenses').createIndex({ user_id: 1, id: 1 }, { unique: true })
  await database.collection('expenses').createIndex({ user_id: 1, deletedAt: 1 })

  console.log(`Connected to MongoDB database: ${databaseName}`)
}

function users() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('users')
}

function sessions() {
  if (!database) throw new Error('MongoDB is not connected')
  return database.collection('sessions')
}

/* Temporarily disabled: Google OAuth will be re-enabled after email auth is ready.
export async function upsertGoogleUser(profile) {
  const now = new Date()
  const existing = await users().findOne({ google_sub: profile.sub })

  if (existing) {
    const updated = {
      email: profile.email,
      name: profile.name,
      picture: profile.picture || '',
      email_verified: Boolean(profile.emailVerified),
      updated_at: now,
    }
    await users().updateOne({ _id: existing._id }, { $set: updated })
    return { ...existing, ...updated }
  }

  const user = {
    id: crypto.randomUUID(),
    google_sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture || '',
    email_verified: Boolean(profile.emailVerified),
    created_at: now,
    updated_at: now,
  }

  await users().insertOne(user)
  return user
}
*/

export async function upsertPasswordUser(email, name = 'Shikha') {
  const now = new Date()
  const existing = await users().findOne({ email })

  if (existing) {
    const updated = { name, auth_provider: 'password', updated_at: now }
    await users().updateOne({ _id: existing._id }, { $set: updated })
    return { ...existing, ...updated }
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    picture: '',
    auth_provider: 'password',
    email_verified: false,
    created_at: now,
    updated_at: now,
  }

  await users().insertOne(user)
  return user
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

export async function pruneSessions() {
  await sessions().deleteMany({ expires_at: { $lte: new Date() } })
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

export async function updateExpense(userId, input) {
  if (!input?.id) throw new Error('Expense id is required')
  if (!String(input.title || '').trim()) throw new Error('Expense title is required')
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) throw new Error('Expense amount must be greater than zero')
  if (!input.date || !input.dueDate) throw new Error('Expense date and due date are required')
  const updated = normalizeExpense({ ...input, user_id: userId, updatedAt: new Date().toISOString() })
  const result = await expenses().findOneAndUpdate({ user_id: userId, id: input.id }, { $set: updated }, { returnDocument: 'after' })
  if (!result) throw new Error('Expense not found')
  return publicExpense(result)
}

export async function deleteExpense(userId, id) {
  const now = new Date().toISOString()
  const result = await expenses().findOneAndUpdate({ user_id: userId, id }, { $set: { deletedAt: now, updatedAt: now } }, { returnDocument: 'after' })
  if (!result) throw new Error('Expense not found')
  return publicExpense(result)
}

export async function restoreExpense(userId, id) {
  const result = await expenses().findOneAndUpdate({ user_id: userId, id }, { $set: { deletedAt: '', updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })
  if (!result) throw new Error('Expense not found')
  return publicExpense(result)
}

export async function purgeExpense(userId, id) {
  const result = await expenses().deleteOne({ user_id: userId, id })
  if (!result.deletedCount) throw new Error('Expense not found')
  return { id, deleted: true, permanent: true }
}

function normalizeExpense(expense) {
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
    createdAt: timestamp(expense.createdAt),
    updatedAt: timestamp(expense.updatedAt),
    deletedAt: timestamp(expense.deletedAt),
  }
}

function publicExpense(expense) {
  const { _id, user_id, ...publicValue } = expense
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
