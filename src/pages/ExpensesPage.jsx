import { PageTitle, Category, Status, Empty } from '../components/PageComponents'
import { categories, categoryMeta, formatDate, money } from '../utils/appData'

export default function ExpensesPage({ expenses, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, sort, setSort, selected, setSelected, onBulkDelete, onAdd, onEdit, onDelete, exportCsv }) {
  const allSelected = expenses.length > 0 && expenses.every(expense => selected.includes(expense.id))

  return <>
    <PageTitle eyebrow="Workspace / Expenses" title="All expenses" subtitle="Every transaction, all in one place." action={<button className="primary-btn page-add-button" onClick={onAdd}>＋ Add expense</button>} />
    <section className="card table-card">
      <div className="toolbar">
        <div className="search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search expenses..." /></div>
        <div className="expense-filters">
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
          <button className="outline-btn export" onClick={exportCsv}>↥ Export</button>
        </div>
      </div>
      {selected.length > 0 && <div className="bulk-bar"><span>{selected.length} selected</span><button onClick={onBulkDelete}>Delete selected</button></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th><input type="checkbox" aria-label="Select all expenses" checked={allSelected} onChange={() => setSelected(allSelected ? [] : expenses.map(expense => expense.id))} /></th><th>Expense</th><th>Category</th><th>Date</th><th>Payment</th><th>Status</th><th className="align-right">Amount</th><th>Actions</th></tr></thead>
          <tbody>{expenses.map(expense => <tr key={expense.id}>
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
            <td data-label="Actions"><button className="table-action" aria-label={`Edit ${expense.title}`} onClick={() => onEdit(expense)}>Edit</button><button className="table-delete" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense)}>×</button></td>
          </tr>)}</tbody>
        </table>
        {!expenses.length && <Empty text="No expenses match your filters." />}
      </div>
    </section>
  </>
}
