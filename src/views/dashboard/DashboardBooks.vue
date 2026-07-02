<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books.store'
import DonateBookModal from '@/components/DonateBookModal.vue'
import AddButton from '@/components/AddButton.vue'
import BookGridCard from '@/components/dashboard/BookGridCard.vue'
import BookInfoRow from '@/components/dashboard/BookInfoRow.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { formatRelativeDate, reqInitials, reqStatusBadge, telegramHref, truncateText } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const booksStore = useBooksStore()

const bookFilter = computed(() => (route.query.filter as string) || 'request')

// Mobile filter tabs (desktop uses the sidebar sub-nav).
const bookFilters = computed(() => [
  { value: 'request', label: t('dashboard.sidebar.filters.request') },
  { value: 'yourBook', label: t('dashboard.sidebar.filters.yourBook') },
  { value: 'donated', label: t('dashboard.sidebar.filters.donated') },
  { value: 'received', label: t('dashboard.sidebar.filters.received') },
  { value: 'requesting', label: t('dashboard.sidebar.filters.requesting') },
])

function setFilter(value: string) {
  router.push({ name: 'dashboard-books', query: { filter: value } })
}

// Lists are filtered server-side now — these just expose the active payload.
const myBooks = computed(() => booksStore.myBooks)
const filteredMyBooks = computed(() => booksStore.myBooks)
const receivedBooks = computed(() => booksStore.outgoingRequests)
const requestingBooks = computed(() => booksStore.outgoingRequests)

const loading = ref(false)

async function loadFilter() {
  loading.value = true
  try {
    switch (bookFilter.value) {
      case 'received':
        await booksStore.fetchOutgoingRequests('accepted')
        break
      case 'requesting':
        await booksStore.fetchOutgoingRequests('pending')
        break
      case 'donated':
        await booksStore.fetchMyBooks('donated')
        break
      case 'request':
        await booksStore.fetchMyBooks('pending')
        break
      default: // yourBook
        await booksStore.fetchMyBooks('all')
    }
  } finally {
    loading.value = false
  }
}

watch(bookFilter, loadFilter, { immediate: true })

const requestAction = ref<string | null>(null)

async function refresh() {
  await Promise.all([loadFilter(), booksStore.fetchBookStats()])
}

async function onAcceptRequest(bookId: string, requestId: string) {
  requestAction.value = requestId
  try {
    await booksStore.acceptRequest(bookId, requestId)
    await refresh()
  } finally {
    requestAction.value = null
  }
}

const showDeclineModal = ref(false)
const declineTarget = ref<{ bookId: string; requestId: string } | null>(null)
const declineReason = ref('')
const declining = ref(false)

function onAskDeclineRequest(bookId: string, requestId: string) {
  declineTarget.value = { bookId, requestId }
  declineReason.value = ''
  showDeclineModal.value = true
}

async function confirmDeclineRequest() {
  if (!declineTarget.value) return
  const { bookId, requestId } = declineTarget.value
  declining.value = true
  requestAction.value = requestId + '_d'
  try {
    await booksStore.declineRequest(bookId, requestId, declineReason.value.trim() || undefined)
    showDeclineModal.value = false
    declineTarget.value = null
    await refresh()
  } finally {
    declining.value = false
    requestAction.value = null
  }
}

const expandedMessages = ref<Set<string>>(new Set())

function isExpanded(id: string) {
  return expandedMessages.value.has(id)
}

function toggleExpand(id: string) {
  if (expandedMessages.value.has(id)) expandedMessages.value.delete(id)
  else expandedMessages.value.add(id)
}

// ── Donate / edit / delete a listed book ─────────────────────────────────────
const showDonate = ref(false)
const editingBook = ref<any | null>(null)
const deletingBookId = ref<string | null>(null)
const showDeleteBookModal = ref(false)
const deletingBook = ref(false)

function onEditBook(book: any) {
  editingBook.value = book
  showDonate.value = true
}

async function onBookDonated() {
  showDonate.value = false
  await refresh()
}

async function onBookUpdated() {
  showDonate.value = false
  editingBook.value = null
  await refresh()
}

function onAskDeleteBook(bookId: string) {
  deletingBookId.value = bookId
  showDeleteBookModal.value = true
}

async function confirmDeleteBook() {
  if (!deletingBookId.value) return
  deletingBook.value = true
  try {
    await booksStore.remove(deletingBookId.value)
    showDeleteBookModal.value = false
    deletingBookId.value = null
    await refresh()
  } finally {
    deletingBook.value = false
  }
}
</script>

<template>
  <!-- ── Books I'm donating ──────────────────────────────────────────── -->
  <div class="w-full flex flex-col items-between justify-between gap-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{{ t('dashboard.books.title') }}</p>
      <AddButton :label="t('dashboard.books.listABook')" @click="showDonate = true" />
    </div>

    <!-- Mobile filter tabs (desktop uses the sidebar sub-nav) -->
    <div class="md:hidden flex flex-wrap items-center gap-1.5">
      <button
        v-for="f in bookFilters"
        :key="f.value"
        @click="setFilter(f.value)"
        :class="[
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
          bookFilter === f.value
            ? 'bg-[#008CB9] text-white border-[#008CB9]'
            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
        ]"
      >
        {{ f.label }}
        <span
          v-if="f.value === 'request' && booksStore.bookStats.pendingIncoming"
          :class="[
            'h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
            bookFilter === 'request' ? 'bg-white/30 text-white' : 'bg-red-500 text-white',
          ]"
        >{{ booksStore.bookStats.pendingIncoming }}</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner /></div>

    <template v-else>
    <div
      v-if="bookFilter !== 'received' && bookFilter !== 'requesting' && bookFilter !== 'yourBook' && !filteredMyBooks.length"
      class="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-gray-100 text-center"
    >
      <p class="text-gray-500 font-medium text-sm">
        {{ bookFilter === 'request' ? t('dashboard.books.noPendingRequests') : t('dashboard.books.noDonatedYet') }}
      </p>
      <p class="text-gray-400 text-xs">
        {{ bookFilter === 'request' ? t('dashboard.books.requestsHint') : t('dashboard.books.donatedHint') }}
      </p>
    </div>

    <div
      v-if="bookFilter === 'received' && !receivedBooks.length"
      class="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-gray-100 text-center"
    >
      <p class="text-gray-500 font-medium text-sm">{{ t('dashboard.books.noReceivedYet') }}</p>
      <p class="text-gray-400 text-xs">{{ t('dashboard.books.receivedHint') }}</p>
    </div>

    <div
      v-if="bookFilter === 'yourBook' && !myBooks.length"
      class="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-gray-100 text-center"
    >
      <p class="text-gray-500 font-medium text-sm">{{ t('dashboard.books.noListedYet') }}</p>
      <p class="text-gray-400 text-xs">{{ t('dashboard.books.listedHint') }}</p>
    </div>

    <div
      v-if="bookFilter === 'requesting' && !requestingBooks.length"
      class="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-gray-100 text-center"
    >
      <p class="text-gray-500 font-medium text-sm">{{ t('dashboard.books.noRequestingYet') }}</p>
      <p class="text-gray-400 text-xs">{{ t('dashboard.books.requestingHint') }}</p>
    </div>

    <!-- Received books (outgoing requests accepted by a donor) -->
    <template v-if="bookFilter === 'received'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:mt-0 mt-3">
        <BookGridCard v-for="req in receivedBooks" :key="req.id" :cover-url="req.book.cover_image_url">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">{{ req.book.title }}</p>
            <span :class="`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${reqStatusBadge(req.status)}`">{{ req.status }}</span>
          </div>
          <div class="rounded-xl py-3 flex flex-col gap-2">
            <BookInfoRow icon="owner" :label="t('dashboard.books.bookOwner')">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ req.donor.first_name }} {{ req.donor.last_name }}</p>
            </BookInfoRow>
            <BookInfoRow v-if="req.contact" icon="contact" :label="t('dashboard.books.contact')">
              <a
                v-if="telegramHref(req.contact)"
                :href="telegramHref(req.contact)!"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-semibold text-[#008CB9] hover:underline truncate block"
              >{{ req.contact }}</a>
              <span v-else class="text-sm font-semibold text-[#008CB9] truncate block">{{ req.contact }}</span>
            </BookInfoRow>
          </div>
          <p class="mt-auto text-xs text-right text-gray-400">{{ t('dashboard.books.receivedOn', { date: formatRelativeDate(req.requested_at) }) }}</p>
        </BookGridCard>
      </div>
    </template>

    <!-- Requesting (outgoing requests still pending) -->
    <template v-else-if="bookFilter === 'requesting'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:mt-0 mt-3">
        <BookGridCard v-for="req in requestingBooks" :key="req.id" :cover-url="req.book.cover_image_url">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">{{ req.book.title }}</p>
            <span class="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ t('dashboard.books.pendingBadge') }}
            </span>
          </div>
          <div class="rounded-xl py-3 flex flex-col gap-2">
            <BookInfoRow icon="owner" :label="t('dashboard.books.bookOwner')" color="yellow">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ req.donor.first_name }} {{ req.donor.last_name }}</p>
            </BookInfoRow>
            <BookInfoRow icon="status" :label="t('dashboard.books.status')" color="yellow">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ t('dashboard.books.waitingForResponse') }}</p>
            </BookInfoRow>
          </div>
          <p class="mt-auto text-xs text-right text-gray-400">{{ t('dashboard.books.requestedOn', { date: formatRelativeDate(req.requested_at) }) }}</p>
        </BookGridCard>
      </div>
    </template>

    <!-- Books I'm donating (default) -->
    <div v-else-if="bookFilter !== 'yourBook'" class="flex flex-col gap-4 md:mt-0 mt-3">
      <BookGridCard
        v-for="book in filteredMyBooks"
        :key="book.id"
        :cover-url="book.cover_image_url"
        :highlight="book.request?.status === 'pending'"
      >
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-md font-semibold text-gray-900 truncate flex-1 min-w-0">{{ book.title }}</p>
          <span :class="`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${reqStatusBadge(book.status === 'available' ? 'available' : book.status === 'donated' ? 'accepted' : 'pending')}`">
            <svg v-if="book.status === 'donated'" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {{ book.status === 'donated' ? t('dashboard.books.acceptedBadge') : t('dashboard.books.availableStatus') }}
          </span>
        </div>

        <!-- Pending request -->
        <template v-if="book.request && book.request.status === 'pending'">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 rounded-full overflow-hidden bg-[#008CB9] flex items-center justify-center shrink-0">
              <img v-if="book.request.requester.avatar_url" :src="book.request.requester.avatar_url" class="h-full w-full object-cover" />
              <span v-else class="text-[9px] font-bold text-white">{{ reqInitials(book.request.requester.first_name, book.request.requester.last_name) }}</span>
            </div>
            <p class="text-xs text-gray-500">
              {{ t('dashboard.books.requestedBy', { name: `${book.request.requester.first_name} ${book.request.requester.last_name}` }) }}
            </p>
          </div>
          <p v-if="book.request.message" class="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            {{ isExpanded(book.request.id) ? book.request.message : truncateText(book.request.message) }}
            <button
              v-if="book.request.message.length > 120"
              type="button"
              @click="toggleExpand(book.request.id)"
              class="font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >{{ isExpanded(book.request.id) ? ` ${t('dashboard.books.seeLess')}` : ` ${t('dashboard.books.seeMore')}` }}</button>
          </p>
        </template>
        <!-- Accepted → recipient + contact -->
        <div v-else-if="book.request && book.request.status === 'accepted'" class="rounded-xl py-3 flex flex-col gap-2">
          <BookInfoRow icon="owner" :label="t('dashboard.books.givenTo')">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ book.request.requester.first_name }} {{ book.request.requester.last_name }}</p>
          </BookInfoRow>
          <BookInfoRow v-if="book.request.contact" icon="contact" :label="t('dashboard.books.contact')">
            <a
              v-if="telegramHref(book.request.contact)"
              :href="telegramHref(book.request.contact)!"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-semibold text-[#008CB9] hover:underline truncate block"
            >{{ book.request.contact }}</a>
            <span v-else class="text-sm font-semibold text-[#008CB9] truncate block">{{ book.request.contact }}</span>
          </BookInfoRow>
          <p class="text-xs text-right text-gray-400">{{ t('dashboard.books.donatedOn', { date: formatRelativeDate(book.request.requested_at) }) }}</p>
        </div>
        <!-- No request yet -->
        <p v-else class="text-xs text-gray-400">{{ t('dashboard.books.noRequestYet') }}</p>

        <!-- Accept / Reject -->
        <div v-if="book.request && book.request.status === 'pending'" class="mt-auto pt-2 flex gap-2">
          <button
            :disabled="requestAction === book.request.id"
            @click="onAcceptRequest(book.id, book.request.id)"
            class="flex-1 px-4 py-1.5 rounded-lg bg-[#008CB9] text-xs font-semibold text-white hover:bg-[#006B9C] disabled:opacity-60 transition-colors"
          >{{ requestAction === book.request.id ? '…' : t('dashboard.books.accept') }}</button>
          <button
            :disabled="requestAction === book.request.id + '_d'"
            @click="onAskDeclineRequest(book.id, book.request.id)"
            class="flex-1 px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >{{ requestAction === book.request.id + '_d' ? '…' : t('dashboard.books.reject') }}</button>
        </div>
      </BookGridCard>
    </div>

    <!-- Your Book -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:mt-0 mt-3">
      <BookGridCard v-for="book in myBooks" :key="book.id" :cover-url="book.cover_image_url">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">{{ book.title }}</p>
          <span :class="`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${book.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`">
            {{ book.status === 'donated' ? t('dashboard.books.donatedStatus') : t('dashboard.books.availableStatus') }}
          </span>
        </div>

        <div v-if="book.status === 'available'" class="mt-auto pt-2 flex gap-2">
          <button
            @click="onEditBook(book)"
            class="flex-1 px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >{{ t('dashboard.books.edit') }}</button>
          <button
            @click="onAskDeleteBook(book.id)"
            class="flex-1 px-4 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >{{ t('dashboard.books.delete') }}</button>
        </div>
        <p v-else class="mt-auto text-xs text-gray-400 italic">{{ t('dashboard.books.cantEditDonated') }}</p>
      </BookGridCard>
    </div>
    </template>
  </div>

  <!-- Donate / edit book modal -->
  <Teleport to="body">
    <DonateBookModal
      v-if="showDonate"
      :edit-book="editingBook"
      @close="showDonate = false; editingBook = null"
      @donated="onBookDonated"
      @updated="onBookUpdated"
    />
  </Teleport>

  <!-- Delete book confirmation -->
  <Teleport to="body">
    <div
      v-if="showDeleteBookModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      @click.self="showDeleteBookModal = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p class="text-center text-lg font-semibold text-black">{{ t('dashboard.books.deleteBookTitle') }}</p>
        <p class="mt-2 text-center text-sm text-gray-500">{{ t('dashboard.books.deleteBookConfirm') }}</p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] py-2 text-sm text-black hover:bg-gray-50"
            @click="showDeleteBookModal = false"
          >{{ t('dashboard.books.cancel') }}</button>
          <button
            type="button"
            :disabled="deletingBook"
            class="rounded-xl bg-red-500 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60"
            @click="confirmDeleteBook"
          >{{ deletingBook ? t('dashboard.books.deleting') : t('dashboard.books.delete') }}</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Decline request — ask for a reason -->
  <Teleport to="body">
    <div
      v-if="showDeclineModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      @click.self="showDeclineModal = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p class="text-lg font-semibold text-black">{{ t('dashboard.books.declineTitle') }}</p>
        <p class="mt-1 text-sm text-gray-500">{{ t('dashboard.books.declineSubtitle') }}</p>
        <textarea
          v-model="declineReason"
          rows="3"
          :placeholder="t('dashboard.books.declinePlaceholder')"
          class="mt-3 w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none focus:border-[#008CB9] resize-none"
        />
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] py-2 text-sm text-black hover:bg-gray-50"
            @click="showDeclineModal = false"
          >{{ t('dashboard.books.cancel') }}</button>
          <button
            type="button"
            :disabled="declining"
            class="rounded-xl bg-red-500 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60"
            @click="confirmDeclineRequest"
          >{{ declining ? t('dashboard.books.declining') : t('dashboard.books.decline') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
