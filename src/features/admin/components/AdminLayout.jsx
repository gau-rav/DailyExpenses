import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'

export default function AdminLayout({ children }) {
  const { admin, loading } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login')
    }
  }, [admin, loading, navigate])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading admin panel...</div>
  }
  if (!admin) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ background: '#1a1a1a', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>PaisaWise Admin Panel</div>
        <div style={{ fontSize: '14px' }}>{admin.email} ({admin.role})</div>
      </header>
      <nav style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '0 24px', display: 'flex', gap: '32px' }}>
        <a href="/admin" style={{ padding: '12px 0', color: '#333', textDecoration: 'none', borderBottom: '2px solid transparent' }}>Overview</a>
        <a href="/admin/users" style={{ padding: '12px 0', color: '#333', textDecoration: 'none', borderBottom: '2px solid transparent' }}>Users</a>
      </nav>
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
