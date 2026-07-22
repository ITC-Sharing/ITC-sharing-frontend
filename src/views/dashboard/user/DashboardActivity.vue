<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useBooksStore } from '@/stores/books.store'
import { useAuthStore } from '@/stores/auth.store'
import PendingRejectedAlert from '@/components/dashboard/PendingRejectedAlert.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import { formatRelativeDate, formatTotalFileSize } from '@/utils/format'
import noImage from '@/assets/images/no-image.png'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const docs = useDocumentsStore()
const booksStore = useBooksStore()
const auth = useAuthStore()

const myDocs = computed(() => docs.documents)

// Rows shown in the "recent uploads" panel — also the fetch limit.
const RECENT_COUNT = 3

// Counts and total size come from /documents/stats, aggregated in SQL over all
// of the user's uploads. Deriving them from the fetched list would only ever
// describe the handful of rows below.
const stats = computed(() => ({
  total: docs.stats.total,
  books: booksStore.bookStats.listed,
  size: formatTotalFileSize(docs.stats.size_kb),
  received: booksStore.bookStats.received,
}))

// The server already returns newest-first, and we ask for exactly RECENT_COUNT.
const recentDocs = computed(() => myDocs.value)
const recentMyBooks = computed(() =>
  [...booksStore.myBooks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3),
)

const typeColorMap: Record<string, string> = {
  Note: 'bg-blue-100 text-blue-700',
  TD: 'bg-yellow-100 text-yellow-700',
  'Examination paper': 'bg-red-100 text-red-700',
  TP: 'bg-green-100 text-green-700',
  Project: 'bg-purple-100 text-purple-700',
  Lesson: 'bg-orange-100 text-orange-700',
  Other: 'bg-gray-100 text-gray-700',
}

function goToDocuments() {
  router.push({ name: 'dashboard-documents' })
}

function goToMyBooks() {
  router.push({ name: 'dashboard-books', query: { filter: 'yourBook' } })
}

onMounted(() => {
  // Only the few rows the "recent uploads" panel shows — totals come from
  // fetchStats(), so there is no reason to pull the full list.
  docs.fetchAll({ uploader_id: auth.user?.id, limit: RECENT_COUNT })
  docs.fetchStats()
  docs.fetchMine()
  booksStore.fetchMyBooks('all')
  booksStore.fetchBookStats()
})
</script>

<template>
  <!-- Stats -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard
      :value="stats.total"
      :label="t('dashboard.activity.statFiles')"
      icon-bg="bg-blue-50"
      icon-color="text-[#0057BD]"
    >
      <template #icon>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </template>
    </StatCard>
    <StatCard
      :value="stats.books"
      :label="t('dashboard.activity.statBooksDonated')"
      icon-bg="bg-teal-50"
      icon-color="text-teal-600"
    >
      <template #icon>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </template>
    </StatCard>
    <StatCard
      :value="stats.received"
      :label="t('dashboard.activity.statBooksReceived')"
      icon-bg="bg-purple-50"
      icon-color="text-purple-600"
    >
      <template #icon>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </template>
    </StatCard>
    <StatCard
      :value="stats.size"
      :label="t('dashboard.activity.statTotalSize')"
      icon-bg="bg-orange-50"
      icon-color="text-orange-500"
    >
      <template #icon>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </template>
    </StatCard>
  </div>

  <PendingRejectedAlert :docs="docs.myUploads" />

  <!-- Two-column recent activity -->
  <div class="grid grid-cols-1 gap-6">
    <!-- Recent uploads -->
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <p class="text-sm font-bold text-gray-900">{{ t('dashboard.activity.recentUploads') }}</p>
        <button
          v-if="recentDocs.length"
          @click="goToDocuments"
          class="text-xs font-semibold text-[#008CB9] hover:underline cursor-pointer"
        >
          {{ t('dashboard.activity.viewAll') }}
        </button>
      </div>
      <div v-if="!recentDocs.length" class="px-5 py-10 text-center text-sm text-gray-400">
        {{ t('dashboard.activity.noUploads') }}
      </div>
      <div v-else class="divide-y divide-gray-50">
        <a
          v-for="doc in recentDocs"
          :key="doc.id"
          :href="doc.documents?.[0]?.file_url"
          target="_blank"
          class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
        >
          <div
            :class="`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
            <p class="text-xs text-gray-400 truncate">
              {{ doc.subjects?.name ?? '—' }} &bull; {{ formatRelativeDate(doc.uploaded_at) }}
            </p>
          </div>
          <span
            :class="`hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
            >{{ doc.doc_type }}</span
          >
        </a>
      </div>
    </div>

    <!-- My book -->
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <p class="text-sm font-bold text-gray-900">{{ t('dashboard.sidebar.filters.yourBook') }}</p>
        <button
          v-if="recentMyBooks.length"
          @click="goToMyBooks"
          class="text-xs font-semibold text-[#008CB9] hover:underline cursor-pointer"
        >
          {{ t('dashboard.activity.viewAll') }}
        </button>
      </div>
      <div v-if="!recentMyBooks.length" class="px-5 py-10 text-center text-sm text-gray-400">
        {{ t('dashboard.books.noListedYet') }}
      </div>
      <div v-else class="divide-y divide-gray-50">
        <button
          v-for="book in recentMyBooks"
          :key="book.id"
          @click="goToMyBooks"
          class="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
        >
          <img
            :src="book.cover_image_url || noImage"
            class="h-10 w-7 rounded object-cover shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ book.title }}</p>
            <p class="text-xs text-gray-400 truncate">{{ formatRelativeDate(book.created_at) }}</p>
          </div>
          <span
            :class="`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${book.status === 'donated' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`"
          >
            {{
              book.status === 'donated'
                ? t('dashboard.books.donatedStatus')
                : t('dashboard.books.availableStatus')
            }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
