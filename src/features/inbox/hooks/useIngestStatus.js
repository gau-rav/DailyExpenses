import { useCallback, useEffect, useState } from 'react'
import { fetchIngestStatus } from '../services/ingestService.js'

const emptyGmailStatus = {
  connected: false,
  configured: false,
  loaded: false,
  email: '',
  status: 'disconnected',
  lastSyncAt: '',
  lastError: '',
  syncInProgress: false,
}

function normalizeIngestStatus(data) {
  return {
    enabled: data.enabled,
    autoAdd: data.autoAdd,
    connected: data.connected,
    pendingCount: data.pendingCount || 0,
    gmail: { ...(data.gmail || emptyGmailStatus), loaded: true },
  }
}

/** @param {boolean} authenticated */
export function useIngestStatus(authenticated) {
  const [ingestStatus, setIngestStatus] = useState({
    enabled: false,
    autoAdd: false,
    connected: false,
    pendingCount: 0,
    gmail: emptyGmailStatus,
  })

  const refreshIngestStatus = useCallback(async () => {
    try {
      const data = await fetchIngestStatus()
      setIngestStatus(normalizeIngestStatus(data))
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!authenticated) return undefined
    let active = true
    fetchIngestStatus()
      .then(data => {
        if (active) setIngestStatus(normalizeIngestStatus(data))
      })
      .catch(() => {})
    return () => { active = false }
  }, [authenticated])

  return { ingestStatus, refreshIngestStatus }
}
