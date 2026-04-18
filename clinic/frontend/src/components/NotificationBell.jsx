import { useState } from 'react'
import api from '../api/axios'

export default function NotificationBell({ notifications, onMarkRead }) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.is_read).length

  const markAll = async () => {
    try {
      await api.post('/notifications/mark-all-read/')
      onMarkRead()
    } catch (_) {}
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: 18,
          position: 'relative',
          color: 'white',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: 'white',
            fontSize: 10, fontWeight: 700,
            padding: '1px 5px', borderRadius: 999,
            minWidth: 16, textAlign: 'center',
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: 10, minWidth: 320, maxWidth: 380,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200, maxHeight: 400, overflowY: 'auto',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
              Notifications {unread > 0 && `(${unread})`}
            </span>
            {unread > 0 && (
              <button
                onClick={markAll}
                style={{ background: 'none', border: 'none', color: '#16a34a',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
              No notifications
            </div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div
                key={n.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  background: n.is_read ? 'white' : '#f0fdf4',
                  fontSize: 13,
                }}
              >
                <div style={{ color: '#111827', fontWeight: n.is_read ? 600 : 700 }}>{n.message}</div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
