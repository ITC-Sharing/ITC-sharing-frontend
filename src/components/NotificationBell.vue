<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import type { Notification } from '@/stores/notifications.store'

const notifStore = useNotificationsStore()
const subjectsStore = useSubjectsStore()
const router = useRouter()
const notifOpen = ref(false)
const notifRef = ref<HTMLElement | null>(null)

function toggleNotif() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) notifStore.fetch()
}

function closeNotif() {
  notifOpen.value = false
}

async function handleNotifClick(n: Notification) {
  if (!n.is_read) await notifStore.markRead(n.id)
  closeNotif()

  if (n.ref_type === 'book_request') {
    // Donor's incoming-request notification → Dashboard (accept/reject there)
    if (n.type === 'book_request') {
      router.push({ name: 'dashboard' })
      return
    }
    // Requester's accepted/declined notification → detail page (status + contact)
    router.push({
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
    router.push({
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
    router.push({ name: 'document-details', query: { upload_id: n.ref_id } })
    return
  }

  if (n.ref_type === 'subject' && n.ref_id) {
    let subject = subjectsStore.mySubjects.find((s) => s.id === n.ref_id)
    if (!subject) {
      await subjectsStore.fetchMine()
      subject = subjectsStore.mySubjects.find((s) => s.id === n.ref_id)
    }
    if (subject) {
      router.push({
        name: 'subject-documents',
        params: {
          slug: subject.major?.acronym?.toLowerCase(),
          year: subject.year_level,
          subjectId: n.ref_id,
        },
      })
      return
    }
  }

  router.push({ name: 'dashboard' })
}

async function handleMarkAllRead() {
  await notifStore.markAllRead()
}

function iconBg(type: string) {
  if (type.includes('approved')) return 'bg-green-100'
  if (type.includes('rejected')) return 'bg-red-100'
  return 'bg-blue-100'
}

function timeAgo(dateStr: string) {
  const utc = toUtc(dateStr)
  const diff = Math.floor((Date.now() - new Date(utc).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 259200) return `${Math.floor(diff / 86400)}d ago`
  return new Date(utc).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function toUtc(dateStr: string) {
  return dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z'
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
    if (key === todayStr) label = 'Today'
    else if (key === yesterdayStr) label = 'Yesterday'
    else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    if (keyMap[key] === undefined) {
      keyMap[key] = groups.length
      groups.push({ key, label, items: [] })
    }
    groups[keyMap[key]]!.items.push(n)
  }

  return groups
})

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => notifStore.fetch(), 15_000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleClickOutside(event: MouseEvent) {
  if (notifRef.value && !notifRef.value.contains(event.target as Node)) {
    closeNotif()
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') notifStore.fetch()
}

onMounted(() => {
  notifStore.fetch()
  startPolling()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div ref="notifRef" class="relative">
    <!-- Bell button — circular like Facebook nav icons -->
    <button
      type="button"
      @click.stop="toggleNotif"
      class="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
      aria-label="Notifications"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span
        v-if="notifStore.unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
      >{{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}</span>
    </button>

    <!-- Dropdown panel -->
    <div
      v-if="notifOpen"
      class="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 pt-4 pb-1">
        <h2 class="text-xl font-bold text-gray-900">Notifications</h2>
        <button
          v-if="notifStore.unreadCount > 0"
          @click="handleMarkAllRead"
          class="text-xs font-semibold text-[#0057BD] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >Mark all read</button>
      </div>

      <!-- List -->
      <div class="max-h-130 overflow-y-auto px-2 pb-2 pt-1">
        <!-- Loading -->
        <div v-if="notifStore.loading" class="flex justify-center py-10">
          <svg class="animate-spin h-6 w-6 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>

        <!-- Empty -->
        <div
          v-else-if="notifStore.notifications.length === 0"
          class="flex flex-col items-center justify-center py-12 gap-2 text-gray-400"
        >
          <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p class="text-sm font-medium">No notifications yet</p>
        </div>

        <!-- Grouped items -->
        <template v-else v-for="group in groupedNotifications" :key="group.key">
          <p class="text-xs font-bold text-gray-500 px-3 pt-3 pb-1">{{ group.label }}</p>
          <button
            v-for="n in group.items"
            :key="n.id"
            @click="handleNotifClick(n)"
            :class="[
              'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              !n.is_read ? 'bg-blue-50 hover:bg-blue-100/80' : 'hover:bg-gray-100',
            ]"
          >
            <!-- Icon avatar -->
            <div :class="['shrink-0 w-14 h-14 rounded-full flex items-center justify-center', iconBg(n.type)]">
              <!-- Approved -->
              <svg v-if="n.type.includes('approved')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-8 h-8">
                <path fill="#16a34a" d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320C528 205.1 434.9 112 320 112zM390.7 233.9C398.5 223.2 413.5 220.8 424.2 228.6C434.9 236.4 437.3 251.4 429.5 262.1L307.4 430.1C303.3 435.8 296.9 439.4 289.9 439.9C282.9 440.4 276 437.9 271.1 433L215.2 377.1C205.8 367.7 205.8 352.5 215.2 343.2C224.6 333.9 239.8 333.8 249.1 343.2L285.1 379.2L390.7 234z"/>
              </svg>
              <!-- Rejected -->
              <svg v-else-if="n.type.includes('rejected')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-8 h-8">
                <path fill="#dc2626" d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM231 231C221.6 240.4 221.6 255.6 231 264.9L286 319.9L231 374.9C221.6 384.3 221.6 399.5 231 408.8C240.4 418.1 255.6 418.2 264.9 408.8L319.9 353.8L374.9 408.8C384.3 418.2 399.5 418.2 408.8 408.8C418.1 399.4 418.2 384.2 408.8 374.9L353.8 319.9L408.8 264.9C418.2 255.5 418.2 240.3 408.8 231C399.4 221.7 384.2 221.6 374.9 231L319.9 286L264.9 231C255.5 221.6 240.3 221.6 231 231z"/>
              </svg>
              <!-- Default bell -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>

            <!-- Text -->
            <div class="flex-1 min-w-0">
              <p class="text-[13px] text-gray-900 leading-snug line-clamp-3">{{ n.message }}</p>
              <p :class="['text-xs font-semibold mt-1', !n.is_read ? 'text-[#0057BD]' : 'text-gray-400']">
                {{ timeAgo(n.created_at) }}
              </p>
            </div>

            <!-- Unread dot -->
            <span v-if="!n.is_read" class="shrink-0 w-3 h-3 rounded-full bg-[#0057BD]" />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
