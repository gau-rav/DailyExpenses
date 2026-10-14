/**
 * Cache utilities for localStorage operations
 */

const CACHE_KEYS = {
  EXPENSES: 'penny-expenses',
  TRASH: 'penny-trash',
  BUDGETS_PREFIX: 'penny-budgets',
  THEME: 'penny-theme',
  SESSION_TIMEOUT: 'penny-stay-logged-in',
}

/**
 * Reads expense cache from localStorage
 * @returns {Array} Array of expenses from cache
 */
export const readExpenseCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEYS.EXPENSES) || '[]')
  } catch {
    return []
  }
}

/**
 * Writes expense cache to localStorage
 * @param {Array} expenses - Array of expenses to cache
 */
export const writeExpenseCache = (expenses) => {
  localStorage.setItem(CACHE_KEYS.EXPENSES, JSON.stringify(expenses))
}

/**
 * Reads trash cache from localStorage
 * @returns {Array} Array of deleted expenses
 */
export const readTrashCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEYS.TRASH) || '[]')
  } catch {
    return []
  }
}

/**
 * Writes trash cache to localStorage
 * @param {Array} trash - Array of deleted expenses
 */
export const writeTrashCache = (trash) => {
  localStorage.setItem(CACHE_KEYS.TRASH, JSON.stringify(trash))
}

/**
 * Reads budget cache for a specific user
 * @param {string} userId - User ID
 * @returns {Object|null} Budget object or null
 */
export const readBudgetCache = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(`${CACHE_KEYS.BUDGETS_PREFIX}:${userId}`) || 'null')
  } catch {
    return null
  }
}

/**
 * Writes budget cache for a specific user
 * @param {string} userId - User ID
 * @param {Object} budgets - Budget object
 */
export const writeBudgetCache = (userId, budgets) => {
  localStorage.setItem(`${CACHE_KEYS.BUDGETS_PREFIX}:${userId}`, JSON.stringify(budgets))
}

/**
 * Clears budget cache for a specific user
 * @param {string} userId - User ID
 */
export const clearBudgetCache = (userId) => {
  localStorage.removeItem(`${CACHE_KEYS.BUDGETS_PREFIX}:${userId}`)
}

/**
 * Reads theme preference from localStorage
 * @returns {string|null} Theme ('dark' or 'light') or null
 */
export const readThemeCache = () => {
  return localStorage.getItem(CACHE_KEYS.THEME)
}

/**
 * Writes theme preference to localStorage
 * @param {string} theme - Theme to set
 */
export const writeThemeCache = (theme) => {
  localStorage.setItem(CACHE_KEYS.THEME, theme)
}

/**
 * Reads session timeout preference
 * @returns {boolean} True if user wants to stay signed in
 */
export const readSessionTimeoutCache = () => {
  return localStorage.getItem(CACHE_KEYS.SESSION_TIMEOUT) === 'true'
}

/**
 * Writes session timeout preference
 * @param {boolean} shouldStaySignedIn - Whether to enable session timeout
 */
export const writeSessionTimeoutCache = (shouldStaySignedIn) => {
  localStorage.setItem(CACHE_KEYS.SESSION_TIMEOUT, String(shouldStaySignedIn))
}

/**
 * Clears all auth-related cache entries
 */
export const clearAuthCache = () => {
  Object.values(CACHE_KEYS).forEach(key => {
    if (key.startsWith('penny-')) {
      localStorage.removeItem(key)
    }
  })
}

/**
 * Clears all cached data
 */
export const clearAllCache = () => {
  Object.keys(localStorage)
    .filter(key => key.startsWith('penny-'))
    .forEach(key => localStorage.removeItem(key))
}

/**
 * Gets cache statistics (optional debugging)
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  const stats = {}
  Object.keys(localStorage)
    .filter(key => key.startsWith('penny-'))
    .forEach(key => {
      const value = localStorage.getItem(key)
      stats[key] = value ? JSON.stringify(value).length : 0
    })
  return stats
}
