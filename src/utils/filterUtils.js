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