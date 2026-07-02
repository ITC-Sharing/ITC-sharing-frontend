<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useAuthStore } from '@/stores/auth.store'
import UploadDocumentDashboard from '@/components/UploadDocumentDashboard.vue'
import PendingRejectedAlert from '@/components/dashboard/PendingRejectedAlert.vue'
import AddButton from '@/components/AddButton.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { formatFileSize, formatRelativeDate } from '@/utils/format'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const docs = useDocumentsStore()
const auth = useAuthStore()

function goToDetails(doc: { id: string; subjects?: { id: string } | null }) {
  router.push({
    name: 'document-details',
    query: { upload_id: doc.id, subject_id: doc.subjects?.id || undefined },
  })
}

const showUpload = ref(false)
const selectedType = ref('')
const searchQuery = ref('')
const deletingId = ref<string | null>(null)

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Note', value: 'Note' },
  { label: 'TD', value: 'TD' },
  { label: 'Examination paper', value: 'Examination paper' },
  { label: 'TP', value: 'TP' },
  { label: 'Project', value: 'Project' },
  { label: 'Lesson', value: 'Lesson' },
  { label: 'Other', value: 'Other' },
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

// Lists come back already filtered by the server (doc_type + title search).
const myDocs = computed(() => docs.documents)

function loadDocs() {
  return docs.fetchAll({
    uploader_id: auth.user?.id,
    doc_type: selectedType.value || undefined,
    search: searchQuery.value.trim() || undefined,
  })
}

// Type chips refetch immediately; the search box is debounced so we don't
// fire a request per keystroke.
watch(selectedType, loadDocs)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadDocs, 300)
})

type FileEntry = { download_count?: number; file_size_kb?: number }
type UploadEntry = { documents?: FileEntry[] }

function docFileSize(doc: UploadEntry) {
  return (doc.documents ?? []).reduce((s, f) => s + (f.file_size_kb ?? 0), 0)
}
function docDownloads(doc: UploadEntry) {
  return (doc.documents ?? []).reduce((s, f) => s + (f.download_count ?? 0), 0)
}

async function handleDelete(id: string, title: string) {
  if (!confirm(t('dashboard.documents.deleteConfirm', { title }))) return
  deletingId.value = id
  try {
    await docs.deleteDocument(id)
  } finally {
    deletingId.value = null
  }
}

// ── Pending/rejected uploads (edit + remove) ─────────────────────────────────
type EditableDoc = {
  id: string
  title: string
  doc_type: string
  year_level?: number | null
  academic_year?: string | null
  majors?: { id: string } | null
  subjects?: { id: string } | null
  document_tags?: { tag: string }[]
}
const editDoc = ref<EditableDoc | null>(null)

function openEdit(doc: EditableDoc) {
  editDoc.value = doc
  showUpload.value = true
}

function closeModal() {
  showUpload.value = false
  editDoc.value = null
}

async function removePending(doc: { id: string; title: string }) {
  if (!confirm(t('dashboard.documents.deleteConfirm', { title: doc.title }))) return
  await docs.deleteDocument(doc.id)
  await docs.fetchMine()
}

async function onUploaded() {
  await Promise.all([loadDocs(), docs.fetchMine()])
}

onMounted(() => {
  loadDocs()
  docs.fetchMine()
})
</script>

<template>
  <PendingRejectedAlert :docs="docs.myUploads" @edit="openEdit" @remove="removePending" />

  <!-- Filters -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2 w-full">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('dashboard.documents.searchPlaceholder')"
          class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#008CB9]/30 w-full sm:w-56"
        />
      </div>
      <AddButton :label="t('dashboard.documents.upload')" @click="showUpload = true" />
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
    v-else-if="myDocs.length === 0"
    class="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-gray-100"
  >
    <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
      <svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <div class="text-center">
      <p class="text-gray-500 font-medium">
        {{ searchQuery || selectedType ? t('dashboard.documents.noMatch') : t('dashboard.documents.noneUploaded') }}
      </p>
      <p class="text-gray-400 text-sm mt-1">
        {{ searchQuery || selectedType ? t('dashboard.documents.tryChangingFilter') : t('dashboard.documents.shareNotes') }}
      </p>
    </div>
    <button
      v-if="!searchQuery && !selectedType"
      @click="showUpload = true"
      class="mt-1 bg-[#008CB9] hover:bg-[#00749b] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
    >{{ t('dashboard.documents.uploadFirst') }}</button>
  </div>

  <!-- Document list -->
  <div v-else class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
    <div
      v-for="doc in myDocs"
      :key="doc.id"
      @click="goToDetails(doc)"
      class="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors group cursor-pointer"
    >
      <div :class="`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
        <p class="text-xs text-gray-400 truncate">{{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }}</p>
      </div>
      <span :class="`hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">{{ doc.doc_type }}</span>
      <div class="hidden md:flex items-center gap-5 shrink-0 text-xs text-gray-400 w-44 justify-end">
        <span class="flex items-center gap-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ docDownloads(doc) }}
        </span>
        <span>{{ formatFileSize(docFileSize(doc)) }}</span>
        <span>{{ formatRelativeDate(doc.uploaded_at) }}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          @click.stop="handleDelete(doc.id, doc.title)"
          :disabled="deletingId === doc.id"
          class="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          :title="t('dashboard.documents.delete')"
        >
          <svg v-if="deletingId === doc.id" class="animate-spin h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Upload modal -->
  <UploadDocumentDashboard
    v-if="showUpload"
    :edit-doc="editDoc"
    @close="closeModal"
    @uploaded="onUploaded"
  />
</template>
