export function validateBudgetLimits(value) {
  if (!value || typeof value !== 'object') return null
  const keys = ['daily', 'weekly', 'monthly']
  const limits = Object.fromEntries(keys.map(key => [key, Number(value[key])]))
  if (keys.some(key => !Number.isFinite(limits[key]) || limits[key] < 0 || limits[key] > 1_000_000_000)) return null
  return limits
}

export function isValidCycleStartDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const currentDate = `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`
  const [year, month] = currentDate.slice(0, 7).split('-').map(Number)
  const minimumDate = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10)
  return value >= minimumDate
}
