import { lazy, Suspense } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, ChartNoAxesCombined, Clock3, Plus, Sparkles, TrendingUp, WalletCards } from 'lucide-react'
import { CategoryChart, PageTitle, Empty, Status } from '../components/PageComponents'
import { AnimatedMoney } from '../components/ui/AnimatedMoney'
import { ProgressRing } from '../components/ui/ProgressRing'
import { Stagger, StaggerItem } from '../components/ui/Stagger'
import { categoryMeta, formatDate, getTodayDateLabel, indiaGreeting, money } from '../utils/appData'
import { dailyPace } from '../utils/moneyMath'
import useIsMobile from '../hooks/useIsMobile'

const SpendingTrendChart = lazy(() => import('../components/SpendingTrendChart'))
const CategoryDonut = lazy(() => import('../components/CategoryDonut'))

const chartFallback = <div className="chart-skeleton" aria-hidden="true"><span /><span /><span /></div>

export default function DashboardPage({
  firstName,
  today,
  todaySpend,
  monthSpend,
  monthCommitted,
  monthExpenses,
  cycleRange,
  cycleLabel,
  budgets,
  dueToday,
  overdue,
  upcoming,
  onPage,
  onQuickAdd,
}) {
  const isMobile = useIsMobile()
  const pace = dailyPace({
    monthSpend,
    monthlyBudget: budgets.monthly,
    cycleStart: cycleRange.start,
    cycleEnd: cycleRange.end,
    today,
  })

  const categoryTotals = monthExpenses.reduce((totals, expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount
    return totals
  }, {})
  const biggestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const biggestExpense = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0]
  const billsSoon = [...overdue, ...dueToday, ...upcoming]
  const billsTotal = billsSoon.reduce((sum, expense) => sum + expense.amount, 0)
  const dailyLeft = Math.max(0, budgets.daily - todaySpend)

  const paceTone = pace.over ? 'danger' : pace.status === 'fast' ? 'warn' : 'primary'
  const paceHeadline = !pace.hasBudget
    ? 'Set a monthly limit to unlock your daily pace'
    : pace.over
      ? `You're ${money(pace.spent - pace.budget)} over this cycle`
      : `Spend ${money(pace.dailyAllowance)} a day to finish on budget`

  const paceDetail = !pace.hasBudget
    ? 'Budgets turn your spending into a simple daily number.'
    : pace.over
      ? 'Nothing breaks. Lower the limit, or pause non-essentials for the rest of the cycle.'
      : `${money(pace.remaining)} left across ${pace.daysLeft} day${pace.daysLeft === 1 ? '' : 's'} · ${cycleLabel}`

  const insight = monthExpenses.length === 0
    ? null
    : pace.status === 'fast'
      ? {
          icon: <TrendingUp size={18} aria-hidden="true" />,
          title: 'Spending faster than the month',
          body: `You've used ${Math.round(pace.percent)}% of the budget in ${pace.elapsedDays} of ${pace.totalDays} days.`,
          action: 'Review budgets',
          to: '/budgets',
        }
      : {
          icon: <Sparkles size={18} aria-hidden="true" />,
          title: 'You are pacing well',
          body: `Spending is ${Math.round(Math.max(0, pace.expectedPercent - pace.percent))}% behind the month's pace. Keep it up.`,
          action: 'See the breakdown',
          to: '/expenses',
        }

  return <>
    <PageTitle
      eyebrow={getTodayDateLabel()}
      cycleLabel={cycleLabel}
      title={`${indiaGreeting()}, ${firstName}`}
      subtitle="Here's the one number that matters today."
      action={<button className="primary-btn page-add-button" onClick={() => onQuickAdd()}><Plus size={16} strokeWidth={2.2} aria-hidden="true" /><span>Add expense</span></button>}
    />

    <Stagger className="dashboard-stack">
      <StaggerItem className={`card pace-card tone-${paceTone}`}>
        <div className="pace-visual">
          <ProgressRing value={pace.hasBudget ? pace.percent : 0} tone={paceTone} label={`${Math.round(pace.percent)} percent of monthly budget used`}>
            <strong>{pace.hasBudget ? `${Math.round(pace.percent)}%` : '—'}</strong>
            <span>of budget used</span>
          </ProgressRing>
        </div>
        <div className="pace-copy">
          <span className="pace-eyebrow">{pace.over ? 'Over budget' : pace.hasBudget ? 'Your daily pace' : 'Start here'}</span>
          <h2>{paceHeadline}</h2>
          <p>{paceDetail}</p>
          <div className="pace-stats">
            <div><span>Spent</span><AnimatedMoney value={monthSpend} /></div>
            <div><span>{pace.over ? 'Over by' : 'Remaining'}</span><strong>{money(pace.over ? pace.spent - pace.budget : pace.remaining)}</strong></div>
            <div><span>Days left</span><strong>{pace.hasBudget ? pace.daysLeft : '—'}</strong></div>
          </div>
          {!pace.hasBudget && <button type="button" className="primary-btn pace-cta" onClick={() => onPage('budgets')}>Set a monthly limit <ArrowRight size={15} aria-hidden="true" /></button>}
        </div>
      </StaggerItem>

      <div className="stat-row">
        <StaggerItem className="card stat-tile">
          <span className="stat-icon tone-mint"><Clock3 size={18} strokeWidth={1.9} aria-hidden="true" /></span>
          <div><span>Today</span><strong>{money(todaySpend)}</strong><small>{budgets.daily > 0 ? `${money(dailyLeft)} left of today's ${money(budgets.daily)}` : 'No daily limit set'}</small></div>
        </StaggerItem>
        <StaggerItem className="card stat-tile">
          <span className={`stat-icon ${dueToday.length ? 'tone-amber' : 'tone-mint'}`}><WalletCards size={18} strokeWidth={1.9} aria-hidden="true" /></span>
          <div><span>Bills due today</span><strong>{money(dueToday.reduce((sum, expense) => sum + expense.amount, 0))}</strong><small>{dueToday.length ? `${dueToday.length} payment${dueToday.length === 1 ? '' : 's'} to clear` : 'Nothing due — nice'}</small></div>
        </StaggerItem>
        <StaggerItem className="card stat-tile">
          <span className="stat-icon tone-amber"><CalendarDays size={18} strokeWidth={1.9} aria-hidden="true" /></span>
          <div><span>Committed this cycle</span><strong>{money(monthCommitted)}</strong><small>{Math.max(0, monthCommitted - monthSpend) > 0 ? `${money(monthCommitted - monthSpend)} still unpaid` : 'All logged spending is settled'}</small></div>
        </StaggerItem>
      </div>

      <div className="dashboard-columns">
        <StaggerItem className="card bills-radar">
          <div className="section-head">
            <div><h2>Bills radar</h2><p>{billsSoon.length ? `${money(billsTotal)} overdue or due in the next 7 days` : 'No bills in the next 7 days'}</p></div>
            <button className="text-btn" onClick={() => onPage('bills')}>All bills <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          {billsSoon.length
            ? <ul className="radar-list">
                {billsSoon.slice(0, 4).map(expense => <li key={expense.id} className="radar-item">
                  <span className="radar-icon" style={{ background: `${categoryMeta[expense.category]?.[0]}22`, color: categoryMeta[expense.category]?.[0] }}>{categoryMeta[expense.category]?.[1]}</span>
                  <div className="radar-copy"><strong>{expense.title}</strong><small>{formatDate(expense.dueDate)} · {expense.category}</small></div>
                  <div className="radar-amount"><strong>{money(expense.amount)}</strong><Status value={expense.status} /></div>
                </li>)}
              </ul>
            : <div className="radar-empty"><span aria-hidden="true">✓</span><p>You are all caught up. New bills will show up here a week before they are due.</p></div>}
        </StaggerItem>

        <StaggerItem className="card trend-card">
          <div className="section-head">
            <div><h2>Spending trend</h2><p>Daily spend · {cycleLabel}</p></div>
            <button className="text-btn" onClick={() => onPage('expenses')}>View all <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          {monthExpenses.length
            ? <Suspense fallback={chartFallback}><SpendingTrendChart expenses={monthExpenses} cycleRange={cycleRange} money={money} /></Suspense>
            : <Empty text="Add an expense to start your trend." />}
        </StaggerItem>
      </div>

      <div className="dashboard-columns">
        <StaggerItem className="card category-card">
          <div className="section-head">
            <div><h2>Where it went</h2><p>{monthExpenses.length} expense{monthExpenses.length === 1 ? '' : 's'} · {cycleLabel}</p></div>
            <button className="text-btn" onClick={() => onPage('budgets')}>Reports <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          {monthExpenses.length
            ? (isMobile
                ? <Suspense fallback={chartFallback}><CategoryDonut expenses={monthExpenses} /></Suspense>
                : <CategoryChart expenses={monthExpenses} />)
            : <Empty text="Your category breakdown appears after your first expense." />}
        </StaggerItem>

        <StaggerItem className="insight-stack">
          {insight && <article className="insight-card">
            <span className="insight-icon">{insight.icon}</span>
            <div>
              <h3>{insight.title}</h3>
              <p>{insight.body}</p>
              <button className="text-btn" onClick={() => onPage(insight.to === '/budgets' ? 'budgets' : 'expenses')}>{insight.action} <ArrowRight size={14} aria-hidden="true" /></button>
            </div>
          </article>}
          <article className="insight-card">
            <span className="insight-icon tone-amber"><AlertTriangle size={18} aria-hidden="true" /></span>
            <div>
              <h3>{biggestExpense ? 'Biggest single expense' : 'Start with one payment'}</h3>
              <p>{biggestExpense ? `${biggestExpense.title} at ${money(biggestExpense.amount)}${biggestCategory ? ` · ${biggestCategory[0]} leads the month` : ''}` : 'Log a UPI payment now — it takes two taps and unlocks your pace.'}</p>
              {biggestExpense
                ? <button className="text-btn" onClick={() => onPage('expenses')}>Open expenses <ArrowRight size={14} aria-hidden="true" /></button>
                : <button className="text-btn" onClick={() => onQuickAdd()}>Add expense <ArrowRight size={14} aria-hidden="true" /></button>}
            </div>
          </article>
          {monthExpenses.length > 0 && <article className="insight-card insight-compact">
            <span className="insight-icon"><ChartNoAxesCombined size={18} aria-hidden="true" /></span>
            <div>
              <h3>Category check</h3>
              <p>{biggestCategory ? `${biggestCategory[0]} makes up ${Math.round((biggestCategory[1] / Math.max(1, monthSpend)) * 100)}% of this cycle's logged spend.` : 'Add more expenses for a category read.'}</p>
            </div>
          </article>}
        </StaggerItem>
      </div>
    </Stagger>
  </>
}
