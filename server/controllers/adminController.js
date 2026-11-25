import { countAllUsers, getExpenseStatsForUser, getGlobalAdminStats, getUserById, listAdminAuditLogs, listAllUsers, logAdminAction } from '../repositories/authRepository.js'
import { listExpensesByUserId as listExpensesByUserIdFull } from '../repositories/databaseRepository.js'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pageNumber(value, fallback, maximum) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.min(maximum, Math.trunc(number)))
}

export function createAdminController() {
  return {
    overview: async (req, res) => {
      try {
        const admin = req.adminUser
        const stats = await getGlobalAdminStats()
        await logAdminAction({ adminId: admin.id, action: 'admin_view_overview', ip: req.ip, userAgent: req.headers['user-agent'] })
        res.json({ ok: true, ...stats })
      } catch (error) {
        console.error('Admin overview failed', error)
        res.status(500).json({ ok: false, error: 'Unable to load overview' })
      }
    },
    listUsers: async (req, res) => {
      try {
        const admin = req.adminUser
        const limit = pageNumber(req.query.limit, 50, 100)
        const skip = pageNumber(req.query.skip, 0, 1_000_000)
        const q = {}
        if (req.query.search) {
          const s = String(req.query.search).trim().slice(0, 100)
          q.$or = [
            { email: { $regex: escapeRegex(s), $options: 'i' } },
            { name: { $regex: escapeRegex(s), $options: 'i' } },
          ]
        }
        if (req.query.role && ['user', 'admin'].includes(String(req.query.role))) q.role = String(req.query.role)
        const [users, total] = await Promise.all([listAllUsers({ limit, skip, query: q }), countAllUsers(q)])
        await logAdminAction({ adminId: admin.id, action: 'admin_list_users', ip: req.ip, userAgent: req.headers['user-agent'], details: { limit, skip, search: req.query.search, role: req.query.role } })
        res.json({ ok: true, users: users.map(u => ({ id: u.id, email: u.email, name: u.name, firstName: u.first_name, lastName: u.last_name, role: u.role, authProvider: u.auth_provider, createdAt: u.created_at })), total, limit, skip })
      } catch (error) {
        console.error('Admin list users failed', error)
        res.status(500).json({ ok: false, error: 'Unable to list users' })
      }
    },
    getUser: async (req, res) => {
      try {
        const admin = req.adminUser
        const userId = String(req.params.userId)
        const user = await getUserById(userId)
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' })
        const stats = await getExpenseStatsForUser(userId)
        await logAdminAction({ adminId: admin.id, action: 'admin_view_user', targetUserId: userId, ip: req.ip, userAgent: req.headers['user-agent'] })
        res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, firstName: user.first_name, lastName: user.last_name, role: user.role, authProvider: user.auth_provider, createdAt: user.created_at }, stats })
      } catch (error) {
        console.error('Admin get user failed', error)
        res.status(500).json({ ok: false, error: 'Unable to get user' })
      }
    },
    getUserExpenses: async (req, res) => {
      try {
        const admin = req.adminUser
        const userId = String(req.params.userId)
        const includeDeleted = String(req.query.includeDeleted) === 'true'
        const limit = pageNumber(req.query.limit, 100, 200)
        const skip = pageNumber(req.query.skip, 0, 1_000_000)
        const expenses = await listExpensesByUserIdFull(userId, { includeDeleted, limit, skip })
        await logAdminAction({ adminId: admin.id, action: 'admin_view_user_expenses', targetUserId: userId, ip: req.ip, userAgent: req.headers['user-agent'], details: { includeDeleted, limit, skip } })
        res.json({ ok: true, expenses, limit, skip, hasMore: expenses.length === limit })
      } catch (error) {
        console.error('Admin get user expenses failed', error)
        res.status(500).json({ ok: false, error: 'Unable to get user expenses' })
      }
    },
    getAuditLogs: async (req, res) => {
      try {
        const limit = Number(req.query.limit) || 100
        const skip = Number(req.query.skip) || 0
        const logs = await listAdminAuditLogs({ limit, skip })
        res.json({ ok: true, logs, limit, skip })
      } catch (error) {
        console.error('Admin audit logs failed', error)
        res.status(500).json({ ok: false, error: 'Unable to get audit logs' })
      }
    },
  }
}
