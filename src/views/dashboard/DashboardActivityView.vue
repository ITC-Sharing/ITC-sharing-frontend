<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useBooksStore } from '@/stores/books.store'
import { useAuthStore } from '@/stores/auth.store'
import StatCard from '@/components/dashboard/StatCard.vue'
import { formatRelativeDate } from '@/utils/format'
import noImage from '@/assets/images/no-image.png'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const docs = useDocumentsStore()
const booksStore = useBooksStore()
const auth = useAuthStore()

const myDocs = computed(() => docs.documents)

/**
 * Today's date, from the viewer's own clock — the server's timezone is
 * irrelevant to what day it is where they are sitting.
 *
 * Read once, unlike the clock this replaced: with no time in it the value only
 * changes at midnight, so a ticking timer would redraw the same string all day.
 */
const headerDate = computed(() => {
  const d = new Date()
  // en-US, not en-GB: en-GB abbreviates September as "Sept".
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  return `${weekday} ${d.getDate()} ${month} ${d.getFullYear()}`
})

// Rows shown in each "recent" panel — also the documents fetch limit. Shared by
// both, so the two columns stay the same height.
const RECENT_COUNT = 6

// Counts come from /documents/stats, aggregated in SQL over all of the user's
// uploads. Deriving them from the fetched list would only ever describe the
// handful of rows below.
const stats = computed(() => ({
  total: docs.stats.total,
  listed: booksStore.bookStats.listed,
  donated: booksStore.bookStats.donated,
  received: booksStore.bookStats.received,
}))

// The server already returns newest-first, and we ask for exactly RECENT_COUNT.
const recentDocs = computed(() => myDocs.value)
// Books come back unpaged, so the trim happens here rather than in the request.
const recentMyBooks = computed(() =>
  [...booksStore.myBooks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, RECENT_COUNT),
)

/** The document's own page, the same place the documents list goes. */
function goToDocument(id: string) {
  router.push({ name: 'document-details', query: { upload_id: id } })
}

function goToDocuments() {
  router.push({ name: 'dashboard-documents' })
}

function goToMyBooks() {
  router.push({ name: 'dashboard-books' })
}

onMounted(() => {
  // Only the few rows the "recent uploads" panel shows — totals come from
  // fetchStats(), so there is no reason to pull the full list.
  docs.fetchAll({ uploader_id: auth.user?.id, limit: RECENT_COUNT })
  docs.fetchStats()
  booksStore.fetchMyBooks('all')
  booksStore.fetchBookStats()
})
</script>

<template>
  <!-- Greeting -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <!-- Two titles, one per width. On a phone this row carries the page title
         itself, so it sits beside the date instead of on a line of its own —
         DashboardView suppresses its generic mobile heading for this route. -->
    <h1 class="text-xl font-bold text-gray-900 md:hidden">
      {{ t('dashboard.mobileTitle.dashboard') }}
    </h1>
    <h1 class="hidden text-xs font-semibold uppercase tracking-wide text-gray-400 md:block">
      Dashboard
    </h1>
    <!-- The same date chip the admin dashboard uses, so the two headers read as
         one product. Today's date is context, not a title — at 2xl it competed
         with the page heading beside it. -->
    <div
      class="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {{ headerDate }}
    </div>
  </div>

  <!-- Stats. A scrolling row on a phone rather than four stacked cards —
       stacked, they pushed the activity list a screen and a half down. From sm
       up it goes back to a grid, where there is room to show them all at once.
       The cards need a width of their own in the row: a flex item sizes to its
       content otherwise, and the four labels differ in length, so they would
       come out ragged. -->
  <div
    class="flex gap-4 overflow-x-auto scrollbar-hide pb-1 sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0 lg:grid-cols-4"
  >
    <StatCard
      :value="stats.total"
      :label="t('dashboard.activity.statFiles')"
      :sublabel="t('dashboard.activity.statFilesSub')"
    />
    <StatCard
      :value="stats.listed"
      :label="t('dashboard.activity.statBooksListed')"
      :sublabel="t('dashboard.activity.statBooksListedSub')"
    />
    <StatCard
      :value="stats.donated"
      :label="t('dashboard.activity.statBooksDonated')"
      :sublabel="t('dashboard.activity.statBooksDonatedSub')"
    />
    <StatCard
      :value="stats.received"
      :label="t('dashboard.activity.statBooksReceived')"
      :sublabel="t('dashboard.activity.statBooksReceivedSub')"
    />
  </div>

  <!-- Two-column recent activity -->
  <!-- flex-1 takes the height left under the stats; dropping items-start lets
       both panels stretch to the taller of the two, so they bottom out level
       with the sidebar. -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
    <!-- Recent uploads -->
    <div class="flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p class="text-base font-bold text-gray-900">
          {{ t('dashboard.activity.recentUploads') }}
        </p>
        <button
          v-if="recentDocs.length"
          @click="goToDocuments"
          class="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          {{ t('dashboard.activity.viewAll') }}
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
      <div
        v-if="!recentDocs.length"
        class="flex flex-1 flex-col items-center justify-center px-5 py-16"
      >
        <div class="h-14 w-14 rounded-full bg-gray-50 flex items-center justify-center">
          <svg class="h-6 w-6 text-gray-300" fill="currentColor" viewBox="0 0 640 640">
            <path
              d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM248 320C234.7 320 224 330.7 224 344C224 357.3 234.7 368 248 368L392 368C405.3 368 416 357.3 416 344C416 330.7 405.3 320 392 320L248 320zM248 416C234.7 416 224 426.7 224 440C224 453.3 234.7 464 248 464L392 464C405.3 464 416 453.3 416 440C416 426.7 405.3 416 392 416L248 416z"
            />
          </svg>
        </div>
        <p class="mt-3 text-sm text-gray-400">{{ t('dashboard.activity.noUploads') }}</p>
      </div>
      <div v-else class="flex-1 min-h-0 overflow-y-auto scrollbar-hide divide-y divide-gray-50">
        <!-- The same row the documents list uses — folder, title with its type
             beneath — so a document looks the same wherever it is listed. It
             opens the document's page too, rather than the raw file. -->
        <button
          v-for="doc in recentDocs"
          :key="doc.id"
          type="button"
          class="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 hover:cursor-pointer"
          @click="goToDocument(doc.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-8 w-8 shrink-0">
            <path
              fill="#008CB9"
              d="M128 512L512 512C547.3 512 576 483.3 576 448L576 208C576 172.7 547.3 144 512 144L362.7 144C355.8 144 349 141.8 343.5 137.6L305.1 108.8C294 100.5 280.5 96 266.7 96L128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512z"
            />
          </svg>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-900">{{ doc.title }}</p>
            <p class="mt-0.5 truncate text-xs font-medium text-primary">{{ doc.doc_type }}</p>
          </div>
          <span class="shrink-0 text-xs text-gray-400">
            {{ formatRelativeDate(doc.uploaded_at) }}
          </span>
        </button>
      </div>
    </div>

    <!-- My book -->
    <div class="flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p class="text-base font-bold text-gray-900">
          {{ t('dashboard.sidebar.filters.yourBook') }}
        </p>
        <button
          v-if="recentMyBooks.length"
          @click="goToMyBooks"
          class="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          {{ t('dashboard.activity.viewAll') }}
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
      <div
        v-if="!recentMyBooks.length"
        class="flex flex-1 flex-col items-center justify-center px-5 py-16"
      >
        <div class="h-14 w-14 rounded-full bg-gray-50 flex items-center justify-center">
          <svg
            class="h-6 w-6 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <p class="mt-3 text-sm text-gray-400">{{ t('dashboard.books.noListedYet') }}</p>
      </div>
      <!-- flex, or the centring below does nothing: items-center and
           justify-center only apply to a flex container, and this was a plain
           block. items-center is dropped on purpose — on a column it centres
           HORIZONTALLY, which would shrink each row to its text. -->
      <div v-else class="flex-1 min-h-0 overflow-y-auto scrollbar-hide divide-y divide-gray-50">
        <button
          v-for="book in recentMyBooks"
          :key="book.id"
          @click="goToMyBooks"
          class="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left hover:cursor-pointer"
        >
          <img
            :src="book.cover_image_url || noImage"
            class="h-10 w-7 rounded object-cover shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ book.title }}</p>
            <p class="text-xs text-gray-400 truncate">{{ formatRelativeDate(book.created_at) }}</p>
          </div>
          <!-- One badge style for every state, matching the books dashboard:
               the word carries the meaning, and a colour scale implies a
               severity these states do not have. -->
          <span
            class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
          >
            {{
              book.role === 'receiver'
                ? t('dashboard.books.receivedStatus')
                : book.status === 'donated'
                  ? t('dashboard.books.donatedStatus')
                  : t('dashboard.books.availableStatus')
            }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
