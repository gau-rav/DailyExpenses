import { AlertTriangle, Check, Info, X } from 'lucide-react'

const toneIcon = {
  success: Check,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
}

export default function Toast({ toast, onDismiss }) {
  const tone = toast?.tone || 'info'
  const Icon = toneIcon[tone] || Info

  return <div className="toast-region" aria-live="polite" aria-atomic="true">
    {toast && <div className={`toast toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon"><Icon size={15} strokeWidth={2.4} aria-hidden="true" /></span>
      <span className="toast-message">{toast.message}</span>
      {toast.action && <button type="button" className="toast-action" onClick={() => { toast.action.onClick(); onDismiss() }}>{toast.action.label}</button>}
      <button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={onDismiss}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>}
  </div>
}
