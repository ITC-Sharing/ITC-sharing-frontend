import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import * as notificationsApi from '@/services/notifications.api'
import { useToast, type ToastType } from '@/composables/useToast'
import { notificationMessage, notificationRoute } from '@/composables/useNotifications'
import { accessToken } from '@/services/access-token'

export interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  ref_id: string | null
  ref_type: string | null
  /** The book's cover, for notifications about one. Null otherwise. */
  image_url: string | null
  /**
   * Which phrase to show and what to put in it. Null on notifications written
   * before translation existed — `message` is the fallback for those.
   */
  i18n_key: string | null
  i18n_params: Record<string, string | number> | null
  created_at: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length)

  async function fetch() {
    loading.value = true
    try {
      const data = await notificationsApi.fetchNotifications()
      notifications.value = data
    } catch {
      // silently fail — bell just shows nothing
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string) {
    await notificationsApi.markNotificationRead(id)
    const n = notifications.value.find((n) => n.id === id)
    if (n) n.is_read = true
  }

  async function markAllRead() {
    await notificationsApi.markAllNotificationsRead()
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
      /**
       * WebSocket only — no HTTP long-polling fallback.
       *
       * Behind a load balancer the polling handshake is several separate
       * requests that must all reach the same replica, which would mean sticky
       * sessions. A WebSocket is one connection that stays where it lands, so
       * plain round-robin is enough. The trade is that a network blocking
       * WebSockets outright loses real-time updates rather than degrading to
       * polling; the app still works, the bell just fills on refresh.
       */
      transports: ['websocket'],
      // Called on every (re)connect, so a refreshed access token is always used.
      auth: (cb) => cb({ token: accessToken.value ?? '' }),
      withCredentials: true,
    })
    socket.on('notification', (n: Notification) => {
      // Avoid duplicates if a fetch raced the socket event.
      if (notifications.value.some((existing) => existing.id === n.id)) return
      notifications.value.unshift(n)
      // Only socket-delivered ones are toasted: those arrived while the user
      // was looking at the app. A fetch replays history and must stay silent.
      // Same destination the bell item would take, so acting on the toast and
      // acting on the notification behave identically.
      useToast().showToast(notificationMessage(n), {
        type: toastTypeFor(n.type),
        to: notificationRoute(n),
        notifId: n.id,
        notification: n,
      })
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
