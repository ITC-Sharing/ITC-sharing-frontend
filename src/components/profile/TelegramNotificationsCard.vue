<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useTelegramLink } from '@/composables/useTelegramLink'
import RingSpinner from '@/components/base/RingSpinner.vue'

/**
 * Telegram delivery, managed from Settings.
 *
 * Telegram is a second channel for notifications that already exist in the app,
 * so a user who never connects it loses nothing — which is why this is the
 * place it is turned on and off, and why disconnecting lives here alone.
 *
 * State comes from the shared composable, so connecting from the bell's prompt
 * is reflected here without a reload.
 */
const { t } = useI18n({ useScope: 'global' })
const { showToast } = useToast()
const {
  loading,
  busy,
  pendingUrl,
  connected,
  available,
  loadStatus,
  connect,
  disconnect,
  stopPolling,
} = useTelegramLink()

async function onConnect() {
  const started = await connect(() =>
    showToast(t('common.telegramNotifications.connectedToast'), { duration: 6000 }),
  )
  if (!started) showToast(t('common.telegramNotifications.failed'), { type: 'error' })
}

async function onDisconnect() {
  const ok = await disconnect()
  showToast(
    ok
      ? t('common.telegramNotifications.disconnectedToast')
      : t('common.telegramNotifications.failed'),
    ok ? { duration: 6000 } : { type: 'error' },
  )
}

onMounted(() => void loadStatus())
onBeforeUnmount(stopPolling)
</script>

<template>
  <section class="mt-10 rounded-2xl border border-gray-200 p-5 sm:p-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M21.94 4.6 18.9 19.05c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.95.46l.34-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19l-10.78 6.79-4.64-1.45c-1.01-.32-1.03-1.01.21-1.5l18.14-6.99c.84-.31 1.58.19 1.26 1.59Z"
            />
          </svg>
        </div>

        <div class="min-w-0">
          <h2 class="text-base font-semibold text-gray-900">
            {{ t('common.telegramNotifications.title') }}
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            {{ t('common.telegramNotifications.description') }}
          </p>

          <!-- Status: a dot and a word, the same pair in both states so the eye
               lands in the same place whichever it is. -->
          <div v-if="!loading" class="mt-3 flex items-center gap-2">
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="connected ? 'bg-green-500' : 'bg-gray-300'"
            />
            <p
              class="text-sm font-semibold"
              :class="connected ? 'text-green-600' : 'text-gray-500'"
            >
              {{
                connected
                  ? t('common.telegramNotifications.connected')
                  : t('common.telegramNotifications.notConnected')
              }}
            </p>
          </div>

          <p v-if="connected" class="mt-1 text-sm text-gray-500">
            {{ t('common.telegramNotifications.connectedDescription') }}
          </p>

          <!-- Waiting on the other app. The link is offered again because the
               popup may have been blocked, or the tab closed by accident. -->
          <div
            v-if="pendingUrl && !connected"
            class="mt-3 flex flex-wrap items-center gap-2 text-sm text-primary"
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

          <p v-if="!loading && !available" class="mt-3 text-sm text-gray-400">
            {{ t('common.telegramNotifications.unavailable') }}
          </p>
        </div>
      </div>

      <!-- Full width on a phone, hugging its label from sm up. -->
      <button
        v-if="!loading"
        type="button"
        :disabled="busy || !available"
        class="w-full shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer sm:w-auto"
        :class="
          connected
            ? 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            : 'bg-primary text-white hover:bg-primary-hover'
        "
        @click="connected ? onDisconnect() : onConnect()"
      >
        {{
          connected
            ? t('common.telegramNotifications.disconnect')
            : t('common.telegramNotifications.connect')
        }}
      </button>
    </div>
  </section>
</template>
