import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the httpOnly refresh-token cookie
})

// Attach the access token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Refresh-on-401 ──────────────────────────────────────────────────────────
// When the short-lived access token expires, transparently exchange the refresh
// cookie for a new one and replay the failed request. Concurrent 401s wait for
// a single in-flight refresh.
let isRefreshing = false
let queue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = []

function flushQueue(error: unknown, token: string | null) {
  queue.forEach((p) => (error || !token ? p.reject(error) : p.resolve(token)))
  queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as { _retry?: boolean; url?: string; headers: Record<string, string> }
    const status = error.response?.status
    const url = original?.url ?? ''
    const isAuthCall = url.includes('/auth/refresh') || url.includes('/auth/login')

    if (status !== 401 || !original || original._retry || isAuthCall) {
      return Promise.reject(error)
    }

    original._retry = true

    // A refresh is already running — queue this request until it resolves.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token: string) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const newToken = data.token as string
      localStorage.setItem('token', newToken)
      flushQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshErr) {
      flushQueue(refreshErr, null)
      localStorage.removeItem('token')
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
