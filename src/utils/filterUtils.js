/**
 * Filter Utility for Navigation
 * Generates smart filters based on expense data
 */

/**
 * Get Due Today filter
 * @param {Array} expenses - All expenses
 * @returns {Object} Filter object
 */
export function getDueTodayFilter(expenses) {
  const today = new Date()
  const dueToday = expenses.filter(e => {
    const due = new Date(e.dueDate)
    return due.toDateString() === today.toDateString() && e.status !== 'Paid'
  })

  return {
    id: 'due-today',
    label: `Due today (${dueToday.length})`,
    icon: '⚡',
    query: { status: 'Due Today' }
  }
}

/**
 * Get Over budget filter
 * @param {Array} expenses - All expenses
 * @param {number} maxBudget - Maximum budget value
 * @returns {Object} Filter object
 */
export function getOverBudgetFilter(expenses, maxBudget = 100000) {
  const overBudget = expenses.filter(e => e.amount > maxBudget)

  return {
    id: 'over-budget',
    label: `Over ₹${maxBudget.toLocaleString()} (${overBudget.length})`,
    icon: '⚠️',
    query: { minAmount: maxBudget }
  }
}

/**
 * Get Recent filter
 * @param {Array} expenses - All expenses
 * @param {number} days - Number of days to consider as recent (default: 7)
 * @returns {Object} Filter object
 */
export function getRecentFilter(expenses, days = 7) {
  const now = new Date()
  const recent = expenses.filter(e => {
    if (!e.date) return false
    const expenseDate = new Date(e.date)
    const diffDays = Math.floor((now - expenseDate) / (1000 * 60 * 60 * 24))
    return diffDays <= days
  })

  if (recent.length === 0) return null

  return {
    id: 'recent',
    label: `Last ${days} days (${recent.length})`,
    icon: '📅',
    query: { days }
  }
}

/**
 * Get Category filter
 * @param {Array} expenses - All expenses
 * @param {string} category - Category to filter by
 * @returns {Object} Filter object
 */
export function getCategoryFilter(category) {
  return {
    id: `category-${category}`,
    label: category,
    icon: '🏷️',
    query: { category }
  }
}

/**
 * Get multiple category filters based on top categories
 * @param {Array} expenses - All expenses
 * @param {number} limit - Number of categories to include (default: 3)
 * @returns {Array} Array of filter objects
 */
export function getTopCategoryFilters(expenses, limit = 3) {
  const categoryCounts = {}
  const now = new Date()
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  expenses.forEach(e => {
    if (!e.date || !e.category) return
    const expenseDate = new Date(e.date)
    if (expenseDate >= oneMonthAgo) {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1
    }
  })

  const sorted = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return sorted.map(({ category }) => getCategoryFilter(category))
}

/**
 * Generate filters for Expenses Page
 * @param {Array} expenses - All expenses
 * @param {number} maxBudget - Maximum budget value
 * @param {number} days - Number of days for recent filter
 * @returns {Array} Array of filter objects
 */
export function generateExpensePageFilters(expenses, maxBudget = 100000, days = 7) {
  return [
    getDueTodayFilter(expenses),
    getOverBudgetFilter(expenses, maxBudget),
    getRecentFilter(expenses, days),
    ...getTopCategoryFilters(expenses, 3)
  ].filter(Boolean) // Remove null filters
}

/**
 * Generate filters for Due Page
 * @param {Array} expenses - All expenses due today
 * @returns {Array} Array of filter objects
 */
export function generateDuePageFilters(expenses) {
  return [
    getDueTodayFilter(expenses),
    ...getTopCategoryFilters(expenses, 2)
  ].filter(Boolean)
}

/**
 * Generate filters for Calendar Page
 * @param {Array} expenses - All expenses
 * @param {number} maxBudget - Maximum budget value
 * @returns {Array} Array of filter objects
 */
export function generateCalendarPageFilters(expenses, maxBudget = 100000) {
  return [
    getRecentFilter(expenses, 7),
    ...getTopCategoryFilters(expenses, 2)
  ].filter(Boolean)
}