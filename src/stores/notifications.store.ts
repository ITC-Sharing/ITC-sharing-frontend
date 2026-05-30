import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/axios'

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

  const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length)

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

  return { notifications, loading, unreadCount, fetch, markRead, markAllRead }
})
