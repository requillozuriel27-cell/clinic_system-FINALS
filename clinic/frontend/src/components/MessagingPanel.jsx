import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { useWebSocket } from '../hooks/useWebSocket'

export default function MessagingPanel({ currentUserId }) {
  const [conversations, setConversations] = useState([])
  const [activeUserId, setActiveUserId] = useState(null)
  const [thread, setThread] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations/')
      setConversations(res.data)
    } catch (_) {}
  }, [])

  const loadThread = useCallback(async (uid) => {
    try {
      const res = await api.get(`/messages/thread/${uid}/`)
      setThread(res.data)
    } catch (_) {}
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (activeUserId) loadThread(activeUserId)
  }, [activeUserId, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'new_message') {
      loadConversations()
      if (activeUserId && data.from_id === activeUserId) {
        loadThread(activeUserId)
      }
    }
  }, [activeUserId, loadConversations, loadThread])

  useWebSocket(currentUserId, handleWsMessage, 'messaging')

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMsg.trim() || !activeUserId) return
    setSending(true)
    try {
      await api.post('/messages/send/', {
        receiver: activeUserId,
        subject: subject || 'Message',
        body: newMsg.trim(),
      })
      setNewMsg('')
      setSubject('')
      loadThread(activeUserId)
      loadConversations()
    } catch (_) {}
    setSending(false)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      height: 'calc(100vh - 140px)',
      background: 'white',
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      {/* Conversation list */}
      <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 14, color: '#111827' }}>
          Conversations
        </div>
        {conversations.length === 0 && (
          <div style={{ padding: 20, color: '#6b7280', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            No conversations yet
          </div>
        )}
        {conversations.map(c => (
          <div
            key={c.user_id}
            onClick={() => setActiveUserId(c.user_id)}
            style={{
              padding: '13px 16px', borderBottom: '1px solid #f3f4f6',
              cursor: 'pointer',
              background: activeUserId === c.user_id ? '#f0fdf4' : 'white',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                {c.full_name || c.username}
              </span>
              {c.unread_count > 0 && (
                <span style={{
                  background: '#16a34a', color: 'white', fontSize: 11,
                  fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                }}>{c.unread_count}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, fontWeight: 'bold',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.last_message}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, fontWeight: 'bold' }}>
              {c.role} • {new Date(c.last_timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Thread area */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {!activeUserId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>
            Select a conversation to start messaging
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex',
              flexDirection: 'column', gap: 10 }}>
              {thread.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, fontWeight: 600, marginTop: 40 }}>
                  No messages yet. Say hello!
                </div>
              )}
              {thread.map(msg => {
                const mine = msg.sender === currentUserId
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column',
                    alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: 10,
                      background: mine ? '#bbf7d0' : '#f3f4f6',
                      border: mine ? 'none' : '1px solid #e5e7eb',
                      fontSize: 14, fontWeight: 'bold', color: '#000',
                    }}>
                      {msg.subject && msg.subject !== 'Message' && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
                          Re: {msg.subject}
                        </div>
                      )}
                      {msg.body}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, fontWeight: 'bold' }}>
                      {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <form onSubmit={sendMessage} style={{
              borderTop: '1px solid #e5e7eb', padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <input
                style={{ padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: 6,
                  fontSize: 13, color: '#000', fontWeight: 'bold', background: 'white' }}
                placeholder="Subject (optional)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e5e7eb',
                    borderRadius: 6, fontSize: 14, color: '#000', fontWeight: 'bold',
                    resize: 'none', height: 60, background: 'white' }}
                  placeholder="Type a message…"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
                />
                <button type="submit" className="btn-primary"
                  disabled={sending || !newMsg.trim()}
                  style={{ padding: '8px 18px', alignSelf: 'flex-end' }}>
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
