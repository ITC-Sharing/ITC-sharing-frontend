<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import NotificationAvatar from '@/components/notifications/NotificationAvatar.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationText, useNotifications } from '@/composables/useNotifications'
import { useTelegramLink } from '@/composables/useTelegramLink'
import TelegramConnectModal from '@/components/notifications/TelegramConnectModal.vue'
import type { Notification } from '@/stores/notifications.store'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const { notifStore, groupedNotifications, handleNotifClick, markAllRead, timeAgo } =
  useNotifications()
const notificationText = useNotificationText()

const notifOpen = ref(false)
const notifRef = ref<HTMLElement | null>(null)

const { shouldPrompt, loadStatus } = useTelegramLink()
const telegramPromptOpen = ref(false)

/**
 * Offer Telegram before opening the notifications, until it is connected.
 *
 * Only ever an offer: dismissing carries straight on to the notifications, and
 * `shouldPrompt` is false unless the server actually has a bot to connect to —
 * so a deployment without Telegram never shows this at all.
 */
function toggleNotif() {
  // Closing never has anything to ask about.
  if (notifOpen.value) {
    notifOpen.value = false
    return
  }
  if (shouldPrompt.value) {
    telegramPromptOpen.value = true
    return
  }
  openNotifications()
}

function openNotifications() {
  // On mobile, open a full page instead of a cramped dropdown.
  if (window.innerWidth < 640) {
    router.push({ name: 'notifications' })
    return
  }
  notifOpen.value = true
  notifStore.fetch()
}

/** Dismissing the offer is not a refusal of the notifications behind it. */
function dismissTelegramPrompt() {
  telegramPromptOpen.value = false
  openNotifications()
}

function closeNotif() {
  notifOpen.value = false
}

async function onItemClick(n: Notification) {
  closeNotif()
  await handleNotifClick(n)
}

async function handleMarkAllRead() {
  await markAllRead()
}

function handleClickOutside(event: MouseEvent) {
  // The prompt is teleported to <body>, so a click inside it reads as outside
  // the bell. Leave it to the modal's own backdrop handler.
  if (telegramPromptOpen.value) return
  if (notifRef.value && !notifRef.value.contains(event.target as Node)) {
    closeNotif()
  }
}

function handleVisibilityChange() {
  // Resync the list when the tab regains focus (covers events missed offline).
  if (document.visibilityState === 'visible') notifStore.fetch()
}

onMounted(() => {
  notifStore.fetch() // initial list
  notifStore.connectSocket() // real-time updates (replaces polling)
  // Settled before the first click, so the bell never has to guess whether to
  // ask. Cached module-side, so Settings reuses this one request.
  void loadStatus()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  notifStore.disconnectSocket()
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
      class="relative flex items-center justify-center transition-colors cursor-pointer"
      aria-label="Notifications"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-6 h-6 text-gray-800"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span
        v-if="notifStore.unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 h-3 min-w-3 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
        >{{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}</span
      >
    </button>

    <!-- Dropdown panel -->
    <div
      v-if="notifOpen"
      class="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 pt-4 pb-1">
        <h2 class="text-xl font-bold text-gray-900">{{ t('common.notifications.title') }}</h2>
        <button
          v-if="notifStore.unreadCount > 0"
          @click="handleMarkAllRead"
          class="text-xs font-semibold text-primary hover:text-primary-dark hover:cursor-pointer transition-colors"
        >
          {{ t('common.notifications.markAllRead') }}
        </button>
      </div>

      <!-- List -->
      <div class="max-h-130 overflow-y-auto px-2 pb-2 pt-1 scrollbar-primary">
        <!-- Loading -->
        <div v-if="notifStore.loading" class="flex justify-center py-10">
          <svg
            class="animate-spin h-6 w-6 text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>

        <!-- Empty -->
        <div
          v-else-if="notifStore.notifications.length === 0"
          class="flex flex-col items-center justify-center py-12 gap-2 text-gray-400"
        >
          <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-7 h-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p class="text-sm font-medium">{{ t('common.notifications.empty') }}</p>
          <p class="mt-1 text-xs text-gray-400">{{ t('common.notifications.emptyHint') }}</p>
        </div>

        <!-- Grouped items -->
        <template v-else v-for="group in groupedNotifications" :key="group.key">
          <p class="text-xs font-bold text-gray-500 px-3 pt-3 pb-1">{{ group.label }}</p>
          <button
            v-for="n in group.items"
            :key="n.id"
            @click="onItemClick(n)"
            :class="[
              'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:cursor-pointer',
              !n.is_read ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-gray-100',
            ]"
          >
            <!-- Icon avatar -->
            <NotificationAvatar :notification="n" />

            <!-- Text -->
            <div class="flex-1 min-w-0">
              <p class="text-[13px] text-gray-900 leading-snug line-clamp-3">
                {{ notificationText(n) }}
              </p>
              <p
                :class="[
                  'text-xs font-semibold mt-1',
                  !n.is_read ? 'text-primary' : 'text-gray-400',
                ]"
              >
                {{ timeAgo(n.created_at) }}
              </p>
            </div>

            <!-- Unread dot -->
            <span v-if="!n.is_read" class="shrink-0 w-3 h-3 rounded-full bg-primary" />
          </button>
        </template>
      </div>
    </div>

    <TelegramConnectModal v-if="telegramPromptOpen" @dismiss="dismissTelegramPrompt" />
  </div>
</template>
