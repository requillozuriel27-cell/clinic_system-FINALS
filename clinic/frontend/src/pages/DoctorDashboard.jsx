import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

export default function DoctorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Schedule')
  const [showLogout, setShowLogout] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [records, setRecords] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientPrescriptions, setPatientPrescriptions] = useState([])
  const [prescForm, setPrescForm] = useState({ diagnosis: '', medicines: '', notes: '', appointment: '' })
  const [prescError, setPrescError] = useState('')
  const [prescSuccess, setPrescSuccess] = useState('')
  const [savingPresc, setSavingPresc] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const handleWsNotif = useCallback((data) => {
    if (data.type === 'initial_notifications') setNotifications(data.notifications || [])
    else if (data.message) setNotifications(prev => [data, ...prev])
  }, [])
  useWebSocket(user?.user_id, handleWsNotif)

  const loadNotifications = useCallback(async () => {
    try { const r = await api.get('/notifications/'); setNotifications(r.data) } catch (_) {}
  }, [])
  const loadAppointments = useCallback(async () => {
    try { const r = await api.get('/appointments/'); setAppointments(r.data) } catch (_) {}
  }, [])
  const loadPatients = useCallback(async () => {
    try { const r = await api.get('/users/?role=patient'); setPatients(r.data) } catch (_) {}
  }, [])
  const loadRecords = useCallback(async () => {
    try { const r = await api.get('/records/'); setRecords(r.data) } catch (_) {}
  }, [])

  useEffect(() => {
    loadNotifications(); loadAppointments(); loadPatients()
  }, [])
  useEffect(() => { if (tab === 'Records') loadRecords() }, [tab])

  const loadPatientPrescriptions = async (patientId) => {
    try {
      const r = await api.get(`/prescriptions/?patient_id=${patientId}`)
      setPatientPrescriptions(r.data)
    } catch (_) {}
  }

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient)
    loadPatientPrescriptions(patient.id)
    setPrescForm({ diagnosis: '', medicines: '', notes: '', appointment: '' })
    setPrescError(''); setPrescSuccess('')
  }

  const handleSavePrescription = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return
    setPrescError(''); setPrescSuccess(''); setSavingPresc(true)
    try {
      await api.post('/prescriptions/create/', {
        patient: selectedPatient.id,
        diagnosis: prescForm.diagnosis,
        medicines: prescForm.medicines,
        notes: prescForm.notes,
        appointment: prescForm.appointment || null,
      })
      setPrescSuccess('Prescription saved. Patient has been notified.')
      setPrescForm({ diagnosis: '', medicines: '', notes: '', appointment: '' })
      loadPatientPrescriptions(selectedPatient.id)
    } catch (err) {
      const d = err.response?.data
      setPrescError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to save.')
    } finally { setSavingPresc(false) }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      setActionMsg('Appointment cancelled. Patient has been notified.')
      loadAppointments()
    } catch (_) {}
    setCancelTarget(null)
  }

  const confirmConfirm = async () => {
    if (!confirmTarget) return
    try {
      await api.post(`/appointments/${confirmTarget}/confirm/`)
      setActionMsg('Appointment confirmed. Patient has been notified.')
      loadAppointments()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to confirm.')
    }
    setConfirmTarget(null)
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

  // Today + next 3 days
  const today = new Date()
  const next3Days = [0, 1, 2, 3].map(i => {
    const d = new Date(today); d.setDate(today.getDate() + i)
    return d.toISOString().split('T')[0]
  })
  const scheduleAppointments = appointments.filter(a => next3Days.includes(a.date))

  const sidebarItems = [
    { label: 'Schedule', icon: '📆' },
    { label: 'Patients', icon: '👥' },
    { label: 'Records', icon: '📋' },
    { label: 'Appointments', icon: '📅' },
    { label: 'Messages', icon: '💬' },
  ]

  const ActionButtons = ({ appointment }) => {
    const canAct = appointment.status === 'pending' || appointment.status === 'confirmed'
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {appointment.status === 'pending' && (
          <button
            className="btn-primary"
            style={{ padding: '4px 12px', fontSize: 12, background: '#16a34a' }}
            onClick={() => setConfirmTarget(appointment.id)}
          >
            ✓ Confirm
          </button>
        )}
        {canAct && (
          <button
            className="btn-danger"
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => setCancelTarget(appointment.id)}
          >
            ✕ Cancel
          </button>
        )}
        {!canAct && <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700 }}>—</span>}
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🏥 Clinic System<br />
          <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
            Dr. {user?.full_name || user?.username}
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
            {tab === 'Schedule' ? `Dr. ${user?.full_name || user?.username} — Schedule` : tab}
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

        {/* Schedule */}
        {tab === 'Schedule' && (
          <div className="card">
            <div className="card-title">📆 Today & Next 3 Days</div>
            {scheduleAppointments.length === 0 ? (
              <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: 14 }}>
                No upcoming appointments in the next 3 days.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Time</th><th>Patient</th><th>Status</th><th>Notes</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {scheduleAppointments.map(a => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{a.time}</td>
                        <td>{a.patient_name}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>{a.notes || '—'}</td>
                        <td><ActionButtons appointment={a} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Patients + Prescriptions */}
        {tab === 'Patients' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedPatient ? '1fr 1.4fr' : '1fr', gap: 20 }}>
            <div className="card">
              <div className="card-title">👥 Assigned Patients</div>
              {patients.length === 0 ? (
                <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: 14 }}>No assigned patients yet.</p>
              ) : (
                patients.map(p => (
                  <div key={p.id} onClick={() => handleSelectPatient(p)}
                    style={{
                      padding: '12px 14px', borderRadius: 8,
                      border: `1px solid ${selectedPatient?.id === p.id ? '#16a34a' : '#e5e7eb'}`,
                      marginBottom: 10, cursor: 'pointer',
                      background: selectedPatient?.id === p.id ? '#f0fdf4' : 'white',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontWeight: 700, color: '#000', fontSize: 14 }}>
                      {p.first_name} {p.last_name}
                      <span style={{ color: '#6b7280', fontWeight: 600 }}> (@{p.username})</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, fontWeight: 'bold' }}>{p.email}</div>
                  </div>
                ))
              )}
            </div>

            {selectedPatient && (
              <div className="card">
                <div className="card-title">💊 Prescriptions — {selectedPatient.first_name} {selectedPatient.last_name}</div>
                {prescError && <div className="alert-error">{prescError}</div>}
                {prescSuccess && <div className="alert-success">{prescSuccess}</div>}
                <form onSubmit={handleSavePrescription}>
                  <div className="form-group">
                    <label>Diagnosis *</label>
                    <textarea rows={3} placeholder="Enter diagnosis…" required
                      value={prescForm.diagnosis}
                      onChange={e => setPrescForm(f => ({ ...f, diagnosis: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Medicines *</label>
                    <textarea rows={3} placeholder="One medicine per line…" required
                      value={prescForm.medicines}
                      onChange={e => setPrescForm(f => ({ ...f, medicines: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input type="text" placeholder="Additional instructions…"
                      value={prescForm.notes}
                      onChange={e => setPrescForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn-primary" disabled={savingPresc}>
                    {savingPresc ? 'Saving…' : '💾 Save Prescription'}
                  </button>
                </form>

                {patientPrescriptions.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 10 }}>
                      Previous Prescriptions
                    </div>
                    {patientPrescriptions.map(p => (
                      <div key={p.id} style={{
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        padding: 12, marginBottom: 8, background: '#fafafa',
                      }}>
                        <div style={{ fontWeight: 700, color: '#000', fontSize: 13 }}>{p.diagnosis}</div>
                        <div style={{ fontSize: 12, color: '#374151', fontWeight: 'bold',
                          whiteSpace: 'pre-line', marginTop: 4 }}>{p.medicines}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontWeight: 'bold' }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Medical Records */}
        {tab === 'Records' && (
          <div className="card">
            <div className="card-title">📋 Patient Medical Records</div>
            {records.length === 0 ? (
              <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: 14 }}>No records found.</p>
            ) : (
              records.map(r => (
                <div key={r.id} style={{
                  border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: 16, marginBottom: 12, background: '#fafafa',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#000' }}>{r.record_title}</span>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 'bold' }}>
                      Patient: {r.patient_name}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold',
                    whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{r.data}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, fontWeight: 'bold' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* All Appointments */}
        {tab === 'Appointments' && (
          <div className="card">
            <div className="card-title">📅 All My Appointments</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th><th>Notes</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td>{a.patient_name}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{a.notes || '—'}</td>
                      <td><ActionButtons appointment={a} /></td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No appointments</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Messages' && <MessagingPanel currentUserId={user?.user_id} />}
      </main>

      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}
      {cancelTarget && (
        <ConfirmModal
          title="Cancel Appointment"
          message="Cancel this appointment? The patient will be notified immediately."
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      {confirmTarget && (
        <ConfirmModal
          title="Confirm Appointment"
          message="Confirm this appointment? The patient will be notified that their appointment is confirmed."
          onConfirm={confirmConfirm}
          onCancel={() => setConfirmTarget(null)}
          danger={false}
        />
      )}
    </div>
  )
}