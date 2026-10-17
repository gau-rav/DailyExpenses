import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { PageTitle } from '../components/PageComponents'
import { categoryMeta, money, today } from '../utils/appData'
import { formatDateFull } from '../utils/dateUtils'

const MAX_EVENTS_PER_DAY = 1

const pad2 = value => String(value).padStart(2, '0')
const dateKey = date => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

export default function CalendarPage({ month, setMonth, expenses, onAdd, budgets, monthSpend }) {
  const [viewToggle, setViewToggle] = useState('month') // 'month' or '2weeks'
  const [dayDetail, setDayDetail] = useState(null)

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()

  // Get max budget to determine color coding
  const maxBudget = Math.max(...Object.values(budgets).filter(Boolean), 0)
  const dayWithOptions = expenses.filter(e => e.dueDate && e.amount).map(e => ({
    id: e.id,
    date: e.dueDate,
    amount: e.amount,
    category: e.category,
    title: e.title
  }))

  // Full month: pad to whole weeks so days line up under the weekday header.
  const buildMonthCells = () => {
    const cells = []
    const prevMonthDays = new Date(year, monthIndex, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const dt = new Date(year, monthIndex - 1, prevMonthDays - i)
      cells.push({ date: dateKey(dt), day: dt.getDate() })
    }
    for (let day = 1; day <= days; day++) {
      cells.push({ date: dateKey(new Date(year, monthIndex, day)), day })
    }
    const trailing = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= trailing; i++) {
      const dt = new Date(year, monthIndex + 1, i)
      cells.push({ date: dateKey(dt), day: dt.getDate() })
    }
    return cells
  }

  // 2-week view: 14 days starting from the Sunday of the week that contains
  // today (when viewing the current month) or the 1st of the selected month.
  const buildTwoWeekCells = () => {
    const todayDate = new Date(`${today}T00:00:00`)
    const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === monthIndex
    const reference = isCurrentMonth ? todayDate : new Date(year, monthIndex, 1)
    const start = new Date(reference)
    start.setDate(reference.getDate() - reference.getDay())
    return Array.from({ length: 14 }, (_, i) => {
      const dt = new Date(start)
      dt.setDate(start.getDate() + i)
      return { date: dateKey(dt), day: dt.getDate() }
    })
  }

  const calendarCells = viewToggle === '2weeks' ? buildTwoWeekCells() : buildMonthCells()

  return <>
    <PageTitle
      eyebrow="Workspace / Calendar"
      title="Calendar"
      subtitle="See your spending and due dates at a glance."
      action={<button className="primary-btn page-add-button" style={{ gap: '6px' }} onClick={onAdd}><Plus size={16} strokeWidth={2.2} aria-hidden="true" /><span>Add expense</span></button>}
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
        {calendarCells.map((cell, index) => {
          const { date, day } = cell
          const isToday = date === today
          const dayEvents = dayWithOptions.filter(e => e.date === date)
          const hasEvents = dayEvents.length > 0
          const openDay = () => setDayDetail({ date, events: dayEvents })

          // Show at most MAX_EVENTS_PER_DAY per day; collapse the rest behind a "+N more"
          // chip that opens the full list for the day.
          const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_DAY)
          const hiddenCount = dayEvents.length - visibleEvents.length

          // Calculate budget safety indicator
          const isOverBudget = dayEvents.reduce((sum, e) => sum + e.amount, 0) < monthSpend &&
                               dayEvents.reduce((sum, e) => sum + e.amount, 0) < maxBudget
          const budgetColor = isOverBudget ? 'budget-alert' : 'budget-safe'

          return <div
            className={`calendar-day ${isToday ? 'is-today' : ''} ${budgetColor} ${hasEvents ? 'has-events' : ''}`}
            key={index}
            role={hasEvents ? 'button' : undefined}
            tabIndex={hasEvents ? 0 : undefined}
            aria-label={hasEvents ? `${dayEvents.length} expense${dayEvents.length === 1 ? '' : 's'} on day ${day}` : undefined}
            onClick={hasEvents ? openDay : undefined}
            onKeyDown={hasEvents ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openDay()
              }
            } : undefined}
          >
            <span className="day-num">{day}</span>

            {hasEvents && (
              <div className="calendar-events">
                {visibleEvents.map(expense => (
                  <div
                    key={expense.id}
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

                {hiddenCount > 0 && (
                  <span className="more-events">+{hiddenCount} more</span>
                )}
              </div>
            )}
          </div>
        })}
      </div>
    </section>

    {dayDetail && (
      <div className="modal-backdrop" onClick={() => setDayDetail(null)}>
        <div className="modal day-list-modal" role="dialog" aria-modal="true" aria-label="Expenses for the day" onClick={event => event.stopPropagation()}>
          <div className="modal-head">
            <div>
              <div className="eyebrow">Day overview</div>
              <h2>{formatDateFull(dayDetail.date)}</h2>
            </div>
            <button type="button" className="close" aria-label="Close" onClick={() => setDayDetail(null)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="day-list-head">
            <span>{dayDetail.events.length} expense{dayDetail.events.length === 1 ? '' : 's'}</span>
            <strong>{money(dayDetail.events.reduce((sum, e) => sum + e.amount, 0))}</strong>
          </div>

          <div className="day-list">
            {dayDetail.events.map(expense => (
              <div
                className="day-list-item"
                key={expense.id}
                style={{ borderLeftColor: categoryMeta[expense.category]?.[0] }}
              >
                <div className="event-header">
                  <strong>{expense.title}</strong>
                  <span>{money(expense.amount)}</span>
                </div>
                <div className="event-category">{expense.category}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </>
}
