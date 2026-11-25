import { useEffect, useState } from 'react'
import { adminMe } from '../services/adminApi'

export function useAdminAuth() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminMe()
      .then(data => {
        if (!active) return
        if (data?.authenticated) setAdmin(data.user)
        else setAdmin(null)
      })
      .catch(() => {
        if (active) setAdmin(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { admin, loading, setAdmin }
}
