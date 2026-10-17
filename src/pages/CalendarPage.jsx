import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageTitle } from '../components/PageComponents'
import { categoryMeta, money, today } from '../utils/appData'

export default function CalendarPage({ month, setMonth, expenses, onAdd, budgets, monthSpend }) {
  const [viewToggle, setViewToggle] = useState('month') // 'month' or '2weeks'

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()

  // Calculate 64-hour buffer events (display 15 days before and after each day)
  const bufferDays = Array.from({ length: 47 }, (_, index) => {
    if (index >= firstDay && index < firstDay + days) return index - firstDay + 1
    if (index < firstDay) return index - firstDay + 1 + days // Previous month overflow
    if (index >= firstDay + days) return index - firstDay + 1 - days // Next month overflow
    return null
  }).filter(Boolean)

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

  // Get max budget to determine color coding
  const maxBudget = Math.max(...Object.values(budgets).filter(Boolean), 0)
  const dayWithOptions = expenses.filter(e => e.dueDate && e.amount).map(e => ({
    date: e.dueDate,
    amount: e.amount,
    category: e.category,
    title: e.title
  }))

  return <>
    <PageTitle
      eyebrow="Workspace / Calendar"
      title="Calendar"
      subtitle="See your spending and due dates at a glance."
      action={<button className="primary-btn page-add-button" onClick={onAdd}>＋ Add expense</button>}
    />

    <section className="card calendar-card">
      <div className="calendar-header">
        <div className="calendar-toggle">
          <span className={`toggle-option ${viewToggle === 'month' ? 'active' : ''}`} onClick={() => setViewToggle('month')}>
            Full month
          </span>
          <span className={`toggle-option ${viewToggle === '2weeks' ? 'active' : ''}`} onClick={() => setViewToggle('2weeks')}>
            2-week view
          </span>
        </div>

        <div className="calendar-nav">
          <button className="circle-btn" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <h2>
            {viewToggle === 'month'
              ? month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : `${monthIndex + 1}/${year}`}
          </h2>
          <button className="circle-btn" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <button className="outline-btn today-btn" onClick={() => setMonth(new Date())}>Today</button>
      </div>

      <div className="weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
      </div>

      <div className={`calendar-grid ${viewToggle === '2weeks' ? 'two-weeks' : ''}`}>
        {bufferDays.map((day, index) => {
          if (!day) return <div className="calendar-day empty" key={index}></div>

          const date = `${monthKey}-${String(day).padStart(2, '0')}`
          const isToday = date === today
          const dayEvents = dayWithOptions.filter(e => e.date === date)

          // Calculate budget safety indicator
          const isOverBudget = dayEvents.reduce((sum, e) => sum + e.amount, 0) < monthSpend &&
                               dayEvents.reduce((sum, e) => sum + e.amount, 0) < maxBudget
          const budgetColor = isOverBudget ? 'budget-alert' : 'budget-safe'

          return <>
            <div className={`calendar-day ${isToday ? 'is-today' : ''} ${budgetColor}`} key={index}>
              <span className="day-num">{day}</span>

              {dayEvents.length > 0 && (
                <div className="calendar-events">
                  {dayEvents.map(expense => (
                    <div
                      className={`cal-event ${viewToggle === '2weeks' ? 'full-width' : ''}`}
                      style={{
                        borderLeftColor: categoryMeta[expense.category]?.[0]
                      }}
                    >
                      <div className="event-header">
                        <strong>{expense.title}</strong>
                        <span>{money(expense.amount)}</span>
                      </div>
                      <div className="event-category">
                        {expense.category}
                      </div>
                    </div>
                  ))}

                  {dayEvents.length > 2 && viewToggle !== '2weeks' && (
                    <div className="more-events">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        })}
      </div>
    </section>
  </>
}