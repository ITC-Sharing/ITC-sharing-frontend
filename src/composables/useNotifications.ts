import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore, type Notification } from '@/stores/notifications.store'
import { useSubjectsStore } from '@/stores/subjects.store'

// Shared notification logic used by both the desktop bell dropdown and the
// mobile full-page list (grouping, relative time, icon, click routing).
export function useNotifications() {
  const router = useRouter()
  const { t } = useI18n({ useScope: 'global' })
  const notifStore = useNotificationsStore()
  const subjectsStore = useSubjectsStore()

  function toUtc(dateStr: string) {
    return dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z'
  }

  function timeAgo(dateStr: string) {
    const utc = toUtc(dateStr)
    const diff = Math.floor((Date.now() - new Date(utc).getTime()) / 1000)
    if (diff < 60) return t('common.notifications.justNow')
    if (diff < 3600) return t('common.notifications.minutesAgo', { n: Math.floor(diff / 60) })
    if (diff < 86400) return t('common.notifications.hoursAgo', { n: Math.floor(diff / 3600) })
    if (diff < 259200) return t('common.notifications.daysAgo', { n: Math.floor(diff / 86400) })
    return new Date(utc).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function iconBg(type: string) {
    if (type.includes('approved')) return 'bg-green-100'
    if (type.includes('rejected')) return 'bg-red-100'
    return 'bg-blue-100'
  }

  const groupedNotifications = computed(() => {
    const now = new Date()
    const todayStr = now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()

    const groups: { key: string; label: string; items: Notification[] }[] = []
    const keyMap: Record<string, number> = {}

    for (const n of notifStore.notifications) {
      const d = new Date(toUtc(n.created_at))
      const key = d.toDateString()

      let label: string
      if (key === todayStr) label = t('common.notifications.today')
      else if (key === yesterdayStr) label = t('common.notifications.yesterday')
      else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

      if (keyMap[key] === undefined) {
        keyMap[key] = groups.length
        groups.push({ key, label, items: [] })
      }
      groups[keyMap[key]]!.items.push(n)
    }

    return groups
  })

  // Marks read + routes to the right destination based on the notification.
  async function handleNotifClick(n: Notification) {
    if (!n.is_read) await notifStore.markRead(n.id)

    if (n.ref_type === 'book_request') {
      if (n.type === 'book_request') {
        await router.push({ name: 'dashboard-books', query: { filter: 'request' } })
        return
      }
      await router.push({
        name: 'notification-detail',
        query: {
          notif_id: n.id,
          ...(n.ref_id ? { ref_id: n.ref_id } : {}),
          ref_type: n.ref_type,
        },
      })
      return
    }

    const approved = n.type.includes('approved')

    if (!approved) {
      await router.push({
        name: 'notification-detail',
        query: {
          notif_id: n.id,
          ...(n.ref_id ? { ref_id: n.ref_id } : {}),
          ...(n.ref_type ? { ref_type: n.ref_type } : {}),
        },
      })
      return
    }

    if (n.ref_type === 'document' && n.ref_id) {
      await router.push({ name: 'document-details', query: { upload_id: n.ref_id } })
      return
    }

    if (n.ref_type === 'subject' && n.ref_id) {
      let subject = subjectsStore.mySubjects.find((s) => s.id === n.ref_id)
      if (!subject) {
        await subjectsStore.fetchMine()
        subject = subjectsStore.mySubjects.find((s) => s.id === n.ref_id)
      }
      if (subject) {
        await router.push({
          name: 'subject-documents',
          params: {
            slug: subject.majors?.acronym?.toLowerCase(),
            year: subject.year_level,
            subjectId: n.ref_id,
          },
        })
        return
      }
    }

    await router.push({ name: 'dashboard' })
  }

  async function markAllRead() {
    await notifStore.markAllRead()
  }

  return { notifStore, groupedNotifications, handleNotifClick, markAllRead, iconBg, timeAgo }
}
