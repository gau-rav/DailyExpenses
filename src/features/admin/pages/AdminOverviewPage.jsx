import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getAdminOverview } from '../services/adminApi'

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminOverview()
      .then(data => {
        if (data.ok) setStats(data)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <h1 style={{ margin: '0 0 24px', fontSize: '28px' }}>Overview</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Total Users</div>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>{stats?.totalUsers || 0}</div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Total Expenses</div>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>{stats?.totalExpenses || 0}</div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Total Spend</div>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>₹{(stats?.totalSpend || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
