<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useBooksStore } from '@/stores/books.store'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import noImage from '@/assets/images/no-image.png'

const route = useRoute()
const router = useRouter()
const notifStore = useNotificationsStore()
const docs = useDocumentsStore()
const subjectsStore = useSubjectsStore()
const booksStore = useBooksStore()

const notifId = computed(() => String(route.query.notif_id ?? ''))
const refId   = computed(() => String(route.query.ref_id   ?? ''))
const refType = computed(() => String(route.query.ref_type ?? ''))

const notification = computed(() => notifStore.notifications.find((n) => n.id === notifId.value))
const isRejected   = computed(() => notification.value?.type?.includes('rejected') ?? false)

const upload  = computed(() => docs.myUploads.find((u) => u.id === refId.value) ?? null)
const subject = computed(() => subjectsStore.mySubjects.find((s) => s.id === refId.value) ?? null)

// ── Book request detail ─────────────────────────────────────────────────────
interface BookRequestDetail {
  id: string
  role: 'donor' | 'requester'
  status: 'pending' | 'accepted' | 'declined'
  message: string | null
  contact: string | null
  requested_at: string
  resolved_at: string | null
  book: { id: string; title: string; cover_image_url: string | null }
  requester: { id: string; first_name: string; last_name: string; avatar_url: string | null }
  donor: { id: string; first_name: string; last_name: string; avatar_url: string | null }
}

const bookRequest = ref<BookRequestDetail | null>(null)
const bookReqLoading = ref(false)
const bookReqMissing = ref(false)
const reqAction = ref<string | null>(null)

function reqStatusBadge(status: string) {
  if (status === 'accepted') return 'bg-green-100 text-green-700'
  if (status === 'declined') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

function reqInitials(first?: string, last?: string) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

async function loadBookRequest() {
  bookReqMissing.value = false
  if (!refId.value) {
    bookReqMissing.value = true
    return
  }
  bookReqLoading.value = true
  try {
    bookRequest.value = await booksStore.fetchRequestDetail(refId.value)
  } catch {
    // Request no longer exists (deleted book or stale notification)
    bookRequest.value = null
    bookReqMissing.value = true
  } finally {
    bookReqLoading.value = false
  }
}

async function onAccept() {
  if (!bookRequest.value) return
  reqAction.value = 'accept'
  try {
    await booksStore.acceptRequest(bookRequest.value.book.id, bookRequest.value.id)
    await loadBookRequest()
  } finally {
    reqAction.value = null
  }
}

async function onDecline() {
  if (!bookRequest.value) return
  reqAction.value = 'decline'
  try {
    await booksStore.declineRequest(bookRequest.value.book.id, bookRequest.value.id)
    await loadBookRequest()
  } finally {
    reqAction.value = null
  }
}

const loading = computed(() => docs.loading || subjectsStore.loading || bookReqLoading.value)

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const now  = new Date()
  const diffSec  = Math.floor((now.getTime() - date.getTime()) / 1000)
  const diffMin  = Math.floor(diffSec  / 60)
  const diffHour = Math.floor(diffMin  / 60)
  const diffDay  = Math.floor(diffHour / 24)
  if (diffSec  < 60)  return 'just now'
  if (diffMin  < 60)  return `${diffMin} min ago`
  if (diffHour < 24)  return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay  <= 3)  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getFileIcon(name: string | null | undefined): { bg: string; label: string } {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { bg: 'bg-red-500', label: 'PDF' }
  if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-500', label: 'DOC' }
  if (['xls', 'xlsx'].includes(ext)) return { bg: 'bg-green-500', label: 'XLS' }
  if (['ppt', 'pptx'].includes(ext)) return { bg: 'bg-orange-500', label: 'PPT' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { bg: 'bg-purple-500', label: 'IMG' }
  if (['zip', 'rar', '7z'].includes(ext)) return { bg: 'bg-yellow-500', label: 'ZIP' }
  return { bg: 'bg-gray-400', label: ext.toUpperCase() || 'FILE' }
}

function formatDocType(type: string): string {
  return type
}

onMounted(async () => {
  if (notifId.value && notification.value && !notification.value.is_read) {
    await notifStore.markRead(notifId.value)
  }
  if (refType.value === 'document') await docs.fetchMine()
  if (refType.value === 'subject')  await subjectsStore.fetchMine()
  if (refType.value === 'book_request') await loadBookRequest()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-8">
    <!-- Back -->
    <div class="flex items-center gap-2 text-sm text-gray-400 mb-6">
      <button
        class="flex items-center gap-1 hover:text-gray-700 transition-colors"
        @click="router.back()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- ── Rejected document ──────────────────────────────────────────────── -->
    <template v-else-if="refType === 'document' && upload">
      <!-- Rejection reason -->
      <div
        v-if="upload.rejection_reason"
        class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 mb-4 flex items-start gap-3"
      >
        <svg class="shrink-0 w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p class="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Reason for rejection</p>
          <p class="text-sm text-red-700">{{ upload.rejection_reason }}</p>
        </div>
      </div>

      <!-- Upload info -->
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Upload Details</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Title</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.title || '—' }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Type</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.doc_type ? formatDocType(upload.doc_type) : '—' }}</span>
          </div>
          <div v-if="upload.subjects?.name" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Subject</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.subjects.name }}</span>
          </div>
          <div v-if="upload.majors?.acronym" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Major</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.majors.acronym }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Submitted</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(upload.uploaded_at) }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Rejected</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(upload.rejected_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Files (read-only — storage deleted on rejection) -->
      <div v-if="upload.documents?.length" class="rounded-2xl border border-gray-200 bg-white overflow-hidden mt-4">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Submitted Files
            <span class="normal-case text-gray-300 ml-1">(removed from storage)</span>
          </p>
        </div>
        <div
          v-for="(file, idx) in upload.documents"
          :key="file.id"
          class="flex items-center gap-3 px-4 py-3"
          :class="idx !== upload.documents.length - 1 ? 'border-b border-gray-50' : ''"
        >
          <div :class="['shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white', getFileIcon(file.original_name).bg]">
            {{ getFileIcon(file.original_name).label }}
          </div>
          <span class="flex-1 truncate text-sm text-gray-700">{{ file.original_name || 'Unnamed file' }}</span>
          <span class="shrink-0 text-sm text-gray-400">
            {{ file.file_size_kb < 1024 ? `${file.file_size_kb} KB` : `${(file.file_size_kb / 1024).toFixed(1)} MB` }}
          </span>
        </div>
      </div>
    </template>

    <!-- ── Rejected subject ───────────────────────────────────────────────── -->
    <template v-else-if="refType === 'subject' && subject">

      <!-- Subject info -->
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Subject Details</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Name</span>
            <span class="text-sm font-medium text-gray-800">{{ subject.name || '—' }}</span>
          </div>
          <div v-if="subject.majors?.acronym" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Major</span>
            <span class="text-sm font-medium text-gray-800">{{ subject.majors.acronym }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Year Level</span>
            <span class="text-sm font-medium text-gray-800">Year {{ subject.year_level }}</span>
          </div>
          <div v-if="subject.semester" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Semester</span>
            <span class="text-sm font-medium text-gray-800">Semester {{ subject.semester }}</span>
          </div>
          <div v-if="subject.rejection_reason" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Rejection Reason</span>
            <span class="text-sm font-medium text-red-600">{{ subject.rejection_reason }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Submitted</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(subject.created_at) }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Rejected</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(subject.rejected_at) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Book request no longer available ───────────────────────────────── -->
    <div
      v-else-if="refType === 'book_request' && bookReqMissing"
      class="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center"
    >
      <p class="text-sm font-semibold text-gray-600">This request is no longer available</p>
      <p class="mt-1 text-xs text-gray-400">The book may have been removed or the request withdrawn.</p>
    </div>

    <!-- ── Book request ───────────────────────────────────────────────────── -->
    <template v-else-if="refType === 'book_request' && bookRequest">
      <!-- Book card -->
      <button
        class="w-full flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow text-left"
        @click="router.push({ name: 'book-detail', params: { id: bookRequest.book.id } })"
      >
        <img :src="bookRequest.book.cover_image_url || noImage" class="h-20 w-14 rounded-lg object-cover shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-400">Book request</p>
          <p class="text-lg font-bold text-gray-900 leading-tight">{{ bookRequest.book.title }}</p>
          <span :class="`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${reqStatusBadge(bookRequest.status)}`">
            {{ bookRequest.status }}
          </span>
        </div>
        <span class="text-xs text-[#008CB9] shrink-0">View book →</span>
      </button>

      <!-- Details -->
      <div class="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {{ bookRequest.role === 'donor' ? 'Request from' : 'Your request' }}
          </p>
        </div>
        <div class="divide-y divide-gray-50">
          <!-- The other party -->
          <div class="flex items-center gap-3 px-5 py-3">
            <div class="h-9 w-9 rounded-full overflow-hidden bg-[#008CB9] flex items-center justify-center shrink-0">
              <template v-if="bookRequest.role === 'donor'">
                <img v-if="bookRequest.requester.avatar_url" :src="bookRequest.requester.avatar_url" class="h-full w-full object-cover" />
                <span v-else class="text-[11px] font-bold text-white">{{ reqInitials(bookRequest.requester.first_name, bookRequest.requester.last_name) }}</span>
              </template>
              <template v-else>
                <img v-if="bookRequest.donor.avatar_url" :src="bookRequest.donor.avatar_url" class="h-full w-full object-cover" />
                <span v-else class="text-[11px] font-bold text-white">{{ reqInitials(bookRequest.donor.first_name, bookRequest.donor.last_name) }}</span>
              </template>
            </div>
            <span class="text-sm font-medium text-gray-800">
              <template v-if="bookRequest.role === 'donor'">
                {{ bookRequest.requester.first_name }} {{ bookRequest.requester.last_name }}
              </template>
              <template v-else>
                {{ bookRequest.donor.first_name }} {{ bookRequest.donor.last_name }}
              </template>
            </span>
          </div>

          <!-- Message -->
          <div v-if="bookRequest.message" class="grid grid-cols-3 px-5 py-3">
            <span class="text-sm text-gray-400">Message</span>
            <span class="col-span-2 text-sm text-gray-800">"{{ bookRequest.message }}"</span>
          </div>

          <!-- Revealed contact (after accept) -->
          <div v-if="bookRequest.contact" class="grid grid-cols-3 px-5 py-3">
            <span class="text-sm text-gray-400">{{ bookRequest.role === 'donor' ? 'Requester contact' : 'Donor contact' }}</span>
            <span class="col-span-2 text-sm font-semibold text-[#008CB9]">{{ bookRequest.contact }}</span>
          </div>

          <div class="grid grid-cols-3 px-5 py-3">
            <span class="text-sm text-gray-400">Requested</span>
            <span class="col-span-2 text-sm font-medium text-gray-800">{{ formatDate(bookRequest.requested_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Status messages -->
      <div v-if="bookRequest.status === 'accepted'" class="mt-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
        <p class="text-sm font-semibold text-green-700">Request accepted ✓</p>
        <p class="mt-1 text-sm text-gray-600">
          {{ bookRequest.role === 'donor'
            ? 'Reach out to the requester using their contact above to arrange the handoff.'
            : 'Contact the donor using the details above to arrange picking up the book.' }}
        </p>
      </div>
      <div v-else-if="bookRequest.status === 'declined'" class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <p class="text-sm font-semibold text-red-600">Request declined</p>
      </div>

      <!-- Donor actions on a pending request -->
      <div v-if="bookRequest.role === 'donor' && bookRequest.status === 'pending'" class="mt-4 flex gap-3">
        <button
          :disabled="reqAction !== null"
          @click="onDecline"
          class="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          {{ reqAction === 'decline' ? '…' : 'Decline' }}
        </button>
        <button
          :disabled="reqAction !== null"
          @click="onAccept"
          class="flex-1 rounded-xl bg-[#008CB9] py-2.5 text-sm font-semibold text-white hover:bg-[#006B9C] disabled:opacity-60 transition-colors"
        >
          {{ reqAction === 'accept' ? '…' : 'Accept' }}
        </button>
      </div>
      <p v-else-if="bookRequest.role === 'requester' && bookRequest.status === 'pending'" class="mt-4 text-center text-sm text-gray-400">
        Waiting for the donor to respond…
      </p>
    </template>

    <!-- Fallback -->
    <div v-else class="text-sm text-gray-400 py-8 text-center">No details available.</div>
  </div>
</template>
