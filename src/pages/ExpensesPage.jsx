import { useEffect, useRef, useState } from 'react'
import { Filter, Pencil, X } from 'lucide-react'
import { PageTitle, Category, Status, Empty } from '../components/PageComponents'
import { categories, categoryMeta, formatDate, money } from '../utils/appData'

const PAGE_SIZE = 20

export default function ExpensesPage({ expenses, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, sort, setSort, selected, setSelected, onBulkDelete, onAdd, onEdit, onDelete, exportCsv }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const loadMoreRef = useRef(null)
  const hasMore = visibleCount < expenses.length
  const allSelected = expenses.length > 0 && expenses.every(expense => selected.includes(expense.id))

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) return undefined

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(current => Math.min(current + PAGE_SIZE, expenses.length))
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [expenses, hasMore])

  useEffect(() => {
    if (!filtersOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [filtersOpen])

  const visibleExpenses = expenses.slice(0, visibleCount)

  return <>
    <PageTitle eyebrow="Workspace / Expenses" title="All expenses" subtitle="Every transaction, all in one place." action={<button className="primary-btn page-add-button" onClick={onAdd}>＋ Add expense</button>} />
    <section className="card table-card">
    <div className={`toolbar${filtersOpen ? ' filters-open' : ''}`}>
      <div className="expense-search-row">
        <div className="search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search expenses..." /></div>
        <button className="mobile-filter-toggle" type="button" aria-label="Open expense filters" aria-expanded={filtersOpen} aria-controls="expense-filters" onClick={() => setFiltersOpen(open => !open)}>
          <Filter size={18} aria-hidden="true" />
          <span>Filter</span>
        </button>
      </div>
      <label className="mobile-select-all">
        <input type="checkbox" aria-label="Select all expenses" checked={allSelected} onChange={() => setSelected(allSelected ? [] : expenses.map(expense => expense.id))} />
        <span>Select all expenses</span>
        <small>{expenses.length}</small>
      </label>
      {filtersOpen && <button className="expense-filter-backdrop" type="button" aria-label="Close expense filters" onClick={() => setFiltersOpen(false)} />}
      <div className="expense-filters" id="expense-filters" role={filtersOpen ? 'dialog' : undefined} aria-modal={filtersOpen || undefined} aria-label="Expense filters">
        <div className="mobile-filter-heading">
          <strong>Filters</strong>
          <button type="button" aria-label="Close expense filters" onClick={() => setFiltersOpen(false)}><X size={20} aria-hidden="true" /></button>
        </div>
        <select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
            <option>All categories</option>
            {categories.map(category => <option key={category}>{category}</option>)}
          </select>
          <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option>All statuses</option>
            {['Paid', 'Due Today', 'Upcoming', 'Overdue', 'Pending'].map(status => <option key={status}>{status}</option>)}
          </select>
          <select aria-label="Sort expenses" value={sort} onChange={event => setSort(event.target.value)}>
            <option value="date">Newest first</option>
            <option value="amount">Highest amount</option>
            <option value="category">Category</option>
          </select>
          <button className="outline-btn export" onClick={() => { exportCsv(); setFiltersOpen(false) }}>↥ Export</button>
        </div>
      </div>
      {selected.length > 0 && <div className="bulk-bar"><span>{selected.length} selected</span><button onClick={onBulkDelete}>Delete selected</button></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th><input type="checkbox" aria-label="Select all expenses" checked={allSelected} onChange={() => setSelected(allSelected ? [] : expenses.map(expense => expense.id))} /></th><th>Expense</th><th>Category</th><th>Date</th><th>Payment</th><th>Status</th><th className="align-right">Amount</th><th>Actions</th></tr></thead>
          <tbody>{visibleExpenses.map(expense => <tr key={expense.id}>
            <td data-label="Select"><input aria-label={`Select ${expense.title}`} type="checkbox" checked={selected.includes(expense.id)} onChange={() => setSelected(current => current.includes(expense.id) ? current.filter(id => id !== expense.id) : [...current, expense.id])} /></td>
            <td data-label="Expense">
              <div className="table-expense">
                <span className="expense-icon" style={{ background: `${categoryMeta[expense.category]?.[0]}1c` }}>{categoryMeta[expense.category]?.[1]}</span>
                <span className="expense-info"><strong>{expense.title}</strong><small className="expense-mobile-meta"><Category value={expense.category} /><span>·</span>{formatDate(expense.date)}<span>·</span><Status value={expense.status} /></small></span>
              </div>
            </td>
            <td data-label="Category"><Category value={expense.category} /></td>
            <td data-label="Date">{formatDate(expense.date)}</td>
            <td data-label="Payment">{expense.payment}</td>
            <td data-label="Status"><Status value={expense.status} /></td>
            <td data-label="Amount" className="align-right amount-cell">{money(expense.amount)}</td>
            <td data-label="Actions"><button className="table-action" aria-label={`Edit ${expense.title}`} title="Edit expense" onClick={() => onEdit(expense)}><Pencil size={16} strokeWidth={2} aria-hidden="true" /><span>Edit</span></button><button className="table-delete" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense)}>×</button></td>
          </tr>)}</tbody>
        </table>
        {!expenses.length && <Empty text="No expenses match your filters." />}
        {hasMore && <div ref={loadMoreRef} className="expenses-load-more" role="status">Scroll to load more expenses…</div>}
        {expenses.length > 0 && !hasMore && <p className="expenses-end-message" role="status">You’ve reached the end — all {expenses.length} expenses are shown.</p>}
      </div>
    </section>
  </>
}
