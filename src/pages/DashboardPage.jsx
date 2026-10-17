import { CalendarDays, ChartNoAxesCombined, Clock3, TrendingUp, Star, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import { DashboardEmpty, FinHealthCheck, InfluenceCard, MoreMenu, PageTitle, Metric, CategoryChart, CategoryDonut } from '../components/PageComponents'
import SpendingTrendChart from '../components/SpendingTrendChart'
import useIsMobile from '../hooks/useIsMobile'
import { categoryMeta, cycleHeaderLabel, indiaGreeting, todayDateLabel, formatDate } from '../utils/appData'

export default function DashboardPage({ firstName, dueToday, upcoming, todaySpend, monthSpend, monthExpenses, cycleRange, cycleLabel, budgets, money, onPage, onAdd }) {
  const isMobile = useIsMobile()

  // Calculate biggest category by spending
  const biggestCategory = monthExpenses.length > 0 ? (function() {
    const categoryTotals = {}
    monthExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount
    })
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || null
  })() : null

  // Calculate bills due in < 48 hours
  const billsDue48h = monthExpenses.filter(e => {
    const daysUntilDue = (new Date(e.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    return daysUntilDue >= 0 && daysUntilDue <= 2
  }).length

  // Generate smart recommendations
  const getBestDayToSpend = () => {
    if (monthExpenses.length === 0) return 'No pattern yet'

    // Analyze spending by day of week
    const daySpending = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } // Sun-Sat
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

    monthExpenses.forEach(e => {
      const date = e.date || e.dueDate
      if (!date) return
      const day = new Date(date).getDay()
      daySpending[day] += e.amount
      dayCounts[day] += 1
    })

    // Find day with lowest average spending
    let lowestAverage = Infinity
    let bestDay = 'After 6pm weekdays' // Default

    Object.entries(daySpending).forEach(([day, total]) => {
      const count = dayCounts[day]
      if (count > 0) {
        const average = total / count
        if (average < lowestAverage) {
          lowestAverage = average
          bestDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
        }
      }
    })

    return bestDay
  }

  const bestDay = getBestDayToSpend()
  const biggestExpense = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0]

  const insightMenu = [
    { label: 'View full insight', onSelect: () => onPage('budgets') },
    { label: 'Find spending patterns', onSelect: () => onPage('calendar') },
  ]

  return <>
    <PageTitle
      eyebrow={todayDateLabel}
      cycleLabel={cycleHeaderLabel(cycleRange)}
      title={`${indiaGreeting()}, ${firstName}`}
      subtitle="Check your money at a glance."
      action={<button className="primary-btn page-add-button" style={{ gap: '6px' }} onClick={onAdd}><Plus size={16} strokeWidth={2.2} aria-hidden="true" /><span>Add expense</span></button>}
    />
    <div className="dashboard-grid">
      {/* Top KPIs - Today's spending + This month side by side */}
      <Metric label="Today's spending" value={money(todaySpend)} note={`${todaySpend ? 'On track' : 'No spending yet'} · ${budgets.daily > 0 ? `${money(budgets.daily - todaySpend)} left` : 'No daily limit'}`} tone="blue" icon={<Clock3 size={20} strokeWidth={2} />} to="/expenses" />

      <Metric label="This month" value={money(monthSpend)} note={`${cycleLabel} · ${budgets.monthly > 0 ? `${Math.round(monthSpend / budgets.monthly * 100)}% used` : 'No limit set'}`} tone="violet" icon={<TrendingUp size={20} strokeWidth={2} />} to="/budgets" />

      {/* Merged card: financial health (left) + spending trend (right) */}
      <section className="card overview-card">
        <FinHealthCheck
          monthlyBudget={budgets.monthly}
          monthSpend={monthSpend}
          biggestCategory={biggestCategory}
          billsDue48h={billsDue48h}
          expenses={monthExpenses}
        />
        <div className="overview-trend">
          <div className="section-head"><div><h2>Spending trend</h2><p>Daily spend · {cycleLabel}</p></div><button className="text-btn" onClick={() => onPage('expenses')}>View expenses <ArrowRight size={14} aria-hidden="true" /></button></div>
          {monthExpenses.length ? <SpendingTrendChart expenses={monthExpenses} cycleRange={cycleRange} money={money} /> : <DashboardEmpty Icon={ChartNoAxesCombined} title="Your trend starts here" detail="Add an expense to see your daily spending pattern." action="Browse expenses" onClick={() => onPage('expenses')} />}
        </div>
      </section>

      {/* Due today payments - Mirrors today's spending card */}
      <Metric label="Due today" value={money(dueToday.reduce((total, expense) => total + expense.amount, 0))} note={`${dueToday.length} payment${dueToday.length === 1 ? '' : 's'}`} tone="amber" icon={<AlertTriangle size={20} strokeWidth={2} />} to="/due" />

      {/* Upcoming - Mirrors this month */}
      <Metric label="Upcoming" value={money(upcoming.reduce((total, expense) => total + expense.amount, 0))} note={`${upcoming.length} payment${upcoming.length === 1 ? '' : 's'}`} tone="mint" icon={<CalendarDays size={20} strokeWidth={2} />} to="/calendar" />

      {/* Influence Card 1 - Best day to spend */}
      <InfluenceCard
        type="guidance"
        icon={<TrendingUp size={20} />}
        title="Best day to spend"
        insight={bestDay === 'No pattern yet'
          ? 'Add more expenses to see personalized recommendations'
          : `Based on your history, ${bestDay} has lower spending. Consider scheduling payments here`}
        actionText="Smart tips"
        to="/calendar"
      />

      {/* Influence Card 2 - Biggest expense insight */}
      <InfluenceCard
        type="insight"
        icon={<Star size={20} />}
        title={biggestExpense ? 'Biggest expense' : 'Start tracking'}
        insight={biggestExpense
          ? `Your biggest expense is ${biggestExpense.category} at ${money(biggestExpense.amount)}`
          : 'Track your first expense to see where your money goes'}
        actionText={biggestExpense ? "View all" : "Add expense"}
        to={biggestExpense ? `/expenses?category=${biggestExpense.category}` : undefined}
        action={!biggestExpense ? onAdd : undefined}
      />

      {/* Calendar Summary */}
      <section className="card chart-card calendar-card">
        <div className="section-head"><div><h2>Calendar</h2><p>Next 28 days</p></div><button className="text-btn" onClick={() => onPage('calendar')}>View calendar <ArrowRight size={14} aria-hidden="true" /></button></div>
        <div className="simple-calendar">
          <div className="calendar-summary">
            <div>
              <strong>{monthSpend === 0 ? 'No spending yet' : `${money(monthSpend)}`} <span>current month</span></strong>
              <p>{cycleLabel}</p>
            </div>
          </div>
          <div className="calendar-preview">
            {monthExpenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="preview-event" style={{ borderLeftColor: categoryMeta[expense.category]?.[0] || '#94a3b8' }}>
                <span className="preview-date">{formatDate(expense.dueDate || expense.date)}</span>
                <strong>{expense.title}</strong>
                <span>{money(expense.amount)}</span>
              </div>
            ))}
            {monthExpenses.length > 5 && <small>Plus {monthExpenses.length - 5} more expenses</small>}
          </div>
        </div>
      </section>

      {/* Spending Chart */}
      <section className="card chart-card">
        <div className="section-head"><div><h2>Spending by category</h2><p>{monthExpenses.length} expense{monthExpenses.length === 1 ? '' : 's'} · {cycleLabel}</p></div><MoreMenu label="This report" items={insightMenu} /></div>
        {monthExpenses.length ? (isMobile ? <CategoryDonut expenses={monthExpenses} /> : <CategoryChart expenses={monthExpenses} />) : <DashboardEmpty Icon={ChartNoAxesCombined} title="Your monthly report starts here" detail="Add an expense to see where your money goes." action="Browse expenses" onClick={() => onPage('expenses')} />}
      </section>
    </div>
  </>
}