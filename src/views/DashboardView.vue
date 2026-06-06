<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import UploadDocumentDashboard from '@/components/UploadDocumentDashboard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import api from '@/lib/axios'

const auth = useAuthStore()
const docs = useDocumentsStore()

const showUpload = ref(false)
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
  downloads: sumFiles('download_count'),
  views: sumFiles('view_count'),
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

onMounted(() => {
  loadMyDocs()
  loadMyPendingRejectedDocs()
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F8FA]">
    <div class="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-8">
      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p class="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">Dashboard</p>
          <h1 class="text-3xl font-bold text-gray-900 leading-tight">My Activity</h1>
          <p class="text-gray-400 text-sm mt-1">
            Manage everything you've shared with the community
          </p>
        </div>
        <button
          @click="showUpload = true"
          class="flex items-center gap-2 bg-[#008CB9] hover:bg-[#00749b] active:scale-95 text-white text-sm px-5 py-3 rounded-xl transition-all shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload Document
        </button>
      </div>

      <!-- ── Stats row ───────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col gap-1">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Files</p>
          <p class="text-3xl font-bold text-gray-900">{{ stats.total }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col gap-1">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">Downloads</p>
          <p class="text-3xl font-bold text-[#0057BD]">{{ stats.downloads }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col gap-1">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">Views</p>
          <p class="text-3xl font-bold text-gray-900">{{ stats.views }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col gap-1">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Size</p>
          <p class="text-3xl font-bold text-gray-900">{{ stats.size }}</p>
        </div>
      </div>

      <!-- ── Pending / Rejected uploads ───────────────────────────────────── -->
      <div v-if="myPendingRejectedDocs.length" class="flex flex-col gap-2">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Pending & Rejected Uploads
        </p>
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div
            v-for="(doc, i) in myPendingRejectedDocs"
            :key="doc.id"
            :class="[
              'px-5 py-3 flex items-start gap-3',
              i !== myPendingRejectedDocs.length - 1 ? 'border-b border-gray-100' : '',
            ]"
          >
            <span
              :class="`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`"
            >
              {{ doc.status }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400">
                {{ doc.majors?.acronym }} &bull; {{ doc.subjects?.name ?? '—' }} &bull;
                {{ formatDate(doc.uploaded_at) }}
              </p>
              <p v-if="doc.rejection_reason" class="text-xs text-red-500 mt-1">
                Reason: {{ doc.rejection_reason }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Filters ─────────────────────────────────────────────────────── -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Type tabs -->
        <div class="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
          <button
            v-for="type in docTypes"
            :key="type.value"
            @click="selectedType = type.value"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              selectedType === type.value
                ? 'bg-[#0057BD] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
            ]"
          >
            {{ type.label }}
            <span
              :class="[
                'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                selectedType === type.value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-400',
              ]"
            >
              {{ countByType(type.value) }}
            </span>
          </button>
        </div>

        <!-- Search -->
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search documents..."
            class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
      </div>

      <!-- ── Loading ─────────────────────────────────────────────────────── -->
      <div v-if="docs.loading" class="flex justify-center py-24">
        <LoadingSpinner />
      </div>

      <!-- ── Empty state ─────────────────────────────────────────────────── -->
      <div
        v-else-if="filteredDocs.length === 0 && !docs.loading"
        class="flex flex-col items-center justify-center py-24 gap-4"
      >
        <div class="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-gray-500 font-medium">
            {{
              searchQuery || selectedType
                ? 'No documents match your filters'
                : "You haven't uploaded anything yet"
            }}
          </p>
          <p class="text-gray-400 text-sm mt-1">
            {{
              searchQuery || selectedType
                ? 'Try changing your search or filter'
                : 'Share your notes with fellow students'
            }}
          </p>
        </div>
        <button
          v-if="!searchQuery && !selectedType"
          @click="showUpload = true"
          class="mt-2 bg-[#0057BD] hover:bg-[#0948A0] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          Upload your first document
        </button>
      </div>

      <!-- ── Document table ──────────────────────────────────────────────── -->
      <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <!-- Table header -->
        <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
          <p class="col-span-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Document
          </p>
          <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</p>
          <p
            class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center"
          >
            Size
          </p>
          <p
            class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center"
          >
            DL
          </p>
          <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</p>
          <p
            class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right"
          >
            Actions
          </p>
        </div>

        <!-- Rows -->
        <div
          v-for="(doc, index) in filteredDocs"
          :key="doc.id"
          :class="[
            'grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-gray-50',
            index !== filteredDocs.length - 1 ? 'border-b border-gray-100' : '',
          ]"
        >
          <!-- Title + subject -->
          <div class="col-span-5 flex flex-col gap-0.5 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
            <p class="text-xs text-gray-400 truncate">
              {{ doc.subjects?.name ?? '—' }} &nbsp;•&nbsp; {{ doc.majors?.acronym }}
            </p>
            <!-- Tags -->
            <div v-if="doc.document_tags?.length" class="flex gap-1 mt-1 flex-wrap">
              <span
                v-for="t in doc.document_tags.slice(0, 3)"
                :key="t.tag"
                class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full"
              >
                #{{ t.tag }}
              </span>
            </div>
          </div>

          <!-- Type badge -->
          <div class="col-span-2">
            <span
              :class="`text-xs font-medium px-2.5 py-1 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
            >
              {{ doc.doc_type }}
            </span>
          </div>

          <!-- Size -->
          <p class="col-span-1 text-xs text-gray-500 text-center">
            {{ formatSize(doc.file_size_kb) }}
          </p>

          <!-- Downloads -->
          <div class="col-span-1 flex items-center justify-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <p class="text-xs text-gray-500">{{ doc.download_count ?? 0 }}</p>
          </div>

          <!-- Date -->
          <p class="col-span-2 text-xs text-gray-400">{{ formatDate(doc.uploaded_at) }}</p>

          <!-- Actions -->
          <div class="col-span-1 flex items-center justify-end gap-2">
            <!-- Open file -->
            <a
              :href="doc.file_url"
              target="_blank"
              class="p-1.5 text-gray-300 hover:text-[#0057BD] transition-colors rounded-lg hover:bg-blue-50"
              title="Open file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            <!-- Delete -->
            <button
              @click="handleDelete(doc.id, doc.title)"
              :disabled="deletingId === doc.id"
              class="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete"
            >
              <svg
                v-if="deletingId === doc.id"
                class="animate-spin h-4 w-4 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Upload modal -->
  <UploadDocumentDashboard v-if="showUpload" @close="showUpload = false" @uploaded="onUploaded" />
</template>
