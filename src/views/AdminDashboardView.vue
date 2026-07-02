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
    const [s, r] = await Promise.all([api.get('/admin/stats'), api.get('/admin/recent-documents')])
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
const expandedUploadId = ref<string | null>(null)

type DocFile = { file_size_kb?: number; download_count?: number }

function totalSize(docs: DocFile[]) {
  return docs?.reduce((s, d) => s + (d.file_size_kb ?? 0), 0) ?? 0
}
function totalDownloads(docs: DocFile[]) {
  return docs?.reduce((s, d) => s + (d.download_count ?? 0), 0) ?? 0
}
let docSearchTimer: ReturnType<typeof setTimeout>

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Note', value: 'Note' },
  { label: 'TD', value: 'TD' },
  { label: 'Examination paper', value: 'Examination paper' },
  { label: 'TP', value: 'TP' },
  { label: 'Project', value: 'Project' },
  { label: 'Lesson', value: 'Lesson' },
  { label: 'Thesis', value: 'Thesis' },
  { label: 'Other', value: 'Other' },
]

const typeColorMap: Record<string, string> = {
  Note: 'bg-blue-100 text-blue-700',
  TD: 'bg-yellow-100 text-yellow-700',
  'Examination paper': 'bg-red-100 text-red-700',
  TP: 'bg-green-100 text-green-700',
  Project: 'bg-purple-100 text-purple-700',
  Lesson: 'bg-orange-100 text-orange-700',
  Thesis: 'bg-teal-100 text-teal-700',
  Other: 'bg-gray-100 text-gray-700',
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

// Deduplicate by group_id — one row per upload batch
type DocGroup = {
  id: string
  group_id: string
  title: string
  doc_type: string
  file_url: string | null
  uploaded_at: string
  fileCount: number
  users: { id: string; first_name: string; last_name: string } | null
  majors: { id: string; acronym: string } | null
  subjects: { id: string; name: string } | null
}
const pendingDocGroups = computed<DocGroup[]>(() => {
  const groups = new Map<string, DocGroup>()
  for (const doc of pendingDocs.value) {
    if (!groups.has(doc.group_id)) {
      groups.set(doc.group_id, { ...doc, fileCount: 0 })
    }
    groups.get(doc.group_id)!.fileCount++
  }
  return Array.from(groups.values())
})

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

const pendingCount = computed(() => pendingSubjects.value.length + pendingDocGroups.value.length)

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
  openRejectModal(id, 'subject')
}

async function approveDoc(groupId: string) {
  actioningId.value = groupId
  try {
    await api.patch(`/admin/documents/group/${groupId}/approve`)
    pendingDocs.value = pendingDocs.value.filter((d) => d.group_id !== groupId)
  } finally {
    actioningId.value = null
  }
}

async function rejectDoc(groupId: string) {
  openRejectModal(groupId, 'document')
}

// ── Reject modal ──────────────────────────────────────────────────────────────
const rejectModal = ref<{ id: string; type: 'subject' | 'document' } | null>(null)
const rejectReason = ref('')
const rejecting = ref(false)

function openRejectModal(id: string, type: 'subject' | 'document') {
  rejectModal.value = { id, type }
  rejectReason.value = ''
}

function closeRejectModal() {
  rejectModal.value = null
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejectModal.value) return
  const { id, type } = rejectModal.value
  rejecting.value = true
  try {
    const payload = rejectReason.value.trim() ? { reason: rejectReason.value.trim() } : {}
    if (type === 'subject') {
      await api.patch(`/admin/subjects/${id}/reject`, payload)
      pendingSubjects.value = pendingSubjects.value.filter((s) => s.id !== id)
    } else {
      await api.patch(`/admin/documents/group/${id}/reject`, payload)
      pendingDocs.value = pendingDocs.value.filter((d) => d.group_id !== id)
    }
    closeRejectModal()
  } finally {
    rejecting.value = false
  }
}

// ── All Subjects (admin manage) ───────────────────────────────────────────────
interface AdminSubject {
  id: string
  name: string
  slug: string
  year_level: number
  semester: string | number
  subject_url: string | null
  status: string
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

async function saveAdminSubjectEdit(subject: {
  id: string
  name: string
  semester?: string | number
}) {
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
  if (tab === 'approvals' && pendingSubjects.value.length === 0 && pendingDocs.value.length === 0)
    loadApprovals()
  if (tab === 'users' && users.value.length === 0) loadUsers()
  if (tab === 'subjects' && allSubjects.value.length === 0) loadAllSubjects()
  if (tab === 'documents' && allDocs.value.length === 0) loadDocuments()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const currentDateStr = new Date().toLocaleDateString('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

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
  <div class="flex min-h-screen bg-[#F5F6FA]">
    <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
    <aside class="fixed inset-y-0 left-0 w-56 bg-white shadow-sm flex flex-col z-30">
      <!-- Logo -->
      <div class="px-5 h-16 flex items-center border-b border-gray-100">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-[#008CB9] flex items-center justify-center">
            <span class="text-white text-base font-extrabold">I</span>
          </div>
          <div>
            <p class="text-sm font-extrabold text-gray-900 leading-tight">ITC Sharing</p>
            <p class="text-[11px] text-gray-400 leading-tight">Admin Panel</p>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
        <button
          v-for="item in [
            { tab: 'overview', label: 'Dashboard', icon: 'dashboard' },
            { tab: 'approvals', label: 'Approvals', icon: 'check' },
            { tab: 'subjects', label: 'Subjects', icon: 'book' },
            { tab: 'users', label: 'Users', icon: 'users' },
            { tab: 'documents', label: 'Documents', icon: 'document' },
          ] as const"
          :key="item.tab"
          @click="activeTab = item.tab"
          :class="[
            'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
            activeTab === item.tab
              ? 'bg-[#008CB9] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
          ]"
        >
          <!-- Dashboard -->
          <svg
            v-if="item.icon === 'dashboard'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <!-- Check -->
          <svg
            v-else-if="item.icon === 'check'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <!-- Book -->
          <svg
            v-else-if="item.icon === 'book'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <!-- Users -->
          <svg
            v-else-if="item.icon === 'users'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <!-- Document -->
          <svg
            v-else-if="item.icon === 'document'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          <span class="flex-1">{{ item.label }}</span>

          <!-- Pending badge -->
          <span
            v-if="item.tab === 'approvals' && pendingCount > 0"
            :class="[
              'h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
              activeTab === 'approvals' ? 'bg-white/30 text-white' : 'bg-red-500 text-white',
            ]"
            >{{ pendingCount }}</span
          >

          <!-- Active chevron -->
          <svg
            v-if="activeTab === item.tab"
            class="h-4 w-4 shrink-0 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </nav>

      <!-- Bottom user info -->
      <div class="px-4 py-4 border-t border-gray-100">
        <div class="flex items-center gap-2.5">
          <div
            class="h-8 w-8 rounded-full bg-[#E8EEF8] flex items-center justify-center text-[#0057BD] text-xs font-bold shrink-0"
          >
            {{ auth.user?.email?.[0]?.toUpperCase() ?? 'A' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-900 truncate">
              {{ auth.user?.email ?? 'Admin' }}
            </p>
            <p class="text-[11px] text-gray-400">Administrator</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- ── Main area ───────────────────────────────────────────────────────── -->
    <div class="ml-56 flex-1 flex flex-col min-h-screen">
      <!-- Top header -->
      <header
        class="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 h-16 flex items-center gap-4"
      >
        <h1 class="text-xl font-bold text-gray-900 capitalize flex-1">
          {{ activeTab === 'overview' ? 'Overview' : activeTab }}
        </h1>

        <div class="flex items-center gap-3">
          <!-- Date chip -->
          <div
            class="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {{ currentDateStr }}
          </div>
          <!-- Bell -->
          <button
            class="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            @click="activeTab = 'approvals'"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span
              v-if="pendingCount > 0"
              class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"
            />
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 px-6 py-6 flex flex-col gap-6">
        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- OVERVIEW TAB                                                     -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-if="activeTab === 'overview'">
          <div v-if="statsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <template v-else>
            <!-- Stat cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Total Users -->
              <div
                class="bg-white rounded-2xl border border-gray-100 px-5 py-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Users</p>
                  <p class="text-xs text-gray-300 mt-0.5">Registered</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">
                    {{ stats.totalUsers.toLocaleString() }}
                  </p>
                </div>
                <div
                  class="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-6 h-6 fill-[#008CB9]">
                    <path
                      d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z"
                    />
                  </svg>
                </div>
              </div>
              <!-- Total Documents -->
              <div
                class="bg-white rounded-2xl border border-gray-100 px-5 py-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Documents</p>
                  <p class="text-xs text-gray-300 mt-0.5">Approved &amp; active</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">
                    {{ stats.totalDocuments.toLocaleString() }}
                  </p>
                </div>
                <div
                  class="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0"
                >
                  <svg
                    class="h-6 w-6 text-teal-500"
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
              </div>
              <!-- Total Downloads -->
              <div
                class="bg-white rounded-2xl border border-gray-100 px-5 py-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Downloads</p>
                  <p class="text-xs text-gray-300 mt-0.5">All time</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">
                    {{ stats.totalDownloads.toLocaleString() }}
                  </p>
                </div>
                <div
                  class="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0"
                >
                  <svg
                    class="h-6 w-6 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </div>
              </div>
              <!-- Total Views -->
              <div
                class="bg-white rounded-2xl border border-gray-100 px-5 py-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Views</p>
                  <p class="text-xs text-gray-300 mt-0.5">All time</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">
                    {{ stats.totalViews.toLocaleString() }}
                  </p>
                </div>
                <div
                  class="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0"
                >
                  <svg
                    class="h-6 w-6 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Two-col layout: Recent Uploads + Pending Review -->
            <div class="grid grid-cols-3 gap-5">
              <!-- Recent Uploads (2/3) -->
              <div class="col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 class="font-semibold text-gray-900">Recent Uploads</h2>
                  <button
                    @click="activeTab = 'documents'"
                    class="text-xs text-[#008CB9] font-medium hover:underline"
                  >
                    View all →
                  </button>
                </div>

                <div v-if="recentDocs.length === 0" class="text-center py-12 text-gray-400 text-sm">
                  No documents yet.
                </div>

                <div
                  v-for="(doc, i) in recentDocs"
                  :key="doc.id"
                  :class="[
                    'grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors',
                    i !== recentDocs.length - 1 ? 'border-b border-gray-50' : '',
                  ]"
                >
                  <div class="col-span-5 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                    <p class="text-xs text-gray-400 truncate">
                      {{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }}
                    </p>
                  </div>
                  <div class="col-span-2">
                    <span
                      :class="`text-xs font-medium px-2 py-0.5 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
                    >
                      {{ doc.doc_type }}
                    </span>
                  </div>
                  <p class="col-span-3 text-xs text-gray-500 truncate">
                    {{ doc.users?.first_name }} {{ doc.users?.last_name }}
                  </p>
                  <p class="col-span-1 text-xs text-gray-400">{{ formatDate(doc.uploaded_at) }}</p>
                  <div class="col-span-1 flex items-center justify-end gap-1 text-xs text-gray-400">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {{ doc.download_count ?? 0 }}
                  </div>
                </div>
              </div>

              <!-- Pending Review (1/3) -->
              <div
                class="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden"
              >
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 class="font-semibold text-gray-900">Pending Review</h2>
                  <button
                    @click="activeTab = 'approvals'"
                    class="text-xs text-[#008CB9] font-medium hover:underline"
                  >
                    Review →
                  </button>
                </div>
                <div class="px-6 py-5 flex flex-col gap-4 flex-1">
                  <!-- Pending docs -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0"
                      >
                        <svg
                          class="h-5 w-5 text-yellow-500"
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
                      <div>
                        <p class="text-sm font-medium text-gray-900">Documents</p>
                        <p class="text-xs text-gray-400">Awaiting approval</p>
                      </div>
                    </div>
                    <span class="text-xl font-bold text-gray-900">{{
                      pendingDocGroups.length
                    }}</span>
                  </div>
                  <div class="h-px bg-gray-100" />
                  <!-- Pending subjects -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"
                      >
                        <svg
                          class="h-5 w-5 text-orange-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900">Subjects</p>
                        <p class="text-xs text-gray-400">Awaiting approval</p>
                      </div>
                    </div>
                    <span class="text-xl font-bold text-gray-900">{{
                      pendingSubjects.length
                    }}</span>
                  </div>
                  <div class="h-px bg-gray-100" />
                  <!-- Total -->
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-gray-700">Total Pending</p>
                    <span
                      :class="[
                        'text-xl font-bold',
                        pendingCount > 0 ? 'text-red-500' : 'text-green-500',
                      ]"
                      >{{ pendingCount }}</span
                    >
                  </div>

                  <button
                    v-if="pendingCount > 0"
                    @click="activeTab = 'approvals'"
                    class="mt-auto w-full py-2.5 bg-[#2DC8A4] hover:bg-[#26B394] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Review Now
                  </button>
                  <div
                    v-else
                    class="mt-auto flex items-center gap-2 text-sm text-green-600 font-medium"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    All caught up!
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- APPROVALS TAB                                                    -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-else-if="activeTab === 'approvals'">
          <div v-if="approvalsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <template v-else>
            <div
              v-if="pendingSubjects.length === 0 && pendingDocs.length === 0"
              class="flex flex-col items-center justify-center py-24 gap-3 text-center"
            >
              <div class="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <svg
                  class="h-8 w-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p class="font-medium text-gray-700">All caught up!</p>
              <p class="text-sm text-gray-400">No pending approvals.</p>
            </div>

            <template v-else>
              <!-- Pending Subjects -->
              <div
                v-if="pendingSubjects.length > 0"
                class="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <h2 class="font-semibold text-gray-900">Pending Subjects</h2>
                  <span
                    class="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full"
                    >{{ pendingSubjects.length }}</span
                  >
                </div>

                <div
                  v-for="(subject, i) in pendingSubjects"
                  :key="subject.id"
                  :class="[
                    'transition-colors',
                    i !== pendingSubjects.length - 1 ? 'border-b border-gray-100' : '',
                  ]"
                >
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
                        {{ subject.majors?.acronym }} &bull; Year {{ subject.year_level }} &bull;
                        Semester {{ subject.semester }}
                      </p>
                      <p class="text-xs text-gray-400 mt-0.5">
                        Submitted by
                        <span class="font-medium text-gray-600">{{
                          subject.users
                            ? `${subject.users.first_name} ${subject.users.last_name}`
                            : 'Unknown'
                        }}</span>
                      </p>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <button
                        @click="openSubjectEdit(subject)"
                        :disabled="!!actioningId"
                        class="p-1.5 text-gray-400 hover:text-[#0057BD] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Edit"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        @click="adminDeleteSubject(subject.id, subject.name)"
                        :disabled="actioningId === subject.id"
                        class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"
                          />
                        </svg>
                      </button>
                      <div class="w-px h-5 bg-gray-200" />
                      <button
                        @click="approveSubject(subject.id)"
                        :disabled="actioningId === subject.id"
                        class="px-3 py-1.5 text-xs font-semibold bg-[#2DC8A4] hover:bg-[#26B394] text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        @click="rejectSubject(subject.id)"
                        :disabled="actioningId === subject.id"
                        class="px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <!-- Inline edit -->
                  <div
                    v-if="editingSubjectId === subject.id"
                    class="px-6 pb-4 bg-blue-50/40 border-t border-blue-100"
                  >
                    <div class="flex items-end gap-3 pt-3 flex-wrap">
                      <div class="flex flex-col gap-1 flex-1 min-w-40">
                        <label class="text-xs font-medium text-gray-500">Name</label>
                        <input
                          v-model="editSubjectName"
                          class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057BD] bg-white"
                        />
                      </div>
                      <div class="flex flex-col gap-1 w-36">
                        <label class="text-xs font-medium text-gray-500">Semester</label>
                        <select
                          v-model="editSubjectSemester"
                          class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
                        >
                          <option value="1">Semester 1</option>
                          <option value="2">Semester 2</option>
                        </select>
                      </div>
                      <div class="flex gap-2">
                        <button
                          @click="saveSubjectEdit(subject)"
                          :disabled="savingSubjectId === subject.id"
                          class="px-4 py-2 text-sm font-semibold bg-[#0057BD] hover:bg-[#0948A0] text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                          {{ savingSubjectId === subject.id ? 'Saving…' : 'Save' }}
                        </button>
                        <button
                          @click="closeSubjectEdit"
                          class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pending Documents -->
              <div
                v-if="pendingDocGroups.length > 0"
                class="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <h2 class="font-semibold text-gray-900">Pending Documents</h2>
                  <span
                    class="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full"
                    >{{ pendingDocGroups.length }}</span
                  >
                </div>

                <div
                  v-for="(doc, i) in pendingDocGroups"
                  :key="doc.group_id"
                  :class="[
                    'flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors',
                    i !== pendingDocGroups.length - 1 ? 'border-b border-gray-100' : '',
                  ]"
                  @click="router.push({ name: 'admin-review', params: { groupId: doc.group_id } })"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                      <span
                        v-if="doc.fileCount > 1"
                        class="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                        >{{ doc.fileCount }} files</span
                      >
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5">
                      <span
                        :class="`font-medium px-1.5 py-0.5 rounded-full mr-1 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
                        >{{ doc.doc_type }}</span
                      >
                      {{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }} &bull;
                      {{ doc.users?.first_name }} {{ doc.users?.last_name }} &bull;
                      {{ formatDate(doc.uploaded_at) }}
                    </p>
                  </div>
                  <svg
                    class="h-4 w-4 text-gray-300 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <div class="flex items-center gap-2 shrink-0" @click.stop>
                    <button
                      @click="approveDoc(doc.group_id)"
                      :disabled="actioningId === doc.group_id"
                      class="px-3 py-1.5 text-xs font-semibold bg-[#2DC8A4] hover:bg-[#26B394] text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      @click="rejectDoc(doc.group_id)"
                      :disabled="actioningId === doc.group_id"
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

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- SUBJECTS TAB                                                     -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-else-if="activeTab === 'subjects'">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <p class="text-sm text-gray-500">
              <span class="font-semibold text-gray-900">{{ allSubjects.length }}</span> subjects
            </p>
            <div class="relative">
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
                v-model="subjectSearch"
                type="text"
                placeholder="Search subjects..."
                class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2DC8A4] w-56"
              />
            </div>
          </div>

          <div v-if="subjectsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
              <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Subject
              </p>
              <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Major
              </p>
              <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Year
              </p>
              <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Sem
              </p>
              <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Status
              </p>
              <p
                class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right"
              >
                Actions
              </p>
            </div>

            <div v-if="allSubjects.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No subjects found.
            </div>

            <div
              v-for="(subject, i) in allSubjects"
              :key="subject.id"
              :class="[
                'transition-colors',
                i !== allSubjects.length - 1 ? 'border-b border-gray-100' : '',
              ]"
            >
              <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50">
                <div class="col-span-4 flex items-center gap-3 min-w-0">
                  <img
                    v-if="subject.subject_url"
                    :src="subject.subject_url"
                    class="h-9 w-9 rounded-xl object-cover shrink-0"
                  />
                  <div v-else class="h-9 w-9 rounded-xl bg-gray-100 shrink-0" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ subject.name }}</p>
                    <p class="text-xs text-gray-400 truncate">
                      {{
                        subject.users
                          ? `${subject.users.first_name} ${subject.users.last_name}`
                          : '—'
                      }}
                    </p>
                  </div>
                </div>
                <p class="col-span-2 text-sm text-gray-500">{{ subject.majors?.acronym ?? '—' }}</p>
                <p class="col-span-1 text-sm text-gray-500">I{{ subject.year_level }}</p>
                <p class="col-span-1 text-sm text-gray-500">{{ subject.semester ?? '—' }}</p>
                <div class="col-span-2">
                  <span
                    :class="`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[subject.status] ?? 'bg-gray-100 text-gray-500'}`"
                    >{{ subject.status }}</span
                  >
                </div>
                <div class="col-span-2 flex items-center justify-end gap-2">
                  <button
                    @click="openAdminSubjectEdit(subject)"
                    class="p-1.5 text-gray-400 hover:text-[#0057BD] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="deleteAdminSubject(subject.id, subject.name)"
                    :disabled="deletingAdminSubjectId === subject.id"
                    class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <svg
                      v-if="deletingAdminSubjectId === subject.id"
                      class="animate-spin h-4 w-4 text-red-400"
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

              <!-- Inline edit -->
              <div
                v-if="editingAdminSubjectId === subject.id"
                class="px-6 pb-4 bg-blue-50/40 border-t border-blue-100"
              >
                <div class="flex items-end gap-3 pt-3 flex-wrap">
                  <div class="flex flex-col gap-1 flex-1 min-w-40">
                    <label class="text-xs font-medium text-gray-500">Name</label>
                    <input
                      v-model="editAdminName"
                      class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057BD] bg-white"
                    />
                  </div>
                  <div class="flex flex-col gap-1 w-36">
                    <label class="text-xs font-medium text-gray-500">Semester</label>
                    <select
                      v-model="editAdminSemester"
                      class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                    </select>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="saveAdminSubjectEdit(subject)"
                      :disabled="savingAdminSubjectId === subject.id"
                      class="px-4 py-2 text-sm font-semibold bg-[#0057BD] hover:bg-[#0948A0] text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                      {{ savingAdminSubjectId === subject.id ? 'Saving…' : 'Save' }}
                    </button>
                    <button
                      @click="closeAdminSubjectEdit"
                      class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- USERS TAB                                                        -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-else-if="activeTab === 'users'">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <p class="text-sm text-gray-500">
              <span class="font-semibold text-gray-900">{{ users.length }}</span> users
            </p>
            <div class="relative">
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
                v-model="userSearch"
                type="text"
                placeholder="Search by name or email..."
                class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#008CB9] w-64"
              />
            </div>
          </div>

          <div v-if="usersLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
              <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Name
              </p>
              <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Email
              </p>
              <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Major
              </p>
              <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Joined
              </p>
              <p
                class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right"
              >
                Role
              </p>
            </div>

            <div v-if="users.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No users found.
            </div>

            <div
              v-for="(user, i) in users"
              :key="user.id"
              :class="[
                'grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors',
                i !== users.length - 1 ? 'border-b border-gray-100' : '',
              ]"
            >
              <div class="col-span-4 flex items-center gap-3 min-w-0">
                <div
                  class="h-8 w-8 rounded-full bg-[#E8EEF8] flex items-center justify-center text-[#008CB9] text-xs font-bold shrink-0"
                >
                  {{ user.first_name?.[0]?.toUpperCase() }}{{ user.last_name?.[0]?.toUpperCase() }}
                </div>
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ user.first_name }} {{ user.last_name }}
                  <span v-if="user.id === auth.user?.id" class="ml-1 text-xs text-gray-400"
                    >(you)</span
                  >
                </p>
              </div>
              <p class="col-span-4 text-sm text-gray-500 truncate">{{ user.email }}</p>
              <p class="col-span-1 text-xs text-gray-500">{{ user.majors?.acronym ?? '—' }}</p>
              <p class="col-span-2 text-xs text-gray-400">{{ formatDate(user.created_at) }}</p>
              <div class="col-span-1 flex justify-end">
                <span
                  :class="[
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    user.role === 'admin' ? 'bg-[#008CB9] text-white' : 'bg-gray-100 text-gray-600',
                  ]"
                >
                  {{ user.role }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- DOCUMENTS TAB                                                    -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-else-if="activeTab === 'documents'">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
              <button
                v-for="type in docTypes"
                :key="type.value"
                @click="docTypeFilter = type.value"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  docTypeFilter === type.value
                    ? 'bg-[#008CB9] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                ]"
              >
                {{ type.label }}
              </button>
            </div>
            <div class="relative">
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
                v-model="docSearch"
                type="text"
                placeholder="Search documents..."
                class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#008CB9] w-56"
              />
            </div>
          </div>

          <div v-if="docsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <div v-else class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
              <p class="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Document
              </p>
              <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Uploader
              </p>
              <p class="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Type
              </p>
              <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Size
              </p>
              <p
                class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center"
              >
                DL
              </p>
              <p class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Date
              </p>
              <p
                class="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right"
              >
                Del
              </p>
            </div>

            <div v-if="allDocs.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No documents found.
            </div>

            <div
              v-for="(doc, i) in allDocs"
              :key="doc.id"
              :class="i !== allDocs.length - 1 ? 'border-b border-gray-100' : ''"
            >
              <!-- ── Upload row (click to expand) ── -->
              <div
                class="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                @click="expandedUploadId = expandedUploadId === doc.id ? null : doc.id"
              >
                <div class="col-span-4 min-w-0 flex items-center gap-2">
                  <svg
                    class="h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform duration-200"
                    :class="expandedUploadId === doc.id ? 'rotate-90' : ''"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                      <span
                        v-if="doc.documents?.length > 1"
                        class="shrink-0 text-[10px] font-bold bg-blue-100 text-[#008CB9] px-1.5 py-0.5 rounded-full"
                      >{{ doc.documents.length }} files</span>
                    </div>
                    <p class="text-xs text-gray-400 truncate">
                      {{ doc.subjects?.name ?? '—' }} &bull; {{ doc.majors?.acronym }}
                    </p>
                  </div>
                </div>
                <p class="col-span-2 text-xs text-gray-500 truncate">
                  {{ doc.users?.first_name }} {{ doc.users?.last_name }}
                </p>
                <div class="col-span-2">
                  <span :class="`text-xs font-medium px-2 py-0.5 rounded-full ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
                    {{ doc.doc_type }}
                  </span>
                </div>
                <p class="col-span-1 text-xs text-gray-500">{{ formatSize(totalSize(doc.documents)) }}</p>
                <p class="col-span-1 text-xs text-gray-500 text-center">{{ totalDownloads(doc.documents) }}</p>
                <p class="col-span-1 text-xs text-gray-400">{{ formatDate(doc.uploaded_at) }}</p>
                <div class="col-span-1 flex justify-end" @click.stop>
                  <button
                    @click="deleteDocument(doc)"
                    :disabled="deletingDocId === doc.id"
                    class="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Delete upload"
                  >
                    <svg v-if="deletingDocId === doc.id" class="animate-spin h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- ── Expanded file list ── -->
              <div v-if="expandedUploadId === doc.id" class="bg-gray-50/70 border-t border-gray-100 px-8 py-3">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Files in this upload</p>
                <div
                  v-for="file in doc.documents"
                  :key="file.id"
                  class="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
                >
                  <svg class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <p class="text-sm text-gray-700 flex-1 truncate">{{ file.original_name ?? '—' }}</p>
                  <p class="text-xs text-gray-400 shrink-0">{{ formatSize(file.file_size_kb) }}</p>
                  <div class="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    {{ file.download_count ?? 0 }}
                  </div>
                  <a
                    :href="file.file_url"
                    target="_blank"
                    class="shrink-0 text-xs font-medium text-[#2DC8A4] hover:underline"
                    @click.stop
                  >View</a>
                </div>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>

  <!-- Reject modal -->
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="rejectModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      @click.self="closeRejectModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">
            Reject {{ rejectModal.type === 'subject' ? 'Subject' : 'Document' }}
          </h3>
          <button
            @click="closeRejectModal"
            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-700"
            >Reason <span class="text-gray-400 font-normal">(optional)</span></label
          >
          <textarea
            v-model="rejectReason"
            rows="3"
            placeholder="e.g. Duplicate content, missing information, inappropriate..."
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
          <p class="text-xs text-gray-400">
            The uploader will see this reason in their dashboard and notification.
          </p>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            @click="closeRejectModal"
            class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmReject"
            :disabled="rejecting"
            class="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {{ rejecting ? 'Rejecting…' : 'Confirm Reject' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
