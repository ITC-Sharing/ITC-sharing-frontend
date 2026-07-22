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
  <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-1">
    <button
      :disabled="page === 1"
      @click="goTo(page - 1)"
      class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {{ t('common.documentsPage.prev') }}
    </button>

    <button
      v-for="(p, i) in visiblePages"
      :key="i"
      :disabled="p === '…'"
      @click="goTo(p)"
      :class="[
        'min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors',
        p === page
          ? 'bg-[#008CB9] text-white'
          : p === '…'
            ? 'text-gray-400 cursor-default'
            : 'text-gray-600 hover:bg-gray-100',
      ]"
    >
      {{ p }}
    </button>

    <button
      :disabled="page === totalPages"
      @click="goTo(page + 1)"
      class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {{ t('common.documentsPage.next') }}
    </button>
  </div>
</template>
