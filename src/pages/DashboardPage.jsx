import { CalendarPlus, ChartNoAxesCombined, CircleCheck } from 'lucide-react'
import { DashboardEmpty, ExpenseRow, Metric, MoreMenu, PageTitle, CategoryChart } from '../components/PageComponents'
import { cycleHeaderLabel, indiaGreeting, todayDateLabel } from '../utils/appData'

export default function DashboardPage({ firstName, dueToday, overdue, upcoming, todaySpend, monthSpend, monthExpenses, cycleRange, cycleLabel, budgets, money, onPage, onAdd, onEdit }) {
  const budgetMenu = [
    { label: 'Manage budgets', onSelect: () => onPage('budgets') },
    { label: 'View expenses', onSelect: () => onPage('expenses') },
  ]
  const categoryMenu = [
    { label: 'View full report', onSelect: () => onPage('budgets') },
    { label: 'Browse expenses', onSelect: () => onPage('expenses') },
  ]

  return <>
    <PageTitle eyebrow={todayDateLabel} cycleLabel={cycleHeaderLabel(cycleRange)} title={`${indiaGreeting()}, ${firstName}`} subtitle="Here’s your money at a glance." action={<button className="primary-btn page-add-button" onClick={onAdd}>＋ Add expense</button>} />
    <div className="metric-grid">
      <Metric label="Today's spending" value={money(todaySpend)} note={`${todaySpend ? 'On track' : 'No spending yet'} · ${money(budgets.daily - todaySpend)} left`} tone="blue" icon="◷" />
      <Metric label="This cycle's spending" value={money(monthSpend)} note={`${Math.round(monthSpend / budgets.monthly * 100)}% of cycle budget`} tone="violet" icon="▣" />
      <Metric label="Upcoming expenses" value={upcoming.length} note={`${money(upcoming.reduce((total, expense) => total + expense.amount, 0))} in the next 7 days`} tone="mint" icon="↗" />
      <Metric label="Overdue" value={overdue.length} note={overdue.length ? `${money(overdue.reduce((total, expense) => total + expense.amount, 0))} needs attention` : 'You’re all caught up'} tone="orange" icon="!" />
    </div>
    <div className="dashboard-grid">
      <section className="card budget-card">
        <div className="section-head"><div><h2>Budget overview</h2><p>{cycleLabel}</p></div><MoreMenu label="Budget overview" items={budgetMenu} /></div>
        <div className="budget-figure"><div className={`ring ${monthSpend > budgets.monthly ? 'over-budget' : ''}`} style={{ '--progress': `${budgets.monthly > 0 ? Math.min(monthSpend / budgets.monthly * 100, 100) : 0}%` }}><div><strong>{budgets.monthly > 0 ? Math.round(monthSpend / budgets.monthly * 100) : 0}%</strong><small>used</small></div></div><div><strong className={`big-number ${monthSpend > budgets.monthly ? 'is-over-budget' : ''}`}>{money(Math.abs(budgets.monthly - monthSpend))}</strong><span>{monthSpend > budgets.monthly ? 'over budget this month' : 'remaining this month'}</span></div></div>
        <div className="budget-line"><span>Monthly budget</span><strong>{money(budgets.monthly)}</strong></div>
        <div className={`progress ${monthSpend > budgets.monthly ? 'over-budget' : ''}`}><i style={{ width: `${budgets.monthly > 0 ? Math.min(monthSpend / budgets.monthly * 100, 100) : 0}%` }}></i></div>
        <button className="outline-btn full" onClick={() => onPage('budgets')}>Manage budgets</button>
      </section>
      <section className="card due-card">
        <div className="section-head"><div><h2>Due today <span className="pill-yellow">{dueToday.length}</span></h2><p>Expenses that need your attention</p></div><button className="text-btn" onClick={() => onPage('due')}>View all <span>→</span></button></div>
        {dueToday.length ? dueToday.map(expense => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} />) : <DashboardEmpty Icon={CircleCheck} title="All clear for today" detail={upcoming.length ? `${upcoming.length} payment${upcoming.length === 1 ? '' : 's'} coming up this week.` : 'You have no payments that need attention today.'} action="Browse expenses" onClick={() => onPage('expenses')} />}
      </section>
      <section className="card upcoming-card">
        <div className="section-head"><div><h2>Coming up</h2><p>Next 7 days</p></div><button className="text-btn" onClick={() => onPage('calendar')}>Calendar <span>→</span></button></div>
        {upcoming.length ? upcoming.map(expense => <ExpenseRow key={expense.id} expense={expense} compact onEdit={onEdit} />) : <DashboardEmpty Icon={CalendarPlus} title="Nothing scheduled this week" detail="Add a due date to an expense and it will appear here." action="Add an expense" onClick={onAdd} />}
      </section>
      <section className="card chart-card">
        <div className="section-head"><div><h2>Spending by category</h2><p>{monthExpenses.length} expense{monthExpenses.length === 1 ? '' : 's'} · {cycleLabel}</p></div><MoreMenu label="Spending by category" items={categoryMenu} /></div>
        {monthExpenses.length ? <CategoryChart expenses={monthExpenses} /> : <DashboardEmpty Icon={ChartNoAxesCombined} title="Your monthly report starts here" detail="Add an expense to see where your money goes." action="Browse expenses" onClick={() => onPage('expenses')} />}
        <button className="outline-btn full" onClick={() => onPage('budgets')}>View full report</button>
      </section>
    </div>
  </>
}
