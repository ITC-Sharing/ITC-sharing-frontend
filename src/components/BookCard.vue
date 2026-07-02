<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useBooksStore } from '@/stores/books.store'
import noImage from '@/assets/images/no-image.png'

const router = useRouter()
const auth = useAuthStore()
const booksStore = useBooksStore()

const props = defineProps<{
  book: {
    id: string
    title: string
    description?: string | null
    contact?: string | null
    status: string
    has_active_request?: boolean
    cover_image_url?: string | null
    created_at: string
    majors?: { id: string; acronym: string } | null
    users?: { id: string; first_name: string; last_name: string; avatar_url?: string | null } | null
  }
  isMyRequest?: boolean
}>()

const emit = defineEmits<{ (e: 'deleted', id: string): void }>()

const showDeleteModal = ref(false)

const isOwner = computed(() => auth.user?.id === props.book.users?.id)

const donorName = computed(() =>
  `${props.book.users?.first_name ?? ''} ${props.book.users?.last_name ?? ''}`.trim(),
)

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

const dateText = computed(() => formatDate(props.book.created_at))

async function confirmDelete() {
  await booksStore.remove(props.book.id)
  emit('deleted', props.book.id)
  showDeleteModal.value = false
}


</script>

<template>
  <article
    class="flex w-full max-w-64 flex-col rounded-2xl border border-[#E0E0E0] bg-white overflow-hidden hover:border-[#008CB9] transition-colors cursor-pointer"
    @click="router.push({ name: 'book-detail', params: { id: book.id } })"
  >
    <!-- Cover image -->
    <div class="relative h-40 bg-gray-100">
      <img
        :src="book.cover_image_url || noImage"
        :alt="book.title"
        class="h-full w-full object-cover"
      />
      <!-- Status badge -->
      <span
        v-if="!isOwner"
        class="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
        :class="[
          book.status === 'available' && !book.has_active_request
            ? 'bg-green-100 text-green-700'
            : book.status === 'available' && book.has_active_request && isMyRequest
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-500',
        ]"
      >
        {{
          book.status === 'available' && book.has_active_request
            ? isMyRequest ? 'Requested' : 'Unavailable'
            : book.status
        }}
      </span>
      <!-- Delete button (owner only) -->
      <button
        v-if="isOwner"
        @click.stop="showDeleteModal = true"
        class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-400 shadow hover:text-red-500 transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex flex-1 flex-col gap-2 p-4">
      <div class="flex items-start justify-between gap-2">
        <h2 class="text-base font-semibold leading-tight text-gray-900 line-clamp-2">{{ book.title }}</h2>
        <span v-if="book.majors" class="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
          {{ book.majors.acronym }}
        </span>
      </div>

      <p class="text-sm line-clamp-2" :class="book.description ? 'text-gray-500' : 'text-gray-300'">
        {{ book.description || 'No description' }}
      </p>

      <div class="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
        <div>
          <p class="text-xs font-medium text-gray-700">Owner: {{ isOwner ? 'You' : donorName }}</p>
          <p class="text-xs text-gray-400">{{ dateText }}</p>
        </div>
        <span v-if="isOwner" class="text-xs text-gray-400 italic">Your book</span>
      </div>
    </div>
  </article>

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      @click.self="showDeleteModal = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p class="text-center text-lg font-semibold text-black">Delete "{{ book.title }}"?</p>
        <p class="mt-2 text-center text-sm text-gray-500">This action cannot be undone.</p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] py-2 text-sm text-black hover:bg-gray-50"
            @click="showDeleteModal = false"
          >Cancel</button>
          <button
            type="button"
            class="rounded-xl bg-red-500 py-2 text-sm text-white hover:bg-red-600"
            @click="confirmDelete"
          >Delete</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
