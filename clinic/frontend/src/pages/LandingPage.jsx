import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #16a34a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
    }}>

      {/* LOGO */}
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.8)',
        transition: 'all 0.7s ease',
        marginBottom: 28,
      }}>
        <img
          src="/logo.png"
          alt="Poblacion Danao Bohol Clinic Logo"
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Title */}
      <h1 style={{
        color: 'white',
        fontSize: 'clamp(20px, 4.5vw, 36px)',
        fontWeight: 800,
        lineHeight: 1.3,
        maxWidth: 600,
        marginBottom: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s ease 0.15s',
      }}>
        Hello! Welcome to<br />
        <span style={{ color: '#bbf7d0' }}>Poblacion Danao Bohol</span><br />
        Clinic Appointment System
      </h1>

      {/* Subtitle */}
      <p style={{
        color: 'rgba(255,255,255,0.75)',
        fontSize: 15,
        maxWidth: 420,
        marginBottom: 36,
        lineHeight: 1.7,
        fontWeight: 500,
        opacity: visible ? 1 : 0,
        transition: 'all 0.7s ease 0.25s',
      }}>
        Book appointments, view prescriptions, and manage your
        healthcare — all in one place.
      </p>

      {/* Enter Button */}
      <button
        onClick={() => navigate('/login')}
        style={{
          background: 'white',
          color: '#15803d',
          border: 'none',
          borderRadius: 50,
          padding: '15px 50px',
          fontSize: 18,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          letterSpacing: 0.5,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'all 0.7s ease 0.35s',
        }}
        onMouseEnter={e => {
          e.target.style.transform = 'scale(1.07)'
          e.target.style.boxShadow = '0 14px 36px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={e => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'
        }}
      >
        Enter System
      </button>

      {/* Footer text */}
      <p style={{
        color: 'rgba(255,255,255,0.35)',
        fontSize: 12,
        marginTop: 44,
        fontWeight: 600,
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease 0.5s',
      }}>
        Powered by Django + React • Secure & Encrypted
      </p>

    </div>
  )
}