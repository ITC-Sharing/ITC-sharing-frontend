<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/axios'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const auth = useAuthStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'approvals' | 'subjects' | 'users' | 'documents'
const activeTab = ref<Tab>('overview')

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = ref({ totalUsers: 0, totalDocuments: 0, totalDownloads: 0, totalViews: 0 })
const recentDocs = ref<any[]>([])
const statsLoading = ref(false)

async function loadOverview() {
  statsLoading.value = true
  try {
    const [s, r] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-documents'),
    ])
    stats.value = s.data
    recentDocs.value = r.data
  } finally {
    statsLoading.value = false
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
const users = ref<any[]>([])
const usersLoading = ref(false)
const userSearch = ref('')
let userSearchTimer: ReturnType<typeof setTimeout>

watch(userSearch, () => {
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(loadUsers, 300)
})

async function loadUsers() {
  usersLoading.value = true
  try {
    const { data } = await api.get('/admin/users', {
      params: userSearch.value ? { search: userSearch.value } : {},
    })
    users.value = data
  } finally {
    usersLoading.value = false
  }
}


// ── Documents ─────────────────────────────────────────────────────────────────
const allDocs = ref<any[]>([])
const docsLoading = ref(false)
const docSearch = ref('')
const docTypeFilter = ref('')
const deletingDocId = ref<string | null>(null)
let docSearchTimer: ReturnType<typeof setTimeout>

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Notes', value: 'notes' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Past Exam', value: 'past_exam' },
  { label: 'Lab', value: 'lab' },
]

const typeColorMap: Record<string, string> = {
  notes: 'bg-blue-100 text-blue-700',
  assignment: 'bg-yellow-100 text-yellow-700',
  past_exam: 'bg-red-100 text-red-700',
  lab: 'bg-green-100 text-green-700',
}

watch(docSearch, () => {
  clearTimeout(docSearchTimer)
  docSearchTimer = setTimeout(loadDocuments, 300)
})

watch(docTypeFilter, loadDocuments)

async function loadDocuments() {
  docsLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (docSearch.value) params.search = docSearch.value
    if (docTypeFilter.value) params.doc_type = docTypeFilter.value
    const { data } = await api.get('/admin/documents', { params })
    allDocs.value = data
  } finally {
    docsLoading.value = false
  }
}

async function deleteDocument(doc: any) {
  if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
  deletingDocId.value = doc.id
  try {
    await api.delete(`/admin/documents/${doc.id}`)
    allDocs.value = allDocs.value.filter((d) => d.id !== doc.id)
    stats.value.totalDocuments = Math.max(0, stats.value.totalDocuments - 1)
  } finally {
    deletingDocId.value = null
  }
}

// ── Approvals ─────────────────────────────────────────────────────────────────
const pendingSubjects = ref<any[]>([])
const pendingDocs = ref<any[]>([])
const approvalsLoading = ref(false)
const actioningId = ref<string | null>(null)

// subject inline edit
const editingSubjectId = ref<string | null>(null)
const editSubjectName = ref('')
const editSubjectSemester = ref('')
const savingSubjectId = ref<string | null>(null)

function openSubjectEdit(subject: { id: string; name: string; semester?: string | number }) {
  editingSubjectId.value = subject.id
  editSubjectName.value = subject.name
  editSubjectSemester.value = String(subject.semester ?? '')
}

function closeSubjectEdit() {
  editingSubjectId.value = null
}

async function saveSubjectEdit(subject: { id: string; name: string; semester?: string | number }) {
  savingSubjectId.value = subject.id
  try {
    const payload: { name: string; semester?: number } = { name: editSubjectName.value.trim() }
    if (editSubjectSemester.value) payload.semester = Number(editSubjectSemester.value)
    await api.patch(`/admin/subjects/${subject.id}`, payload)
    subject.name = payload.name
    if (payload.semester) subject.semester = payload.semester
    closeSubjectEdit()
  } finally {
    savingSubjectId.value = null
  }
}

async function adminDeleteSubject(id: string, name: string) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
  actioningId.value = id
  try {
    await api.delete(`/admin/subjects/${id}`)
    pendingSubjects.value = pendingSubjects.value.filter((s) => s.id !== id)
  } finally {
    actioningId.value = null
  }
}

const pendingCount = computed(() => pendingSubjects.value.length + pendingDocs.value.length)

async function loadApprovals() {
  approvalsLoading.value = true
  try {
    const [s, d] = await Promise.all([
      api.get('/admin/pending/subjects'),
      api.get('/admin/pending/documents'),
    ])
    pendingSubjects.value = s.data
    pendingDocs.value = d.data
  } finally {
    approvalsLoading.value = false
  }
}

async function approveSubject(id: string) {
  actioningId.value = id
  try {
    await api.patch(`/admin/subjects/${id}/approve`)
    pendingSubjects.value = pendingSubjects.value.filter((s) => s.id !== id)
  } finally {
    actioningId.value = null
  }
}

async function rejectSubject(id: string) {
  actioningId.value = id
  try {
    await api.patch(`/admin/subjects/${id}/reject`)
    pendingSubjects.value = pendingSubjects.value.filter((s) => s.id !== id)
  } finally {
    actioningId.value = null
  }
}

async function approveDoc(id: string) {
  actioningId.value = id
  try {
    await api.patch(`/admin/documents/${id}/approve`)
    pendingDocs.value = pendingDocs.value.filter((d) => d.id !== id)
  } finally {
    actioningId.value = null
  }
}

async function rejectDoc(id: string) {
  actioningId.value = id
  try {
    await api.patch(`/admin/documents/${id}/reject`)
    pendingDocs.value = pendingDocs.value.filter((d) => d.id !== id)
  } finally {
    actioningId.value = null
  }
}

// ── All Subjects (admin manage) ───────────────────────────────────────────────
interface AdminSubject {
  id: string; name: string; slug: string; year_level: number
  semester: string | number; subject_url: string | null; status: string
  majors: { id: string; acronym: string } | null
  users: { id: string; first_name: string; last_name: string } | null
}
const allSubjects = ref<AdminSubject[]>([])
const subjectsLoading = ref(false)
const subjectSearch = ref('')
const editingAdminSubjectId = ref<string | null>(null)
const editAdminName = ref('')
const editAdminSemester = ref('')
const savingAdminSubjectId = ref<string | null>(null)
const deletingAdminSubjectId = ref<string | null>(null)
let subjectSearchTimer: ReturnType<typeof setTimeout>

const statusStyle: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
}

watch(subjectSearch, () => {
  clearTimeout(subjectSearchTimer)
  subjectSearchTimer = setTimeout(loadAllSubjects, 300)
})

async function loadAllSubjects() {
  subjectsLoading.value = true
  try {
    const { data } = await api.get('/admin/subjects', {
      params: subjectSearch.value ? { search: subjectSearch.value } : {},
    })
    allSubjects.value = data
  } finally {
    subjectsLoading.value = false
  }
}

function openAdminSubjectEdit(subject: { id: string; name: string; semester?: string | number }) {
  editingAdminSubjectId.value = subject.id
  editAdminName.value = subject.name
  editAdminSemester.value = String(subject.semester ?? '')
}

function closeAdminSubjectEdit() {
  editingAdminSubjectId.value = null
}

async function saveAdminSubjectEdit(subject: { id: string; name: string; semester?: string | number }) {
  savingAdminSubjectId.value = subject.id
  try {
    const payload: { name: string; semester?: number } = { name: editAdminName.value.trim() }
    if (editAdminSemester.value) payload.semester = Number(editAdminSemester.value)
    await api.patch(`/admin/subjects/${subject.id}`, payload)
    subject.name = payload.name
    if (payload.semester) subject.semester = payload.semester
    closeAdminSubjectEdit()
  } finally {
    savingAdminSubjectId.value = null
  }
}

async function deleteAdminSubject(id: string, name: string) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
  deletingAdminSubjectId.value = id
  try {
    await api.delete(`/admin/subjects/${id}`)
    allSubjects.value = allSubjects.value.filter((s) => s.id !== id)
  } finally {
    deletingAdminSubjectId.value = null
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
watch(activeTab, (tab) => {
  if (tab === 'overview' && recentDocs.value.length === 0) loadOverview()
  if (tab === 'approvals' && pendingSubjects.value.length === 0 && pendingDocs.value.length === 0) loadApprovals()
  if (tab === 'users' && users.value.length === 0) loadUsers()
  if (tab === 'subjects' && allSubjects.value.length === 0) loadAllSubjects()
  if (tab === 'documents' && allDocs.value.length === 0) loadDocuments()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const statCards = computed(() => [
  { label: 'Total Users', value: stats.value.totalUsers, color: 'text-[#0057BD]' },
  { label: 'Total Documents', value: stats.value.totalDocuments, color: 'text-gray-900' },
  { label: 'Total Downloads', value: stats.value.totalDownloads, color: 'text-green-600' },
  { label: 'Total Views', value: stats.value.totalViews, color: 'text-gray-900' },
])

onMounted(async () => {
  await auth.init()
  if (auth.user?.role !== 'admin') {
    router.replace({ name: 'home' })
    return
  }
  loadOverview()
  loadApprovals()
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F8FA]">
    <div class="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-6">

      <!-- ── Header ──────────────────────────────────────────────────────────── -->
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Admin</p>
        <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-400 mt-1">Platform overview and management</p>
      </div>

      <!-- ── Tabs ────────────────────────────────────────────────────────────── -->
      <div class="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
        <button
          v-for="tab in (['overview', 'approvals', 'subjects', 'users', 'documents'] as const)"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'relative px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
            activeTab === tab
              ? 'bg-[#0057BD] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
          ]"
        >
          {{ tab }}
          <span
            v-if="tab === 'approvals' && pendingCount > 0"
            class="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
          >{{ pendingCount }}</span>
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- OVERVIEW TAB                                                           -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-if="activeTab === 'overview'">
        <div v-if="statsLoading" class="flex justify-center py-24">
          <LoadingSpinner />
        </div>

        <template v-else>
          <!-- Stat cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="card in statCards"
              :key="card.label"
              class="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col gap-1"
            >
              <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">{{ card.label }}</p>
              <p :class="`text-3xl font-bold ${card.color}`">{{ card.value.toLocaleString() }}</p>
            </div>
          </div>

          <!-- Recent uploads -->
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
              <h2 class="font-semibold text-gray-900">Recent Uploads</h2>
            </div>

            <div v-if="recentDocs.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No documents yet.
            </div>

            <div
              v-for="(doc, i) in recentDocs"
              :key="doc.id"
              :class="['grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-gray-50 transition-colors', i !== recentDocs.length - 1 ? 'border-b border-gray-100' : '']"
            >
              <div class="col-span-5 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                <p class="text-xs text-gray-400 truncate">
                  {{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }}
                </p>
              </div>
              <div class="col-span-2">
                <span :class="`text-xs font-medium px-2 py-0.5 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
                  {{ doc.doc_type?.replace('_', ' ') }}
                </span>
              </div>
              <p class="col-span-2 text-xs text-gray-500">
                {{ doc.users?.first_name }} {{ doc.users?.last_name }}
              </p>
              <p class="col-span-2 text-xs text-gray-400">{{ formatDate(doc.uploaded_at) }}</p>
              <div class="col-span-1 flex items-center justify-end gap-1 text-xs text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ doc.download_count ?? 0 }}
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- APPROVALS TAB                                                          -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'approvals'">
        <div v-if="approvalsLoading" class="flex justify-center py-24">
          <LoadingSpinner />
        </div>

        <template v-else>
          <!-- All clear -->
          <div
            v-if="pendingSubjects.length === 0 && pendingDocs.length === 0"
            class="flex flex-col items-center justify-center py-24 gap-3 text-center"
          >
            <div class="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="font-medium text-gray-700">All caught up!</p>
            <p class="text-sm text-gray-400">No pending approvals.</p>
          </div>

          <template v-else>
            <!-- ── Pending Subjects ──────────────────────────────────────────── -->
            <div v-if="pendingSubjects.length > 0" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <h2 class="font-semibold text-gray-900">Pending Subjects</h2>
                <span class="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{{ pendingSubjects.length }}</span>
              </div>

              <div
                v-for="(subject, i) in pendingSubjects"
                :key="subject.id"
                :class="['transition-colors', i !== pendingSubjects.length - 1 ? 'border-b border-gray-100' : '']"
              >
                <!-- Main row -->
                <div class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                  <img
                    v-if="subject.subject_url"
                    :src="subject.subject_url"
                    class="h-10 w-10 rounded-xl object-cover shrink-0"
                  />
                  <div v-else class="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />

                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ subject.name }}</p>
                    <p class="text-xs text-gray-400">
                      {{ subject.majors?.acronym }} &bull; Year {{ subject.year_level }} &bull; Semester {{ subject.semester }}
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5">
                      Submitted by
                      <span class="font-medium text-gray-600">
                        {{ subject.users ? `${subject.users.first_name} ${subject.users.last_name}` : 'Unknown' }}
                      </span>
                    </p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <!-- Edit -->
                    <button
                      @click="openSubjectEdit(subject)"
                      :disabled="!!actioningId"
                      class="p-1.5 text-gray-400 hover:text-[#0057BD] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <!-- Delete -->
                    <button
                      @click="adminDeleteSubject(subject.id, subject.name)"
                      :disabled="actioningId === subject.id"
                      class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"/>
                      </svg>
                    </button>
                    <div class="w-px h-5 bg-gray-200" />
                    <!-- Approve -->
                    <button
                      @click="approveSubject(subject.id)"
                      :disabled="actioningId === subject.id"
                      class="px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >Approve</button>
                    <!-- Reject -->
                    <button
                      @click="rejectSubject(subject.id)"
                      :disabled="actioningId === subject.id"
                      class="px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                    >Reject</button>
                  </div>
                </div>

                <!-- Inline edit form -->
                <div v-if="editingSubjectId === subject.id" class="px-6 pb-4 bg-blue-50/40 border-t border-blue-100">
                  <div class="flex items-end gap-3 pt-3 flex-wrap">
                    <div class="flex flex-col gap-1 flex-1 min-w-40">
                      <label class="text-xs font-medium text-gray-500">Name</label>
                      <input v-model="editSubjectName" class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057BD] bg-white" />
                    </div>
                    <div class="flex flex-col gap-1 w-36">
                      <label class="text-xs font-medium text-gray-500">Semester</label>
                      <select v-model="editSubjectSemester" class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="saveSubjectEdit(subject)"
                        :disabled="savingSubjectId === subject.id"
                        class="px-4 py-2 text-sm font-semibold bg-[#0057BD] hover:bg-[#0948A0] text-white rounded-xl transition-colors disabled:opacity-50"
                      >{{ savingSubjectId === subject.id ? 'Saving…' : 'Save' }}</button>
                      <button @click="closeSubjectEdit" class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Pending Documents ─────────────────────────────────────────── -->
            <div v-if="pendingDocs.length > 0" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <h2 class="font-semibold text-gray-900">Pending Documents</h2>
                <span class="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{{ pendingDocs.length }}</span>
              </div>

              <div
                v-for="(doc, i) in pendingDocs"
                :key="doc.id"
                :class="['flex items-center gap-4 px-6 py-4', i !== pendingDocs.length - 1 ? 'border-b border-gray-100' : '']"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                  <p class="text-xs text-gray-400">
                    <span :class="`font-medium px-1.5 py-0.5 rounded-full mr-1 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
                      {{ doc.doc_type?.replace('_', ' ') }}
                    </span>
                    {{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }} &bull;
                    {{ doc.users?.first_name }} {{ doc.users?.last_name }} &bull;
                    {{ formatDate(doc.uploaded_at) }}
                  </p>
                </div>

                <a
                  v-if="doc.file_url"
                  :href="doc.file_url"
                  target="_blank"
                  class="p-1.5 text-gray-400 hover:text-[#0057BD] transition-colors rounded-lg hover:bg-blue-50 shrink-0"
                  title="Preview file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    @click="approveDoc(doc.id)"
                    :disabled="actioningId === doc.id"
                    class="px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    @click="rejectDoc(doc.id)"
                    :disabled="actioningId === doc.id"
                    class="px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </template>
        </template>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- SUBJECTS TAB                                                           -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'subjects'">
        <!-- Toolbar -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <p class="text-sm text-gray-500">
            <span class="font-semibold text-gray-900">{{ allSubjects.length }}</span> subjects
          </p>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input v-model="subjectSearch" type="text" placeholder="Search subjects..." class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
          </div>
        </div>

        <div v-if="subjectsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

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

          <div v-if="allSubjects.length === 0" class="text-center py-12 text-gray-400 text-sm">No subjects found.</div>

          <div
            v-for="(subject, i) in allSubjects"
            :key="subject.id"
            :class="['transition-colors', i !== allSubjects.length - 1 ? 'border-b border-gray-100' : '']"
          >
            <!-- Row -->
            <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50">
              <div class="col-span-4 flex items-center gap-3 min-w-0">
                <img v-if="subject.subject_url" :src="subject.subject_url" class="h-9 w-9 rounded-xl object-cover shrink-0" />
                <div v-else class="h-9 w-9 rounded-xl bg-gray-100 shrink-0" />
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ subject.name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ subject.users ? `${subject.users.first_name} ${subject.users.last_name}` : '—' }}</p>
                </div>
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
                  @click="openAdminSubjectEdit(subject)"
                  class="p-1.5 text-gray-400 hover:text-[#0057BD] hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button
                  @click="deleteAdminSubject(subject.id, subject.name)"
                  :disabled="deletingAdminSubjectId === subject.id"
                  class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <svg v-if="deletingAdminSubjectId === subject.id" class="animate-spin h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <div v-if="editingAdminSubjectId === subject.id" class="px-6 pb-4 bg-blue-50/40 border-t border-blue-100">
              <div class="flex items-end gap-3 pt-3 flex-wrap">
                <div class="flex flex-col gap-1 flex-1 min-w-40">
                  <label class="text-xs font-medium text-gray-500">Name</label>
                  <input v-model="editAdminName" class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057BD] bg-white" />
                </div>
                <div class="flex flex-col gap-1 w-36">
                  <label class="text-xs font-medium text-gray-500">Semester</label>
                  <select v-model="editAdminSemester" class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="saveAdminSubjectEdit(subject)"
                    :disabled="savingAdminSubjectId === subject.id"
                    class="px-4 py-2 text-sm font-semibold bg-[#0057BD] hover:bg-[#0948A0] text-white rounded-xl transition-colors disabled:opacity-50"
                  >{{ savingAdminSubjectId === subject.id ? 'Saving…' : 'Save' }}</button>
                  <button @click="closeAdminSubjectEdit" class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- USERS TAB                                                              -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'users'">
        <!-- Toolbar -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <p class="text-sm text-gray-500">
            <span class="font-semibold text-gray-900">{{ users.length }}</span> users
          </p>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="userSearch"
              type="text"
              placeholder="Search by name or email..."
              class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div v-if="usersLoading" class="flex justify-center py-24">
          <LoadingSpinner />
        </div>

        <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <!-- Header -->
          <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
            <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</p>
            <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Major</p>
            <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Joined</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Role</p>
          </div>

          <div v-if="users.length === 0" class="text-center py-12 text-gray-400 text-sm">
            No users found.
          </div>

          <div
            v-for="(user, i) in users"
            :key="user.id"
            :class="['grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors', i !== users.length - 1 ? 'border-b border-gray-100' : '']"
          >
            <!-- Name -->
            <div class="col-span-4 flex items-center gap-3 min-w-0">
              <div class="h-8 w-8 rounded-full bg-[#E8EEF8] flex items-center justify-center text-[#0057BD] text-xs font-bold shrink-0">
                {{ user.first_name?.[0]?.toUpperCase() }}{{ user.last_name?.[0]?.toUpperCase() }}
              </div>
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ user.first_name }} {{ user.last_name }}
                <span v-if="user.id === auth.user?.id" class="ml-1 text-xs text-gray-400">(you)</span>
              </p>
            </div>

            <!-- Email -->
            <p class="col-span-4 text-sm text-gray-500 truncate">{{ user.email }}</p>

            <!-- Major -->
            <p class="col-span-1 text-xs text-gray-500">{{ user.majors?.acronym ?? '—' }}</p>

            <!-- Joined -->
            <p class="col-span-2 text-xs text-gray-400">{{ formatDate(user.created_at) }}</p>

            <!-- Role badge (read-only) -->
            <div class="col-span-1 flex justify-end">
              <span
                :class="[
                  'text-xs font-semibold px-2.5 py-1 rounded-full',
                  user.role === 'admin'
                    ? 'bg-[#0057BD] text-white'
                    : 'bg-gray-100 text-gray-600',
                ]"
              >
                {{ user.role }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- DOCUMENTS TAB                                                          -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'documents'">
        <!-- Toolbar -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
            <button
              v-for="type in docTypes"
              :key="type.value"
              @click="docTypeFilter = type.value"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                docTypeFilter === type.value
                  ? 'bg-[#0057BD] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              ]"
            >
              {{ type.label }}
            </button>
          </div>

          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="docSearch"
              type="text"
              placeholder="Search documents..."
              class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
        </div>

        <div v-if="docsLoading" class="flex justify-center py-24">
          <LoadingSpinner />
        </div>

        <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <!-- Header -->
          <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
            <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Document</p>
            <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Uploader</p>
            <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Size</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">DL</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</p>
            <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Del</p>
          </div>

          <div v-if="allDocs.length === 0" class="text-center py-12 text-gray-400 text-sm">
            No documents found.
          </div>

          <div
            v-for="(doc, i) in allDocs"
            :key="doc.id"
            :class="['grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors', i !== allDocs.length - 1 ? 'border-b border-gray-100' : '']"
          >
            <!-- Title -->
            <div class="col-span-4 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400 truncate">{{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }}</p>
            </div>

            <!-- Uploader -->
            <p class="col-span-2 text-xs text-gray-500 truncate">
              {{ doc.users?.first_name }} {{ doc.users?.last_name }}
            </p>

            <!-- Type -->
            <div class="col-span-2">
              <span :class="`text-xs font-medium px-2 py-0.5 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
                {{ doc.doc_type?.replace('_', ' ') }}
              </span>
            </div>

            <!-- Size -->
            <p class="col-span-1 text-xs text-gray-500">{{ formatSize(doc.file_size_kb) }}</p>

            <!-- Downloads -->
            <p class="col-span-1 text-xs text-gray-500 text-center">{{ doc.download_count ?? 0 }}</p>

            <!-- Date -->
            <p class="col-span-1 text-xs text-gray-400">{{ formatDate(doc.uploaded_at) }}</p>

            <!-- Delete -->
            <div class="col-span-1 flex justify-end">
              <button
                @click="deleteDocument(doc)"
                :disabled="deletingDocId === doc.id"
                class="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete"
              >
                <svg v-if="deletingDocId === doc.id" class="animate-spin h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>
