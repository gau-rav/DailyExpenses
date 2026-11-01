import { closeDatabase, connectDatabase } from './repositories/databaseRepository.js'
import { syncAllGmailAccounts } from './services/gmailSyncService.js'

try {
  await connectDatabase()
  const result = await syncAllGmailAccounts()
  console.log('Gmail sync completed', {
    accounts: result.accounts,
    imported: result.imported,
    ignored: result.ignored,
    duplicates: result.duplicates,
    failed: result.failed,
  })
} catch (error) {
  console.error('Gmail sync job failed', error)
  process.exitCode = 1
} finally {
  await closeDatabase().catch(() => {})
}
