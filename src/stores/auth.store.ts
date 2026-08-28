import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/axios'

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  major_id: string | null
  year_level: number | null
  role: string
  majors: { id: string; name: string; acronym: string }
}

/**
 * Pull the API's reason out of an axios error. The backend puts it in
 * `data.message`; anything else (network down, non-JSON) falls back.
 */
function apiMessage(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const fullName = computed(() =>
    user.value ? `${user.value.first_name} ${user.value.last_name}` : '',
  )

  // ── Registration: three steps ───────────────────────────────────────────
  // The account does not exist until step 3. Steps 1 and 2 only build up a
  // pending registration server-side, so abandoning the flow leaves nothing
  // behind that could be logged into.

  /** Step 1 — details in, 6-digit code emailed to the derived address. */
  async function register(payload: {
    first_name: string
    last_name: string
    student_id: string
    major_id: string
    year_level: number
  }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<{
        email: string
        expires_in_seconds: number
        /** False when the server has no SMTP — the code was logged, not sent. */
        delivered: boolean
      }>('/auth/register', payload)
      return data
    } catch (e: unknown) {
      error.value = apiMessage(e, 'Registration failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Step 2 — check the code. Creates nothing; just unlocks step 3. */
  async function verifyOtp(student_id: string, code: string) {
    loading.value = true
    error.value = null
    try {
      await api.post('/auth/register/verify', { student_id, code })
    } catch (e: unknown) {
      error.value = apiMessage(e, 'Verification failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Step 3 — set the password, which creates the account. The code is sent
   * again because the server re-checks it here, not just the verified flag.
   */
  async function setRegistrationPassword(
    student_id: string,
    code: string,
    password: string,
  ) {
    loading.value = true
    error.value = null
    try {
      await api.post('/auth/register/password', { student_id, code, password })
    } catch (e: unknown) {
      error.value = apiMessage(e, 'Could not set password')
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Ask for a fresh code. Rate limited server-side to one a minute. */
  async function resendOtp(student_id: string) {
    error.value = null
    try {
      const { data } = await api.post<{ email: string; delivered: boolean }>(
        '/auth/register/resend',
        { student_id },
      )
      return data
    } catch (e: unknown) {
      error.value = apiMessage(e, 'Could not resend the code')
      throw e
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.token
      localStorage.setItem('token', data.token)
      await fetchMe()
    } catch (e: unknown) {
      error.value = apiMessage(e, 'Login failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    try {
      const { data } = await api.get('/users/me')
      user.value = data
    } catch {
      logout()
    }
  }

  async function updateMe(payload: {
    first_name?: string
    last_name?: string
    major_id?: string
    year_level?: number
    avatar_url?: string | null
  }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.patch('/users/me', payload)
      user.value = data
      return data
    } catch (e: unknown) {
      error.value = apiMessage(e, 'Failed to update profile')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function uploadAvatar(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url as string
  }

  async function logout() {
    try {
      await api.post('/auth/logout') // revoke the refresh token + clear cookie
    } catch {
      // ignore — clear client state regardless
    }
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  // Rehydrate user on page refresh if token exists
  async function init() {
    if (token.value && !user.value) await fetchMe()
  }

  return { user, token, loading, error, isAuthenticated, fullName, register, verifyOtp, setRegistrationPassword, resendOtp, login, logout, fetchMe, updateMe, uploadAvatar, init }
})