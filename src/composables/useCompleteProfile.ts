import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Shared state for the "tell us your department and year" prompt.
 *
 * Module scope on purpose: the modal is mounted once in UserLayout, but pages
 * need to open it too — the documents feed offers a link when it has nothing to
 * show for want of these fields. Both drive the same instance.
 */
const manuallyOpened = ref(false)
const dismissedForSession = ref(false)

export function useCompleteProfile() {
  const auth = useAuthStore()

  /**
   * Finished Foundation and due a July rollover, so the department they moved
   * into is still unknown. The server decides this — the date rule lives there.
   */
  const needsPromotion = computed(() => !!auth.user?.needs_department_choice)

  /**
   * Signed in, but missing the pair that audience filtering matches on — either
   * never set, or gone stale because Foundation ended.
   */
  const needsProfile = computed(
    () => !!auth.user && (!auth.user.major_id || !auth.user.year_level || needsPromotion.value),
  )

  /** Opened by a link; ignores the session dismissal, since they asked for it. */
  function open() {
    manuallyOpened.value = true
  }

  /** Closed by the user, or answered. Stops the automatic prompt re-appearing. */
  function dismiss() {
    manuallyOpened.value = false
    dismissedForSession.value = true
  }

  return {
    needsProfile,
    needsPromotion,
    manuallyOpened,
    dismissedForSession,
    open,
    dismiss,
  }
}
