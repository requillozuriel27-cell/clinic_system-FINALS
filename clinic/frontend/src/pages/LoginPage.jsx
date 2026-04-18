import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Admin section toggle
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminForm, setAdminForm] = useState({
    username: '', password: '', special_code: ''
  })
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login/', form)
      login(res.data)
      const routes = { doctor: '/doctor', patient: '/patient' }
      navigate(routes[res.data.role] || '/patient')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password')
      setForm(f => ({ ...f, password: '' }))
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)
    try {
      const res = await api.post('/auth/admin-login/', adminForm)
      login(res.data)
      navigate('/admin')
    } catch (err) {
      setAdminError(err.response?.data?.error || 'Invalid username or password')
      setAdminForm(f => ({ ...f, password: '', special_code: '' }))
    } finally {
      setAdminLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, color: '#000', fontWeight: 'bold', background: 'white',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f0fdf4',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏥</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#14532d' }}>
            Clinic Appointment System
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, fontWeight: 600 }}>
            Poblacion Danao Bohol
          </p>
        </div>

        {/* Patient / Doctor Login */}
        <div style={{
          background: 'white', borderRadius: 14, padding: 28,
          border: '1px solid #e5e7eb', marginBottom: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>
            Patient / Doctor Login
          </h2>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                style={inp} type="text"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                style={inp} type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required autoComplete="current-password"
              />
            </div>
            <button
              type="submit" className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: 11, fontSize: 15, marginTop: 4 }}
            >
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: 16,
            fontSize: 13, color: '#6b7280', fontWeight: 600
          }}>
            No account yet?{' '}
            <Link to="/register" style={{ color: '#16a34a', fontWeight: 700 }}>
              Register here
            </Link>
          </p>
        </div>

        {/* Admin Login Toggle Button */}
        {!showAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            style={{
              width: '100%', padding: '12px',
              background: 'white', border: '2px solid #16a34a',
              borderRadius: 10, color: '#14532d', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            🔧 Admin Login Only
          </button>
        )}

        {/* Admin Login Form */}
        {showAdmin && (
          <div style={{
            background: 'white', borderRadius: 14, padding: 28,
            border: '2px solid #16a34a',
            boxShadow: '0 2px 12px rgba(22,163,74,0.1)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: 8, marginBottom: 20,
            }}>
              <span style={{ fontSize: 18 }}>🔧</span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#14532d' }}>
                Admin Login
              </h2>
              <span style={{
                marginLeft: 'auto', background: '#dcfce7',
                color: '#166534', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 999,
              }}>
                STAFF ONLY
              </span>
              <button
                onClick={() => { setShowAdmin(false); setAdminError('') }}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 18, cursor: 'pointer', color: '#6b7280',
                }}
              >
                ✕
              </button>
            </div>

            {adminError && <div className="alert-error">{adminError}</div>}

            <form onSubmit={handleAdminLogin}>
              <div className="form-group">
                <label>Admin Username</label>
                <input style={inp} type="text" placeholder="Admin username"
                  value={adminForm.username}
                  onChange={e => setAdminForm(f => ({ ...f, username: e.target.value }))}
                  required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input style={inp} type="password" placeholder="Admin password"
                  value={adminForm.password}
                  onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                  required />
              </div>
              <div className="form-group">
                <label>Admin Access Code</label>
                <input style={inp} type="password" placeholder="Enter admin code"
                  value={adminForm.special_code}
                  onChange={e => setAdminForm(f => ({ ...f, special_code: e.target.value }))}
                  required />
              </div>
              <button type="submit" disabled={adminLoading}
                style={{
                  width: '100%', padding: 11, fontSize: 15,
                  background: '#14532d', color: 'white',
                  border: 'none', borderRadius: 8,
                  fontWeight: 700, cursor: 'pointer',
                }}>
                {adminLoading ? 'Logging in…' : 'Admin Login'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}