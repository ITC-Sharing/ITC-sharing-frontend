<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import UploadDocumentDashboard from '@/components/UploadDocumentDashboard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import api from '@/lib/axios'

const auth = useAuthStore()
const docs = useDocumentsStore()

// ── Top-level tab ──────────────────────────────────────────────────────────────
type MainTab = 'documents' | 'subjects'
const mainTab = ref<MainTab>('documents')

const showUpload = ref(false)
const selectedType = ref('')
const searchQuery = ref('')
const deletingId = ref<string | null>(null)

const docTypes = [
  { label: 'All', value: '', color: 'bg-gray-100 text-gray-600' },
  { label: 'Notes', value: 'notes', color: 'bg-blue-100 text-blue-700' },
  { label: 'Assignment', value: 'assignment', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Past Exam', value: 'past_exam', color: 'bg-red-100 text-red-700' },
  { label: 'Lab', value: 'lab', color: 'bg-green-100 text-green-700' },
]

const typeColorMap: Record<string, string> = {
  notes: 'bg-blue-100 text-blue-700',
  assignment: 'bg-yellow-100 text-yellow-700',
  past_exam: 'bg-red-100 text-red-700',
  lab: 'bg-green-100 text-green-700',
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

const stats = computed(() => ({
  total: myDocs.value.length,
  downloads: myDocs.value.reduce((sum: number, d: any) => sum + (d.download_count ?? 0), 0),
  views: myDocs.value.reduce((sum: number, d: any) => sum + (d.view_count ?? 0), 0),
  size: formatTotalSize(
    myDocs.value.reduce((sum: number, d: any) => sum + (d.file_size_kb ?? 0), 0),
  ),
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
  await loadMyDocs()
}

async function loadMyDocs() {
  await docs.fetchAll({ uploader_id: auth.user?.id })
}

// ── My Subjects ────────────────────────────────────────────────────────────────
const mySubjects = ref<any[]>([])
const subjectsLoading = ref(false)
const editingSubject = ref<any | null>(null)
const editName = ref('')
const editSemester = ref('')
const savingSubject = ref(false)
const deletingSubjectId = ref<string | null>(null)

const statusStyle: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
}

async function loadMySubjects() {
  subjectsLoading.value = true
  try {
    const { data } = await api.get('/subjects/mine')
    mySubjects.value = data
  } finally {
    subjectsLoading.value = false
  }
}

function openEdit(subject: any) {
  editingSubject.value = subject
  editName.value = subject.name
  editSemester.value = String(subject.semester ?? '')
}

function closeEdit() {
  editingSubject.value = null
}

async function saveEdit() {
  if (!editingSubject.value) return
  savingSubject.value = true
  try {
    const payload: any = {}
    if (editName.value.trim()) payload.name = editName.value.trim()
    if (editSemester.value) payload.semester = Number(editSemester.value)
    const { data } = await api.patch(`/subjects/${editingSubject.value.id}`, payload)
    const idx = mySubjects.value.findIndex((s) => s.id === editingSubject.value.id)
    if (idx !== -1) mySubjects.value[idx] = { ...mySubjects.value[idx], ...data }
    closeEdit()
  } finally {
    savingSubject.value = false
  }
}

async function deleteSubject(subject: any) {
  if (!confirm(`Delete "${subject.name}"? This cannot be undone.`)) return
  deletingSubjectId.value = subject.id
  try {
    await api.delete(`/subjects/${subject.id}`)
    mySubjects.value = mySubjects.value.filter((s) => s.id !== subject.id)
  } finally {
    deletingSubjectId.value = null
  }
}

onMounted(() => {
  loadMyDocs()
  loadMySubjects()
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
          <p class="text-gray-400 text-sm mt-1">Manage everything you've shared with the community</p>
        </div>
        <button
          @click="showUpload = true"
          class="flex items-center gap-2 bg-[#0057BD] hover:bg-[#0948A0] active:scale-95 text-white text-sm px-5 py-3 rounded-xl transition-all shadow-sm"
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

      <!-- ── Main tab switcher ─────────────────────────────────────────── -->
      <div class="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
        <button
          @click="mainTab = 'documents'"
          :class="['px-4 py-2 rounded-lg text-sm font-medium transition-all', mainTab === 'documents' ? 'bg-[#0057BD] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50']"
        >My Documents</button>
        <button
          @click="mainTab = 'subjects'"
          :class="['px-4 py-2 rounded-lg text-sm font-medium transition-all', mainTab === 'subjects' ? 'bg-[#0057BD] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50']"
        >
          My Subjects
          <span v-if="mySubjects.filter(s => s.status === 'pending').length" class="ml-1 text-xs bg-yellow-400 text-white rounded-full px-1.5 py-0.5">
            {{ mySubjects.filter(s => s.status === 'pending').length }}
          </span>
        </button>
      </div>

      <template v-if="mainTab === 'documents'">
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
              {{ doc.doc_type?.replace('_', ' ') }}
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
      </template>
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- SUBJECTS TAB                                                        -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <template v-else-if="mainTab === 'subjects'">
        <div v-if="subjectsLoading" class="flex justify-center py-24">
          <LoadingSpinner />
        </div>

        <div v-else-if="mySubjects.length === 0" class="flex flex-col items-center py-24 gap-3 text-center">
          <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p class="text-gray-500 font-medium">No subjects submitted yet</p>
          <p class="text-gray-400 text-sm">Subjects you create will appear here</p>
        </div>

        <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <!-- Header -->
          <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
            <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Subject</p>
            <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Major</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Year</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sem</p>
            <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</p>
            <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Actions</p>
          </div>

          <div
            v-for="(subject, i) in mySubjects"
            :key="subject.id"
            :class="['transition-colors', i !== mySubjects.length - 1 ? 'border-b border-gray-100' : '']"
          >
            <!-- Row -->
            <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50">
              <div class="col-span-4 flex items-center gap-3 min-w-0">
                <img v-if="subject.subject_url" :src="subject.subject_url" class="h-9 w-9 rounded-xl object-cover shrink-0" />
                <div v-else class="h-9 w-9 rounded-xl bg-gray-100 shrink-0" />
                <p class="text-sm font-medium text-gray-900 truncate">{{ subject.name }}</p>
              </div>
              <p class="col-span-2 text-sm text-gray-500">{{ subject.majors?.acronym ?? '—' }}</p>
              <p class="col-span-1 text-sm text-gray-500">I{{ subject.year_level }}</p>
              <p class="col-span-1 text-sm text-gray-500">{{ subject.semester ?? '—' }}</p>
              <div class="col-span-2">
                <span :class="`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[subject.status] ?? 'bg-gray-100 text-gray-500'}`">
                  {{ subject.status }}
                </span>
              </div>
              <div class="col-span-2 flex items-center justify-end gap-2">
                <button
                  @click="openEdit(subject)"
                  class="p-1.5 text-gray-400 hover:text-[#0057BD] hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="deleteSubject(subject)"
                  :disabled="deletingSubjectId === subject.id"
                  class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <svg v-if="deletingSubjectId === subject.id" class="animate-spin h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Inline edit form -->
            <div v-if="editingSubject?.id === subject.id" class="px-6 pb-4 bg-blue-50/40 border-t border-blue-100">
              <div class="flex items-end gap-3 pt-3 flex-wrap">
                <div class="flex flex-col gap-1 flex-1 min-w-40">
                  <label class="text-xs font-medium text-gray-500">Name</label>
                  <input v-model="editName" class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057BD] bg-white" />
                </div>
                <div class="flex flex-col gap-1 w-32">
                  <label class="text-xs font-medium text-gray-500">Semester</label>
                  <select v-model="editSemester" class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <button @click="saveEdit" :disabled="savingSubject" class="px-4 py-2 text-sm font-semibold bg-[#0057BD] hover:bg-[#0948A0] text-white rounded-xl transition-colors disabled:opacity-50">
                    {{ savingSubject ? 'Saving…' : 'Save' }}
                  </button>
                  <button @click="closeEdit" class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>

  <!-- Upload modal -->
  <UploadDocumentDashboard v-if="showUpload" @close="showUpload = false" @uploaded="onUploaded" />
</template>
