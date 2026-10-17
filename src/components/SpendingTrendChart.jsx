import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../utils/appData'

const DAY_MS = 86400000

const buildDailySeries = (expenses, cycleRange) => {
  if (!cycleRange?.start || !cycleRange?.end) return []

  const totals = {}
  expenses.forEach(expense => {
    const key = expense.date || expense.dueDate
    if (!key) return
    totals[key] = (totals[key] || 0) + expense.amount
  })

  const start = new Date(`${cycleRange.start}T00:00:00Z`)
  const end = new Date(`${cycleRange.end}T00:00:00Z`)
  const series = []
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += DAY_MS) {
    const key = new Date(cursor).toISOString().slice(0, 10)
    series.push({ date: key, amount: Math.round((totals[key] || 0) * 100) / 100 })
  }
  return series
}

const formatAxisAmount = value => {
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return `₹${value}`
}

export default function SpendingTrendChart({ expenses, cycleRange, money }) {
  const data = buildDailySeries(expenses, cycleRange)
  const hasSpending = data.some(item => item.amount > 0)

  if (!data.length) {
    return <p className="trend-chart-empty" role="status">No cycle data available yet.</p>
  }

  return <div className="trend-chart">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="trend-stop-top" />
            <stop offset="100%" className="trend-stop-bottom" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} minTickGap={24} />
        <YAxis width={48} tickFormatter={formatAxisAmount} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          formatter={value => [money(value), 'Spent']}
          labelFormatter={formatDate}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }}
        />
        <Area type="monotone" dataKey="amount" strokeWidth={2} fill="url(#trend-fill)" />
      </AreaChart>
    </ResponsiveContainer>
    {!hasSpending && <p className="trend-chart-empty" role="status">No spending recorded in this cycle yet.</p>}
  </div>
}
