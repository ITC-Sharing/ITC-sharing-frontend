<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { useBooksStore } from '@/stores/books.store'
import UploadDocumentDashboard from '@/components/UploadDocumentDashboard.vue'
import DonateBookModal from '@/components/DonateBookModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import noImage from '@/assets/images/no-image.png'
import api from '@/lib/axios'

const auth = useAuthStore()
const docs = useDocumentsStore()
const booksStore = useBooksStore()

const showUpload = ref(false)
const showDonate = ref(false)

async function onBookDonated() {
  showDonate.value = false
  await booksStore.fetchMyBooks()
}
const selectedType = ref('')
const searchQuery = ref('')
const deletingId = ref<string | null>(null)

const docTypes = [
  { label: 'All', value: '', color: 'bg-gray-100 text-gray-600' },
  { label: 'Note', value: 'Note', color: 'bg-blue-100 text-blue-700' },
  { label: 'TD', value: 'TD', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Examination paper', value: 'Examination paper', color: 'bg-red-100 text-red-700' },
  { label: 'TP', value: 'TP', color: 'bg-green-100 text-green-700' },
  { label: 'Project', value: 'Project', color: 'bg-purple-100 text-purple-700' },
  { label: 'Lesson', value: 'Lesson', color: 'bg-orange-100 text-orange-700' },
  { label: 'Other', value: 'Other', color: 'bg-gray-100 text-gray-700' },
]

const typeColorMap: Record<string, string> = {
  Note: 'bg-blue-100 text-blue-700',
  TD: 'bg-yellow-100 text-yellow-700',
  'Examination paper': 'bg-red-100 text-red-700',
  TP: 'bg-green-100 text-green-700',
  Project: 'bg-purple-100 text-purple-700',
  Lesson: 'bg-orange-100 text-orange-700',
  Other: 'bg-gray-100 text-gray-700',
}

const myDocs = computed(() => docs.documents)

const filteredDocs = computed(() => {
  let result = myDocs.value

  if (selectedType.value) {
    result = result.filter((d: any) => d.doc_type === selectedType.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter((d: any) => d.title?.toLowerCase().includes(q))
  }

  return result
})

type FileEntry = { download_count?: number; view_count?: number; file_size_kb?: number }
type UploadEntry = { documents?: FileEntry[] }

function sumFiles(key: keyof FileEntry) {
  return myDocs.value.reduce((sum: number, d: UploadEntry) => {
    return sum + (d.documents ?? []).reduce((s: number, f: FileEntry) => s + (f[key] ?? 0), 0)
  }, 0)
}

const stats = computed(() => ({
  total: myDocs.value.length,
  books: booksStore.myBooks.length,
  size: formatTotalSize(sumFiles('file_size_kb')),
}))

function formatTotalSize(kb: number) {
  if (kb < 1024) return `${kb} KB`
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${(kb / (1024 * 1024)).toFixed(2)} GB`
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

// Per-upload aggregates (file size & downloads live in the nested documents[] files)
function docFileSize(doc: UploadEntry) {
  return (doc.documents ?? []).reduce((s, f) => s + (f.file_size_kb ?? 0), 0)
}
function docDownloads(doc: UploadEntry) {
  return (doc.documents ?? []).reduce((s, f) => s + (f.download_count ?? 0), 0)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function countByType(type: string) {
  if (!type) return myDocs.value.length
  return myDocs.value.filter((d: any) => d.doc_type === type).length
}

async function handleDelete(id: string, title: string) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
  deletingId.value = id
  try {
    await docs.deleteDocument(id)
  } finally {
    deletingId.value = null
  }
}

async function onUploaded() {
  await Promise.all([loadMyDocs(), loadMyPendingRejectedDocs()])
}

async function loadMyDocs() {
  await docs.fetchAll({ uploader_id: auth.user?.id })
}

// ── My pending / rejected docs ─────────────────────────────────────────────────
type PendingRejectedDoc = {
  id: string
  title: string
  doc_type: string
  file_size_kb: number
  status: 'pending' | 'rejected'
  rejection_reason: string | null
  rejected_at: string | null
  uploaded_at: string
  subjects: { id: string; name: string } | null
  majors: { id: string; acronym: string } | null
}

const myPendingRejectedDocs = ref<PendingRejectedDoc[]>([])

async function loadMyPendingRejectedDocs() {
  const { data } = await api.get('/documents/mine')
  myPendingRejectedDocs.value = data
}

// ── Incoming book requests ─────────────────────────────────────────────────
interface IncomingRequest {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  message: string | null
  contact: string | null
  requested_at: string
  book: { id: string; title: string; cover_image_url: string | null }
  requester: { id: string; first_name: string; last_name: string; avatar_url: string | null }
}

const requestAction = ref<string | null>(null)
const incomingRequests = computed<IncomingRequest[]>(() => booksStore.incomingRequests)

// ── Sidebar nav + header ────────────────────────────────────────────────────
const activeTab = ref<'activity' | 'documents' | 'books'>('activity')
const greetingName = computed(() => auth.user?.first_name || 'there')
const userInitials = computed(() =>
  ((auth.user?.first_name?.[0] ?? '') + (auth.user?.last_name?.[0] ?? '')).toUpperCase() || 'U',
)
const navItems = [
  { tab: 'activity', label: 'My Activity' },
  { tab: 'documents', label: 'My Documents' },
  { tab: 'books', label: 'Books' },
] as const
const currentLabel = computed(() => navItems.find((n) => n.tab === activeTab.value)?.label ?? '')

// ── Books: donated + requested ──────────────────────────────────────────────
const myBooks = computed(() => booksStore.myBooks)
const outgoingRequests = computed(() => booksStore.outgoingRequests)
const pendingIncomingCount = computed(
  () => myBooks.value.filter((b: any) => b.request?.status === 'pending').length,
)

const recentDocs = computed(() =>
  [...myDocs.value]
    .sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, 3),
)
const recentRequests = computed(() =>
  [...incomingRequests.value]
    .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())
    .slice(0, 3),
)

function reqInitials(first?: string, last?: string) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

function reqStatusBadge(status: string) {
  if (status === 'accepted') return 'bg-green-100 text-green-700'
  if (status === 'declined') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

async function onAcceptRequest(bookId: string, requestId: string) {
  requestAction.value = requestId
  try {
    await booksStore.acceptRequest(bookId, requestId)
  } finally {
    requestAction.value = null
  }
}

async function onDeclineRequest(bookId: string, requestId: string) {
  requestAction.value = requestId + '_d'
  try {
    await booksStore.declineRequest(bookId, requestId)
  } finally {
    requestAction.value = null
  }
}

onMounted(() => {
  loadMyDocs()
  loadMyPendingRejectedDocs()
  booksStore.fetchIncomingRequests()
  booksStore.fetchMyBooks()
  booksStore.fetchOutgoingRequests()
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F8FA]">
    <div class="mx-auto max-w-7xl px-6 flex flex-col md:flex-row gap-6 items-start">
      <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
      <aside class="w-full md:w-60 shrink-0 md:sticky md:top-[100px] flex flex-col gap-4">
        <!-- Profile card -->
        <div class="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div class="h-11 w-11 rounded-full bg-[#008CB9] flex items-center justify-center shrink-0 overflow-hidden">
            <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" class="h-full w-full object-cover" />
            <span v-else class="text-white text-sm font-bold">{{ userInitials }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-gray-900 truncate">Hi, {{ greetingName }} 👋</p>
            <p class="text-[11px] text-gray-400 truncate">{{ auth.user?.email }}</p>
          </div>
        </div>

        <!-- Nav -->
        <nav class="bg-white rounded-2xl border border-gray-100 p-2 flex md:flex-col gap-1">
          <button
            v-for="item in navItems"
            :key="item.tab"
            @click="activeTab = item.tab"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
              activeTab === item.tab
                ? 'bg-[#008CB9] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            ]"
          >
            <svg v-if="item.tab === 'activity'" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <svg v-else-if="item.tab === 'documents'" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <svg v-else class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span class="flex-1">{{ item.label }}</span>
            <span
              v-if="item.tab === 'books' && pendingIncomingCount"
              :class="[
                'h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                activeTab === 'books' ? 'bg-white/30 text-white' : 'bg-red-500 text-white',
              ]"
            >{{ pendingIncomingCount }}</span>
          </button>
        </nav>
      </aside>

      <!-- ── Content ──────────────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 flex flex-col gap-6">
        <!-- Mobile title -->
        <div class="md:hidden">
          <h1 class="text-xl font-bold text-gray-900">{{ currentLabel }}</h1>
        </div>

      <!-- ── Stats ───────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div class="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg class="h-5 w-5 text-[#0057BD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 leading-none">{{ stats.total }}</p>
            <p class="text-xs text-gray-400 mt-1">Files</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div class="h-11 w-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <svg class="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 leading-none">{{ stats.size }}</p>
            <p class="text-xs text-gray-400 mt-1">Total size</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div class="h-11 w-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <svg class="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 leading-none">{{ stats.books }}</p>
            <p class="text-xs text-gray-400 mt-1">Books donated</p>
          </div>
        </div>
      </div>

      <!-- ══════════════════ MY ACTIVITY TAB ══════════════════ -->
      <template v-if="activeTab === 'activity'">
        <!-- Pending / rejected alert -->
        <div
          v-if="myPendingRejectedDocs.length"
          class="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3"
        >
          <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            Uploads under review ({{ myPendingRejectedDocs.length }})
          </p>
          <div v-for="doc in myPendingRejectedDocs" :key="doc.id" class="flex items-start gap-3">
            <span
              :class="`mt-0.5 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`"
            >{{ doc.status }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400">
                {{ doc.majors?.acronym }} &bull; {{ doc.subjects?.name ?? '—' }} &bull; {{ formatDate(doc.uploaded_at) }}
              </p>
              <p v-if="doc.rejection_reason" class="text-xs text-red-500 mt-1">Reason: {{ doc.rejection_reason }}</p>
            </div>
          </div>
        </div>

        <!-- Two-column recent activity -->
        <div class="grid grid-cols-1 gap-6">
          <!-- Recent uploads -->
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p class="text-sm font-bold text-gray-900">Recent uploads</p>
              <button
                v-if="recentDocs.length"
                @click="activeTab = 'documents'"
                class="text-xs font-semibold text-[#008CB9] hover:underline cursor-pointer"
              >View all</button>
            </div>
            <div v-if="!recentDocs.length" class="px-5 py-10 text-center text-sm text-gray-400">
              No uploads yet
            </div>
            <div v-else class="divide-y divide-gray-50">
              <a
                v-for="doc in recentDocs"
                :key="doc.id"
                :href="doc.file_url"
                target="_blank"
                class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div :class="`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ doc.subjects?.name ?? '—' }} &bull; {{ formatDate(doc.uploaded_at) }}</p>
                </div>
                <span :class="`hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">{{ doc.doc_type }}</span>
              </a>
            </div>
          </div>

          <!-- Recent book requests -->
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p class="text-sm font-bold text-gray-900">Recent book requests</p>
              <button
                v-if="recentRequests.length"
                @click="activeTab = 'books'"
                class="text-xs font-semibold text-[#008CB9] hover:underline cursor-pointer"
              >View all</button>
            </div>
            <div v-if="!recentRequests.length" class="px-5 py-10 text-center text-sm text-gray-400">
              No requests yet
            </div>
            <div v-else class="divide-y divide-gray-50">
              <button
                v-for="req in recentRequests"
                :key="req.id"
                @click="activeTab = 'books'"
                class="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <img :src="req.book.cover_image_url || noImage" class="h-10 w-7 rounded object-cover shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ req.book.title }}</p>
                  <p class="text-xs text-gray-400 truncate">
                    {{ req.requester.first_name }} {{ req.requester.last_name }} &bull; {{ formatDate(req.requested_at) }}
                  </p>
                </div>
                <span :class="`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${reqStatusBadge(req.status)}`">{{ req.status }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════════ DOCUMENTS TAB ══════════════════ -->
      <template v-else-if="activeTab === 'documents'">
        <!-- Pending / rejected alert -->
        <div
          v-if="myPendingRejectedDocs.length"
          class="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3"
        >
          <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            Uploads under review ({{ myPendingRejectedDocs.length }})
          </p>
          <div
            v-for="doc in myPendingRejectedDocs"
            :key="doc.id"
            class="flex items-start gap-3"
          >
            <span
              :class="`mt-0.5 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`"
            >{{ doc.status }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400">
                {{ doc.majors?.acronym }} &bull; {{ doc.subjects?.name ?? '—' }} &bull; {{ formatDate(doc.uploaded_at) }}
              </p>
              <p v-if="doc.rejection_reason" class="text-xs text-red-500 mt-1">Reason: {{ doc.rejection_reason }}</p>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 w-full">
            <div class="relative flex-1">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search documents..."
                class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#008CB9]/30 w-full sm:w-56"
              />
            </div>
            <button
              @click="showUpload = true"
              class="flex items-center gap-2 bg-[#008CB9] hover:bg-[#00749b] active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Upload
            </button>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="type in docTypes"
              :key="type.value"
              @click="selectedType = type.value"
              :class="[
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                selectedType === type.value
                  ? 'bg-[#008CB9] text-white border-[#008CB9]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
              ]"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="docs.loading" class="flex justify-center py-24"><LoadingSpinner /></div>

        <!-- Empty -->
        <div
          v-else-if="filteredDocs.length === 0"
          class="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-gray-100"
        >
          <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div class="text-center">
            <p class="text-gray-500 font-medium">
              {{ searchQuery || selectedType ? 'No documents match your filters' : "You haven't uploaded anything yet" }}
            </p>
            <p class="text-gray-400 text-sm mt-1">
              {{ searchQuery || selectedType ? 'Try changing your search or filter' : 'Share your notes with fellow students' }}
            </p>
          </div>
          <button
            v-if="!searchQuery && !selectedType"
            @click="showUpload = true"
            class="mt-1 bg-[#008CB9] hover:bg-[#00749b] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >Upload your first document</button>
        </div>

        <!-- Document list -->
        <div v-else class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <div
            v-for="doc in filteredDocs"
            :key="doc.id"
            class="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors group"
          >
            <!-- Icon -->
            <div :class="`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <!-- Title + meta -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400 truncate">
                {{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }}
              </p>
            </div>
            <!-- Type -->
            <span
              :class="`hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
            >{{ doc.doc_type }}</span>
            <!-- Meta cluster -->
            <div class="hidden md:flex items-center gap-5 shrink-0 text-xs text-gray-400 w-44 justify-end">
              <span class="flex items-center gap-1">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {{ docDownloads(doc) }}
              </span>
              <span>{{ formatSize(docFileSize(doc)) }}</span>
              <span>{{ formatDate(doc.uploaded_at) }}</span>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <a
                :href="doc.file_url"
                target="_blank"
                class="p-2 text-gray-300 hover:text-[#008CB9] transition-colors rounded-lg hover:bg-blue-50"
                title="Open file"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <button
                @click="handleDelete(doc.id, doc.title)"
                :disabled="deletingId === doc.id"
                class="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete"
              >
                <svg v-if="deletingId === doc.id" class="animate-spin h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════════ BOOKS TAB ══════════════════ -->
      <template v-else>
        <!-- ── Books I'm donating ──────────────────────────────────────────── -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Books you're donating</p>
            <button
              @click="showDonate = true"
              class="flex items-center gap-2 bg-[#008CB9] hover:bg-[#00749b] active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              List a Book
            </button>
          </div>

          <div
            v-if="!myBooks.length"
            class="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-gray-100 text-center"
          >
            <p class="text-gray-500 font-medium text-sm">You haven't listed any books</p>
            <p class="text-gray-400 text-xs">Books you donate will appear here with their requests.</p>
          </div>

          <div
            v-for="book in myBooks"
            :key="book.id"
            :class="[
              'bg-white rounded-2xl border p-4 flex items-start gap-4 transition-colors',
              book.request?.status === 'pending' ? 'border-[#008CB9]/30 ring-1 ring-[#008CB9]/10' : 'border-gray-100',
            ]"
          >
            <img :src="book.cover_image_url || noImage" class="h-16 w-12 rounded-lg object-cover shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ book.title }}</p>
                <span :class="`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${reqStatusBadge(book.status === 'available' ? 'available' : book.status === 'donated' ? 'accepted' : 'pending')}`">{{ book.status }}</span>
              </div>

              <!-- Pending request -->
              <template v-if="book.request && book.request.status === 'pending'">
                <div class="mt-1.5 flex items-center gap-2">
                  <div class="h-6 w-6 rounded-full overflow-hidden bg-[#008CB9] flex items-center justify-center shrink-0">
                    <img v-if="book.request.requester.avatar_url" :src="book.request.requester.avatar_url" class="h-full w-full object-cover" />
                    <span v-else class="text-[9px] font-bold text-white">{{ reqInitials(book.request.requester.first_name, book.request.requester.last_name) }}</span>
                  </div>
                  <p class="text-xs text-gray-500">
                    Requested by {{ book.request.requester.first_name }} {{ book.request.requester.last_name }}
                  </p>
                </div>
              </template>
              <!-- Accepted → recipient + contact -->
              <p v-else-if="book.request && book.request.status === 'accepted'" class="mt-2 text-sm rounded-lg bg-green-50 px-3 py-2">
                Given to <span class="font-medium">{{ book.request.requester.first_name }} {{ book.request.requester.last_name }}</span>
                <template v-if="book.request.contact">
                  · <span class="font-semibold text-[#008CB9]">{{ book.request.contact }}</span>
                </template>
              </p>
              <!-- No request yet -->
              <p v-else class="mt-1 text-xs text-gray-400">Available — waiting for requests</p>
            </div>

            <!-- Accept / Reject -->
            <div v-if="book.request && book.request.status === 'pending'" class="flex flex-col gap-2 shrink-0">
              <button
                :disabled="requestAction === book.request.id"
                @click="onAcceptRequest(book.id, book.request.id)"
                class="px-4 py-1.5 rounded-lg bg-[#008CB9] text-xs font-semibold text-white hover:bg-[#006B9C] disabled:opacity-60 transition-colors"
              >{{ requestAction === book.request.id ? '…' : 'Accept' }}</button>
              <button
                :disabled="requestAction === book.request.id + '_d'"
                @click="onDeclineRequest(book.id, book.request.id)"
                class="px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >{{ requestAction === book.request.id + '_d' ? '…' : 'Reject' }}</button>
            </div>
          </div>
        </div>

        <!-- ── Books I requested ───────────────────────────────────────────── -->
        <div class="flex flex-col gap-3">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Books you requested</p>

          <div
            v-if="!outgoingRequests.length"
            class="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-2xl border border-gray-100 text-center"
          >
            <p class="text-gray-500 font-medium text-sm">You haven't requested any books</p>
            <p class="text-gray-400 text-xs">Browse books and request one to see it here.</p>
          </div>

          <div
            v-for="req in outgoingRequests"
            :key="req.id"
            class="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4"
          >
            <img :src="req.book.cover_image_url || noImage" class="h-16 w-12 rounded-lg object-cover shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ req.book.title }}</p>
                <span :class="`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${reqStatusBadge(req.status)}`">{{ req.status }}</span>
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Donor: {{ req.donor.first_name }} {{ req.donor.last_name }} • {{ formatDate(req.requested_at) }}
              </p>
              <p v-if="req.status === 'accepted' && req.contact" class="mt-2 text-sm rounded-lg bg-green-50 px-3 py-2">
                <span class="font-medium text-gray-700">Donor contact:</span>
                <span class="font-semibold text-[#008CB9]"> {{ req.contact }}</span>
              </p>
              <p v-else-if="req.status === 'pending'" class="mt-1 text-xs text-gray-400">Waiting for donor response…</p>
              <p v-else-if="req.status === 'declined'" class="mt-1 text-xs text-red-500">Request declined</p>
            </div>
          </div>
        </div>
      </template>
      </div>
      <!-- /content -->
    </div>
  </div>

  <!-- Upload modal -->
  <UploadDocumentDashboard v-if="showUpload" @close="showUpload = false" @uploaded="onUploaded" />

  <!-- Donate book modal -->
  <Teleport to="body">
    <DonateBookModal v-if="showDonate" @close="showDonate = false" @donated="onBookDonated" />
  </Teleport>
</template>
