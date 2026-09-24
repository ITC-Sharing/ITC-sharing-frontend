<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import RingSpinner from '@/components/base/RingSpinner.vue'

/**
 * Confirmation before deleting something.
 *
 * `target` names what's going away and is woven into the sentence — "Are you
 * sure you want to delete Midterm Notes?" — so the user can see they're about
 * to delete the thing they meant. Without it the message stays generic.
 *
 * Render it behind a v-if; it teleports itself above everything else.
 */
const props = withDefaults(
  defineProps<{
    /** What is being deleted, e.g. a document title or a file name. */
    target?: string
    /** Overrides the heading; defaults to "Delete". */
    title?: string
    /** Disables both buttons and spins the confirm one. */
    loading?: boolean
  }>(),
  { target: '', title: '', loading: false },
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
      @click.self="!loading && emit('cancel')"
    >
      <div
        class="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-black/10"
      >
        <button
          type="button"
          class="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-white transition hover:bg-gray-500 hover:cursor-pointer disabled:opacity-50"
          :disabled="loading"
          :aria-label="t('common.confirmDelete.cancel')"
          @click="emit('cancel')"
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
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500"
        >
          <svg class="h-8 w-8" fill="currentColor" viewBox="0 0 640 640">
            <path
              d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"
            />
          </svg>
        </div>
        <!-- <i18n-t> puts the target in a slot so it can be bold without
             v-html — the title comes from user data. break-words: a long file
             name shouldn't stretch the dialog. -->
        <i18n-t
          v-if="target"
          keypath="common.confirmDelete.message"
          tag="p"
          class="mt-2 break-words text-sm text-gray-500"
        >
          <template #target>
            <span class="font-semibold text-black">{{ target }}</span>
          </template>
        </i18n-t>
        <p v-else class="mt-2 break-words text-sm text-gray-500">
          {{ t('common.confirmDelete.messageGeneric') }}
        </p>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="emit('cancel')"
          >
            {{ t('common.confirmDelete.cancel') }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="emit('confirm')"
          >
            <RingSpinner v-if="loading" :size="16" :stroke="2.5" />
            {{ t('common.confirmDelete.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
