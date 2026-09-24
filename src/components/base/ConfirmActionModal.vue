<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import RingSpinner from '@/components/base/RingSpinner.vue'

/**
 * Generic "are you sure?" for actions that are not deletions.
 *
 * ConfirmDeleteModal exists but is delete-shaped — red trash icon, "Delete"
 * heading — which misreads on a confirmation like "I've received the book".
 * This takes its wording from the caller and only varies the tone.
 */
const props = withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmLabel: string
    /** `danger` for actions that undo someone else's work. */
    tone?: 'primary' | 'danger'
    loading?: boolean
  }>(),
  { message: '', tone: 'primary', loading: false },
)

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>()

const { t } = useI18n({ useScope: 'global' })

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.loading) emit('cancel')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="!props.loading && emit('cancel')"
    >
      <div
        class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-black/10"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          :class="props.tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'"
        >
          <svg
            class="h-7 w-7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            viewBox="0 0 24 24"
          >
            <path
              v-if="props.tone === 'danger'"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 class="mt-4 text-lg font-bold text-gray-900">{{ props.title }}</h2>
        <p v-if="props.message" class="mt-2 text-sm text-gray-500">{{ props.message }}</p>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="props.loading"
            @click="emit('cancel')"
          >
            {{ t('common.confirmDelete.cancel') }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              props.tone === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary hover:bg-primary-hover'
            "
            :disabled="props.loading"
            @click="emit('confirm')"
          >
            <RingSpinner v-if="props.loading" :size="16" :stroke="3" />
            {{ props.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
