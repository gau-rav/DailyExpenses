import 'dotenv/config'
import { connectDatabase, createAdminUser } from '../server/repositories/databaseRepository.js'
import { getUserByEmail } from '../server/repositories/authRepository.js'
import { hashPassword } from '../server/services/passwordService.js'

async function main() {
  await connectDatabase()
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set; refusing to use default credentials')
  }
  
  const existing = await getUserByEmail(email)
  if (existing) {
    console.log(`Admin user already exists: ${email} (role: ${existing.role})`)
    process.exit(0)
  }
  
  const user = await createAdminUser(email, await hashPassword(password), 'Gaurav', '')
  console.log(`Created admin user: ${user.email} with role: ${user.role}`)
  process.exit(0)
}

main().catch(err => {
  console.error('Failed to create admin user:', err)
  process.exit(1)
})


