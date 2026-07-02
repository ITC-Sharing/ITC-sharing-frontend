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

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const fullName = computed(() =>
    user.value ? `${user.value.first_name} ${user.value.last_name}` : '',
  )

  async function register(payload: {
    first_name: string
    last_name: string
    email: string
    password: string
    major_id: string
    year_level: number
  }) {
    loading.value = true
    error.value = null
    try {
      await api.post('/auth/register', payload)
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Registration failed'
      throw e
    } finally {
      loading.value = false
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
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Login failed'
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
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to update profile'
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

  return { user, token, loading, error, isAuthenticated, fullName, register, login, logout, fetchMe, updateMe, uploadAvatar, init }
})