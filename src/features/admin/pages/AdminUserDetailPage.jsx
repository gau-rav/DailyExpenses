import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { getAdminUser, getAdminUserExpenses } from '../services/adminApi'

export default function AdminUserDetailPage() {
  const { userId } = useParams()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getAdminUser(userId),
      getAdminUserExpenses(userId, false)
    ]).then(([userData, expData]) => {
      if (userData.ok) {
        setUser(userData.user)
        setStats(userData.stats)
      }
      if (expData.ok) {
        setExpenses(expData.expenses)
      }
    }).finally(() => setLoading(false))
  }, [userId])

  return (
    <AdminLayout>
      <h1 style={{ margin: '0 0 24px', fontSize: '28px' }}>User Details</h1>
      {loading ? (
        <div>Loading...</div>
      ) : !user ? (
        <div>User not found</div>
      ) : (
        <>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '20px' }}>Profile</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Name:</strong> {user.name || '-'}</div>
              <div><strong>Role:</strong> {user.role}</div>
              <div><strong>Provider:</strong> {user.authProvider}</div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <strong>Expense Stats:</strong> {stats?.count || 0} expenses, Total: ₹{(stats?.total || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Expenses ({expenses.length})</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f5f5f5' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Title</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>No expenses</td></tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{exp.title}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>₹{exp.amount?.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{exp.category}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{exp.date}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{exp.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
