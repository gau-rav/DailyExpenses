import { indiaDate } from '../../../shared/utils/indiaDate.js'

const today = indiaDate(new Date())

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
    return cycleDateInMonth(year, month - 1, 1)
  }
  return startDate > asOf ? startDate : getMonthlyCycleRange(startDate, asOf).start
}
