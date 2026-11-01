export function Stagger({ children, className = '' }) {
  return <div className={`stagger-wrap ${className}`}>{children}</div>
}

export function StaggerItem({ className = '', children }) {
  return <div className={`stagger-item ${className}`}>{children}</div>
}
