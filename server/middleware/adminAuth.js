export function requireAdmin(getAdminUserFromRequest) {
  return async (req, res, next) => {
    try {
      // Call with just req since the function expects it
      const user = await getAdminUserFromRequest(req)
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' })
      }
      req.adminUser = user
      next()
    } catch (error) {
      console.error('Admin auth middleware failed', error)
      return res.status(500).json({ ok: false, error: 'Unable to verify admin access' })
    }
  }
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket?.remoteAddress || ''
}
