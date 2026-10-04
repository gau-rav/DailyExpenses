import { PageTitle } from '../components/PageComponents'
import { categoryMeta, money, today } from '../utils/appData'

export default function CalendarPage({ month, setMonth, expenses, onAdd }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + days }, (_, index) => index < firstDay ? null : index - firstDay + 1)
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

  return <>
    <PageTitle eyebrow="Workspace / Calendar" title="Calendar" subtitle="See your spending and due dates at a glance." action={<button className="primary-btn page-add-button" onClick={onAdd}>＋ Add expense</button>} />
    <section className="card calendar-card">
      <div className="calendar-header">
        <button className="circle-btn" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
        <h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button className="circle-btn" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
        <button className="outline-btn today-btn" onClick={() => setMonth(new Date())}>Today</button>
      </div>
      <div className="weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{cells.map((day, index) => {
        const date = day ? `${monthKey}-${String(day).padStart(2, '0')}` : ''
        const items = expenses.filter(expense => expense.dueDate === date)
        return <div className={`calendar-day ${date === today ? 'is-today' : ''}`} key={index}>
          {day && <>
            <span className="day-num">{day}</span>
            {items.slice(0, 2).map(expense => <div className="cal-event" style={{ borderLeftColor: categoryMeta[expense.category]?.[0] }} key={expense.id}>{expense.title} <b>{money(expense.amount)}</b></div>)}
            {items.length > 2 && <small>+{items.length - 2} more</small>}
          </>}
        </div>
      })}</div>
    </section>
  </>
}
