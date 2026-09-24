<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useBooksStore } from '@/stores/books.store'
import { truncateText } from '@/utils/format'
import { useRelativeDate } from '@/composables/useRelativeDate'
import noImage from '@/assets/images/no-image.png'
import { useI18n } from 'vue-i18n'
import RowActionsMenu, { type RowAction } from '@/components/base/RowActionsMenu.vue'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const booksStore = useBooksStore()

type BookCardBook = {
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

const props = defineProps<{ book: BookCardBook }>()

const emit = defineEmits<{
  (e: 'deleted', id: string): void
  /** The owner asked to edit — the parent opens the editor. */
  (e: 'edit', book: BookCardBook): void
}>()

const showDeleteModal = ref(false)

const isOwner = computed(() => auth.user?.id === props.book.users?.id)

const donorName = computed(() =>
  `${props.book.users?.first_name ?? ''} ${props.book.users?.last_name ?? ''}`.trim(),
)

const { relativeDate } = useRelativeDate()
const dateText = computed(() => relativeDate(props.book.created_at))

// Cap the title so long ones end with an ellipsis instead of wrapping.
const displayTitle = computed(() => truncateText(props.book.title, 15))

/**
 * A book someone is waiting on is frozen — the API rejects edit and delete
 * while a request is pending, so the menu is hidden rather than offering
 * actions that will 400.
 */
const canManage = computed(() => isOwner.value && !props.book.has_active_request)

const bookActions = computed<RowAction[]>(() => [
  { key: 'edit', label: t('dashboard.books.edit') },
  { key: 'delete', label: t('dashboard.books.delete'), tone: 'danger' as const },
])

function onAction(key: string) {
  if (key === 'edit') emit('edit', props.book)
  else if (key === 'delete') showDeleteModal.value = true
}

async function confirmDelete() {
  await booksStore.remove(props.book.id)
  emit('deleted', props.book.id)
  showDeleteModal.value = false
}
</script>

<template>
  <!-- max-w-60 keeps the card a card, so in the single column a phone gets it
       is narrower than the row and would otherwise sit against the left edge.
       mx-auto centres it there; from sm up the grid has 2+ columns and the
       cards line up on their own left edges, which is what a grid should do. -->
  <article
    class="mx-auto flex w-full max-w-60 flex-col rounded-2xl border border-[#E0E0E0] bg-white overflow-hidden hover:border-primary transition-colors cursor-pointer sm:mx-0"
    @click="router.push({ name: 'book-detail', params: { id: book.id } })"
  >
    <!-- Cover image -->
    <div class="relative h-56 bg-white p-3">
      <img
        :src="book.cover_image_url || noImage"
        :alt="book.title"
        class="h-full w-full object-contain"
      />
      <!-- Owner actions -->
      <div v-if="canManage" class="absolute right-2 top-2" @click.stop>
        <RowActionsMenu :items="bookActions" @select="onAction" />
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 flex-col gap-2 p-4 border-t border-[#E0E0E0]">
      <div class="flex items-start justify-between gap-2">
        <h2 class="text-base font-semibold leading-tight text-gray-900 line-clamp-2">
          {{ displayTitle }}
        </h2>
        <span
          v-if="book.majors"
          class="shrink-0 rounded-full bg-[#B8EDFF] px-2 py-0.5 text-xs font-medium text-[#0082B8]"
        >
          {{ book.majors.acronym }}
        </span>
      </div>

      <!-- Stacked, not a justify-between row: a long owner name ran straight
           into the date with nothing separating them. -->
      <div class="mt-auto pt-1">
        <p class="truncate text-xs font-medium text-gray-700">
          {{
            t('common.bookCard.owner', {
              name: isOwner ? t('common.bookCard.you') : donorName,
            })
          }}
        </p>
        <p class="mt-1 text-xs text-gray-400">Date: {{ dateText }}</p>
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
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-xl bg-red-500 py-2 text-sm text-white hover:bg-red-600"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
