<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '@/composables/useNotifications'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const { notifStore, groupedNotifications, handleNotifClick, markAllRead, iconBg, timeAgo } =
  useNotifications()

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
        <button
          @click="router.back()"
          class="p-1 -ml-1 text-gray-500 hover:text-gray-800 transition-colors"
          :aria-label="t('common.notifications.back')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('common.notifications.title') }}</h1>
      </div>
      <button
        v-if="notifStore.unreadCount > 0"
        @click="markAllRead"
        class="text-xs font-semibold text-[#0057BD] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
      >{{ t('common.notifications.markAllRead') }}</button>
    </div>

    <!-- Loading -->
    <div v-if="notifStore.loading && !notifStore.notifications.length" class="flex justify-center py-16">
      <svg class="animate-spin h-7 w-7 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <p class="text-sm font-medium">{{ t('common.notifications.empty') }}</p>
    </div>

    <!-- Grouped list -->
    <template v-else v-for="group in groupedNotifications" :key="group.key">
      <p class="text-xs font-bold text-gray-500 px-1 pt-4 pb-1">{{ group.label }}</p>
      <button
        v-for="n in group.items"
        :key="n.id"
        @click="handleNotifClick(n)"
        :class="[
          'w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
          !n.is_read ? 'bg-blue-50 hover:bg-blue-100/80' : 'hover:bg-gray-100',
        ]"
      >
        <div :class="['shrink-0 w-14 h-14 rounded-full flex items-center justify-center', iconBg(n.type)]">
          <svg v-if="n.type.includes('approved')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-8 h-8">
            <path fill="#16a34a" d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320C528 205.1 434.9 112 320 112zM390.7 233.9C398.5 223.2 413.5 220.8 424.2 228.6C434.9 236.4 437.3 251.4 429.5 262.1L307.4 430.1C303.3 435.8 296.9 439.4 289.9 439.9C282.9 440.4 276 437.9 271.1 433L215.2 377.1C205.8 367.7 205.8 352.5 215.2 343.2C224.6 333.9 239.8 333.8 249.1 343.2L285.1 379.2L390.7 234z"/>
          </svg>
          <svg v-else-if="n.type.includes('rejected')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-8 h-8">
            <path fill="#dc2626" d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM231 231C221.6 240.4 221.6 255.6 231 264.9L286 319.9L231 374.9C221.6 384.3 221.6 399.5 231 408.8C240.4 418.1 255.6 418.2 264.9 408.8L319.9 353.8L374.9 408.8C384.3 418.2 399.5 418.2 408.8 408.8C418.1 399.4 418.2 384.2 408.8 374.9L353.8 319.9L408.8 264.9C418.2 255.5 418.2 240.3 408.8 231C399.4 221.7 384.2 221.6 374.9 231L319.9 286L264.9 231C255.5 221.6 240.3 221.6 231 231z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900 leading-snug">{{ n.message }}</p>
          <p :class="['text-xs font-semibold mt-1', !n.is_read ? 'text-[#0057BD]' : 'text-gray-400']">
            {{ timeAgo(n.created_at) }}
          </p>
        </div>

        <span v-if="!n.is_read" class="shrink-0 w-3 h-3 rounded-full bg-[#0057BD]" />
      </button>
    </template>
  </div>
</template>
