const DAY_MS = 86400000

export const daysBetween = (start, end) => {
  if (!start || !end) return 0
  return Math.round((Date.parse(`${String(end).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(start).slice(0, 10)}T00:00:00Z`)) / DAY_MS)
}
