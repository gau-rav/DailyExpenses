import { useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, CircleCheck, Clock3, TrendingUp, Star, Filter, AlertTriangle } from 'lucide-react'
import { DashboardEmpty, ExpenseRow, FinHealthCheck, InfluenceCard, FavoritesCard, MoreMenu, PageTitle, Metric, CategoryChart, QuickFilterBar } from '../components/PageComponents'
import { categoryMeta, cycleHeaderLabel, indiaGreeting, todayDateLabel, formatDate, money } from '../utils/appData'

export default function DashboardPage({ firstName, dueToday, overdue, upcoming, todaySpend, monthSpend, monthExpenses, cycleRange, cycleLabel, budgets, money, onPage, onAdd, onEdit }) {
  const [activeFilter, setActiveFilter] = useState('overview')

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

  // Calculate savings opportunity
  const getSavingsOpportunity = () => {
    if (monthExpenses.length < 5 || !biggestCategory) return 0

    const biggestCatTotal = monthExpenses
      .filter(e => e.category === biggestCategory)
      .reduce((total, e) => total + e.amount, 0)

    return Math.round(biggestCatTotal * 0.1) // 10% of biggest category spending
  }

  const savingsOpportunity = getSavingsOpportunity()

  const bestDay = getBestDayToSpend()
  const biggestExpense = monthExpenses.sort((a, b) => b.amount - a.amount)[0]

  const insightMenu = [
    { label: 'View full insight', onSelect: () => onPage('budgets') },
    { label: 'Find spending patterns', onSelect: () => onPage('calendar') },
  ]

  // Quick Filter options
  const quickFilters = [
    { id: 'overview', label: 'Overview', icon: <Filter size={12} /> },
    { id: 'due', label: 'Due today', icon: <AlertTriangle size={12} /> },
    { id: 'upcoming', label: 'Upcoming', icon: <CalendarDays size={12} /> },
    { id: 'budget', label: 'Budget', icon: <TrendingUp size={12} /> },
    { id: 'favorites', label: 'Favorites', icon: <Star size={12} /> },
  ]

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId)
    if (filterId === 'due') onPage('due')
    else if (filterId === 'upcoming') onPage('calendar')
    else if (filterId === 'budget') onPage('budgets')
    else if (filterId === 'favorites') {} // Will be handled in favorites
    // 'overview' just shows dashboard
  }

  return <>
    <PageTitle
      eyebrow={todayDateLabel}
      cycleLabel={cycleHeaderLabel(cycleRange)}
      title={`${indiaGreeting()}, ${firstName}`}
      subtitle="Check your money at a glance."
      action={<button className="primary-btn page-add-button" onClick={onAdd}>＋ Add expense</button>}
    />
    <QuickFilterBar filters={quickFilters} activeFilter={activeFilter} onFilterChange={handleFilterChange} />
    <div className="dashboard-grid">
      {/* FinHealth Check Panel - Top priority */}
      <div className="fin-health-panel">
        <FinHealthCheck
          monthlyBudget={budgets.monthly}
          monthSpend={monthSpend}
          biggestCategory={biggestCategory}
          billsDue48h={billsDue48h}
          expenses={monthExpenses}
        />
      </div>

      {/* Today's spending - 50/50 balance */}
      <Metric label="Today's spending" value={money(todaySpend)} note={`${todaySpend ? 'On track' : 'No spending yet'} · ${budgets.daily > 0 ? `${money(budgets.daily - todaySpend)} left` : 'No daily limit'}`} tone="blue" icon={<Clock3 size={20} strokeWidth={2} />} to="/expenses" />

      {/* Due today payments - Mirrors today's spending card */}
      <Metric label="Due today" value={money(dueToday.reduce((total, expense) => total + expense.amount, 0))} note={`${dueToday.length} payment${dueToday.length === 1 ? '' : 's'}`} tone="amber" icon={<AlertTriangle size={20} strokeWidth={2} />} to="/due" />

      {/* This month - 50/50 balance */}
      <Metric label="This month" value={money(monthSpend)} note={`${cycleLabel} · ${budgets.monthly > 0 ? `${Math.round(monthSpend / budgets.monthly * 100)}% used` : 'No limit set'}`} tone="violet" icon={<TrendingUp size={20} strokeWidth={2} />} to="/budgets" />

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

      {/* Favorites Category */}
      <FavoritesCard myExpenses={monthExpenses} />

      {/* Due Today - Active action */}
      <section className="card due-card">
        <div className="section-head"><div><h2>Due today <span className="pill-yellow">{dueToday.length}</span></h2><p>Expenses that need your attention</p></div><button className="text-btn" onClick={() => onPage('due')}>View all <span>→</span></button></div>
        {dueToday.length ? dueToday.slice(0, 2).map(expense => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} />) : <DashboardEmpty Icon={CircleCheck} title="All clear for today" detail={upcoming.length ? `${upcoming.length} payment${upcoming.length === 1 ? '' : 's'} coming up this week.` : 'No payments due today.'} action="Browse expenses" onClick={() => onPage('expenses')} />}
      </section>

      {/* Calendar Summary */}
      <section className="card chart-card calendar-card">
        <div className="section-head"><div><h2>Calendar</h2><p>Next 28 days</p></div><button className="text-btn" onClick={() => onPage('calendar')}>View calendar <span>→</span></button></div>
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
        {monthExpenses.length ? <CategoryChart expenses={monthExpenses} /> : <DashboardEmpty Icon={ChartNoAxesCombined} title="Your monthly report starts here" detail="Add an expense to see where your money goes." action="Browse expenses" onClick={() => onPage('expenses')} />}
      </section>
    </div>
  </>
}