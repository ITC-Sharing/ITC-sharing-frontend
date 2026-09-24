<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Asks the donor why, before a request is declined.
 *
 * The reason is required, not a courtesy: a decline ends that student's request
 * and this text is the only thing they get back. The API enforces it too — see
 * decline-request.dto.ts — so this is the friendly half of the same rule.
 *
 * Shared by the dashboard and the notification detail, which both decline.
 */
const props = defineProps<{ loading?: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'confirm', reason: string): void }>()

const { t } = useI18n({ useScope: 'global' })

const reason = ref('')
const error = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

// The modal is v-if'd, so it mounts fresh each time it opens — focusing here
// puts the cursor in the field, which is also what makes Enter reachable.
onMounted(() => textarea.value?.focus())

function confirm() {
  const text = reason.value.trim()
  if (!text) {
    error.value = t('dashboard.books.declineReasonRequired')
    return
  }
  error.value = ''
  emit('confirm', text)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="!props.loading && emit('cancel')"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p class="text-lg text-center font-semibold text-black">
          {{ t('dashboard.books.declineTitle') }}
        </p>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('dashboard.books.declineSubtitle') }} <span class="text-red-500">*</span>
        </p>

        <!-- Enter declines; Shift+Enter still breaks the line, so a longer
             reason is not cut off by the shortcut. -->
        <textarea
          ref="textarea"
          v-model="reason"
          rows="3"
          @keydown.enter.exact.prevent="confirm"
          :placeholder="t('dashboard.books.declinePlaceholder')"
          class="mt-3 w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
          :class="error ? 'border-red-400' : 'border-[#D9D9D9]'"
        />
        <p v-if="error" class="mt-1.5 text-sm text-red-500">{{ error }}</p>

        <div class="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] py-2 text-sm text-black hover:bg-gray-50 hover:cursor-pointer disabled:opacity-60"
            :disabled="props.loading"
            @click="emit('cancel')"
          >
            {{ t('dashboard.books.cancel') }}
          </button>
          <button
            type="button"
            :disabled="props.loading"
            class="rounded-xl bg-red-500 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60 hover:cursor-pointer"
            @click="confirm"
          >
            {{ props.loading ? t('dashboard.books.declining') : t('dashboard.books.decline') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
