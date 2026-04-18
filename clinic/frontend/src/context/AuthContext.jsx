import { createContext, useContext, useState } from 'react'
import api, { setTokens, clearTokens, getRefreshToken } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // user starts null on every page load — refresh = logout
  const [user, setUser] = useState(null)

  const login = (data) => {
    setTokens(data.access, data.refresh)
    setUser({
      role: data.role,
      user_id: data.user_id,
      username: data.username,
      full_name: data.full_name || data.username,
    })
  }

  const logout = async () => {
    try {
      const refresh = getRefreshToken()
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch (_) {}
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}