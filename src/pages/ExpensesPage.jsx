import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle, Category, Status, Empty } from '../components/PageComponents'
import { categories, categoryMeta, formatDate, money } from '../utils/appData'

const PAGE_SIZE = 20
const dateLabel = expense => expense.date
  ? formatDate(expense.date)
  : expense.dueDate ? `Due ${formatDate(expense.dueDate)}` : '—'
const SORTS = {
  date: (a, b) => (b.date || b.dueDate || '').localeCompare(a.date || a.dueDate || ''),
  amount: (a, b) => b.amount - a.amount,
  category: (a, b) => a.category.localeCompare(b.category),
}

export default function ExpensesPage({ expenses, selected, setSelected, onBulkDelete, onQuickAdd, onEdit, onDelete, exportCsv }) {
  const [params, setParams] = useSearchParams()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const loadMoreRef = useRef(null)

  const query = params.get('q') || ''
  const categoryFilter = params.get('category') || 'All categories'
  const statusFilter = params.get('status') || 'All statuses'
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'date'

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'All categories' || value === 'All statuses' || (key === 'sort' && value === 'date')) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => expenses
    .filter(expense => `${expense.title} ${expense.category} ${expense.payment}`.toLowerCase().includes(query.toLowerCase()))
    .filter(expense => categoryFilter === 'All categories' || expense.category === categoryFilter)
    .filter(expense => statusFilter === 'All statuses' || expense.status === statusFilter)
    .sort(SORTS[sort]), [expenses, query, categoryFilter, statusFilter, sort])

  const hasMore = visibleCount < filtered.length
  const allSelected = filtered.length > 0 && filtered.every(expense => selected.includes(expense.id))
  const activeFilterCount = [query, categoryFilter !== 'All categories', statusFilter !== 'All statuses', sort !== 'date'].filter(Boolean).length
  const filteredTotal = filtered.reduce((sum, expense) => sum + expense.amount, 0)

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) return undefined
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(current => Math.min(current + PAGE_SIZE, filtered.length))
      }
    }, { rootMargin: '200px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [filtered.length, hasMore])

  useEffect(() => {
    if (!filtersOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [filtersOpen])

  const visibleExpenses = filtered.slice(0, visibleCount)
  const clearFilters = () => setParams(new URLSearchParams(), { replace: true })

  return <>
    <PageTitle
      eyebrow="Every transaction"
      title="All expenses"
      subtitle={`${expenses.length} logged · ${money(filteredTotal)} in this view`}
      action={<button className="primary-btn page-add-button" onClick={() => onQuickAdd()}><Plus size={16} strokeWidth={2.2} aria-hidden="true" /><span>Add expense</span></button>}
    />

    <section className="card table-card">
      <div className={`toolbar${filtersOpen ? ' filters-open' : ''}`}>
        <div className="expense-search-row">
          <div className="search">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={event => updateParam('q', event.target.value)} placeholder="Search expenses…" aria-label="Search expenses" />
          </div>
          <button className="mobile-filter-toggle" type="button" aria-label="Open expense filters" aria-expanded={filtersOpen} aria-controls="expense-filters" onClick={() => setFiltersOpen(open => !open)}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>Filters</span>
            {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
        </div>

        <div className="filter-chip-row" aria-label="Active filters">
          <select className="filter-select" aria-label="Filter by category" value={categoryFilter} onChange={event => updateParam('category', event.target.value)}>
            <option>All categories</option>
            {categories.map(category => <option key={category}>{category}</option>)}
          </select>
          <select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={event => updateParam('status', event.target.value)}>
            <option>All statuses</option>
            {['Paid', 'Due Today', 'Upcoming', 'Overdue', 'Pending'].map(status => <option key={status}>{status}</option>)}
          </select>
          <select className="filter-select" aria-label="Sort expenses" value={sort} onChange={event => updateParam('sort', event.target.value)}>
            <option value="date">Newest first</option>
            <option value="amount">Highest amount</option>
            <option value="category">Category</option>
          </select>
          {activeFilterCount > 0 && <button type="button" className="chip chip-clear" onClick={clearFilters}><X size={13} aria-hidden="true" />Clear</button>}
          <button className="outline-btn export" onClick={exportCsv}><Download size={14} aria-hidden="true" /><span>Export</span></button>
        </div>

        <div className="expense-controls-row">
          <label className="mobile-select-all">
            <input type="checkbox" aria-label="Select all expenses" checked={allSelected} onChange={() => setSelected(allSelected ? [] : filtered.map(expense => expense.id))} />
            <span>Select all expenses</span>
            <small>{filtered.length}</small>
          </label>
        </div>

        {filtersOpen && <button className="expense-filter-backdrop" type="button" aria-label="Close expense filters" onClick={() => setFiltersOpen(false)} />}
        {filtersOpen && <div className="expense-filters" id="expense-filters" role="dialog" aria-label="Expense filters">
          <div className="mobile-filter-heading">
            <strong>Filters</strong>
            <button type="button" aria-label="Close expense filters" onClick={() => setFiltersOpen(false)}><X size={20} aria-hidden="true" /></button>
          </div>
          <select aria-label="Filter by category" value={categoryFilter} onChange={event => updateParam('category', event.target.value)}>
            <option>All categories</option>
            {categories.map(category => <option key={category}>{category}</option>)}
          </select>
          <select aria-label="Filter by status" value={statusFilter} onChange={event => updateParam('status', event.target.value)}>
            <option>All statuses</option>
            {['Paid', 'Due Today', 'Upcoming', 'Overdue', 'Pending'].map(status => <option key={status}>{status}</option>)}
          </select>
          <select aria-label="Sort expenses" value={sort} onChange={event => updateParam('sort', event.target.value)}>
            <option value="date">Newest first</option>
            <option value="amount">Highest amount</option>
            <option value="category">Category</option>
          </select>
          <button className="primary-btn" onClick={() => setFiltersOpen(false)}>Show {filtered.length} result{filtered.length === 1 ? '' : 's'}</button>
        </div>}

        {selected.length > 0 && <div className="bulk-bar"><span>{selected.length} selected · {money(filtered.filter(expense => selected.includes(expense.id)).reduce((sum, expense) => sum + expense.amount, 0))}</span><button onClick={onBulkDelete}>Delete selected</button></div>}

        <div className="table-wrap">
          <table>
            <thead><tr><th><input type="checkbox" aria-label="Select all expenses" checked={allSelected} onChange={() => setSelected(allSelected ? [] : filtered.map(expense => expense.id))} /></th><th>Expense</th><th>Category</th><th>Date</th><th>Payment</th><th>Status</th><th className="align-right">Amount</th><th>Actions</th></tr></thead>
            <tbody>{visibleExpenses.map(expense => {
              const categoryColor = categoryMeta[expense.category]?.[0] || '#94a3b8'
              return <tr key={expense.id} style={{ borderLeft: `3px solid ${categoryColor}` }}>
                <td data-label="Select"><input aria-label={`Select ${expense.title}`} type="checkbox" checked={selected.includes(expense.id)} onChange={() => setSelected(current => current.includes(expense.id) ? current.filter(id => id !== expense.id) : [...current, expense.id])} /></td>
                <td data-label="Expense">
                  <div className="table-expense">
                    <span className="expense-icon" style={{ background: `${categoryColor}1c` }}>{categoryMeta[expense.category]?.[1]}</span>
                    <span className="expense-info"><strong>{expense.title}</strong><small className="expense-mobile-meta"><Category value={expense.category} /><span>·</span>{dateLabel(expense)}<span>·</span><Status value={expense.status} /></small></span>
                  </div>
                </td>
                <td data-label="Category"><Category value={expense.category} /></td>
                <td data-label="Date">{dateLabel(expense)}</td>
                <td data-label="Payment">{expense.payment}</td>
                <td data-label="Status"><Status value={expense.status} /></td>
                <td data-label="Amount" className="align-right amount-cell">{money(expense.amount)}</td>
                <td data-label="Actions"><button type="button" className="table-action" aria-label={`Edit ${expense.title}`} onClick={() => onEdit(expense)}>Edit</button><button type="button" className="table-delete" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense)}>×</button></td>
              </tr>
            })}</tbody>
          </table>
          {!filtered.length && <Empty text={expenses.length ? 'No expenses match these filters. Try clearing one.' : 'No expenses yet. Add your first one in two taps.'} />}
          {hasMore && <div ref={loadMoreRef} className="expenses-load-more" role="status">Scroll to load more expenses…</div>}
          {filtered.length > 0 && !hasMore && <p className="expenses-end-message" role="status">All {filtered.length} expenses shown · <strong>{money(filteredTotal)}</strong></p>}
        </div>
      </div>
    </section>
  </>
}
