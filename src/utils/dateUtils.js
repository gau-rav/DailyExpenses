/**
 * Enhanced date utilities for expense tracking
 * Complements existing appData.js utilities
 */

/**
 * Validates and normalizes a date string
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Normalized date string or empty string
 */
export const validateDateString = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return ''
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return ''
  return dateStr // Return as-is if valid
}

/**
 * Calculates days between two dates
 * @param {string} date1 - First date string
 * @param {string} date2 - Second date string
 * @returns {number} Number of days difference
 */
export const daysDifference = (date1, date2) => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = d2 - d1
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Formats date as relative (e.g., "Tomorrow", "In 3 days", "Overdue")
 * @param {string} dateStr - Date string to compare
 * @param {string} todayStr - Today's date string (default: use current date)
 * @returns {string} Relative date label
 */
export const relativeDate = (dateStr, todayStr) => {
  const today = todayStr || new Date().toISOString().split('T')[0]
  const diffDays = daysDifference(today, dateStr)

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === 7) return 'Next week'
  if (diffDays <= 30) return `In ${diffDays} days`

  // Return full date for dates > 30 days away
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateStr))
}

/**
 * Formats a date range label
 * @param {Object} range - Object with start and end date strings
 * @returns {string} Formatted range label (e.g., "1/2026 - 2/2026")
 */
export const cycleRangeLabel = ({ start, end }) => {
  const [startYear, startMonth] = start.split('-').slice(0, 2).map(Number)
  const [endYear, endMonth] = end.split('-').slice(0, 2).map(Number)
  return `${startMonth}/${startYear} — ${endMonth}/${endYear}`
}

/**
 * Checks if a date is in the past
 * @param {string} dateStr - Date string to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  return date < new Date(today.toDateString())
}

/**
 * Checks if a date is today
 * @param {string} dateStr - Date string to check
 * @returns {boolean} True if date is today
 */
export const isToday = (dateStr) => {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

/**
 * Checks if a date is in the future
 * @param {string} dateStr - Date string to check
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (dateStr) => {
  return !isPastDate(dateStr) && !isToday(dateStr)
}

/**
 * Formats date for display in dialog/modal (e.g., "January 15, 2026")
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
export const formatDateFull = (dateStr) => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateStr))
}
