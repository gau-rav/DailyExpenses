import { formatMoney } from './currency'
import { indiaDate } from '../shared/utils/indiaDate.js'

export const categories = ['Food', 'Grocery', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Rent', 'Education', 'Other']
export const defaultBudgets = { daily: 1500, weekly: 6500, monthly: 24000 }
export const categoryMeta = { Food: ['#f4a261', '🍜'], Grocery: ['#42a879', '🛒'], Transport: ['#0d7377', '🚕'], Bills: ['#c67837', '🧾'], Shopping: ['#d88950', '🛍️'], Entertainment: ['#2f9c79', '🎧'], Health: ['#d96857', '💊'], Rent: ['#0a5c5f', '🏠'], Education: ['#398f89', '📚'], Other: ['#94a3b8', '✦'] }

export { indiaDate } from '../shared/utils/indiaDate.js'

export const today = indiaDate(new Date())
export const todayDateLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
export const todayDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(new Date())
export const getTodayDateLabel = () => todayDateLabel
export const todayMonth = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }).format(new Date()).toUpperCase()
export const getTodayDay = () => todayDay
export const getTodayMonth = () => todayMonth
export const indiaGreeting = () => {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
}
export const dateOffset = n => {
  const date = new Date()
  date.setDate(date.getDate() + n)
  return indiaDate(date)
}
export { formatUtcDate, getPreviousMonthStart, cycleDateInMonth, getMonthlyCycleRange, cycleRangeLabel, cycleHeaderLabel, previewCycleRange, getCycleDateForSettings } from '../features/settings/domain/monthlyCycleRules.js'
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
export const money = n => formatMoney(n)
export const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const formatDateFull = value => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(`${value}T12:00:00+05:30`))
export const formatTimestamp = value => {
  if (!value) return ''
  const text = String(value)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' })
}
