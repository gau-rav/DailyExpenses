export default function DeleteModal({ target, onClose, onPaid, onDelete, onPostpone }) {
  return (
    <div className="modal-backdrop">
      <div className="modal delete-modal">
        <div className="delete-icon">!</div>
        <h2>{target.type === 'bulk' ? `What should we do with ${target.items.length} expenses?` : 'This expense is due today'}</h2>
        <p>Choose what happens next. You can mark it as paid, remove it, or move it to tomorrow.</p>
        <div className="delete-options">
          <button className="paid-option" onClick={onPaid}>
            <span>✓</span>
            <div>
              <strong>Mark as Paid</strong>
              <small>Keep it in your expense history</small>
            </div>
          </button>
          <button className="delete-option" onClick={onDelete}>
            <span>⌫</span>
            <div>
              <strong>Delete</strong>
              <small>Move it to trash</small>
            </div>
          </button>
          <button className="postpone-option" onClick={onPostpone}>
            <span>◷</span>
            <div>
              <strong>Postpone</strong>
              <small>Move due date to tomorrow</small>
            </div>
          </button>
        </div>
        <button className="text-btn center-btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}