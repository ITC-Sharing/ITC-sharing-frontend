<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressTrack from '@/components/books/ProgressTrack.vue'
import type { BookRequestStatus } from '@/types/books.types'

/**
 * Where a request has got to, as a three-step track.
 *
 *   Requested ──▶ Accepted ──▶ Received
 *
 * A badge only says what state you are in; the track also says what is left,
 * which is the question a requester actually has ("do I wait, or do I act?").
 *
 * Declined, cancelled and expired leave the track — they are not a step, they
 * are the journey ending — so those render as a single terminal line instead of
 * a half-finished progress bar that will never move.
 */
const props = defineProps<{ status: BookRequestStatus }>()

const { t } = useI18n({ useScope: 'global' })

const STEPS = ['requested', 'accepted', 'received'] as const

const labels = computed(() => STEPS.map((step) => t(`dashboard.books.step_${step}`)))

/** -1 for the terminal states, which do not sit on the track at all. */
const currentStep = computed(() => {
  if (props.status === 'pending') return 0
  if (props.status === 'accepted') return 1
  if (props.status === 'completed') return 2
  return -1
})

const ended = computed(() => currentStep.value === -1)

const endedLabel = computed(() => {
  if (props.status === 'declined') return t('dashboard.books.declinedStatus')
  if (props.status === 'cancelled') return t('dashboard.books.cancelledStatus')
  return t('dashboard.books.expiredStatus')
})
</script>

<template>
  <!-- Ended: no track, just what happened. -->
  <div
    v-if="ended"
    class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500"
  >
    <svg
      class="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
    {{ endedLabel }}
  </div>

  <ProgressTrack v-else :steps="labels" :current="currentStep" />
</template>
