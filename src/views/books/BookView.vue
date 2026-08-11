<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useAuthStore } from '@/stores/auth.store'
import BookCard from '@/components/books/BookCard.vue'
import DonateBookModal from '@/components/books/DonateBookModal.vue'
import IconTextButton from '@/components/common/IconTextButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageSizeSelect from '@/components/common/PageSizeSelect.vue'
import { useI18n } from 'vue-i18n'

const books = useBooksStore()
const majors = useMajorsStore()
const auth = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const showDonateModal = ref(false)
const selectedMajor = ref('')
const page = ref(1)
const pageSize = ref(10)

const majorOptions = computed(() => [
  { value: '', label: 'All Departments' },
  ...majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
])

const myRequestedBookIds = computed(
  () =>
    new Set(
      books.outgoingRequests
        .filter((r) => r.status === 'pending' || r.status === 'accepted')
        .map((r) => r.book.id),
    ),
)

function fetchBooks() {
  return books.fetchAll(selectedMajor.value || undefined, page.value, pageSize.value)
}

// Anything that changes the result set sends us back to page 1; a page change
// just refetches. Resetting to page 1 fires the page watcher, which fetches —
// so only fetch directly when already on page 1, to avoid a double request.
function resetAndFetch() {
  if (page.value !== 1) page.value = 1
  else void fetchBooks()
}

onMounted(async () => {
  const tasks: Promise<unknown>[] = [majors.fetchMajors(), fetchBooks()]
  if (auth.isAuthenticated) tasks.push(books.fetchOutgoingRequests())
  await Promise.all(tasks)
})

watch(page, () => void fetchBooks())
watch(pageSize, resetAndFetch)

function onMajorChange() {
  resetAndFetch()
}

async function onDeleted() {
  // Refetch so total and the current page stay correct after removal; if that
  // emptied the last page, fall back to page 1.
  await fetchBooks()
  if (!books.books.length && page.value > 1) page.value = 1
}

function onDonated() {
  resetAndFetch()
}
</script>

<template>
  <div class="w-full">
    <div class="mx-auto w-full max-w-7xl px-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ t('common.nav.books') }}</h1>
          <p class="mt-1 text-sm text-gray-400">{{ t('common.donateBookModal.bookSubtitle') }}</p>
        </div>

        <div class="flex w-full items-center justify-between gap-4 md:w-auto">
          <div class="w-48 shrink-0">
            <SearchableSelect
              v-model="selectedMajor"
              :options="majorOptions"
              @change="onMajorChange"
            />
          </div>
          <IconTextButton :text="t('dashboard.books.listABook')" @click="showDonateModal = true">
            <template #icon>
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </template>
          </IconTextButton>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="books.loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- Error -->
      <div v-else-if="books.error" class="py-8 text-center text-sm text-red-500">
        {{ books.error }}
      </div>

      <!-- Empty -->
      <div v-else-if="!books.books.length" class="py-16 text-center text-sm text-gray-400">
        {{ t('common.donateBookModal.noBooksAvailable') }}
      </div>

      <!--Grid -->
      <div v-else class="flex md:justify-start justify-center items-center">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <BookCard
            v-for="book in books.books"
            :key="book.id"
            :book="book"
            :is-my-request="myRequestedBookIds.has(book.id)"
            @deleted="onDeleted"
          />
        </div>
      </div>

      <!-- Footer: page size + pager -->
      <!-- Hidden when the list fits the smallest page size (≤10). -->
      <div
        v-if="!books.loading && !books.error && books.booksTotal > 10"
        class="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4"
      >
        <Pagination
          class="col-start-2 justify-self-center"
          v-model:page="page"
          :total="books.booksTotal"
          :page-size="pageSize"
          scroll-to-top
        />
        <PageSizeSelect
          class="col-start-3 justify-self-end"
          v-model="pageSize"
          :options="[10, 20, 30, 50]"
          direction="up"
        />
      </div>
    </div>
  </div>

  <!-- Donate modal -->
  <Teleport to="body">
    <DonateBookModal v-if="showDonateModal" @close="showDonateModal = false" @donated="onDonated" />
  </Teleport>
</template>
