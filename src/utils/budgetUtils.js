/**
 * Budget Intelligence Utilities
 * AI-powered budget suggestions and progress tracking
 */

/**
 * Calculate budget suggestion based on historical spending patterns
 * @param {Array} expenses - Array of expense objects
 * @Returns {Object} Budget suggestion with metadata
 */
export function suggestBudget(expenses, monthsToAnalyze = 12) {
  if (!expenses || expenses.length === 0) {
    return {
      suggestion: null,
      confidence: 0,
      reasons: ['Not enough data to suggest a budget']
    }
  }

  // Extract month strings from expense dates
  const monthlyExpenses = expenses.filter(e => e.date).map(e => {
    const date = new Date(e.date)
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      amount: e.amount,
      category: e.category
    }
  })

  if (monthlyExpenses.length < 6) {
    return {
      suggestion: null,
      confidence: Math.min(monthlyExpenses.length / 3, 0.7),
      reasons: ['Less than 6 months of data — suggestion incomplete']
    }
  }

  // Analyze spending by month with adjustments for seasonality
  const monthlyTotals = {}
  const seasonalityAdjustment = {}

  monthlyExpenses.forEach(e => {
    const key = `${e.year}-${String(e.month + 1).padStart(2, '0')}`
    if (!monthlyTotals[key]) {
      monthlyTotals[key] = { total: 0, count: 0 }
    }
    monthlyTotals[key].total += e.amount
    monthlyTotals[key].count += 1
  })

  // Calculate average by month (to detect seasonality)
  const avgSpend = Object.values(monthlyTotals).reduce((sum, m) => sum + m.total, 0) / Object.keys(monthlyTotals).length

  // Detect highest months to identify seasonality
  const sortedMonths = [...Object.entries(monthlyTotals)]
    .map(([key, data]) => ({
      key,
      avg: data.total / data.count
    }))
    .sort((a, b) => b.avg - a.avg)

  // If there's significant seasonality (more than 20% variation between months)
  const highSeasonality = sortedMonths[0].avg > (sortedMonths[sortedMonths.length - 1].avg * 1.2)

  let baseSuggestion = avgSpend

  // Adjust for seasonality
  if (highSeasonality) {
    // Suggest slightly higher budget to accommodate peak months
    baseSuggestion = avgSpend * 1.15
    seasonalityAdjustment.reason = 'Peak-month spending detected (adjust monthly budget +15%)'
  }

  // Calculate standard deviation to identify outlier months
  const monthlyValues = Object.values(monthlyTotals).map(m => m.total / m.count)
  const mean = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
  const variance = monthlyValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthlyValues.length
  const stdDev = Math.sqrt(variance)

  // Suggest a buffer based on volatility
  const bufferPercent = stdDev > mean * 0.2 ? 1.2 : 1.1 // 20% volatility = 110% buffer

  const suggestion = Math.round(baseSuggestion * bufferPercent)

  // Calculate confidence based on data quality
  const confidence = Math.min(monthlyExpenses.length / 6, 0.9)

  // Generate explanation with insights
  const explanations = []
  if (highSeasonality) {
    explanations.push('Peak-month spending adjusted (+15%)')
  }
  if (stdDev / mean > 0.15) {
    explanations.push('High monthly volatility detected')
  }
  explanations.push(`${monthlyExpenses.length} months of history`)

  return {
    suggestion,
    confidence,
    reasons: explanations,
    meta: {
      baseTotal: Math.round(avgSpend),
      stdDev: Math.round(stdDev),
      volatility: Math.round((stdDev / mean) * 100),
      highSeasonality,
      dataPoints: monthlyExpenses.length
    }
  }
}

/**
 * Check if budget warning banner should be shown
 * @param {number} used - Current budget usage (e.g., monthSpend)
 * @param {number} total - Total budget amount
 * @param {number[]} previouslyShownBanners - Array of already-triggered thresholds
 * @Returns {Object} Status and next threshold to show
 */
export function checkBudgetWarningBanner(used, total, previouslyShownBanners = []) {
  if (total <= 0) {
    return { shouldShow: false, reason: 'No budget set' }
  }

  const percentage = (used / total) * 100
  const thresholds = [60, 70, 80]

  // Find next threshold that hasn't been shown
  const nextThreshold = thresholds
    .filter(t => t < percentage && !previouslyShownBanners.includes(t))
    .sort((a, b) => a - b)[0]

  if (!nextThreshold) {
    return { shouldShow: false, reason: 'Already at or above budget' }
  }

  // Check if user has taken action (reset the banner)
  if (previouslyShownBanners === 'resolved') {
    return { shouldShow: false, reason: 'Warning acknowledged' }
  }

  return {
    shouldShow: true,
    threshold: nextThreshold,
    remainingPercent: nextThreshold - percentage,
    totalRemaining: Math.round(total * (nextThreshold - percentage) / 100)
  }
}

/**
 * Calculate smart spending prediction
 * @param {Array} expenses - Monthly expense history
 * @param {number} currentSpend - Current spends for the month
 * @param {number} targetDateFor - Date for projection
 * @Returns {Object} Forecast and savings opportunity
 */
export function predictSpending(expenses, currentSpend, targetDateFor = 10) {
  if (!expenses || expenses.length < 3) {
    return {
      forecast: null,
      savingsOpportunity: 0,
      insight: 'Add more expenses for personalized predictions'
    }
  }

  // Calculate average spending per day (based on day of month)
  const dailySpendingByDay = {}
  const dailyCountsByDay = {}

  expenses.forEach(e => {
    const date = new Date(e.date)
    const dayOfMonth = date.getDate()
    if (!dailySpendingByDay[dayOfMonth]) {
      dailySpendingByDay[dayOfMonth] = 0
      dailyCountsByDay[dayOfMonth] = 0
    }
    dailySpendingByDay[dayOfMonth] += e.amount
    dailyCountsByDay[dayOfMonth] += 1
  })

  // Calculate average spend for upcoming days
  const upcomingDays = []
  for (let day = 1; day <= targetDateFor; day++) {
    if (dailyCountsByDay[day] > 0) {
      upcomingDays.push(dailySpendingByDay[day] / dailyCountsByDay[day])
    }
  }

  const avgUpcomingDay = upcomingDays.length > 0
    ? upcomingDays.reduce((a, b) => a + b, 0) / upcomingDays.length
    : null

  if (!avgUpcomingDay) {
    return {
      forecast: null,
      savingsOpportunity: 0,
      insight: 'Add more expenses for personalized predictions'
    }
  }

  // Predict remaining spend
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const remainingDays = daysInMonth - targetDateFor
  const predictedEndOfMonth = currentSpend + (avgUpcomingDay * remainingDays)

  // Calculate savings opportunity
  // Compare with current budget's mid-point
  const savingsOpportunity = Math.max(0, Math.round((predictedEndOfMonth - avgUpcomingDay * daysInMonth) * 0.1))

  return {
    forecast: {
      currentSpend,
      predictedEndOfMonth,
      avgDailyRemaining: Math.round(predictedEndOfMonth / remainingDays)
    },
    savingsOpportunity,
    insight: predictedEndOfMonth > avgUpcomingDay * daysInMonth
      ? `You're on track — expected end spend: ₹${predictedEndOfMonth}, consistent with last month's ${avgUpcomingDay * daysInMonth}`
      : `Potential savings: Remove ₹${savingsOpportunity} from future days and hit budget by day ${targetDateFor}`
  }
}

/**
 * Get budget progress with smart insights
 * @param {number} used - Current budget usage
 * @param {number} total - Total budget
 * @param {number} daysInCurrentCycle - Days elapsed in current billing cycle
 * @param {number} daysInCycle - Total days in cycle (typically 30 or 31)
 * @Returns {Object} Progress metrics and insights
 */
export function getBudgetProgress(used, total, daysInCurrentCycle = 15, daysInCycle = 30) {
  if (total <= 0) {
    return {
      progress: 0,
      remaining: 0,
      daysRemaining: daysInCycle - daysInCurrentCycle,
      trend: 'neutral',
      insight: 'No budget set'
    }
  }

  const percentage = Math.min((used / total) * 100, 100)
  const remaining = total - used
  const daysRemaining = daysInCycle - daysInCurrentCycle

  // Determine trend
  const avgDailySpend = used / daysInCurrentCycle
  const stdDev = 100 // Simplified for demo - would need historical data
  const trend = avgDailySpend * daysRemaining > remaining ? 'over_budget' : 'on_track'

  // Generate smart insight
  let insight = 'Monitor your spending'
  if (percentage > 90) {
    insight = `⚠️ Critical: Only ₹${remaining} remaining for ${daysRemaining} days`
  } else if (percentage > 70) {
    insight = `High usage: ₹${remaining} remaining for ${daysRemaining} days`
  } else if (percentage > 50) {
    insight = `Moderate: ₹${remaining} remaining for ${daysRemaining} days`
  } else if (daysRemaining === 0) {
    insight = `Cycle complete — you spent ₹${used} of ₹${total}`
  }

  return {
    progress: Math.round(percentage),
    remaining: Math.round(remaining),
    daysRemaining,
    trend,
    insight
  }
}