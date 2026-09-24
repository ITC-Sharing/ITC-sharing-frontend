import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * A ticking countdown to a deadline.
 *
 * Driven by a target timestamp rather than by decrementing a number each tick.
 * A backgrounded tab has its timers throttled — a decrementing counter would
 * drift behind real time and cheerfully show "1:20 left" on a code that died
 * a minute ago. Reading the clock every tick means the worst a throttled tab
 * can do is update late, never be wrong.
 *
 * The server sends the window with every code it issues, so `start()` takes
 * that number rather than a constant copied into the client.
 */
export function useCountdown() {
  /** Epoch ms the countdown ends at; null when it is not running. */
  const endsAt = ref<number | null>(null)
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  const remaining = computed(() => {
    if (endsAt.value === null) return 0
    return Math.max(0, Math.ceil((endsAt.value - now.value) / 1000))
  })

  const expired = computed(() => endsAt.value !== null && remaining.value === 0)

  /** m:ss — the shape people read a code timer in. */
  const formatted = computed(() => {
    const total = remaining.value
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  })

  function stop() {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  function start(seconds: number) {
    stop()
    // Guard the argument: a missing or nonsensical `expires_in` should leave
    // the timer off rather than render "0:00" under a code that is fine.
    if (!Number.isFinite(seconds) || seconds <= 0) {
      endsAt.value = null
      return
    }
    endsAt.value = Date.now() + seconds * 1000
    now.value = Date.now()
    timer = setInterval(() => {
      now.value = Date.now()
      if (remaining.value === 0) stop()
    }, 1000)
  }

  /** Back to "not running", so the caller can hide the timer entirely. */
  function reset() {
    stop()
    endsAt.value = null
  }

  onBeforeUnmount(stop)

  return {
    remaining,
    expired,
    formatted,
    running: computed(() => endsAt.value !== null),
    start,
    reset,
  }
}
