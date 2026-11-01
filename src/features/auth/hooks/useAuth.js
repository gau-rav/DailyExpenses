import { useCallback, useEffect, useState } from 'react'
import { endCurrentSession, fetchCurrentUser } from '../services/authService.js'

/** @typedef {{id: string, email: string, name?: string, firstName?: string, lastName?: string}} AuthUser */

export function useAuth() {
  const [authUser, setAuthUser] = useState(/** @type {AuthUser | null | undefined} */ (undefined))

  useEffect(() => {
    let active = true
    fetchCurrentUser()
      .then(data => { if (active) setAuthUser(data?.user || null) })
      .catch(() => { if (active) setAuthUser(null) })
    return () => { active = false }
  }, [])

  const logout = useCallback(async () => {
    await endCurrentSession()
    setAuthUser(null)
  }, [])

  return { authUser, logout }
}
