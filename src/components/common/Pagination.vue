<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// Extracted from DocumentInNavView so every paginated list shares one pager.
// Controlled component: the parent owns `page` via v-model and refetches when
// it changes — this only renders the controls.
const props = defineProps<{
  page: number
  total: number
  pageSize: number
  /** Scroll back to the top on page change. Off for lists inside a dashboard
   *  panel, where the list is already in view. */
  scrollToTop?: boolean
}>()

const emit = defineEmits<{ 'update:page': [value: number] }>()

const { t } = useI18n({ useScope: 'global' })

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function goTo(p: number | '…') {
  if (p === '…' || p < 1 || p > totalPages.value || p === props.page) return
  emit('update:page', p)
  if (props.scrollToTop) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Windowed page numbers (1 … 4 5 6 … 12)
const visiblePages = computed<(number | '…')[]>(() => {
  const tp = totalPages.value
  const cur = props.page
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(tp - 1, cur + 1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < tp - 1) pages.push('…')
  pages.push(tp)
  return pages
})
</script>

<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-2">
    <!-- Previous -->
    <button
      type="button"
      :disabled="page === 1"
      @click="goTo(page - 1)"
      :aria-label="t('document.documentsPage.prev')"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 hover:cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="h-4 w-4"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6" />
      </svg>
    </button>

    <!-- Page numbers -->
    <button
      v-for="(p, i) in visiblePages"
      :key="i"
      type="button"
      :disabled="p === '…'"
      @click="goTo(p)"
      :aria-current="p === page ? 'page' : undefined"
      :class="[
        'h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition-colors hover:cursor-pointer',
        p === page
          ? 'border-primary bg-[#EAF6FB] text-primary'
          : p === '…'
            ? 'cursor-default border-transparent text-gray-400'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
      ]"
    >
      {{ p }}
    </button>

    <!-- Next -->
    <button
      type="button"
      :disabled="page === totalPages"
      @click="goTo(page + 1)"
      :aria-label="t('document.documentsPage.next')"
      class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 hover:cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="h-4 w-4"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
      </svg>
    </button>
  </nav>
</template>
