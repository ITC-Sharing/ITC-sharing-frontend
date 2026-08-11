import { ref } from 'vue'

/**
 * Transient messages that slide in at the top-right and dismiss themselves.
 *
 * The queue is module-level, so anything — a modal that's about to unmount, a
 * store, a view — can push one and the message still shows: ToastHost renders
 * the list once, at the root of the app.
 */
export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  type: ToastType
  title?: string
  message: string
}

const toasts = ref<Toast[]>([])
let nextId = 1

function dismissToast(id: number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function showToast(
  message: string,
  options: { type?: ToastType; title?: string; duration?: number } = {},
) {
  // A minute: long enough to read, notice which document it refers to, and act
  // on it. Pass `duration` to override, or 0 to keep it up until dismissed.
  const { type = 'success', title, duration = 60_000 } = options
  const id = nextId++
  toasts.value.push({ id, type, title, message })
  // 0 keeps it up until something dismisses it.
  if (duration > 0) setTimeout(() => dismissToast(id), duration)
  return id
}

export function useToast() {
  return { toasts, showToast, dismissToast }
}
