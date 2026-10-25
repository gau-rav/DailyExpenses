import { Link } from 'react-router-dom'

export default function SiteFooter({ className = '' }) {
  const year = new Date().getFullYear()
  return <footer className={`site-footer ${className}`.trim()}>
    <div className="site-footer-inner">
      <span className="site-footer-copy">© {year} PaisaWise. All rights reserved.</span>
      <nav className="site-footer-links" aria-label="Legal">
        <Link to="/privacy">Privacy policy</Link>
        <Link to="/terms">Terms &amp; conditions</Link>
      </nav>
    </div>
  </footer>
}
