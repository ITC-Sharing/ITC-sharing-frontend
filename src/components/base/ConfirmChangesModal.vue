<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import RingSpinner from '@/components/base/RingSpinner.vue'

/**
 * Shows what an edit is about to change, before it is saved.
 *
 * A plain "are you sure?" asks a question the user cannot answer — they have to
 * remember what the record said before they started typing. Listing each field
 * as old → new answers it for them, and makes an accidental edit obvious.
 *
 * Only changed fields are passed in; an unchanged form should not open this at
 * all.
 */
export type FieldChange = {
  label: string
  /** Empty string renders as "—": a field that had nothing before. */
  from: string
  to: string
}

const props = defineProps<{ changes: FieldChange[]; loading?: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>()

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="!props.loading && emit('cancel')"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <h2 class="text-center text-lg font-bold text-gray-900">
          {{ t('common.confirmChanges.title') }}
        </h2>
        <p class="mt-1 text-center text-sm text-gray-500">
          {{ t('common.confirmChanges.message') }}
        </p>

        <ul class="mt-4 flex flex-col gap-3">
          <li
            v-for="change in props.changes"
            :key="change.label"
            class="rounded-xl bg-gray-50 px-3 py-2"
          >
            <p class="text-xs font-semibold text-gray-500">{{ change.label }}</p>
            <!-- Wraps rather than truncates: a description can be long, and the
                 point of this screen is to read what is changing. -->
            <div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span class="text-gray-400 line-through">{{ change.from || '—' }}</span>
              <svg
                class="h-4 w-4 shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span class="font-semibold text-gray-900">{{ change.to || '—' }}</span>
            </div>
          </li>
        </ul>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-black transition hover:cursor-pointer hover:bg-gray-200 disabled:opacity-60"
            :disabled="props.loading"
            @click="emit('cancel')"
          >
            {{ t('common.confirmChanges.cancel') }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-primary-hover disabled:opacity-60"
            :disabled="props.loading"
            @click="emit('confirm')"
          >
            <RingSpinner v-if="props.loading" :size="16" :stroke="3" />
            {{ t('common.confirmChanges.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
