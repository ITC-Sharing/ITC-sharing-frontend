<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books.store'
import { useAuthStore } from '@/stores/auth.store'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import noImage from '@/assets/images/no-image.png'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const auth = useAuthStore()

const book = computed(() => booksStore.currentBook)
const isOwner = computed(() => auth.user?.id === book.value?.users?.id)

const showRequestModal = ref(false)
const requestMessage = ref('')
const requestContact = ref('')
const requesting = ref(false)
const requestError = ref('')
const requestSent = ref(false)

onMounted(() => booksStore.fetchOne(route.params.id as string))

const donorName = computed(() =>
  `${book.value?.users?.first_name ?? ''} ${book.value?.users?.last_name ?? ''}`.trim(),
)

const donorInitials = computed(() => {
  const f = book.value?.users?.first_name?.[0] ?? ''
  const l = book.value?.users?.last_name?.[0] ?? ''
  return (f + l).toUpperCase()
})

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const date = new Date(normalized)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay <= 3) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const dateText = computed(() => formatDate(book.value?.created_at))

async function submitRequest() {
  if (!requestContact.value.trim()) {
    requestError.value = 'Please provide your contact so the donor can reach you'
    return
  }
  requesting.value = true
  requestError.value = ''
  try {
    await booksStore.request(
      book.value.id,
      requestContact.value.trim(),
      requestMessage.value.trim() || undefined,
    )
    showRequestModal.value = false
    requestSent.value = true
    requestMessage.value = ''
    requestContact.value = ''
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } }
    requestError.value = err.response?.data?.message ?? 'Request failed'
  } finally {
    requesting.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <div class="mx-auto w-full max-w-7xl px-6">

      <!-- Back -->
      <div class="mb-6">
        <button
          class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          @click="router.back()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <!-- Loading -->
      <div v-if="booksStore.loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- Error -->
      <div v-else-if="booksStore.error" class="py-8 text-center text-sm text-red-500">
        {{ booksStore.error }}
      </div>

      <!-- Content -->
      <div v-else-if="book" class="flex flex-col md:flex-row gap-8 overflow-hidden">

        <!-- Cover image — left panel -->
        <div class="w-full md:w-[55%] shrink-0">
          <img
            :src="book.cover_image_url || noImage"
            :alt="book.title"
            class="h-full w-full object-cover rounded-2xl"
            style="min-height: 400px; max-height: 560px;"
          />
        </div>

        <!-- Info — right panel -->
        <div class="flex flex-1 flex-col gap-4 px-6 py-6 md:py-0">

          <!-- Donor row -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div class="h-10 w-10 rounded-full overflow-hidden bg-[#008CB9] flex items-center justify-center shrink-0">
                <img
                  v-if="book.users?.avatar_url"
                  :src="book.users.avatar_url"
                  class="h-full w-full object-cover"
                />
                <span v-else class="text-sm font-bold text-white">{{ donorInitials }}</span>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ donorName }}</p>
                <p class="text-xs text-gray-400">{{ dateText }}</p>
              </div>
            </div>
          </div>

          <hr class="text-gray-400">

          <!-- Title -->
          <h1 class="text-2xl font-bold text-gray-900 leading-tight">{{ book.title }}</h1>

          <!-- Meta row -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span v-if="book.majors">
              <span class="font-medium text-gray-700">Department:</span> {{ book.majors.acronym }}
            </span>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
              :class="book.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
            >
              {{ book.status }}
            </span>
          </div>

          <!-- Description -->
          <p v-if="book.description" class="text-sm text-gray-600 leading-relaxed">
            {{ book.description }}
          </p>

          <!-- Request sent confirmation -->
          <div v-if="requestSent" class="mt-2 rounded-xl border border-green-200 bg-green-50 p-4">
            <p class="text-sm font-semibold text-green-700">Request sent ✓</p>
            <p class="mt-1 text-sm text-gray-600">
              The donor will review your request. If accepted, they'll contact you directly.
            </p>
          </div>

          <!-- Request this book -->
          <button
            v-else-if="!isOwner && book.status === 'available'"
            @click="showRequestModal = true"
            class="w-full rounded-xl bg-[#008CB9] py-3 text-sm font-semibold text-white hover:bg-[#006B9C] transition-colors"
          >
            Request this Book
          </button>
          <p v-else-if="isOwner" class="text-center text-xs text-gray-400 italic">This is your listing</p>
          <p v-else class="text-center text-xs text-gray-400 italic">This book is no longer available</p>
        </div>
      </div>

    </div>
  </div>

  <!-- Request modal -->
  <Teleport to="body">
    <div
      v-if="showRequestModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      @click.self="showRequestModal = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p class="text-lg font-semibold text-black">Request "{{ book?.title }}"</p>
        <p class="mt-1 text-xs text-gray-400">
          The donor will review your request and contact you if accepted.
        </p>
        <p v-if="requestError" class="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ requestError }}</p>

        <label class="mt-4 block text-xs font-medium text-gray-600">Your contact (phone / Telegram) *</label>
        <input
          v-model="requestContact"
          type="text"
          placeholder="e.g. 012 345 678 or @username"
          class="mt-1 w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none focus:border-[#008CB9]"
        />

        <label class="mt-3 block text-xs font-medium text-gray-600">Message (optional)</label>
        <textarea
          v-model="requestMessage"
          rows="3"
          placeholder="Optional message to the donor…"
          class="mt-1 w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none focus:border-[#008CB9] resize-none"
        />

        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] py-2 text-sm text-black hover:bg-gray-50"
            @click="showRequestModal = false"
          >Cancel</button>
          <button
            type="button"
            :disabled="requesting"
            class="rounded-xl bg-[#008CB9] py-2 text-sm font-semibold text-white hover:bg-[#006B9C] disabled:opacity-60"
            @click="submitRequest"
          >
            {{ requesting ? 'Sending…' : 'Send Request' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
