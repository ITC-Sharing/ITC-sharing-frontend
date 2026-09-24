<script setup lang="ts">
import { computed } from 'vue'
import type { Notification } from '@/stores/notifications.store'

/**
 * The round marker beside a notification.
 *
 * A book shows its own cover — far more recognisable than any icon, since the
 * message is about that specific book. Everything else falls back to an icon on
 * the app's own tint: a book for coverless books, a folder for documents and
 * subjects. The outcome is left to the wording, which already says approved or
 * rejected, so the marker stays one colour throughout the list.
 *
 * Shared by the bell dropdown and the full-page list so the two cannot drift.
 */
const props = withDefaults(
  defineProps<{
    notification: Notification
    /** `sm` is the toast's 36px tile; `md` is the bell and the full-page list. */
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' },
)

// A map rather than an interpolated class: Tailwind scans source text, so a
// class it never sees written out is never generated.
const box = { sm: 'w-9 h-9', md: 'w-14 h-14' } as const
const glyph = { sm: 'w-5 h-5', md: 'w-7 h-7' } as const

const isBook = computed(
  () => props.notification.ref_type === 'book' || props.notification.ref_type === 'book_request',
)
</script>

<template>
  <!-- No tint behind a cover — the picture is the marker. -->
  <div
    :class="[
      'shrink-0 rounded-full overflow-hidden flex items-center justify-center',
      box[props.size],
      props.notification.image_url ? 'bg-gray-100' : 'bg-primary/10',
    ]"
  >
    <img
      v-if="props.notification.image_url"
      :src="props.notification.image_url"
      alt=""
      class="h-full w-full object-cover"
    />

    <!-- A book with no cover of its own still reads as a book. -->
    <svg
      v-else-if="isBook"
      :class="[glyph[props.size], 'text-primary']"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>

    <!-- Documents and subjects alike are folders of material. -->
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      :class="[glyph[props.size], 'text-primary']"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      />
    </svg>
  </div>
</template>
