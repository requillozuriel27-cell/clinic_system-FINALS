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
  const [apptStatusFilter, setApptStatusFilter] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionMsg, setActionMsg] = useState('')
  const [resetUserId, setResetUserId] = useState(null)
  const [resetUsername, setResetUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
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
      const params = new URLSearchParams()
      if (apptSearch) params.append('search', apptSearch)
      if (apptStatusFilter) params.append('status', apptStatusFilter)
      const r = await api.get(`/appointments/?${params}`)
      setAppointments(r.data)
    } catch (_) {}
  }, [apptSearch, apptStatusFilter])

  useEffect(() => { loadNotifications(); loadStats(); loadAppointments() }, [])
  useEffect(() => { if (tab === 'Users') loadUsers() }, [tab, userSearch, userRoleFilter])
  useEffect(() => { if (tab === 'Appointments' || tab === 'Overview') loadAppointments() }, [tab, apptSearch, apptStatusFilter])

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      setActionMsg('Appointment cancelled. Both patient and doctor have been notified.')
      loadAppointments(); loadStats()
    } catch (_) {}
    setCancelTarget(null)
  }

  const confirmConfirm = async () => {
    if (!confirmTarget) return
    try {
      await api.post(`/appointments/${confirmTarget}/confirm/`)
      setActionMsg('Appointment confirmed. Patient has been notified.')
      loadAppointments(); loadStats()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to confirm.')
    }
    setConfirmTarget(null)
  }

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await api.post(`/appointments/${apptId}/update-status/`, { status: newStatus })
      setActionMsg(`Status updated to "${newStatus}".`)
      loadAppointments(); loadStats()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to update status.')
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    try { await api.post(`/users/${deactivateTarget.id}/deactivate/`); loadUsers() } catch (_) {}
    setDeactivateTarget(null)
  }

  const restoreUser = async (id) => {
    try { await api.post(`/users/${id}/restore/`); loadUsers() } catch (_) {}
  }

  const openResetPassword = (u) => {
    setResetUserId(u.id); setResetUsername(u.username)
    setNewPassword(''); setResetMsg(''); setResetError('')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetMsg(''); setResetError(''); setResetLoading(true)
    try {
      const res = await api.post(`/users/${resetUserId}/reset-password/`, { new_password: newPassword })
      setResetMsg(res.data.message); setNewPassword('')
    } catch (err) {
      setResetError(err.response?.data?.error || 'Failed to reset password.')
    } finally { setResetLoading(false) }
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
      setRecordError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed.')
    }
  }

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const statusBadge = (s) => {
    const colors = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      cancelled: 'badge-cancelled',
      completed: 'badge-completed',
    }
    return <span className={`badge ${colors[s] || 'badge-pending'}`}>{s}</span>
  }

  const bold = { color: '#000', fontWeight: 'bold' }

  const AppointmentActions = ({ a }) => (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      {a.status === 'pending' && (
        <button className="btn-primary"
          style={{ padding: '3px 10px', fontSize: 12, background: '#16a34a' }}
          onClick={() => setConfirmTarget(a.id)}>
          ✓ Confirm
        </button>
      )}
      {(a.status === 'pending' || a.status === 'confirmed') && (
        <button className="btn-danger"
          style={{ padding: '3px 10px', fontSize: 12 }}
          onClick={() => setCancelTarget(a.id)}>
          ✕ Cancel
        </button>
      )}
      {/* Admin status dropdown */}
      <select
        value={a.status}
        onChange={e => handleStatusChange(a.id, e.target.value)}
        style={{
          fontSize: 12, padding: '3px 6px', border: '1px solid #e5e7eb',
          borderRadius: 6, color: '#000', fontWeight: 'bold',
          background: 'white', cursor: 'pointer',
        }}
      >
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  )

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

        {actionMsg && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            {actionMsg}
            <button onClick={() => setActionMsg('')}
              style={{ float: 'right', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 700, color: '#065f46' }}>✕</button>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'Overview' && (
          <>
            <div className="stats-grid">
              {[
                ['Total Patients', stats.total_patients, '#16a34a'],
                ['Total Doctors', stats.total_doctors, '#16a34a'],
                ['Total Appointments', stats.total_appointments, '#16a34a'],
                ['Pending', stats.pending, '#f59e0b'],
                ['Confirmed', stats.confirmed, '#16a34a'],
                ['Cancelled', stats.cancelled, '#dc2626'],
              ].map(([label, val, color]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-number" style={{ color }}>{val ?? '—'}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">📅 Recent Appointments</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {appointments.slice(0, 10).map(a => (
                      <tr key={a.id}>
                        <td style={bold}>{a.patient_name}</td>
                        <td style={bold}>Dr. {a.doctor_name}</td>
                        <td style={bold}>{a.date}</td>
                        <td style={bold}>{a.time}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td><AppointmentActions a={a} /></td>
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

        {/* USERS */}
        {tab === 'Users' && (
          <div className="card">
            <div className="card-title">👥 Manage Users</div>
            <div className="search-bar">
              <input type="text" placeholder="Search users…" value={userSearch}
                style={bold} onChange={e => setUserSearch(e.target.value)} />
              <select value={userRoleFilter} style={{ ...bold, maxWidth: 160 }}
                onChange={e => setUserRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Admins</option>
              </select>
              <button className="btn-primary" onClick={loadUsers}>Search</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 320px' : '1fr', gap: 20 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...bold, cursor: 'pointer', color: '#16a34a' }}
                          onClick={() => setSelectedUser(u)}>{u.username}</td>
                        <td style={bold}>{u.first_name} {u.last_name}</td>
                        <td>
                          <span className={`badge ${u.role === 'doctor' ? 'badge-confirmed' : u.role === 'admin' ? 'badge-completed' : 'badge-pending'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.is_active ? (
                            <button className="btn-danger"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setDeactivateTarget(u)}>Deactivate</button>
                          ) : (
                            <button className="btn-outline"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => restoreUser(u.id)}>Restore</button>
                          )}
                          <button
                            style={{ padding: '4px 10px', fontSize: 12, background: '#fef3c7',
                              color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6,
                              cursor: 'pointer', fontWeight: 700 }}
                            onClick={() => openResetPassword(u)}>
                            🔑 Reset PW
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>No users found</td></tr>
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

        {/* APPOINTMENTS */}
        {tab === 'Appointments' && (
          <div className="card">
            <div className="card-title">📅 All Appointments</div>
            <div className="search-bar">
              <input type="text" placeholder="Search by patient or doctor…"
                value={apptSearch} style={bold}
                onChange={e => setApptSearch(e.target.value)} />
              <select value={apptStatusFilter} style={{ ...bold, maxWidth: 160 }}
                onChange={e => setApptStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
              <button className="btn-primary" onClick={loadAppointments}>Search</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td style={bold}>{a.patient_name}</td>
                      <td style={bold}>Dr. {a.doctor_name}</td>
                      <td style={bold}>{a.date}</td>
                      <td style={bold}>{a.time}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td><AppointmentActions a={a} /></td>
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

        {/* RECORDS */}
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
                <textarea rows={6} placeholder="Enter data (will be encrypted)…" required
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
        <ConfirmModal title="Cancel Appointment"
          message="Cancel this appointment? Both patient and doctor will be notified."
          onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
      )}
      {confirmTarget && (
        <ConfirmModal title="Confirm Appointment"
          message="Confirm this appointment? The patient will be notified."
          onConfirm={confirmConfirm} onCancel={() => setConfirmTarget(null)} danger={false} />
      )}
      {deactivateTarget && (
        <ConfirmModal title="Deactivate User"
          message={`Deactivate "${deactivateTarget.username}"? They cannot log in.`}
          onConfirm={confirmDeactivate} onCancel={() => setDeactivateTarget(null)} />
      )}
      {resetUserId && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>🔑 Reset Password</h2>
            <p>Set a new password for <strong>{resetUsername}</strong>.</p>
            {resetMsg && <div className="alert-success">{resetMsg}</div>}
            {resetError && <div className="alert-error">{resetError}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password (min 6 characters)</label>
                <input type="password" placeholder="Enter new password"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  required minLength={6} style={bold} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary"
                  onClick={() => { setResetUserId(null); setResetMsg(''); setResetError('') }}>
                  Close
                </button>
                <button type="submit" className="btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}