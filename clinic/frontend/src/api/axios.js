import axios from 'axios'

// Store tokens in MEMORY only — not localStorage
// Page refresh = logout (intended). Login always works fresh.
let _accessToken = null
let _refreshToken = null

export function setTokens(access, refresh) {
  _accessToken = access
  _refreshToken = refresh
}

export function clearTokens() {
  _accessToken = null
  _refreshToken = null
}

export function getAccessToken() { return _accessToken }
export function getRefreshToken() { return _refreshToken }

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// On 401: try silent refresh once — but never on auth endpoints themselves
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    const isAuthEndpoint =
      original.url?.includes('/auth/login/') ||
      original.url?.includes('/auth/admin-login/') ||
      original.url?.includes('/auth/register/') ||
      original.url?.includes('/auth/token/refresh/')

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint &&
      _refreshToken
    ) {
      original._retry = true
      try {
        const res = await axios.post('/api/auth/token/refresh/', {
          refresh: _refreshToken,
        })
        _accessToken = res.data.access
        if (res.data.refresh) _refreshToken = res.data.refresh
        original.headers.Authorization = `Bearer ${_accessToken}`
        return api(original)
      } catch {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default api
