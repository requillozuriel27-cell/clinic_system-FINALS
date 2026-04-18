import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [showLogout, setShowLogout] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [appointments, setAppointments] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [apptSearch, setApptSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newRecord, setNewRecord] = useState({ patient: '', record_title: '', data: '' })
  const [recordSuccess, setRecordSuccess] = useState('')
  const [recordError, setRecordError] = useState('')

  const handleWsNotif = useCallback((data) => {
    if (data.type === 'initial_notifications') setNotifications(data.notifications || [])
    else if (data.message) setNotifications(prev => [data, ...prev])
  }, [])
  useWebSocket(user?.user_id, handleWsNotif)

  const loadNotifications = useCallback(async () => {
    try { const r = await api.get('/notifications/'); setNotifications(r.data) } catch (_) {}
  }, [])
  const loadStats = useCallback(async () => {
    try { const r = await api.get('/appointments/stats/overview/'); setStats(r.data) } catch (_) {}
  }, [])
  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (userSearch) params.append('search', userSearch)
      if (userRoleFilter) params.append('role', userRoleFilter)
      const r = await api.get(`/users/?${params}`)
      setUsers(r.data)
    } catch (_) {}
  }, [userSearch, userRoleFilter])
  const loadAppointments = useCallback(async () => {
    try {
      const params = apptSearch ? `?search=${apptSearch}` : ''
      const r = await api.get(`/appointments/${params}`)
      setAppointments(r.data)
    } catch (_) {}
  }, [apptSearch])

  useEffect(() => { loadNotifications(); loadStats(); loadAppointments() }, [])
  useEffect(() => { if (tab === 'Users') loadUsers() }, [tab, userSearch, userRoleFilter])
  useEffect(() => { if (tab === 'Appointments') loadAppointments() }, [tab, apptSearch])

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      loadAppointments(); loadStats()
    } catch (_) {}
    setCancelTarget(null)
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await api.post(`/users/${deactivateTarget.id}/deactivate/`)
      loadUsers()
    } catch (_) {}
    setDeactivateTarget(null)
  }

  const restoreUser = async (id) => {
    try { await api.post(`/users/${id}/restore/`); loadUsers() } catch (_) {}
  }

  const handleSaveRecord = async (e) => {
    e.preventDefault()
    setRecordError(''); setRecordSuccess('')
    try {
      await api.post('/records/create/', newRecord)
      setRecordSuccess('Medical record saved successfully.')
      setNewRecord({ patient: '', record_title: '', data: '' })
    } catch (err) {
      const d = err.response?.data
      setRecordError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to save record.')
    }
  }

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const statusBadge = (s) => <span className={`badge badge-${s}`}>{s}</span>
  const boldCell = { color: '#000', fontWeight: 'bold' }

  const sidebarItems = [
    { label: 'Overview', icon: '📊' },
    { label: 'Users', icon: '👥' },
    { label: 'Appointments', icon: '📅' },
    { label: 'Records', icon: '📋' },
    { label: 'Messages', icon: '💬' },
  ]

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🏥 Admin Panel<br />
          <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
            {user?.full_name || user?.username}
          </span>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <a key={item.label} href="#" className={tab === item.label ? 'active' : ''}
              onClick={e => { e.preventDefault(); setTab(item.label) }}>
              {item.icon} {item.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <button onClick={() => setShowLogout(true)}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 16px', width: '100%', fontWeight: 700,
              fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
            {tab === 'Overview' ? 'Admin Dashboard' : tab}
          </h1>
          <NotificationBell notifications={notifications} onMarkRead={loadNotifications} />
        </div>

        {/* Overview */}
        {tab === 'Overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.total_patients ?? '—'}</div>
                <div className="stat-label">Total Patients</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.total_doctors ?? '—'}</div>
                <div className="stat-label">Total Doctors</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.total_appointments ?? '—'}</div>
                <div className="stat-label">Total Appointments</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#f59e0b' }}>{stats.pending ?? '—'}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#16a34a' }}>{stats.confirmed ?? '—'}</div>
                <div className="stat-label">Confirmed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" style={{ color: '#dc2626' }}>{stats.cancelled ?? '—'}</div>
                <div className="stat-label">Cancelled</div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">📅 Recent Appointments</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {appointments.slice(0, 10).map(a => (
                      <tr key={a.id}>
                        <td style={boldCell}>{a.patient_name}</td>
                        <td style={boldCell}>Dr. {a.doctor_name}</td>
                        <td style={boldCell}>{a.date}</td>
                        <td style={boldCell}>{a.time}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>
                          {(a.status === 'pending' || a.status === 'confirmed') && (
                            <button className="btn-danger"
                              style={{ padding: '4px 12px', fontSize: 12 }}
                              onClick={() => setCancelTarget(a.id)}>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No appointments</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Users */}
        {tab === 'Users' && (
          <div className="card">
            <div className="card-title">👥 Manage Users</div>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search users…"
                value={userSearch}
                style={{ color: '#000', fontWeight: 'bold' }}
                onChange={e => setUserSearch(e.target.value)}
              />
              <select
                value={userRoleFilter}
                style={{ color: '#000', fontWeight: 'bold', maxWidth: 160 }}
                onChange={e => setUserRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Admins</option>
              </select>
              <button className="btn-primary" onClick={loadUsers}>Search</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 340px' : '1fr', gap: 20 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ cursor: 'pointer' }}>
                        <td style={boldCell} onClick={() => setSelectedUser(u)}>{u.username}</td>
                        <td style={boldCell} onClick={() => setSelectedUser(u)}>{u.first_name} {u.last_name}</td>
                        <td style={boldCell}>
                          <span className={`badge ${u.role === 'doctor' ? 'badge-confirmed' : u.role === 'admin' ? 'badge-completed' : 'badge-pending'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={boldCell}>{u.email}</td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {u.is_active ? (
                            <button className="btn-danger"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setDeactivateTarget(u)}>
                              Deactivate
                            </button>
                          ) : (
                            <button className="btn-outline"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => restoreUser(u.id)}>
                              Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedUser && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#000' }}>User Detail</span>
                    <button onClick={() => setSelectedUser(null)}
                      style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                  </div>
                  {[
                    ['Username', selectedUser.username],
                    ['Full Name', `${selectedUser.first_name} ${selectedUser.last_name}`],
                    ['Email', selectedUser.email],
                    ['Role', selectedUser.role],
                    ['Status', selectedUser.is_active ? 'Active' : 'Inactive'],
                    selectedUser.specialization && ['Specialization', selectedUser.specialization],
                    selectedUser.date_of_birth && ['Date of Birth', selectedUser.date_of_birth],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 14, color: '#000', fontWeight: 'bold', marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appointments */}
        {tab === 'Appointments' && (
          <div className="card">
            <div className="card-title">📅 All Appointments</div>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by patient or doctor…"
                value={apptSearch}
                style={{ color: '#000', fontWeight: 'bold' }}
                onChange={e => setApptSearch(e.target.value)}
              />
              <button className="btn-primary" onClick={loadAppointments}>Search</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td style={boldCell}>{a.patient_name}</td>
                      <td style={boldCell}>Dr. {a.doctor_name}</td>
                      <td style={boldCell}>{a.date}</td>
                      <td style={boldCell}>{a.time}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>
                        {(a.status === 'pending' || a.status === 'confirmed') && (
                          <button className="btn-danger"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            onClick={() => setCancelTarget(a.id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No appointments found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Records */}
        {tab === 'Records' && (
          <div className="card">
            <div className="card-title">📋 Add Medical Record</div>
            {recordError && <div className="alert-error">{recordError}</div>}
            {recordSuccess && <div className="alert-success">{recordSuccess}</div>}
            <form onSubmit={handleSaveRecord}>
              <div className="form-group">
                <label>Patient ID *</label>
                <input type="number" placeholder="Enter patient user ID" required
                  value={newRecord.patient}
                  onChange={e => setNewRecord(r => ({ ...r, patient: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Record Title *</label>
                <input type="text" placeholder="e.g. Blood Test Results" required
                  value={newRecord.record_title}
                  onChange={e => setNewRecord(r => ({ ...r, record_title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Record Data *</label>
                <textarea rows={6} placeholder="Enter medical record data (will be encrypted)…" required
                  value={newRecord.data}
                  onChange={e => setNewRecord(r => ({ ...r, data: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary">💾 Save Encrypted Record</button>
            </form>
          </div>
        )}

        {tab === 'Messages' && <MessagingPanel currentUserId={user?.user_id} />}
      </main>

      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}
      {cancelTarget && (
        <ConfirmModal
          title="Cancel Appointment"
          message="Cancel this appointment? Both the patient AND doctor will be notified via real-time notification."
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      {deactivateTarget && (
        <ConfirmModal
          title="Deactivate User"
          message={`Deactivate user "${deactivateTarget.username}"? They will no longer be able to log in.`}
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  )
}
