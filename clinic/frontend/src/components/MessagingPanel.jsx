
import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { useWebSocket } from '../hooks/useWebSocket'

export default function MessagingPanel({ currentUserId }) {
  const [conversations, setConversations] = useState([])
  const [activeUserId, setActiveUserId] = useState(null)
  const [activeUserName, setActiveUserName] = useState('')
  const [thread, setThread] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  // New message modal
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [userList, setUserList] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const userSearchRef = useRef(null)

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations/')
      setConversations(res.data)
    } catch (_) {}
  }, [])

  // ── Load thread ──
  const loadThread = useCallback(async (uid) => {
    try {
      const res = await api.get(`/messages/thread/${uid}/`)
      setThread(res.data)
    } catch (_) {}
  }, [])

  // ── Load all users for New Message modal ──
  const loadUserList = useCallback(async (query = '') => {
    setLoadingUsers(true)
    try {
      const params = query ? `?search=${query}` : ''
      const res = await api.get(`/users/${params}`)
      // Exclude self
      setUserList(res.data.filter(u => u.id !== currentUserId))
    } catch (_) {}
    setLoadingUsers(false)
  }, [currentUserId])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (activeUserId) loadThread(activeUserId)
  }, [activeUserId, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  // ── Open new message modal ──
  useEffect(() => {
    if (showNewMsg) {
      loadUserList('')
      setTimeout(() => userSearchRef.current?.focus(), 100)
    }
  }, [showNewMsg])

  // ── Debounced user search ──
  useEffect(() => {
    if (!showNewMsg) return
    const t = setTimeout(() => loadUserList(userSearch), 300)
    return () => clearTimeout(t)
  }, [userSearch, showNewMsg])

  // ── WebSocket real-time ──
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'new_message') {
      loadConversations()
      if (activeUserId && (data.from_id === activeUserId || data.to_id === activeUserId)) {
        loadThread(activeUserId)
      }
    }
  }, [activeUserId, loadConversations, loadThread])

  useWebSocket(currentUserId, handleWsMessage, 'messaging')

  // ── Open a conversation ──
  const openConversation = (userId, userName) => {
    setActiveUserId(userId)
    setActiveUserName(userName)
    setShowNewMsg(false)
    setUserSearch('')
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  // ── Start new conversation from modal ──
  const startConversation = (u) => {
    openConversation(u.id, u.first_name
      ? `${u.first_name} ${u.last_name}`.trim()
      : u.username
    )
  }

  // ── Send message ──
  const sendMessage = async (e) => {
    e?.preventDefault()
    if (!newMsg.trim() || !activeUserId || sending) return
    setSending(true)
    const msgText = newMsg.trim()
    setNewMsg('')
    try {
      await api.post('/messages/send/', {
        receiver: activeUserId,
        subject: 'Message',
        body: msgText,
      })
      loadThread(activeUserId)
      loadConversations()
    } catch (_) {
      setNewMsg(msgText)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const roleIcon = (role) => {
    if (role === 'doctor') return '👨‍⚕️'
    if (role === 'admin') return '🔧'
    return '👤'
  }

  const roleColor = (role) => {
    if (role === 'doctor') return '#dbeafe'
    if (role === 'admin') return '#fef3c7'
    return '#d1fae5'
  }

  const filteredConversations = conversations.filter(c =>
    (c.full_name || c.username).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* ── Main messaging layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        height: 'calc(100vh - 130px)',
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: '#16a34a',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>
                💬 Messages
              </span>

              {/* New Message Button */}
              <button
                onClick={() => setShowNewMsg(true)}
                title="Start new conversation"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  borderRadius: 8,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ✏️ New
              </button>
            </div>

            {/* Search bar */}
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px',
                border: 'none', borderRadius: 20,
                fontSize: 13, color: '#000', fontWeight: 'bold',
                background: 'rgba(255,255,255,0.9)',
                outline: 'none',
              }}
            />
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 && (
              <div style={{
                padding: 24, textAlign: 'center',
                color: '#9ca3af', fontSize: 13, fontWeight: 600,
              }}>
                {search ? 'No results found' : 'No conversations yet'}
                <br />
                <span
                  onClick={() => setShowNewMsg(true)}
                  style={{
                    color: '#16a34a', fontWeight: 700,
                    cursor: 'pointer', fontSize: 13,
                    textDecoration: 'underline',
                    display: 'inline-block', marginTop: 8,
                  }}
                >
                  Start a new message ✏️
                </span>
              </div>
            )}

            {filteredConversations.map(c => (
              <div
                key={c.user_id}
                onClick={() => openConversation(
                  c.user_id, c.full_name || c.username
                )}
                style={{
                  padding: '13px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  background: activeUserId === c.user_id
                    ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                    : 'white',
                  borderLeft: activeUserId === c.user_id
                    ? '3px solid #16a34a' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: roleColor(c.role),
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}>
                      {roleIcon(c.role)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#000' }}>
                        {c.full_name || c.username}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                        {c.role}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: 4,
                  }}>
                    <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                      {c.last_timestamp ? formatTime(c.last_timestamp) : ''}
                    </span>
                    {c.unread_count > 0 && (
                      <span style={{
                        background: '#16a34a', color: 'white',
                        fontSize: 11, fontWeight: 700,
                        padding: '1px 7px', borderRadius: 999,
                        minWidth: 20, textAlign: 'center',
                      }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                {c.last_message && (
                  <div style={{
                    fontSize: 12, color: '#6b7280', marginTop: 6,
                    fontWeight: c.unread_count > 0 ? 700 : 600,
                    whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis', paddingLeft: 50,
                  }}>
                    {c.last_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Chat area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white' }}>
          {!activeUserId ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 60 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#374151' }}>
                Select a conversation
              </div>
              <div style={{
                fontSize: 13, color: '#9ca3af',
                fontWeight: 600, textAlign: 'center',
              }}>
                Choose from the left or start a new message
              </div>
              <button
                onClick={() => setShowNewMsg(true)}
                className="btn-primary"
                style={{ marginTop: 8, padding: '10px 24px' }}
              >
                ✏️ New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: 'white',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: '#d1fae5',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20,
                  }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#000' }}>
                      {activeUserName}
                    </div>
                    <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                      Active
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewMsg(true)}
                  style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 8, color: '#15803d', fontWeight: 700,
                    fontSize: 13, padding: '6px 14px', cursor: 'pointer',
                  }}
                >
                  ✏️ New Message
                </button>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '20px 16px',
                display: 'flex', flexDirection: 'column',
                gap: 6, background: '#f9fafb',
              }}>
                {thread.length === 0 && (
                  <div style={{
                    textAlign: 'center', color: '#9ca3af',
                    fontSize: 13, fontWeight: 600, marginTop: 40,
                  }}>
                    No messages yet — say hello! 👋
                  </div>
                )}
                {thread.map((msg) => {
                  const mine = msg.sender === currentUserId
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: mine ? 'flex-end' : 'flex-start',
                      marginBottom: 2,
                    }}>
                      <div style={{
                        maxWidth: '68%',
                        padding: '10px 15px',
                        borderRadius: mine
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                        background: mine
                          ? 'linear-gradient(135deg, #16a34a, #15803d)'
                          : 'white',
                        color: mine ? 'white' : '#000',
                        fontSize: 14,
                        fontWeight: mine ? 500 : 'bold',
                        boxShadow: mine
                          ? '0 2px 8px rgba(22,163,74,0.25)'
                          : '0 1px 4px rgba(0,0,0,0.08)',
                        border: mine ? 'none' : '1px solid #e5e7eb',
                        wordBreak: 'break-word',
                        lineHeight: 1.5,
                      }}>
                        {msg.body}
                      </div>
                      <div style={{
                        fontSize: 10, color: '#9ca3af',
                        marginTop: 3, fontWeight: 600,
                        paddingLeft: mine ? 0 : 4,
                        paddingRight: mine ? 4 : 0,
                      }}>
                        {formatTime(msg.timestamp)}
                        {mine && (
                          <span style={{
                            marginLeft: 4,
                            color: msg.is_read ? '#16a34a' : '#9ca3af',
                          }}>
                            {msg.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid #e5e7eb',
                background: 'white',
                display: 'flex', alignItems: 'flex-end', gap: 10,
              }}>
                <textarea
                  ref={inputRef}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  style={{
                    flex: 1, padding: '10px 16px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 24, fontSize: 14,
                    color: '#000', fontWeight: 'bold',
                    resize: 'none', outline: 'none',
                    background: '#f9fafb', lineHeight: 1.5,
                    maxHeight: 120, overflowY: 'auto',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMsg.trim()}
                  style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: newMsg.trim() ? '#16a34a' : '#e5e7eb',
                    border: 'none',
                    cursor: newMsg.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    transition: 'background 0.2s, transform 0.1s',
                    transform: newMsg.trim() ? 'scale(1)' : 'scale(0.9)',
                    boxShadow: newMsg.trim()
                      ? '0 2px 8px rgba(22,163,74,0.4)' : 'none',
                  }}
                >
                  {sending ? '⏳' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── NEW MESSAGE MODAL ── */}
      {showNewMsg && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 16,
            width: '100%', maxWidth: 460,
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              background: '#16a34a', padding: '18px 20px',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
                ✏️ New Message
              </span>
              <button
                onClick={() => { setShowNewMsg(false); setUserSearch('') }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none', borderRadius: '50%',
                  width: 32, height: 32, cursor: 'pointer',
                  color: 'white', fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Search input */}
            <div style={{ padding: '16px 20px 8px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', fontSize: 16,
                }}>
                  🔍
                </span>
                <input
                  ref={userSearchRef}
                  type="text"
                  placeholder="Search by name or username…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px',
                    border: '1.5px solid #e5e7eb', borderRadius: 10,
                    fontSize: 14, color: '#000', fontWeight: 'bold',
                    outline: 'none', background: '#f9fafb',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <p style={{
                fontSize: 12, color: '#9ca3af',
                fontWeight: 600, marginTop: 6, marginLeft: 2,
              }}>
                Select who you want to message
              </p>
            </div>

            {/* User list */}
            <div style={{ maxHeight: 360, overflowY: 'auto', padding: '0 12px 16px' }}>
              {loadingUsers && (
                <div style={{
                  padding: 24, textAlign: 'center',
                  color: '#9ca3af', fontSize: 13, fontWeight: 600,
                }}>
                  Loading users…
                </div>
              )}

              {!loadingUsers && userList.length === 0 && (
                <div style={{
                  padding: 24, textAlign: 'center',
                  color: '#9ca3af', fontSize: 13, fontWeight: 600,
                }}>
                  No users found
                </div>
              )}

              {!loadingUsers && userList.map(u => {
                const fullName = u.first_name
                  ? `${u.first_name} ${u.last_name}`.trim()
                  : u.username
                const isActive = activeUserId === u.id

                return (
                  <div
                    key={u.id}
                    onClick={() => startConversation(u)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      gap: 12, padding: '11px 12px',
                      borderRadius: 10, cursor: 'pointer',
                      marginBottom: 4,
                      background: isActive ? '#f0fdf4' : 'transparent',
                      border: isActive
                        ? '1.5px solid #bbf7d0'
                        : '1.5px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = '#f9fafb'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: roleColor(u.role),
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    }}>
                      {roleIcon(u.role)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                        {fullName}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                        @{u.username}
                      </div>
                      {u.specialization && (
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                          {u.specialization}
                        </div>
                      )}
                    </div>

                    {/* Role badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 999,
                      background: u.role === 'doctor'
                        ? '#dbeafe'
                        : u.role === 'admin'
                          ? '#fef3c7'
                          : '#d1fae5',
                      color: u.role === 'doctor'
                        ? '#1e40af'
                        : u.role === 'admin'
                          ? '#92400e'
                          : '#065f46',
                    }}>
                      {u.role}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}