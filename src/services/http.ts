import axios from 'axios'
import { accessToken, clearAccessToken, setAccessToken } from './access-token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the httpOnly refresh-token cookie
})

// Attach the access token to every request automatically. Read from memory,
// not localStorage — see access-token.ts for why, and for what re-mints it
// after a reload.
api.interceptors.request.use((config) => {
  const token = accessToken.value
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

// ─── Envelope ────────────────────────────────────────────────────────────────
// The API wraps every success in `{ success, data, message }` (see the backend's
// TransformInterceptor). Unwrapping it here keeps `const { data } = await
// api.get(...)` meaning the payload, so no call site has to know the envelope
// exists. Anything that isn't the envelope is passed through untouched.
function isEnvelope(body: unknown): body is { success: true; data: unknown } {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { success?: unknown }).success === true &&
    'data' in body
  )
}

api.interceptors.response.use(
  (response) => {
    if (isEnvelope(response.data)) response.data = response.data.data
    return response
  },
  async (error) => {
    const original = error.config as {
      _retry?: boolean
      url?: string
      headers: Record<string, string>
    }
    const status = error.response?.status
    const url = original?.url ?? ''
    // Endpoints that establish a session in the first place. A 401 from one of
    // these is the final answer — retrying it behind a token refresh is
    // pointless, and worse, it replaces the real reason ("Could not verify that
    // Google account") with the refresh's own "Missing refresh token".
    const isAuthCall = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/google'].some(
      (path) => url.includes(path),
    )

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
      // Raw axios, so the envelope isn't unwrapped by the interceptor above.
      const { data: body } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const data = isEnvelope(body) ? (body.data as { token: string }) : body
      const newToken = data.token as string
      setAccessToken(newToken)
      flushQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshErr) {
      flushQueue(refreshErr, null)
      clearAccessToken()
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
