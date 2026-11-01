import { X } from 'lucide-react'

export default function AppDialog({ open, onOpenChange, title, description, hideTitle, variant = 'center', className = '', children, footer }) {
  if (!open) return null

  return (
    <>
      <div className="dialog-overlay" onClick={() => onOpenChange(false)} />
      <div className={`dialog-content dialog-${variant} ${className}`.trim()} role="dialog" aria-modal="true" aria-label={hideTitle ? title : undefined}>
        <div className="dialog-head">
          <div>
            {hideTitle ? <h2 className="sr-only">{title}</h2> : <h2 className="dialog-title">{title}</h2>}
            {description && <p className="dialog-description">{description}</p>}
          </div>
          <button type="button" className="dialog-close" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </>
  )
}
