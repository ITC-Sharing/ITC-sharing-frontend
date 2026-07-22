<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useAuthStore } from '@/stores/auth.store'
import BookCard from '@/components/books/BookCard.vue'
import DonateBookModal from '@/components/books/DonateBookModal.vue'
import IconTextButton from '@/components/common/IconTextButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import { useI18n } from 'vue-i18n'

const books = useBooksStore()
const majors = useMajorsStore()
const auth = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const showDonateModal = ref(false)
const selectedMajor = ref('')

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

onMounted(async () => {
  const tasks: Promise<unknown>[] = [majors.fetchMajors(), books.fetchAll()]
  if (auth.isAuthenticated) tasks.push(books.fetchOutgoingRequests())
  await Promise.all(tasks)
})

async function onMajorChange() {
  await books.fetchAll(selectedMajor.value || undefined)
}

function onDeleted(id: string) {
  books.books = books.books.filter((b) => b.id !== id)
}

async function onDonated() {
  await books.fetchAll(selectedMajor.value || undefined)
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
            <FilterButton v-model="selectedMajor" :options="majorOptions" @change="onMajorChange" />
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
    </div>
  </div>

  <!-- Donate modal -->
  <Teleport to="body">
    <DonateBookModal v-if="showDonateModal" @close="showDonateModal = false" @donated="onDonated" />
  </Teleport>
</template>
