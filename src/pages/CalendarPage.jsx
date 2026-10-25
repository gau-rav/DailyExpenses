import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, WalletCards } from 'lucide-react'
import { PageTitle } from '../components/PageComponents'
import AppDialog from '../components/ui/AppDialog'
import { categoryMeta, formatDateFull, money, today as todayIso } from '../utils/appData'

const MAX_EVENTS_PER_DAY = 2

const pad2 = value => String(value).padStart(2, '0')
const dateKey = date => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

export default function CalendarPage({ month, setMonth, expenses, today, onAdd, onAddForDate, budgets }) {
  const [viewToggle, setViewToggle] = useState('month')
  const [dayDetail, setDayDetail] = useState(null)
  const liveToday = today || todayIso

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()

  const eventsByDate = expenses.reduce((map, expense) => {
    const add = (date, kind) => {
      if (!date) return
      const key = String(date).slice(0, 10)
      if (!map[key]) map[key] = []
      if (map[key].some(event => event.id === expense.id && event.kind === kind)) return
      map[key].push({ ...expense, date: key, kind })
    }
    const spentDate = expense.date ? String(expense.date).slice(0, 10) : ''
    const dueDate = expense.dueDate ? String(expense.dueDate).slice(0, 10) : ''
    if (dueDate && spentDate === dueDate) {
      add(spentDate, expense.status === 'Paid' ? 'spent' : 'due')
    } else {
      add(expense.date, 'spent')
      add(expense.dueDate, 'due')
    }
    return map
  }, {})

  const buildMonthCells = () => {
    const cells = []
    const prevMonthDays = new Date(year, monthIndex, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const dt = new Date(year, monthIndex - 1, prevMonthDays - i)
      cells.push({ date: dateKey(dt), day: dt.getDate(), outside: true })
    }
    for (let day = 1; day <= days; day++) {
      cells.push({ date: dateKey(new Date(year, monthIndex, day)), day, outside: false })
    }
    const trailing = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= trailing; i++) {
      const dt = new Date(year, monthIndex + 1, i)
      cells.push({ date: dateKey(dt), day: dt.getDate(), outside: true })
    }
    return cells
  }

  const buildTwoWeekCells = () => {
    const todayDate = new Date(`${liveToday}T00:00:00`)
    const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === monthIndex
    const reference = isCurrentMonth ? todayDate : new Date(year, monthIndex, 1)
    const start = new Date(reference)
    start.setDate(reference.getDate() - reference.getDay())
    return Array.from({ length: 14 }, (_, index) => {
      const dt = new Date(start)
      dt.setDate(start.getDate() + index)
      return { date: dateKey(dt), day: dt.getDate(), outside: dt.getMonth() !== monthIndex }
    })
  }

  const calendarCells = viewToggle === '2weeks' ? buildTwoWeekCells() : buildMonthCells()
  const openDay = (date, events) => setDayDetail({ date, events })

  return <>
    <PageTitle
      eyebrow="Your month"
      title="Calendar"
      subtitle="Spending and bills, laid out by day."
      action={<button className="primary-btn page-add-button" onClick={onAdd}><Plus size={16} strokeWidth={2.2} aria-hidden="true" /><span>Add expense</span></button>}
    />

    <section className="card calendar-card">
      <div className="calendar-header">
        <div className="calendar-toggle" role="group" aria-label="Calendar view">
          <button type="button" className={viewToggle === 'month' ? 'toggle-option active' : 'toggle-option'} aria-pressed={viewToggle === 'month'} onClick={() => setViewToggle('month')}>Full month</button>
          <button type="button" className={viewToggle === '2weeks' ? 'toggle-option active' : 'toggle-option'} aria-pressed={viewToggle === '2weeks'} onClick={() => setViewToggle('2weeks')}>2 weeks</button>
        </div>

        <div className="calendar-nav">
          <button className="circle-btn" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /></button>
          <h2>{viewToggle === 'month' ? month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${monthIndex + 1}/${year}`}</h2>
          <button className="circle-btn" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={16} strokeWidth={2} aria-hidden="true" /></button>
        </div>

        <button className="outline-btn today-btn" onClick={() => setMonth(new Date())}>Today</button>
      </div>

      <div className="weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
      </div>

      <div className={`calendar-grid ${viewToggle === '2weeks' ? 'two-weeks' : ''}`}>
        {calendarCells.map(cell => {
          const { date, day, outside } = cell
          const isToday = date === liveToday
          const dayEvents = (eventsByDate[date] || []).sort((a, b) => b.amount - a.amount)
          const spent = dayEvents.filter(event => event.kind === 'spent').reduce((sum, event) => sum + event.amount, 0)
          const due = dayEvents.filter(event => event.kind === 'due' && event.status !== 'Paid').reduce((sum, event) => sum + event.amount, 0)
          const hasEvents = dayEvents.length > 0
          const visibleEvents = dayEvents.slice(0, viewToggle === '2weeks' ? 2 : MAX_EVENTS_PER_DAY)
          const hiddenCount = dayEvents.length - visibleEvents.length
          const overDaily = budgets.daily > 0 && spent > budgets.daily
          const tone = overDaily ? 'day-over' : spent > 0 ? 'day-spent' : due > 0 ? 'day-due' : ''

          return <div
            className={`calendar-day ${isToday ? 'is-today' : ''} ${outside ? 'outside' : ''} ${tone} ${hasEvents ? 'has-events' : ''}`}
            key={date}
            role={hasEvents ? 'button' : undefined}
            tabIndex={hasEvents ? 0 : undefined}
            aria-label={hasEvents ? `${dayEvents.length} item${dayEvents.length === 1 ? '' : 's'} on ${formatDateFull(date)}` : undefined}
            onClick={hasEvents ? () => openDay(date, dayEvents) : undefined}
            onKeyDown={hasEvents ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openDay(date, dayEvents)
              }
            } : undefined}
          >
            <span className="day-num">{day}</span>
            {spent > 0 && <span className="day-total">{money(spent)}</span>}

            {hasEvents && <div className="calendar-events">
              {visibleEvents.map(event => <div
                key={`${event.id}-${event.kind}`}
                className={`cal-event kind-${event.kind}`}
                style={{ borderLeftColor: categoryMeta[event.category]?.[0] }}
              >
                <div className="event-header">
                  <strong>{event.title}</strong>
                  <span>{money(event.amount)}</span>
                </div>
                <div className="event-category">
                  {event.kind === 'due' && event.status !== 'Paid' && <WalletCards size={10} aria-hidden="true" />}
                  {event.category}
                </div>
              </div>)}
              {hiddenCount > 0 && <span className="more-events">+{hiddenCount} more</span>}
            </div>}
          </div>
        })}
      </div>

      <div className="calendar-legend">
        <span><i className="dot spent" />Spent</span>
        <span><i className="dot due" />Bill due</span>
        <span><i className="dot over" />Over daily guide</span>
        <span className="calendar-legend-note">Tap a day for details</span>
      </div>
    </section>

    <AppDialog
      open={Boolean(dayDetail)}
      onOpenChange={next => { if (!next) setDayDetail(null) }}
      title={dayDetail ? formatDateFull(dayDetail.date) : 'Day overview'}
      description={dayDetail ? `${dayDetail.events.length} item${dayDetail.events.length === 1 ? '' : 's'} · ${money(dayDetail.events.reduce((sum, event) => sum + event.amount, 0))}` : undefined}
      variant="center"
      className="day-dialog"
      footer={dayDetail ? <button type="button" className="primary-btn" onClick={() => { const date = dayDetail.date; setDayDetail(null); onAddForDate(date) }}>
        <Plus size={16} aria-hidden="true" /> Add expense on this day
      </button> : null}
    >
      <div className="day-list">
        {dayDetail?.events.map(event => <div className="day-list-item" key={`${event.id}-${event.kind}`} style={{ borderLeftColor: categoryMeta[event.category]?.[0] }}>
          <div className="event-header">
            <strong>{event.title}</strong>
            <span>{money(event.amount)}</span>
          </div>
          <div className="event-category">
            {event.category} · {event.kind === 'due' ? 'Bill due' : 'Spent'} · {event.payment}
          </div>
        </div>)}
      </div>
    </AppDialog>
  </>
}
