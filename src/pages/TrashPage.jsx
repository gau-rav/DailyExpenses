import { useState, useEffect } from 'react'
import { Empty, PageTitle } from '../components/PageComponents'
import { formatDate, money, categoryMeta } from '../utils/appData'

export default function TrashPage({ deleted, setDeleted, setExpenses, notify, onRestore, onPurge }) {
  const [selected, setSelected] = useState([])
  const [undoItem, setUndoItem] = useState(null) // for undo toast
  const [undoTimer, setUndoTimer] = useState(null)
  const [previewItem, setPreviewItem] = useState(null) // for delete preview modal
  const [isRestoring, setIsRestoring] = useState(false)

  // Clean up undo timer on unmount
  useEffect(() => () => undoTimer && clearTimeout(undoTimer), [undoTimer])

  const allSelected = deleted.length > 0 && deleted.every(e => selected.includes(e.id))

  const toggleSelect = id => setSelected(cur =>
    cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
  )

  const restore = async expense => {
    setIsRestoring(true)
    try {
      setExpenses(cur => [expense, ...cur])
      setDeleted(cur => cur.filter(e => e.id !== expense.id))
      setSelected(cur => cur.filter(id => id !== expense.id))
      await onRestore(expense)
      notify('Expense restored')
    } finally {
      setIsRestoring(false)
    }
  }

  const restoreSelected = async () => {
    if (selected.length === 0) return
    setIsRestoring(true)
    const toRestore = deleted.filter(e => selected.includes(e.id))
    try {
      for (const expense of toRestore) {
        setExpenses(cur => [expense, ...cur])
        await onRestore(expense)
      }
      setDeleted(cur => cur.filter(e => !selected.includes(e.id)))
      setSelected([])
      notify(`${toRestore.length} expense${toRestore.length === 1 ? '' : 's'} restored`)
    } finally {
      setIsRestoring(false)
    }
  }

  // Show preview modal before permanent delete
  const requestPurge = expense => {
    setPreviewItem(expense || { _bulk: true, items: deleted.filter(e => selected.includes(e.id)) })
  }

  const confirmPurge = async () => {
    if (!previewItem) return
    if (previewItem._bulk) {
      await onPurge(previewItem.items)
      setDeleted(cur => cur.filter(e => !selected.includes(e.id)))
      setSelected([])
      notify(`${previewItem.items.length} expense${previewItem.items.length === 1 ? '' : 's'} permanently deleted`)
    } else {
      await onPurge([previewItem])
      setDeleted(cur => cur.filter(e => e.id !== previewItem.id))
      setSelected(cur => cur.filter(id => id !== previewItem.id))
      notify('Expense permanently deleted')
    }
    setPreviewItem(null)
  }

  const purgeAll = () => {
    setPreviewItem({ _bulk: true, _all: true, items: deleted })
  }

  return <>
    <PageTitle
      eyebrow="Workspace / Trash"
      title="Trash"
      subtitle="Restore something you deleted by mistake."
      action={deleted.length > 0 && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {selected.length > 0 && (
            <>
              <button
                className="primary-btn"
                onClick={restoreSelected}
                disabled={isRestoring}
              >
                {isRestoring ? 'Restoring…' : `Restore ${selected.length}`}
              </button>
              <button
                className="outline-btn danger-outline"
                onClick={() => requestPurge(null)}
              >
                Delete {selected.length}
              </button>
            </>
          )}
          <button className="outline-btn" onClick={purgeAll}>Empty trash</button>
        </div>
      )}
    />

    <section className="card table-card trash-card">
      {deleted.length > 0 && (
        <div className="trash-header">
          <label className="trash-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : deleted.map(e => e.id))}
            />
            <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
          </label>
          {selected.length > 0 && (
            <span className="trash-selection-summary">
              {selected.length} selected
            </span>
          )}
        </div>
      )}

      {deleted.length
        ? deleted.map(expense => {
            const isSelected = selected.includes(expense.id)
            const color = categoryMeta[expense.category]?.[0] || '#94a3b8'
            const emoji = categoryMeta[expense.category]?.[1] || '✦'

            return (
              <div
                className={`trash-row ${isSelected ? 'selected' : ''}`}
                key={expense.id}
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(expense.id)}
                />
                <div className="trash-icon" style={{ background: `${color}20`, color }}>
                  {emoji}
                </div>
                <div className="trash-info">
                  <strong>{expense.title}</strong>
                  <span>{expense.category} · {formatDate(expense.date)} · {money(expense.amount)}</span>
                  {expense.deletedAt && (
                    <small>Deleted {formatDate(expense.deletedAt)}</small>
                  )}
                </div>
                <div className="trash-actions">
                  <button
                    className="outline-btn"
                    onClick={() => restore(expense)}
                    disabled={isRestoring}
                  >
                    Restore
                  </button>
                  <button
                    className="icon-outline-btn"
                    onClick={() => requestPurge(expense)}
                    title="Permanently delete"
                    aria-label={`Permanently delete ${expense.title}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })
        : <Empty text="Trash is empty." />
      }
    </section>

    {/* Delete preview modal */}
    {previewItem && (
      <div className="modal-backdrop" onClick={() => setPreviewItem(null)}>
        <div className="modal delete-preview-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div>
              <div className="eyebrow">This cannot be undone</div>
              <h2>Permanently delete?</h2>
            </div>
            <button type="button" className="close" onClick={() => setPreviewItem(null)}>×</button>
          </div>

          <div className="preview-list">
            {previewItem._bulk
              ? previewItem.items.map(e => (
                  <div className="preview-item" key={e.id}>
                    <span className="preview-category" style={{ background: `${categoryMeta[e.category]?.[0]}20`, color: categoryMeta[e.category]?.[0] }}>
                      {categoryMeta[e.category]?.[1] || '✦'}
                    </span>
                    <div>
                      <strong>{e.title}</strong>
                      <small>{money(e.amount)} · {formatDate(e.date)}</small>
                    </div>
                  </div>
                ))
              : (
                <div className="preview-item">
                  <span className="preview-category" style={{ background: `${categoryMeta[previewItem.category]?.[0]}20`, color: categoryMeta[previewItem.category]?.[0] }}>
                    {categoryMeta[previewItem.category]?.[1] || '✦'}
                  </span>
                  <div>
                    <strong>{previewItem.title}</strong>
                    <small>{money(previewItem.amount)} · {formatDate(previewItem.date)}</small>
                  </div>
                </div>
              )
            }
          </div>

          <p className="preview-warning">
            Once deleted, this data cannot be recovered.
          </p>

          <div className="modal-actions">
            <button type="button" className="outline-btn" onClick={() => setPreviewItem(null)}>Cancel</button>
            <button type="button" className="danger-btn" onClick={confirmPurge}>
              Delete permanently
            </button>
          </div>
        </div>
      </div>
    )}
  </>
}
