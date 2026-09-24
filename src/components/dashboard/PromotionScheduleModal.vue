<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import RingSpinner from '@/components/base/RingSpinner.vue'

/**
 * Picks the date the whole institute moves up a year.
 *
 * A dialog rather than a field on the dashboard: this changes every student's
 * year level at once, and a control that sits inline among read-only statistics
 * invites a stray click. Opening something deliberately, and confirming inside
 * it, matches the weight of what it does.
 */
const props = defineProps<{
  /** The instant currently scheduled, ISO, or null when there is none. */
  currentAt: string | null
  saving?: boolean
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', isoOrNull: string | null): void
}>()

/** `datetime-local` speaks local wall-clock with no zone, so convert both ways. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const value = ref(toLocalInput(props.currentAt))
const field = ref<HTMLInputElement | null>(null)

/** A time already gone is valid — it simply takes effect at once. Say so. */
const isPast = computed(() => !!value.value && new Date(value.value).getTime() <= Date.now())

/** Opens the browser's own calendar; the native icon is hidden by the field. */
function openPicker() {
  const el = field.value
  if (!el) return
  try {
    ;(el as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
  } catch {
    // Some browsers refuse outside a gesture they recognise; focus still helps
    // and the field can always be typed into.
  }
  el.focus()
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.saving) emit('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="!props.saving && emit('close')"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <h2 class="text-lg font-bold text-gray-900">Schedule student promotion</h2>
        <p class="mt-1 text-sm leading-relaxed text-gray-500">
          Every student moves up one year. This is the only thing that promotes them — there is no
          automatic yearly rollover. It is not applied all at once: each student advances on their
          next visit after this moment passes.
        </p>

        <label class="mt-5 block text-sm font-semibold text-gray-600" for="promotion-at">
          Date and time
        </label>
        <div class="relative mt-1.5">
          <input
            id="promotion-at"
            ref="field"
            v-model="value"
            type="datetime-local"
            class="no-native-picker w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-11 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            aria-label="Open the date picker"
            class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-gray-400 transition hover:cursor-pointer hover:text-primary"
            @click="openPicker"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        <p v-if="isPast" class="mt-2 text-xs text-amber-600">
          That time has already passed — it will take effect immediately.
        </p>

        <div class="mt-6 flex flex-col gap-2">
          <button
            type="button"
            :disabled="props.saving || !value"
            class="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            @click="emit('save', new Date(value).toISOString())"
          >
            <RingSpinner v-if="props.saving" :size="16" :stroke="3" />
            Schedule
          </button>
          <!-- Clearing lives here too: it is the other half of the same
               decision, and putting it on the card would mean one click could
               undo a promotion nobody meant to touch. -->
          <button
            v-if="props.currentAt"
            type="button"
            :disabled="props.saving"
            class="rounded-xl px-5 py-2.5 text-sm font-semibold text-red-500 transition hover:cursor-pointer hover:bg-red-50 disabled:opacity-50"
            @click="emit('save', null)"
          >
            Remove the schedule
          </button>
          <button
            type="button"
            :disabled="props.saving"
            class="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:cursor-pointer hover:bg-gray-100 disabled:opacity-50"
            @click="emit('close')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
