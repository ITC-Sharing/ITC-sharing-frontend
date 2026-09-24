<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import NotificationAvatar from '@/components/notifications/NotificationAvatar.vue'
import { useI18n } from 'vue-i18n'
import { useNotificationText, useNotifications } from '@/composables/useNotifications'

const { t } = useI18n({ useScope: 'global' })
const { notifStore, groupedNotifications, handleNotifClick, markAllRead, timeAgo } =
  useNotifications()
const notificationText = useNotificationText()

onMounted(() => {
  notifStore.fetch()
  notifStore.connectSocket()
})
onBeforeUnmount(() => notifStore.disconnectSocket())
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-4 pb-10">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <h1 class="md:text-2xl text-xl font-semibold text-gray-900">{{ t('common.notifications.title') }}</h1>
      </div>
      <button
        v-if="notifStore.unreadCount > 0"
        @click="markAllRead"
        class="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
      >
        {{ t('common.notifications.markAllRead') }}
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="notifStore.loading && !notifStore.notifications.length"
      class="flex justify-center py-16"
    >
      <svg
        class="animate-spin h-7 w-7 text-gray-300"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>

    <!-- Empty -->
    <div
      v-else-if="notifStore.notifications.length === 0"
      class="flex flex-col items-center justify-center py-20 gap-3 text-gray-400"
    >
      <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-8 h-8 text-gray-400"
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

    <!-- Grouped list -->
    <template v-else v-for="group in groupedNotifications" :key="group.key">
      <p class="text-xs font-bold text-gray-500 px-1 pt-4 pb-1">{{ group.label }}</p>
      <button
        v-for="n in group.items"
        :key="n.id"
        @click="handleNotifClick(n)"
        class="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-gray-100"
      >
        <NotificationAvatar :notification="n" />

        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900 leading-snug">{{ notificationText(n) }}</p>
          <p :class="['text-xs font-semibold mt-1', !n.is_read ? 'text-primary' : 'text-gray-400']">
            {{ timeAgo(n.created_at) }}
          </p>
        </div>

        <span v-if="!n.is_read" class="shrink-0 w-3 h-3 rounded-full bg-primary" />
      </button>
    </template>
  </div>
</template>
