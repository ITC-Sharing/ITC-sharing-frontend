<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useTelegramLink } from '@/composables/useTelegramLink'
import RingSpinner from '@/components/base/RingSpinner.vue'

/**
 * The offer to connect Telegram, raised when the bell is opened by someone who
 * has not connected it yet.
 *
 * Deliberately a modal rather than anything inside the dropdown: the list below
 * is the notifications themselves, and nothing about Telegram belongs in it.
 * Dismissing is always available and always leads straight on to the
 * notifications — Telegram is a second channel, never a toll on the first.
 */
const emit = defineEmits<{ (e: 'dismiss'): void }>()

const { t } = useI18n({ useScope: 'global' })
const { showToast } = useToast()
const { busy, pendingUrl, connect, stopPolling } = useTelegramLink()

async function onConnect() {
  const started = await connect(() => {
    showToast(t('common.telegramNotifications.connectedToast'), { duration: 6000 })
    // Connected: the reason for this modal is gone, so it goes with it.
    emit('dismiss')
  })
  if (!started) showToast(t('common.telegramNotifications.failed'), { type: 'error' })
}

function dismiss() {
  stopPolling()
  emit('dismiss')
}

/**
 * Handles the backdrop, and keeps every click inside the modal from escaping.
 *
 * The modal is teleported to <body>, so to the bell's outside-click listener
 * any click in here looks like a click away from the bell. Dismissing opens the
 * notifications; that listener would then close them again on the very same
 * click, and the dropdown would never appear. Stopping here is what makes
 * "Not now" land on the notifications rather than on nothing.
 */
function onOverlayClick(event: MouseEvent) {
  event.stopPropagation()
  if (event.target === event.currentTarget) dismiss()
}

onBeforeUnmount(stopPolling)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"
      @click="onOverlayClick"
    >
      <div
        class="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-black/10"
      >
        <button
          type="button"
          class="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:cursor-pointer hover:bg-gray-100 hover:text-gray-600"
          :aria-label="t('common.telegramNotifications.notNow')"
          @click="dismiss"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M21.94 4.6 18.9 19.05c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.95.46l.34-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19l-10.78 6.79-4.64-1.45c-1.01-.32-1.03-1.01.21-1.5l18.14-6.99c.84-.31 1.58.19 1.26 1.59Z"
            />
          </svg>
        </div>

        <h2 class="mt-4 text-lg font-bold text-gray-900">
          {{ t('common.telegramNotifications.promptTitle') }}
        </h2>
        <p class="mt-1.5 text-sm leading-relaxed text-gray-500">
          {{ t('common.telegramNotifications.promptBody') }}
        </p>

        <!-- Waiting on the other app. The link is offered again because the
             popup may have been blocked, or the tab closed by accident. -->
        <div
          v-if="pendingUrl"
          class="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-primary"
        >
          <RingSpinner :size="16" :stroke="2.5" />
          <span>{{ t('common.telegramNotifications.waiting') }}</span>
          <a
            :href="pendingUrl"
            target="_blank"
            rel="noopener"
            class="font-semibold underline underline-offset-2"
          >
            {{ t('common.telegramNotifications.openAgain') }}
          </a>
        </div>

        <div class="mt-6 flex flex-col gap-2">
          <button
            type="button"
            :disabled="busy"
            class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-primary-hover active:scale-95 disabled:opacity-60"
            @click="onConnect"
          >
            {{ t('common.telegramNotifications.connect') }}
          </button>
          <button
            type="button"
            class="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:cursor-pointer hover:bg-gray-100"
            @click="dismiss"
          >
            {{ t('common.telegramNotifications.notNow') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
