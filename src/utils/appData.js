export const categories = ['Food', 'Grocery', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Rent', 'Education', 'Other']
export const defaultBudgets = { daily: 1500, weekly: 6500, monthly: 24000 }
export const categoryMeta = { Food: ['#f4a261', '🍜'], Grocery: ['#42a879', '🛒'], Transport: ['#0d7377', '🚕'], Bills: ['#c67837', '🧾'], Shopping: ['#d88950', '🛍️'], Entertainment: ['#2f9c79', '🎧'], Health: ['#d96857', '💊'], Rent: ['#0a5c5f', '🏠'], Education: ['#398f89', '📚'], Other: ['#94a3b8', '✦'] }

export const indiaDate = date => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export const today = indiaDate(new Date())
export const todayDateLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
export const todayDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(new Date())
export const todayMonth = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }).format(new Date()).toUpperCase()
export const indiaGreeting = () => {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
}
export const dateOffset = n => {
  const date = new Date()
  date.setDate(date.getDate() + n)
  return indiaDate(date)
}
export const formatUtcDate = date => date.toISOString().slice(0, 10)
export const getPreviousMonthStart = (asOf = today) => {
  const [year, month] = asOf.split('-').slice(0, 2).map(Number)
  return formatUtcDate(new Date(Date.UTC(year, month - 2, 1)))
}
export const cycleDateInMonth = (year, month, day) => {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return formatUtcDate(new Date(Date.UTC(year, month, Math.min(day, lastDay))))
}
export const getMonthlyCycleRange = (cycleStartDate, asOf = today) => {
  const [year, month] = asOf.split('-').slice(0, 2).map(Number)
  if (!cycleStartDate || asOf < cycleStartDate) {
    const start = `${asOf.slice(0, 7)}-01`
    const nextMonth = new Date(Date.UTC(year, month, 1))
    const end = formatUtcDate(new Date(nextMonth.getTime() - 86400000))
    return { start, end }
  }

  const cycleDay = Number(cycleStartDate.slice(-2))
  let start = cycleDateInMonth(year, month - 1, cycleDay)
  if (start > asOf) start = cycleDateInMonth(year, month - 2, cycleDay)
  const [startYear, startMonth] = start.split('-').slice(0, 2).map(Number)
  const nextStart = cycleDateInMonth(startYear, startMonth, cycleDay)
  const end = formatUtcDate(new Date(new Date(`${nextStart}T00:00:00.000Z`).getTime() - 86400000))
  return { start, end }
}
export const cycleRangeLabel = ({ start, end }) => {
  const format = value => new Date(`${value}T12:00:00.000Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric' })
  return `${format(start)} – ${format(end)}`
}
export const cycleHeaderLabel = ({ start, end }) => {
  const format = value => {
    const date = new Date(`${value}T12:00:00.000Z`)
    const day = date.toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric' })
    const month = date.toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'short' }).replace(/^Sep$/, 'Sept')
    return `${day} ${month}`
  }
  return `${format(start)} – ${format(end)}`
}
export const previewCycleRange = startDate => {
  if (!startDate) return getMonthlyCycleRange(null)
  const [year, month, day] = startDate.split('-').map(Number)
  const nextStart = cycleDateInMonth(year, month, day)
  const end = formatUtcDate(new Date(new Date(`${nextStart}T00:00:00.000Z`).getTime() - 86400000))
  return { start: startDate, end }
}
export const getCycleDateForSettings = (startDate, asOf = today) => {
  if (!startDate) {
    const [year, month] = asOf.split('-').slice(0, 2).map(Number)
    return cycleDateInMonth(year, month, 1)
  }
  return startDate > asOf ? startDate : getMonthlyCycleRange(startDate, asOf).start
}
export const seedExpenses = [
  { id: 1, title: 'Weekly groceries', amount: 86.42, category: 'Food', payment: 'Card', date: today, dueDate: today, notes: 'Fresh produce and pantry staples', recurring: true, status: 'Due Today' },
  { id: 2, title: 'Electricity bill', amount: 124.00, category: 'Bills', payment: 'Bank transfer', date: dateOffset(-2), dueDate: today, notes: 'September electricity', recurring: true, status: 'Due Today' },
  { id: 3, title: 'Apartment rent', amount: 1450.00, category: 'Rent', payment: 'Bank transfer', date: dateOffset(-9), dueDate: dateOffset(-3), notes: 'Monthly rent', recurring: true, status: 'Paid' },
  { id: 4, title: 'Metro pass', amount: 48.00, category: 'Transport', payment: 'Card', date: dateOffset(-1), dueDate: dateOffset(2), notes: 'Monthly metro pass', recurring: true, status: 'Upcoming' },
  { id: 5, title: 'Gym membership', amount: 32.00, category: 'Health', payment: 'Card', date: dateOffset(-4), dueDate: dateOffset(5), notes: '', recurring: true, status: 'Upcoming' },
  { id: 6, title: 'Streaming bundle', amount: 19.99, category: 'Entertainment', payment: 'Card', date: dateOffset(-11), dueDate: dateOffset(-2), notes: '', recurring: true, status: 'Overdue' },
  { id: 7, title: 'Coffee with Maya', amount: 7.50, category: 'Food', payment: 'Cash', date: dateOffset(-1), dueDate: dateOffset(-1), notes: '', recurring: false, status: 'Paid' },
  { id: 8, title: 'New running shoes', amount: 118.00, category: 'Shopping', payment: 'Card', date: dateOffset(-6), dueDate: dateOffset(-6), notes: '', recurring: false, status: 'Paid' },
]
export const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
export const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
