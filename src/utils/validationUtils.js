/**
 * Validation utilities for expense forms and other inputs
 */

/**
 * Validates expense data before saving
 * @param {Object} data - Expense data object
 * @returns {Object} Object with error keys and error messages
 */
export const validateExpense = (data) => {
  const errors = {}

  if (!data?.title?.trim()) {
    errors.title = 'Enter a title'
  }

  const amount = Number(data?.amount)
  if (!amount || amount <= 0) {
    errors.amount = 'Enter an amount greater than zero'
  }

  if (!data?.dueDate) {
    errors.dueDate = 'Choose a due date'
  }

  return errors
}

/**
 * Validates email address format
 * @param {string} email - Email address to validate
 * @returns {string} Error message or empty string
 */
export const validateEmail = (email) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address'
  }
  if (email.length > 254) return 'Email must be 254 characters or fewer'
  return ''
}

/**
 * Validates budget limits
 * @param {Object} budgets - Budget limits object with daily, weekly, monthly keys
 * @returns {string|null} Error message or null if valid
 */
export const validateBudget = (budgets) => {
  const keys = ['daily', 'weekly', 'monthly']
  const limits = Object.fromEntries(keys.map(key => [key, Number(budgets[key])]))

  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
      return `Invalid ${key} budget`
    }
  }
  return null
}

/**
 * Validates a numeric input is positive
 * @param {number} value - Value to validate
 * @returns {string} Error message or empty string
 */
export const validatePositiveNumber = (value) => {
  const num = Number(value)
  return (!num || num <= 0) ? 'Must be a positive number' : ''
}

/**
 * Validates required field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Display name for the field
 * @returns {string} Error message or empty string
 */
export const validateRequired = (value, fieldName = 'Field') => {
  return !value?.trim() ? `${fieldName} is required` : ''
}
