import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import api from '@/lib/axios'
import { useToast, type ToastType } from '@/composables/useToast'

export interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  ref_id: string | null
  ref_type: string | null
  created_at: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)

  const unreadCount = computed(() =>
    notifications.value.filter((n) => !n.is_read).length,
  )

  async function fetch() {
    loading.value = true
    try {
      const { data } = await api.get('/notifications')
      notifications.value = data
    } catch {
      // silently fail — bell just shows nothing
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`)
    const n = notifications.value.find((n) => n.id === id)
    if (n) n.is_read = true
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all')
    notifications.value.forEach((n) => (n.is_read = true))
  }

  // ── Real-time (WebSocket) ──────────────────────────────────────────────────
  let socket: Socket | null = null

  // Approvals read as good news, rejections as bad; everything else is neutral.
  // Mirrors iconBg() in useNotifications, so the toast matches the bell entry.
  function toastTypeFor(type: string): ToastType {
    if (type.includes('approved')) return 'success'
    if (type.includes('rejected')) return 'error'
    return 'info'
  }

  // Both the bell and the notifications page connect. Counted, because they
  // overlap: without this, leaving the notifications page would tear down the
  // socket the bell (and the toasts) still rely on.
  let socketUsers = 0

  function connectSocket() {
    socketUsers++
    if (socket) return
    socket = io(import.meta.env.VITE_API_URL, {
      // Called on every (re)connect, so a refreshed access token is always used.
      auth: (cb) => cb({ token: localStorage.getItem('token') ?? '' }),
      withCredentials: true,
    })
    socket.on('notification', (n: Notification) => {
      // Avoid duplicates if a fetch raced the socket event.
      if (notifications.value.some((existing) => existing.id === n.id)) return
      notifications.value.unshift(n)
      // Only socket-delivered ones are toasted: those arrived while the user
      // was looking at the app. A fetch replays history and must stay silent.
      useToast().showToast(n.message, { type: toastTypeFor(n.type) })
    })
  }

  function disconnectSocket() {
    socketUsers = Math.max(0, socketUsers - 1)
    if (socketUsers > 0) return
    socket?.disconnect()
    socket = null
  }

  return {
    notifications,
    loading,
    unreadCount,
    fetch,
    markRead,
    markAllRead,
    connectSocket,
    disconnectSocket,
  }
})
