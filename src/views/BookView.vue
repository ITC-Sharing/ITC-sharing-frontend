<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import BookCard from '@/components/BookCard.vue'
import DonateBookModal from '@/components/DonateBookModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SelectDropdown from '@/components/SelectDropdown.vue'

const books = useBooksStore()
const majors = useMajorsStore()

const showDonateModal = ref(false)
const selectedMajor = ref('')

const majorOptions = computed(() => [
  { value: '', label: 'All Departments' },
  ...majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
])

onMounted(async () => {
  await Promise.all([majors.fetchMajors(), books.fetchAll()])
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
          <h1 class="text-2xl font-bold text-gray-900">Books</h1>
          <p class="mt-1 text-sm text-gray-400">Browse and donate second-hand books</p>
        </div>

        <div class="flex items-center gap-4">
          <div class="w-48 shrink-0">
            <SelectDropdown
              v-model="selectedMajor"
              :options="majorOptions"
              @change="onMajorChange"
            />
          </div>
          <button
            type="button"
            @click="showDonateModal = true"
            class="flex items-center gap-2 rounded-xl bg-[#008CB9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006B9C] transition-colors"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Donate a Book
          </button>
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
        No books available yet. Be the first to donate one!
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <BookCard
          v-for="book in books.books"
          :key="book.id"
          :book="book"
          @deleted="onDeleted"
        />
      </div>

    </div>
  </div>

  <!-- Donate modal -->
  <Teleport to="body">
    <DonateBookModal
      v-if="showDonateModal"
      @close="showDonateModal = false"
      @donated="onDonated"
    />
  </Teleport>
</template>
