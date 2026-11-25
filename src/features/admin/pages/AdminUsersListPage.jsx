import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { getAdminUsers } from '../services/adminApi'

export default function AdminUsersListPage() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const loadUsers = async (searchTerm = '') => {
    setLoading(true)
    try {
      const data = await getAdminUsers({ limit: 100, search: searchTerm })
      if (data.ok) {
        setUsers(data.users)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    loadUsers(search)
  }

  return (
    <AdminLayout>
      <h1 style={{ margin: '0 0 24px', fontSize: '28px' }}>Users ({total})</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', flex: '1', maxWidth: '300px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
      </form>
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Provider</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{user.name || '-'}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{user.email}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: user.role === 'admin' ? '#ffebee' : '#e8f5e9', color: user.role === 'admin' ? '#c62828' : '#2e7d32', fontSize: '12px' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{user.authProvider}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <button
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      style={{ padding: '6px 12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
