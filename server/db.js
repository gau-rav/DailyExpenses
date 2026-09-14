import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const dbPath = process.env.AUTH_DB_PATH || 'data/penny-auth.sqlite'
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true })
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    picture TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
`)

const findUser = db.prepare('SELECT * FROM users WHERE google_sub = ?')
const insertUser = db.prepare(`INSERT INTO users
  (id, google_sub, email, name, picture, email_verified, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
const updateUser = db.prepare(`UPDATE users SET email = ?, name = ?, picture = ?,
  email_verified = ?, updated_at = ? WHERE id = ?`)

export function upsertGoogleUser(profile) {
  const now = new Date().toISOString()
  const existing = findUser.get(profile.sub)
  if (existing) {
    updateUser.run(profile.email, profile.name, profile.picture || '', profile.emailVerified ? 1 : 0, now, existing.id)
    return { ...existing, email: profile.email, name: profile.name, picture: profile.picture || '', email_verified: profile.emailVerified ? 1 : 0 }
  }

  const user = {
    id: crypto.randomUUID(),
    google_sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture || '',
    email_verified: profile.emailVerified ? 1 : 0,
    created_at: now,
    updated_at: now,
  }
  insertUser.run(user.id, user.google_sub, user.email, user.name, user.picture, user.email_verified, user.created_at, user.updated_at)
  return user
}

export function createSession(userId, ttlSeconds = 60 * 60 * 24 * 7) {
  const rawToken = crypto.randomBytes(32).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + ttlSeconds * 1000).toISOString()
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), userId, hashToken(rawToken), expires, now.toISOString())
  return { rawToken, expires }
}

export function getUserBySession(rawToken) {
  if (!rawToken) return null
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(hashToken(rawToken), new Date().toISOString())
  return row || null
}

export function deleteSession(rawToken) {
  if (rawToken) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(rawToken))
}

export function pruneSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString())
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
