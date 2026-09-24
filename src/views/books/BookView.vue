<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import BookCard from '@/components/books/BookCard.vue'
import DonateBookModal from '@/components/books/DonateBookModal.vue'
import IconTextButton from '@/components/base/IconTextButton.vue'
import LoadingSpinner from '@/components/base/LoadingSpinner.vue'
import SearchableSelect from '@/components/base/SearchableSelect.vue'
import Pagination from '@/components/base/Pagination.vue'
import PageSizeSelect from '@/components/base/PageSizeSelect.vue'
import { useI18n } from 'vue-i18n'

const books = useBooksStore()
const majors = useMajorsStore()
const { t } = useI18n({ useScope: 'global' })

const showDonateModal = ref(false)
/** Non-null puts DonateBookModal into edit mode; null is "list a book". */
const editBook = ref<InstanceType<typeof BookCard>['$props']['book'] | null>(null)

function onEditBook(book: NonNullable<typeof editBook.value>) {
  editBook.value = book
  showDonateModal.value = true
}

function closeDonateModal() {
  showDonateModal.value = false
  editBook.value = null
}
const selectedMajor = ref('')
const page = ref(1)
const pageSize = ref(10)

const majorOptions = computed(() => [
  // 'All', not the full phrase — every other filter in the app labels its
  // unfiltered option that way, and the dropdown sits beside a heading that
  // already says what is being filtered.
  { value: '', label: 'All' },
  ...majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
])

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
    <div class="mx-auto w-full max-w-7xl px-6 mb-9">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div class="w-full text-center md:w-auto md:text-left">
          <h1 class="md:text-2xl text-xl font-bold text-gray-900">{{ t('common.nav.books') }}</h1>
          <p class="md:text-sm text-xs text-gray-400">
            {{ t('common.donateBookModal.bookSubtitle') }}
          </p>
        </div>

        <div class="flex w-full items-center md:justify-between justify-end gap-4 md:w-auto">
          <!-- w-36, not w-48: the box was sized for the old 'All Departments'
               label. Every option is now at most three characters — 'All' or a
               department acronym — so the old width left it mostly empty. -->
          <div class="shrink-0">
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
      <!-- Same shape as the document empty states: circled icon, then the
           message. -->
      <div v-else-if="!books.books.length" class="flex flex-col items-center justify-center py-16">
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
              d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20"
            />
          </svg>
        </div>
        <p class="mt-3 text-sm text-gray-400">
          {{ t('common.donateBookModal.noBooksAvailable') }}
        </p>
      </div>

      <!--Grid -->
      <div v-else class="flex md:justify-start justify-center items-center">
        <!-- w-full so the columns divide the row; without it the grid shrank to
             its content and the cards never used the space available. -->
        <div class="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <BookCard
            v-for="book in books.books"
            :key="book.id"
            :book="book"
            @deleted="onDeleted"
            @edit="onEditBook"
          />
        </div>
      </div>

      <!-- Footer: page size + pager -->
      <!-- Hidden when the list fits the smallest page size (≤10). -->
      <div
        v-if="!books.loading && !books.error && books.booksTotal > 10"
        class="mt-8 flex flex-col items-center gap-4 md:grid md:grid-cols-[1fr_auto_1fr]"
      >
        <Pagination
          class="md:col-start-2 md:justify-self-center"
          v-model:page="page"
          :total="books.booksTotal"
          :page-size="pageSize"
          scroll-to-top
        />
        <PageSizeSelect
          class="md:col-start-3 md:justify-self-end"
          v-model="pageSize"
          :total="books.booksTotal"
          :options="[10, 20, 30, 50]"
          direction="up"
        />
      </div>
    </div>
  </div>

  <!-- Donate modal -->
  <Teleport to="body">
    <DonateBookModal
      v-if="showDonateModal"
      :edit-book="editBook"
      @close="closeDonateModal"
      @donated="onDonated"
    />
  </Teleport>
</template>
