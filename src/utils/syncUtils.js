/**
 * Offline Sync Utilities
 * Handles sync state, timestamps, retry logic, and offline recovery
 */

/**
 * Get sync status based on last sync time
 * @param {string} lastSyncTime - ISO string of last sync
 * @returns {Object} Sync status with metadata
 */
export function getSyncStatus(lastSyncTime) {
  const now = new Date()
  const lastSync = lastSyncTime ? new Date(lastSyncTime) : null

  if (!lastSync) {
    return {
      status: 'never_synced',
      message: 'Not synced yet',
      offline: true,
      canRetry: false,
      sinceText: 'Never'
    }
  }

  const diffMinutes = Math.floor((now - lastSync) / (1000 * 60))
  const isOffline = diffMinutes > 5 // Offline if > 5 minutes since last sync

  let status = 'online'
  let message = `Synced ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  if (isOffline) {
    status = 'offline'
    message = `Offline (${diffMinutes} minutes)`
  } else if (diffMinutes > 1) {
    status = 'pending'
    message = `Syncing (${diffMinutes} minutes ago)`
  }

  return {
    status,
    message,
    offline: isOffline,
    canRetry: isOffline || diffMinutes > 1,
    sinceText: diffMinutes < 60 ? `${diffMinutes} min ago` : `${Math.floor(diffMinutes / 60)}h ago`
  }
}

/**
 * Store last sync timestamp in localStorage
 * @param {string} source - Source of sync ('remote', 'cache', 'manual')
 */
export function setLastSyncTimestamp(source = 'manual') {
  try {
    localStorage.setItem('penny-last-sync', JSON.stringify({
      timestamp: new Date().toISOString(),
      source
    }))
  } catch (error) {
    console.error('Failed to save last sync timestamp:', error)
  }
}

/**
 * Get last sync timestamp from localStorage
 * @returns {Object|null} Last sync data or null
 */
export function getLastSyncTimestamp() {
  try {
    const stored = localStorage.getItem('penny-last-sync')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Failed to read last sync timestamp:', error)
    return null
  }
}

/**
 * Get user-readable sync message
 * @param {Object} syncData - Sync data from getLastSyncTimestamp()
 * @returns {string} Human-readable sync message
 */
export function getSyncMessage(syncData) {
  if (!syncData || !syncData.timestamp) {
    return 'Not synced yet'
  }

  const syncDate = new Date(syncData.timestamp)
  const now = new Date()
  const diffMinutes = Math.floor((now - syncDate) / (1000 * 60))

  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  } else {
    const days = Math.floor(diffMinutes / 1440)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
}

/**
 * Check if network is available
 * @returns {Promise<boolean>} True if online
 */
export async function isNetworkAvailable() {
  try {
    // Try multiple strategies
    if (navigator.onLine === false) return false

    // Lightweight fetch to check connectivity
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    await fetch('/api/ping', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
      mode: 'no-cors' // For CORS failures
    }).catch(() => { /* Ignore errors for no-cors */ })
    clearTimeout(timeout)

    return true
  } catch (error) {
    return false
  }
}

/**
 * Retry sync with exponential backoff
 * @param {Function} syncFunction - Sync function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Sync result
 */
export async function retrySync(syncFunction, options = {}) {
  const maxRetries = options.maxRetries || 3
  const initialDelay = options.initialDelay || 1000
  const maxDelay = options.maxDelay || 10000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check network before attempting
      const isOnline = await isNetworkAvailable()
      if (!isOnline) {
        throw new Error('Network unavailable')
      }

      const result = await syncFunction()
      setLastSyncTimestamp('remote')
      return result
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
      const jitter = Math.random() * 0.3 * delay // Add 0-30% jitter
      const waitTime = delay + jitter

      console.log(`Sync attempt ${attempt} failed, retrying in ${Math.round(waitTime / 1000)}s`, error)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

/**
 * Queue offline action for later sync
 * @param {string} action - Action type ('add', 'update', 'delete')
 * @param {Object} data - Action data
 */
export function queueOfflineAction(action, data) {
  try {
    const queueKey = 'penny-offline-actions'
    const currentQueue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    const newAction = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      action,
      data,
      queuedAt: new Date().toISOString()
    }

    localStorage.setItem(queueKey, JSON.stringify([...currentQueue, newAction]))
    return newAction.id
  } catch (error) {
    console.error('Failed to queue offline action:', error)
    return null
  }
}

/**
 * Get queued offline actions
 * @returns {Array} Queued actions
 */
export function getQueuedOfflineActions() {
  try {
    const queueKey = 'penny-offline-actions'
    return JSON.parse(localStorage.getItem(queueKey) || '[]')
  } catch (error) {
    console.error('Failed to read queued offline actions:', error)
    return []
  }
}

/**
 * Process queued offline actions (to be called when network returns)
 * @param {Function} actionProcessor - Function to process each action
 */
export async function processQueuedActions(actionProcessor) {
  try {
    const queueKey = 'penny-offline-actions'
    const actions = JSON.parse(localStorage.getItem(queueKey) || '[]')

    if (actions.length === 0) {
      return { processed: 0, failed: 0 }
    }

    let processed = 0
    let failed = 0
    const errors = []

    for (const action of actions) {
      try {
        await actionProcessor(action)
        processed++
      } catch (error) {
        failed++
        errors.push({ id: action.id, error: error.message })
      }
    }

    // Keep failed actions for retry
    const failedActions = actions.filter((_, index) => {
      const actionId = actions[index].id
      return errors.some(e => e.id === actionId)
    })

    localStorage.setItem(queueKey, JSON.stringify(failedActions))

    return { processed, failed, errors }
  } catch (error) {
    console.error('Failed to process queued actions:', error)
    return { processed: 0, failed: actions.length, errors: [error.message] }
  }
}

/**
 * Clear processed offline actions
 * @param {Array} processedIds - IDs of processed actions
 */
export function clearProcessedActions(processedIds) {
  try {
    const queueKey = 'penny-offline-actions'
    const actions = JSON.parse(localStorage.getItem(queueKey) || '[]')
    const remaining = actions.filter(action => !processedIds.includes(action.id))
    localStorage.setItem(queueKey, JSON.stringify(remaining))
  } catch (error) {
    console.error('Failed to clear processed actions:', error)
  }
}

/**
 * Show offline toast notification
 * @param {string} message - Notification message
 * @returns {Function} Function to hide notification
 */
export function showOfflineNotification(message) {
  // This would typically show a toast or banner
  console.log('[Offline]', message)

  // In a real app, this would update UI state
  return () => console.log('[Offline] Notification dismissed')
}

/**
 * Force sync immediately (user triggered)
 * @param {Function} syncFunction - Function to perform sync
 * @returns {Promise} Sync result
 */
export async function forceSync(syncFunction) {
  try {
    const isOnline = await isNetworkAvailable()
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }

    showOfflineNotification('Syncing...')
    const result = await syncFunction()
    setLastSyncTimestamp('manual')
    showOfflineNotification('Sync complete')

    return result
  } catch (error) {
    showOfflineNotification(`Sync failed: ${error.message}`)
    throw error
  }
}