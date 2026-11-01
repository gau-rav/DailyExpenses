import { acceptIngestMessage, getIngestStatus, ignoreIngestMessage, IngestError, listCapturedMessages, saveIngestPreferences } from '../services/ingestService.js'
import { getGmailStatus } from '../repositories/gmailRepository.js'
import { isGmailConfigured } from '../services/gmailAuthService.js'
import { isTokenEncryptionConfigured } from '../gmailTokenCrypto.js'

export function createIngestController({ getUserFromRequest }) {
  return {
    getStatus: async (req, res) => {
      res.set('Cache-Control', 'private, no-store')
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const [status, gmail] = await Promise.all([getIngestStatus(user.id), getGmailStatus(user.id)])
        res.json({ ok: true, ...status, gmail: { ...gmail, configured: isGmailConfigured() && isTokenEncryptionConfigured() } })
      } catch (error) {
        console.error('Ingest status read failed', error)
        res.status(500).json({ ok: false, error: 'Unable to load email capture status' })
      }
    },
    getMessages: async (req, res) => {
      res.set('Cache-Control', 'private, no-store')
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const status = String(req.query.status || 'pending')
        if (!['pending', 'added', 'ignored', 'all'].includes(status)) {
          return res.status(400).json({ ok: false, error: 'Invalid message status' })
        }
        const messages = await listCapturedMessages(user.id, status, req.query.limit)
        res.json({ ok: true, messages })
      } catch (error) {
        console.error('Ingest messages read failed', error)
        res.status(500).json({ ok: false, error: 'Unable to load captured emails' })
      }
    },
    updateMessage: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const action = String(req.body?.action || '')
        let result
        if (action === 'accept') result = await acceptIngestMessage(user.id, req.params.id, req.body?.expense)
        else if (action === 'ignore') result = await ignoreIngestMessage(user.id, req.params.id)
        else return res.status(400).json({ ok: false, error: 'Action must be accept or ignore' })
        res.json({ ok: true, ...result })
      } catch (error) {
        if (error instanceof IngestError) return res.status(error.status).json({ ok: false, error: error.message })
        console.error('Ingest message update failed', error)
        res.status(400).json({ ok: false, error: error.message || 'Unable to update captured email' })
      }
    },
    saveSettings: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const { enabled, autoAdd } = req.body || {}
        if (enabled === undefined && autoAdd === undefined) {
          return res.status(400).json({ ok: false, error: 'Provide enabled or autoAdd' })
        }
        if ((enabled !== undefined && typeof enabled !== 'boolean') || (autoAdd !== undefined && typeof autoAdd !== 'boolean')) {
          return res.status(400).json({ ok: false, error: 'Settings must be true or false' })
        }
        res.json({ ok: true, settings: await saveIngestPreferences(user.id, { enabled, autoAdd }) })
      } catch (error) {
        console.error('Ingest settings save failed', error)
        res.status(500).json({ ok: false, error: 'Unable to save email capture settings' })
      }
    },
  }
}
