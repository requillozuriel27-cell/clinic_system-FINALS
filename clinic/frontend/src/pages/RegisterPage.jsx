import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    first_name: '', last_name: '',
    role: 'patient', specialization: '', date_of_birth: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      await api.post('/auth/register/', form)
      setSuccess('Registration successful! Redirecting to login…')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        setError(msgs.join(' | '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, color: '#000', fontWeight: 'bold', background: 'white',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f0fdf4',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#14532d' }}>Create Account</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, fontWeight: 600 }}>
            Poblacion Danao Bohol Clinic
          </p>
        </div>

        <div style={{
          background: 'white', borderRadius: 14, padding: 28,
          border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input style={inputStyle} type="text" placeholder="First name"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input style={inputStyle} type="text" placeholder="Last name"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label>Username *</label>
              <input style={inputStyle} type="text" placeholder="Choose a username"
                value={form.username} required
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input style={inputStyle} type="email" placeholder="your@email.com"
                value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input style={inputStyle} type="password" placeholder="Choose a password"
                value={form.password} required
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select style={inputStyle} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>

            {form.role === 'doctor' && (
              <div className="form-group">
                <label>Specialization *</label>
                <input style={inputStyle} type="text" placeholder="e.g. General Medicine, Pediatrics"
                  value={form.specialization}
                  onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />
              </div>
            )}

            {form.role === 'patient' && (
              <div className="form-group">
                <label>Date of Birth</label>
                <input style={inputStyle} type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
            )}

            <button type="submit" className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '11px', fontSize: 15, marginTop: 4 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#16a34a', fontWeight: 700 }}>Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
