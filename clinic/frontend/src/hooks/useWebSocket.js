import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(userId, onMessage, channel = 'notifications') {
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!userId || !mountedRef.current) return

    const path = channel === 'messaging'
      ? `ws://localhost:8000/ws/messaging/${userId}/`
      : `ws://localhost:8000/ws/notifications/${userId}/`

    const ws = new WebSocket(path)
    wsRef.current = ws

    ws.onopen = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage(data)
      } catch (_) {}
    }

    ws.onclose = () => {
      if (mountedRef.current) {
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [userId, channel, onMessage])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
