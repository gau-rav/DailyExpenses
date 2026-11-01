import { createPasswordUser, createSession, deleteSession, deleteUserSessions, getUserByEmail, setPasswordHash } from '../repositories/authRepository.js'
import { hashPassword, verifyPassword } from './passwordService.js'

export async function registerPasswordAccount(email, password, firstName, lastName) {
  const user = await createPasswordUser(email, await hashPassword(password), firstName, lastName)
  return { user, session: await createSession(user.id) }
}

export async function loginPasswordAccount(email, password, dummyEmail, dummyPassword) {
  let user = await getUserByEmail(email)
  if (!user && email === dummyEmail && password === dummyPassword) {
    user = await createPasswordUser(email, await hashPassword(password))
  }
  if (!user) return null

  if (user.password_hash) {
    if (!await verifyPassword(password, user.password_hash)) return null
  } else if (email === dummyEmail && password === dummyPassword) {
    await setPasswordHash(user.id, await hashPassword(password))
  } else {
    return null
  }

  return { user, session: await createSession(user.id) }
}

export async function resetPasswordAccount(email, currentPassword, newPassword) {
  const user = await getUserByEmail(email)
  if (!user?.password_hash || !await verifyPassword(currentPassword, user.password_hash)) return null
  await setPasswordHash(user.id, await hashPassword(newPassword))
  await deleteUserSessions(user.id)
  return { user, session: await createSession(user.id) }
}

export async function changePasswordAccount(user, currentPassword, newPassword) {
  if (!user.password_hash || !await verifyPassword(currentPassword, user.password_hash)) return null
  await setPasswordHash(user.id, await hashPassword(newPassword))
  await deleteUserSessions(user.id)
  return createSession(user.id)
}

export const logoutSession = token => deleteSession(token)
