import { computed, ref } from 'vue'
import {
  createTelegramLink,
  disconnectTelegram,
  fetchTelegramStatus,
  type TelegramStatus,
} from '@/services/telegram.api'

/**
 * One Telegram connection, shared by everything that shows or changes it.
 *
 * Module-level rather than per-component on purpose: the settings card and the
 * bell's prompt are two views of a single fact. Connecting in one has to be
 * visible in the other immediately, and neither should be re-asking the server
 * for a status the other already has.
 */
const status = ref<TelegramStatus | null>(null)
const loading = ref(false)
const busy = ref(false)
/** Set while the user is away in Telegram; cleared when they come back linked. */
const pendingUrl = ref<string | null>(null)

/** Every three seconds for five minutes — outliving the token's ten. */
const POLL_MS = 3000
const POLL_LIMIT = 100
let pollTimer: ReturnType<typeof setTimeout> | undefined
let polls = 0
let fetched = false

export function useTelegramLink() {
  const connected = computed(() => !!status.value?.connected)
  /** False when the server has no bot configured — nothing to connect to. */
  const available = computed(() => status.value?.available === true)
  /** Settled, connectable, and not yet connected: the only time to ask. */
  const shouldPrompt = computed(() => fetched && available.value && !connected.value)

  async function loadStatus(force = false) {
    if (fetched && !force) return status.value
    loading.value = true
    try {
      status.value = await fetchTelegramStatus()
      fetched = true
    } catch {
      // Leaves the caller in its "not connected" shape rather than an error
      // state: nothing here is worth interrupting a page for. `fetched` stays
      // false, so nothing prompts on a guess.
    } finally {
      loading.value = false
    }
    return status.value
  }

  function stopPolling() {
    clearTimeout(pollTimer)
    pollTimer = undefined
    polls = 0
  }

  /**
   * The connect step leaves the site — the user has to start the bot in
   * Telegram for the link to mean anything — so there is no callback to wait
   * for. We poll our own status instead, and give up after a few minutes rather
   * than asking forever.
   */
  function pollUntilLinked(onLinked?: () => void) {
    stopPolling()
    const tick = async () => {
      polls += 1
      try {
        const next = await fetchTelegramStatus()
        status.value = next
        fetched = true
        if (next.connected) {
          pendingUrl.value = null
          stopPolling()
          onLinked?.()
          return
        }
      } catch {
        // A failed poll is not a failed link — keep waiting.
      }
      if (polls >= POLL_LIMIT) {
        pendingUrl.value = null
        stopPolling()
        return
      }
      pollTimer = setTimeout(() => void tick(), POLL_MS)
    }
    pollTimer = setTimeout(() => void tick(), POLL_MS)
  }

  /** Resolves false when the link could not be started, for the caller to report. */
  async function connect(onLinked?: () => void) {
    if (busy.value) return false
    busy.value = true
    try {
      const link = await createTelegramLink()
      pendingUrl.value = link.url
      // noopener: the opened tab must not be able to reach back into this one.
      window.open(link.url, '_blank', 'noopener')
      pollUntilLinked(onLinked)
      return true
    } catch {
      return false
    } finally {
      busy.value = false
    }
  }

  async function disconnect() {
    if (busy.value) return false
    busy.value = true
    stopPolling()
    pendingUrl.value = null
    try {
      await disconnectTelegram()
      if (status.value) status.value = { ...status.value, connected: false, linked_at: null }
      return true
    } catch {
      return false
    } finally {
      busy.value = false
    }
  }

  return {
    status,
    loading,
    busy,
    pendingUrl,
    connected,
    available,
    shouldPrompt,
    loadStatus,
    connect,
    disconnect,
    stopPolling,
  }
}
