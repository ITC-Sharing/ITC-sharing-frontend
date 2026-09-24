<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BookGridCard from '@/components/books/BookGridCard.vue'
import { displayName } from '@/utils/format'
import type { MyBook } from '@/types/books.types'

/**
 * One of your listings that has been accepted and is waiting on the receiver to
 * confirm they have it.
 *
 * Lives in Book Activity rather than My books: it is a handover in flight, not
 * a book on the shelf — you cannot edit it, list it again, or do anything with
 * it except wait or call it off.
 */
const props = defineProps<{ book: MyBook; busy?: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void }>()

const { t } = useI18n({ useScope: 'global' })

const receiver = computed(() => {
  const r = props.book.request?.requester
  return r ? displayName(r.first_name, r.last_name) : ''
})
</script>

<template>
  <BookGridCard :cover-url="props.book.cover_image_url">
    <div class="flex items-center gap-2">
      <p class="text-md min-w-0 flex-1 truncate font-semibold text-black">{{ props.book.title }}</p>
      <span
        class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
      >
        {{ t('dashboard.books.reservedStatus') }}
      </span>
    </div>

    <!-- No contact link: contact runs one way — the RECEIVER reaches out to
         arrange collection, so the donor is never given their handle. -->
    <!-- indent-6 with an absolutely placed icon, not a flex row or a float: a
         flex row gives a hanging indent (wrapped lines align with the first
         line's TEXT), and a float stops affecting a line only once that line
         clears its height, which left the second line wrapping beside it.
         text-indent applies to the first line alone, so every later line starts
         at the icon's own left edge. 1.5rem = the 1.25rem icon plus its gap. -->
    <p class="relative indent-6 text-xs leading-relaxed text-gray-500">
      <svg
        class="absolute left-0 h-5 w-5 text-primary"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
        />
      </svg>
      {{ t('dashboard.books.awaitingReceiver', { name: receiver }) }}
    </p>

    <!-- The donor can release the book too, if the receiver goes quiet and they
         would rather not wait for the 3-day sweep. -->
    <button
      type="button"
      :disabled="props.busy"
      class="mt-auto w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 hover:cursor-pointer disabled:opacity-60"
      @click="emit('cancel')"
    >
      {{ t('dashboard.books.cancelHandover') }}
    </button>
  </BookGridCard>
</template>
