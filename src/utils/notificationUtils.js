/**
 * Toast notification utilities
 * Provides easy-to-use toast notification functions
 */

/**
 * Shows a toast notification
 * @param {string} message - Notification message
 * @param {number} duration - Duration in milliseconds (default: 3000)
 * @returns {HTMLElement|null} The toast element or null
 */
export const showToast = (message, duration = 3000) => {
  // Remove existing toast if any
  const existing = document.querySelector('.toast')
  if (existing) {
    existing.remove()
  }

  if (!message?.trim()) return null

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.innerHTML = `✓ &nbsp;${message}`

  if (duration) {
    setTimeout(() => toast.remove(), duration)
  }

  document.body.appendChild(toast)
  return toast
}

/**
 * Shows an error toast notification
 * @param {string} message - Error message
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
export const showError = (message, duration = 5000) => {
  showToast(message, duration)
}

/**
 * Shows a success toast notification
 * @param {string} message - Success message
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export const showSuccess = (message, duration = 3000) => {
  showToast(message, duration)
}

/**
 * Shows an info toast notification
 * @param {string} message - Info message
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export const showInfo = (message, duration = 4000) => {
  showToast(message, duration)
}
