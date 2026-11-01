import { isValidCycleStartDate, validateBudgetLimits } from '../domain/settingsRules.js'
import { readBudgetLimits, readCurrencySettings, readMonthlyCycle, writeBudgetLimits, writeCurrencySettings, writeMonthlyCycle } from '../services/accountSettingsService.js'

export function createAccountSettingsController({ getUserFromRequest }) {
  return {
    getBudgets: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        res.json({ ok: true, ...await readBudgetLimits(user.id) })
      } catch (error) {
        console.error('Budget read failed', error)
        res.status(500).json({ ok: false, error: 'Unable to load budget limits' })
      }
    },
    saveBudgets: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const limits = validateBudgetLimits(req.body?.budgets)
        if (!limits) return res.status(400).json({ ok: false, error: 'Enter valid daily, weekly, and monthly budget limits' })
        res.json({ ok: true, budgets: await writeBudgetLimits(user.id, limits) })
      } catch (error) {
        console.error('Budget save failed', error)
        res.status(500).json({ ok: false, error: 'Unable to save budget limits' })
      }
    },
    getMonthlyCycle: async (req, res) => {
      res.set('Cache-Control', 'private, no-store')
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        res.json({ ok: true, monthlyCycle: await readMonthlyCycle(user.id) })
      } catch (error) {
        console.error('Monthly cycle read failed', error)
        res.status(500).json({ ok: false, error: 'Unable to load monthly cycle settings' })
      }
    },
    saveMonthlyCycle: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        const startDate = req.body?.startDate
        if (startDate !== null && !isValidCycleStartDate(startDate)) {
          return res.status(400).json({ ok: false, error: 'Choose a cycle start date from the first of last month onward' })
        }
        res.json({ ok: true, monthlyCycle: await writeMonthlyCycle(user.id, startDate) })
      } catch (error) {
        console.error('Monthly cycle save failed', error)
        res.status(500).json({ ok: false, error: 'Unable to save monthly cycle settings' })
      }
    },
    getCurrency: async (req, res) => {
      res.set('Cache-Control', 'private, no-store')
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        res.json({ ok: true, ...await readCurrencySettings(user.id) })
      } catch (error) {
        console.error('User settings read failed', error)
        res.status(500).json({ ok: false, error: 'Unable to load user settings' })
      }
    },
    saveCurrency: async (req, res) => {
      try {
        const user = await getUserFromRequest(req)
        if (!user) return res.status(401).json({ ok: false, error: 'Authentication required' })
        res.json({ ok: true, ...await writeCurrencySettings(user.id, req.body?.currency) })
      } catch (error) {
        console.error('User settings save failed', error)
        res.status(400).json({ ok: false, error: error.message || 'Unable to save user settings' })
      }
    },
  }
}
