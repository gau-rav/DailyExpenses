import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, storedKey] = String(storedHash).split(':')
  if (algorithm !== 'scrypt' || !salt || !/^[a-f\d]{128}$/i.test(storedKey || '')) return false
  const derivedKey = await scrypt(password, salt, 64)
  return crypto.timingSafeEqual(derivedKey, Buffer.from(storedKey, 'hex'))
}
