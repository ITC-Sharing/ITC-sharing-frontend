<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue'
import RingSpinner from '@/components/common/RingSpinner.vue'
import { formatRelativeDate } from '@/utils/format'
import FilePreviewThumb from '@/components/common/FilePreviewThumb.vue'
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal.vue'
import type { UploadFile } from '@/types'
import FolderIcon from '@/components/common/FolderIcon.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageSizeSelect from '@/components/common/PageSizeSelect.vue'
import SearchDashboard from '@/components/dashboard/SearchDashboard.vue'
import FilterDashboard from '@/components/dashboard/FilterDashboard.vue'
import UploadsBarChart from '@/components/dashboard/UploadsBarChart.vue'
import CreateMajorModal from '@/components/dashboard/CreateMajorModal.vue'
import EditSubjectModal from '@/components/dashboard/EditSubjectModal.vue'
import api from '@/lib/axios'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()

async function handleLogout() {
  await auth.logout()
  await router.push('/')
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'approvals' | 'departments' | 'subjects' | 'users' | 'documents'
const activeTab = ref<Tab>('overview')

// Approvals splits into two queues; the sidebar can drill into either one.
type ApprovalSection = 'subjects' | 'documents'
const approvalsSection = ref<ApprovalSection>('subjects')
const approvalsOpen = ref(false)

function openApprovals(section: ApprovalSection) {
  activeTab.value = 'approvals'
  approvalsSection.value = section
  approvalsOpen.value = true
}

function toggleApprovals() {
  if (activeTab.value === 'approvals' && approvalsOpen.value) {
    approvalsOpen.value = false
    return
  }
  openApprovals('subjects')
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = ref({
  totalUsers: 0,
  totalDocuments: 0,
  totalSubjects: 0,
  totalBooks: 0,
  uploadsByMonth: [] as { month: string; count: number }[],
})
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
const userPage = ref(1)
const userPageSize = ref(10)
const pagedUsers = computed(() =>
  users.value.slice((userPage.value - 1) * userPageSize.value, userPage.value * userPageSize.value),
)

// A refetch (the search) or a resize can leave the page past the end.
watch([users, userPageSize], () => {
  userPage.value = 1
})
let userSearchTimer: ReturnType<typeof setTimeout>

watch(userSearch, () => {
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(loadUsers, 300)
})

// ── User administration ─────────────────────────────────────────────────────
// Promote/demote changes the role column; moderating a department is a separate
// assignment, so someone can review GIC without being an admin.
const majors = ref<{ id: string; acronym: string; name: string; image_url: string | null }[]>([])
const busyUserId = ref<string | null>(null)
const moderatorMenuFor = ref<string | null>(null)
const banTarget = ref<{ id: string; name: string } | null>(null)

async function loadMajors() {
  const { data } = await api.get('/majors')
  majors.value = data
}

// ── Departments ─────────────────────────────────────────────────────────────
const showCreateMajor = ref(false)
// Departments nobody reviews yet. Admins can still approve their submissions,
// so this is a prompt to assign someone, not an error.
const majorsWithoutModerator = ref<{ id: string; acronym: string; name: string }[]>([])

async function loadDepartments() {
  await Promise.all([
    loadMajors(),
    api
      .get('/admin/majors/without-moderator')
      .then(({ data }) => (majorsWithoutModerator.value = data)),
  ])
}

type MajorRow = { id: string; name: string; acronym: string; image_url: string | null }
const editingMajor = ref<MajorRow | null>(null)
const deletingMajor = ref<MajorRow | null>(null)
const deletingMajorId = ref<string | null>(null)

function onMajorCreated() {
  const wasEditing = !!editingMajor.value
  showCreateMajor.value = false
  editingMajor.value = null
  showToast(wasEditing ? 'Department updated' : 'Department created')
  void loadDepartments()
}

function closeMajorModal() {
  showCreateMajor.value = false
  editingMajor.value = null
}

function onMajorAction(key: string, major: MajorRow) {
  if (key === 'edit') editingMajor.value = major
  else deletingMajor.value = major
}

async function deleteMajor() {
  const major = deletingMajor.value
  if (!major) return
  deletingMajorId.value = major.id
  try {
    await api.delete(`/majors/${major.id}`)
    deletingMajor.value = null
    showToast(`${major.acronym} deleted`)
    void loadDepartments()
  } catch (e: unknown) {
    // 409 when the department still holds subjects, documents or books — the
    // API says exactly what is in the way, so surface it verbatim.
    const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(message ?? 'Failed to delete department')
    deletingMajor.value = null
  } finally {
    deletingMajorId.value = null
  }
}

function needsModerator(majorId: string) {
  return majorsWithoutModerator.value.some((m) => m.id === majorId)
}

async function withBusy(userId: string, fn: () => Promise<unknown>) {
  busyUserId.value = userId
  try {
    await fn()
    await loadUsers()
  } catch (e: unknown) {
    const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(message ?? 'Action failed', { type: 'error' })
  } finally {
    busyUserId.value = null
  }
}

// Only ever used to demote: the UI doesn't create admins.
function setRole(user: { id: string; role: string }) {
  const role = user.role === 'admin' ? 'user' : 'admin'
  void withBusy(user.id, async () => {
    await api.patch(`/admin/users/${user.id}/role`, { role })
    showToast(role === 'admin' ? 'Promoted to admin' : 'Admin access removed')
  })
}

function confirmBan(user: { id: string; first_name: string; last_name: string }) {
  banTarget.value = { id: user.id, name: `${user.first_name} ${user.last_name}`.trim() }
}

function banUser() {
  const target = banTarget.value
  if (!target) return
  void withBusy(target.id, async () => {
    await api.patch(`/admin/users/${target.id}/ban`, {})
    banTarget.value = null
    showToast('User banned')
  })
}

function unbanUser(user: { id: string }) {
  void withBusy(user.id, async () => {
    await api.patch(`/admin/users/${user.id}/unban`)
    showToast('User reinstated')
  })
}

function moderates(user: { moderates?: { id: string }[] }, majorId: string) {
  return (user.moderates ?? []).some((m) => m.id === majorId)
}

function toggleModerator(user: { id: string; moderates?: { id: string }[] }, majorId: string) {
  const assigned = moderates(user, majorId)
  void withBusy(user.id, async () => {
    if (assigned) await api.delete(`/admin/majors/${majorId}/moderators/${user.id}`)
    else await api.post(`/admin/majors/${majorId}/moderators`, { user_id: user.id })
    showToast(assigned ? 'Moderator removed' : 'Moderator assigned')
  })
}

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
const docMajorFilter = ref('')
const docUploaderFilter = ref('')
const docPeriodFilter = ref('all')
const docPage = ref(1)
const docPageSize = ref(10)
const pagedDocs = computed(() =>
  allDocs.value.slice((docPage.value - 1) * docPageSize.value, docPage.value * docPageSize.value),
)

// A refetch (any filter change) or a resize can leave the page past the end.
watch([allDocs, docPageSize], () => {
  docPage.value = 1
})
const deletingDocId = ref<string | null>(null)
const expandedUploads = ref(new Set<string>())

function toggleUpload(id: string) {
  if (expandedUploads.value.has(id)) expandedUploads.value.delete(id)
  else expandedUploads.value.add(id)
}

type DocFile = { file_size_kb?: number }

function totalSize(docs: DocFile[]) {
  return docs?.reduce((s, d) => s + (d.file_size_kb ?? 0), 0) ?? 0
}
let docSearchTimer: ReturnType<typeof setTimeout>

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Note', value: 'Note' },
  { label: 'TD', value: 'TD' },
  { label: 'Exam Preparation', value: 'Exam Preparation' },
  { label: 'TP', value: 'TP' },
  { label: 'Project', value: 'Project' },
  { label: 'Lesson', value: 'Lesson' },
  { label: 'Thesis', value: 'Thesis' },
  { label: 'Other', value: 'Other' },
]

/** `docTypes` carries an "All" entry of its own; the dropdown supplies that. */
const docTypeOptions = computed(() => docTypes.filter((type) => type.value))

watch(docSearch, () => {
  clearTimeout(docSearchTimer)
  docSearchTimer = setTimeout(loadDocuments, 300)
})

watch([docTypeFilter, docMajorFilter, docUploaderFilter, docPeriodFilter], loadDocuments)

const docFiltersActive = computed(
  () =>
    !!(
      docSearch.value ||
      docTypeFilter.value ||
      docMajorFilter.value ||
      docUploaderFilter.value ||
      docPeriodFilter.value !== 'all'
    ),
)

/** Everyone who could have uploaded — the user list, so filtering never
 *  narrows the options it offers. */
const uploaderOptions = computed(() =>
  users.value.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name}`.trim() || user.email,
  })),
)

function clearDocFilters() {
  docSearch.value = ''
  docTypeFilter.value = ''
  docMajorFilter.value = ''
  docUploaderFilter.value = ''
  docPeriodFilter.value = 'all'
}

async function loadDocuments() {
  docsLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (docSearch.value) params.search = docSearch.value
    if (docTypeFilter.value) params.doc_type = docTypeFilter.value
    if (docMajorFilter.value) params.major_id = docMajorFilter.value
    if (docUploaderFilter.value) params.uploader_id = docUploaderFilter.value
    // The period is a cutoff the server compares `uploaded_at` against.
    const cutoff = cutoffFor(docPeriodFilter.value)
    if (cutoff !== null) params.since = new Date(cutoff).toISOString()
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
  /**
   * What approving this row acts on. 'group' is a whole pending upload — the
   * normal case. 'file' is one or more files added to an upload that is ALREADY
   * approved: that upload never re-pends, so only the files are up for review
   * and the group endpoints would find nothing to act on.
   */
  review_scope: 'group' | 'file'
  fileCount: number
  files: UploadFile[]
  users: { id: string; first_name: string; last_name: string } | null
  majors: { id: string; acronym: string } | null
  subjects: { id: string; name: string } | null
}
const expandedGroups = ref(new Set<string>())

function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) expandedGroups.value.delete(groupId)
  else expandedGroups.value.add(groupId)
}

const previewOpen = ref(false)
const previewTarget = ref<UploadFile | null>(null)

function openPreview(file: UploadFile) {
  previewTarget.value = file
  previewOpen.value = true
}

function downloadFile(file: UploadFile) {
  const link = document.createElement('a')
  link.href = file.file_url
  link.download = file.original_name ?? ''
  link.click()
}

function onDocAction(key: string, groupId: string) {
  if (key === 'approve') approveDoc(groupId)
  else rejectDoc(groupId)
}

/** The pending files of a 'file'-scope group — what a per-file action targets. */
function pendingFileIdsOf(groupId: string): string[] {
  return pendingDocs.value
    .filter((d) => d.group_id === groupId && d.file_status === 'pending')
    .map((d) => d.id as string)
}

function reviewScopeOf(groupId: string): 'group' | 'file' {
  return pendingDocs.value.find((d) => d.group_id === groupId)?.review_scope ?? 'group'
}
const pendingDocGroups = computed<DocGroup[]>(() => {
  const groups = new Map<string, DocGroup>()
  for (const doc of pendingDocs.value) {
    if (!groups.has(doc.group_id)) {
      groups.set(doc.group_id, {
        ...doc,
        review_scope: doc.review_scope ?? 'group',
        fileCount: 0,
        files: [],
      })
    }
    const group = groups.get(doc.group_id)!
    group.fileCount++
    group.files.push({
      id: doc.id,
      file_url: doc.file_url,
      preview_url: doc.preview_url ?? null,
      file_size_kb: doc.file_size_kb,
      original_name: doc.original_name ?? null,
      status: doc.file_status ?? 'active',
      rejection_reason: null,
    })
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
    if (reviewScopeOf(groupId) === 'file') {
      // Files added to an upload that is already approved — each is reviewed on
      // its own, so there is no group endpoint that would find anything.
      for (const fileId of pendingFileIdsOf(groupId)) {
        await api.patch(`/admin/documents/files/${fileId}/approve`)
      }
    } else {
      await api.patch(`/admin/documents/group/${groupId}/approve`)
    }
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
    } else if (reviewScopeOf(id) === 'file') {
      for (const fileId of pendingFileIdsOf(id)) {
        await api.patch(`/admin/documents/files/${fileId}/reject`, payload)
      }
      pendingDocs.value = pendingDocs.value.filter((d) => d.group_id !== id)
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
  acronym: string
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
const subjectMajorFilter = ref('')
const subjectStatusFilter = ref('')
const subjectPage = ref(1)
const subjectPageSize = ref(10)
const pagedSubjects = computed(() =>
  allSubjects.value.slice(
    (subjectPage.value - 1) * subjectPageSize.value,
    subjectPage.value * subjectPageSize.value,
  ),
)

// A refetch (any filter change) or a resize can leave the page past the end.
watch([allSubjects, subjectPageSize], () => {
  subjectPage.value = 1
})

const editingAdminSubject = ref<AdminSubject | null>(null)
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

// Dropdowns commit immediately — only free text needs debouncing.
watch([subjectMajorFilter, subjectStatusFilter], loadAllSubjects)

const subjectFiltersActive = computed(
  () => !!(subjectSearch.value || subjectMajorFilter.value || subjectStatusFilter.value),
)

function clearSubjectFilters() {
  subjectSearch.value = ''
  subjectMajorFilter.value = ''
  subjectStatusFilter.value = ''
}

async function loadAllSubjects() {
  subjectsLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (subjectSearch.value) params.search = subjectSearch.value
    if (subjectMajorFilter.value) params.major_id = subjectMajorFilter.value
    if (subjectStatusFilter.value) params.status = subjectStatusFilter.value
    const { data } = await api.get('/admin/subjects', { params })
    allSubjects.value = data
  } finally {
    subjectsLoading.value = false
  }
}

function onAdminSubjectAction(key: string, subject: AdminSubject) {
  if (key === 'edit') openAdminSubjectEdit(subject)
  else deleteAdminSubject(subject.id, subject.name)
}

function openAdminSubjectEdit(subject: AdminSubject) {
  editingAdminSubject.value = subject
}

function closeAdminSubjectEdit() {
  editingAdminSubject.value = null
}

async function saveAdminSubjectEdit(payload: { name: string; acronym: string; semester: string }) {
  const subject = editingAdminSubject.value
  if (!subject) return

  savingAdminSubjectId.value = subject.id
  try {
    const body: { name: string; acronym: string; semester?: number } = {
      name: payload.name,
      acronym: payload.acronym,
    }
    if (payload.semester) body.semester = Number(payload.semester)
    await api.patch(`/admin/subjects/${subject.id}`, body)
    subject.name = body.name
    subject.acronym = body.acronym
    if (body.semester) subject.semester = body.semester
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

const pendingSubjectSearch = ref('')
const pendingSubjectMajor = ref('')
const pendingSubjectSubmitter = ref('')
const pendingSubjectPeriod = ref('all')

const pendingSearch = ref('')
const pendingUploader = ref('')
const pendingMajor = ref('')
const pendingPeriod = ref('all')

/** Uploaders that actually appear in the queue — no empty options. */
const pendingUploaders = computed(() => {
  const seen = new Map<string, string>()
  for (const doc of pendingDocGroups.value) {
    if (doc.users) seen.set(doc.users.id, `${doc.users.first_name} ${doc.users.last_name}`.trim())
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
})

const pendingMajors = computed(() => {
  const seen = new Map<string, string>()
  for (const doc of pendingDocGroups.value) {
    if (doc.majors) seen.set(doc.majors.id, doc.majors.acronym)
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
})

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

/** Every department, for filters that query the server. */
const majorOptions = computed(() =>
  majors.value.map((major) => ({ value: major.id, label: major.acronym })),
)

const PERIOD_DAYS: Record<string, number> = { today: 1, '7d': 7, '30d': 30 }

/** Milliseconds since an API timestamp, which may arrive without a timezone. */
function ageOf(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).getTime()
}

function cutoffFor(period: string) {
  const days = PERIOD_DAYS[period]
  return days ? Date.now() - days * 24 * 60 * 60 * 1000 : null
}

const pendingSubjectMajors = computed(() => {
  const seen = new Map<string, string>()
  for (const subject of pendingSubjects.value) {
    if (subject.majors) seen.set(subject.majors.id, subject.majors.acronym)
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
})

const pendingSubjectSubmitters = computed(() => {
  const seen = new Map<string, string>()
  for (const subject of pendingSubjects.value) {
    if (subject.users) {
      seen.set(subject.users.id, `${subject.users.first_name} ${subject.users.last_name}`.trim())
    }
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
})

const filteredPendingSubjects = computed(() => {
  const term = pendingSubjectSearch.value.trim().toLowerCase()
  const cutoff = cutoffFor(pendingSubjectPeriod.value)

  return pendingSubjects.value.filter((subject) => {
    if (
      term &&
      !String(subject.name ?? '')
        .toLowerCase()
        .includes(term)
    )
      return false
    if (pendingSubjectMajor.value && subject.majors?.id !== pendingSubjectMajor.value) return false
    if (pendingSubjectSubmitter.value && subject.users?.id !== pendingSubjectSubmitter.value) {
      return false
    }
    if (cutoff !== null) {
      const at = ageOf(subject.created_at)
      if (at === null || at < cutoff) return false
    }
    return true
  })
})

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100]

const pendingSubjectPage = ref(1)
const pendingSubjectPageSize = ref(10)
const pagedPendingSubjects = computed(() =>
  filteredPendingSubjects.value.slice(
    (pendingSubjectPage.value - 1) * pendingSubjectPageSize.value,
    pendingSubjectPage.value * pendingSubjectPageSize.value,
  ),
)

// Filtering or resizing can leave the current page past the end of the list.
watch([filteredPendingSubjects, pendingSubjectPageSize], () => {
  pendingSubjectPage.value = 1
})

const pendingSubjectFiltersActive = computed(
  () =>
    !!(
      pendingSubjectSearch.value ||
      pendingSubjectMajor.value ||
      pendingSubjectSubmitter.value ||
      pendingSubjectPeriod.value !== 'all'
    ),
)

function clearPendingSubjectFilters() {
  pendingSubjectSearch.value = ''
  pendingSubjectMajor.value = ''
  pendingSubjectSubmitter.value = ''
  pendingSubjectPeriod.value = 'all'
}

function onSubjectAction(key: string, subject: { id: string; name: string }) {
  if (key === 'edit') openSubjectEdit(subject)
  else if (key === 'approve') approveSubject(subject.id)
  else if (key === 'reject') rejectSubject(subject.id)
  else adminDeleteSubject(subject.id, subject.name)
}

const filteredDocGroups = computed(() => {
  const term = pendingSearch.value.trim().toLowerCase()
  const cutoff = cutoffFor(pendingPeriod.value)

  return pendingDocGroups.value.filter((doc) => {
    if (term && !doc.title?.toLowerCase().includes(term)) return false
    if (pendingUploader.value && doc.users?.id !== pendingUploader.value) return false
    if (pendingMajor.value && doc.majors?.id !== pendingMajor.value) return false
    if (cutoff !== null) {
      const at = ageOf(doc.uploaded_at)
      if (at === null || at < cutoff) return false
    }
    return true
  })
})

const pendingDocPage = ref(1)
const pendingDocPageSize = ref(10)
const pagedDocGroups = computed(() =>
  filteredDocGroups.value.slice(
    (pendingDocPage.value - 1) * pendingDocPageSize.value,
    pendingDocPage.value * pendingDocPageSize.value,
  ),
)

watch([filteredDocGroups, pendingDocPageSize], () => {
  pendingDocPage.value = 1
})

const pendingFiltersActive = computed(
  () =>
    !!(
      pendingSearch.value ||
      pendingUploader.value ||
      pendingMajor.value ||
      pendingPeriod.value !== 'all'
    ),
)

function clearPendingFilters() {
  pendingSearch.value = ''
  pendingUploader.value = ''
  pendingMajor.value = ''
  pendingPeriod.value = 'all'
}

const approvalsEmpty = computed(() =>
  approvalsSection.value === 'subjects'
    ? pendingSubjects.value.length === 0
    : pendingDocGroups.value.length === 0,
)

const approvalsEmptyText = computed(() =>
  approvalsSection.value === 'subjects' ? 'No pending subjects.' : 'No pending documents.',
)

// ── Tab switching ─────────────────────────────────────────────────────────────
watch(activeTab, (tab) => {
  // Leaving the section collapses it, so the sidebar never claims a queue you left.
  if (tab !== 'approvals') {
    approvalsOpen.value = false
    approvalsSection.value = 'subjects'
  }
  if (tab === 'overview' && recentDocs.value.length === 0) loadOverview()
  if (tab === 'approvals' && pendingSubjects.value.length === 0 && pendingDocs.value.length === 0)
    loadApprovals()
  if (tab === 'users' && users.value.length === 0) loadUsers()
  if (tab === 'departments') void loadDepartments()
  if (tab === 'subjects' && allSubjects.value.length === 0) loadAllSubjects()
  if (tab === 'documents') {
    if (allDocs.value.length === 0) loadDocuments()
    if (users.value.length === 0) loadUsers()
  }
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
  void loadMajors()
})
</script>

<template>
  <div class="flex min-h-screen bg-[#F5F6FA]">
    <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
    <aside class="fixed inset-y-0 left-0 w-56 bg-white shadow-sm flex flex-col z-30">
      <!-- Logo -->
      <div class="px-5 h-16 flex items-center border-b border-gray-100">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
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
        <template
          v-for="item in [
            { tab: 'overview', label: 'Dashboard', icon: 'dashboard' },
            { tab: 'approvals', label: 'Approvals', icon: 'check' },
            { tab: 'departments', label: 'Departments', icon: 'building' },
            { tab: 'subjects', label: 'Subjects', icon: 'book' },
            { tab: 'users', label: 'Users', icon: 'users' },
            { tab: 'documents', label: 'Documents', icon: 'document' },
          ] as const"
          :key="item.tab"
        >
          <button
            @click="item.tab === 'approvals' ? toggleApprovals() : (activeTab = item.tab)"
            :class="[
              'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
              activeTab === item.tab
                ? 'bg-primary text-white shadow-sm'
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
            <!-- Building -->
            <svg
              v-else-if="item.icon === 'building'"
              class="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 10h.01M15 10h.01M9 14h.01M15 14h.01"
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

            <!-- Active chevron — on Approvals it doubles as the open/closed caret -->
            <svg
              v-if="activeTab === item.tab || item.tab === 'approvals'"
              :class="[
                'h-4 w-4 shrink-0 opacity-70 transition-transform',
                item.tab === 'approvals' && approvalsOpen ? 'rotate-90' : '',
              ]"
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

          <!-- Approvals submenu -->
          <div
            v-if="item.tab === 'approvals' && approvalsOpen"
            class="mb-1 ml-5 flex flex-col gap-1 border-l border-gray-100 pl-2"
          >
            <button
              v-for="sub in [
                { key: 'subjects', label: 'Subjects', count: pendingSubjects.length },
                { key: 'documents', label: 'Documents', count: pendingDocGroups.length },
              ] as const"
              :key="sub.key"
              @click="openApprovals(sub.key)"
              :class="[
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:cursor-pointer',
                approvalsSection === sub.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              ]"
            >
              <span class="flex-1">{{ sub.label }}</span>
              <span
                v-if="sub.count > 0"
                :class="[
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                  approvalsSection === sub.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500',
                ]"
                >{{ sub.count }}</span
              >
            </button>
          </div>
        </template>
      </nav>

      <!-- Bottom user info -->
      <div class="px-4 py-4 border-t border-gray-100">
        <div class="flex items-center gap-2.5">
          <div
            class="h-8 w-8 rounded-full bg-[#E8EEF8] flex items-center justify-center text-primary text-xs font-bold shrink-0"
          >
            {{ auth.user?.email?.[0]?.toUpperCase() ?? 'A' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-900 truncate">
              {{ auth.user?.email ?? 'Admin' }}
            </p>
            <p class="text-[11px] text-gray-400">Administrator</p>
          </div>
          <button
            type="button"
            @click="handleLogout"
            title="Log out"
            aria-label="Log out"
            class="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main area ───────────────────────────────────────────────────────── -->
    <div class="ml-56 flex-1 flex flex-col h-screen">
      <!-- Top header -->
      <header
        class="shrink-0 z-20 bg-white border-b border-gray-100 px-6 h-16 flex items-center gap-4"
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
      <main class="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- OVERVIEW TAB                                                     -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-if="activeTab === 'overview'">
          <div v-if="statsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <template v-else>
            <!-- Stat cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    class="w-6 h-6 fill-primary"
                  >
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

              <!-- Total Subjects -->
              <div
                class="bg-white rounded-2xl border border-gray-100 px-5 py-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Subjects</p>
                  <p class="text-xs text-gray-300 mt-0.5">Approved &amp; active</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">
                    {{ stats.totalSubjects.toLocaleString() }}
                  </p>
                </div>
                <div
                  class="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0"
                >
                  <svg
                    class="h-6 w-6 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M12 6.25C10.6 5.2 8.8 4.75 7 4.75c-1.1 0-2.2.2-3.2.5v12.5c1-.3 2.1-.5 3.2-.5 1.8 0 3.6.45 5 1.5 1.4-1.05 3.2-1.5 5-1.5 1.1 0 2.2.2 3.2.5V5.25c-1-.3-2.1-.5-3.2-.5-1.8 0-3.6.45-5 1.5zm0 0v12.5"
                    />
                  </svg>
                </div>
              </div>

              <!-- Total Books -->
              <div
                class="bg-white rounded-2xl border border-gray-100 px-5 py-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p class="text-xs font-medium text-gray-400">Total Books</p>
                  <p class="text-xs text-gray-300 mt-0.5">Donated</p>
                  <p class="text-3xl font-bold text-gray-900 mt-2">
                    {{ stats.totalBooks.toLocaleString() }}
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
                      d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5V5.5zM4 20.5A2.5 2.5 0 016.5 18H19v3H6.5A2.5 2.5 0 014 20.5z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Uploads over time -->
            <div class="bg-white rounded-2xl border border-gray-100 px-6 py-5">
              <div class="flex items-baseline justify-between gap-3">
                <h2 class="font-semibold text-gray-900">Uploads per month</h2>
                <p class="text-xs text-gray-400">Approved documents, last 6 months</p>
              </div>
              <UploadsBarChart :data="stats.uploadsByMonth" class="mt-4" />
            </div>

            <!-- Two-col layout: Recent Uploads + Pending Review -->
            <div class="grid grid-cols-3 gap-5">
              <!-- Recent Uploads (2/3) -->
              <div class="col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 class="font-semibold text-gray-900">Recent Uploads</h2>
                  <button
                    @click="activeTab = 'documents'"
                    class="text-xs text-primary font-medium hover:underline"
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
                      class="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
                    >
                      {{ doc.doc_type }}
                    </span>
                  </div>
                  <p class="col-span-3 text-xs text-gray-500 truncate">
                    {{ doc.users?.first_name }} {{ doc.users?.last_name }}
                  </p>
                  <p class="col-span-2 text-xs text-gray-400 text-right">
                    {{ formatDate(doc.uploaded_at) }}
                  </p>
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
                    class="text-xs text-primary font-medium hover:underline"
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
              v-if="approvalsEmpty"
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
              <p class="text-sm text-gray-400">{{ approvalsEmptyText }}</p>
            </div>

            <template v-else>
              <!-- Pending Subjects -->
              <template v-if="pendingSubjects.length > 0 && approvalsSection === 'subjects'">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-semibold text-gray-900">Pending Subjects</h2>
                  <span
                    class="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >{{ pendingSubjectFiltersActive ? `${filteredPendingSubjects.length}/` : ''
                    }}{{ pendingSubjects.length }}</span
                  >

                  <div class="ml-auto flex flex-wrap items-center gap-2">
                    <SearchDashboard
                      v-model="pendingSubjectSearch"
                      placeholder="Search by name..."
                      width="w-52"
                    />
                    <FilterDashboard
                      v-model="pendingSubjectMajor"
                      :options="pendingSubjectMajors"
                      all-label="All departments"
                    />
                    <FilterDashboard
                      v-model="pendingSubjectSubmitter"
                      :options="pendingSubjectSubmitters"
                      all-label="All submitters"
                    />
                    <FilterDashboard v-model="pendingSubjectPeriod" :options="PERIOD_OPTIONS" />

                    <button
                      v-if="pendingSubjectFiltersActive"
                      @click="clearPendingSubjectFilters"
                      class="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:cursor-pointer hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  class="flex min-h-0 flex-col overflow-y-auto overscroll-none rounded-2xl border border-gray-100 bg-white"
                >
                  <div
                    class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-t border-white bg-primary px-6 py-3"
                  >
                    <p class="col-span-4 text-xs font-semibold text-white uppercase tracking-wide">
                      Subject
                    </p>
                    <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                      Major
                    </p>
                    <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                      Year
                    </p>
                    <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                      Sem
                    </p>
                    <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                      Submitted by
                    </p>
                    <p
                      class="col-span-2 whitespace-nowrap text-xs font-semibold text-white uppercase tracking-wide"
                    >
                      Submitted
                    </p>
                    <p
                      class="col-span-1 text-right text-xs font-semibold text-white uppercase tracking-wide"
                    >
                      Actions
                    </p>
                  </div>

                  <div
                    v-for="(subject, i) in pagedPendingSubjects"
                    :key="subject.id"
                    :class="[
                      'transition-colors',
                      i !== pagedPendingSubjects.length - 1 ? 'border-b border-gray-100' : '',
                    ]"
                  >
                    <div class="grid grid-cols-12 items-center gap-4 px-6 py-4 hover:bg-gray-50">
                      <div class="col-span-4 flex min-w-0 items-center gap-3">
                        <img
                          v-if="subject.subject_url"
                          :src="subject.subject_url"
                          class="h-9 w-9 shrink-0 rounded-xl object-cover"
                        />
                        <div
                          v-else
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 px-1 text-[11px] font-bold text-primary"
                        >
                          <span class="truncate">{{ subject.acronym ?? '—' }}</span>
                        </div>
                        <p class="truncate text-sm font-medium text-gray-900">{{ subject.name }}</p>
                      </div>

                      <p class="col-span-1 truncate text-sm text-gray-600">
                        {{ subject.majors?.acronym ?? '—' }}
                      </p>
                      <p class="col-span-1 text-sm text-gray-600">{{ subject.year_level }}</p>
                      <p class="col-span-1 text-sm text-gray-600">{{ subject.semester }}</p>
                      <p class="col-span-2 truncate text-sm text-gray-600">
                        {{
                          subject.users
                            ? `${subject.users.first_name} ${subject.users.last_name}`
                            : 'Unknown'
                        }}
                      </p>
                      <p
                        class="col-span-2 whitespace-nowrap text-xs text-gray-400"
                        :title="subject.created_at ? formatDate(subject.created_at) : ''"
                      >
                        {{ subject.created_at ? formatRelativeDate(subject.created_at) : '—' }}
                      </p>

                      <div class="col-span-1 flex items-center justify-end">
                        <RowActionsMenu
                          :disabled="actioningId === subject.id"
                          :items="[
                            { key: 'edit', label: 'Edit' },
                            { key: 'approve', label: 'Approve', tone: 'success' },
                            { key: 'reject', label: 'Reject', tone: 'danger' },
                            { key: 'delete', label: 'Delete', tone: 'danger' },
                          ]"
                          @select="(key) => onSubjectAction(key, subject)"
                        />
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

                  <div
                    v-if="filteredPendingSubjects.length === 0"
                    class="flex flex-col items-center gap-2 py-16 text-center"
                  >
                    <p class="text-sm font-medium text-gray-600">
                      No subjects match these filters.
                    </p>
                    <button
                      @click="clearPendingSubjectFilters"
                      class="text-sm font-medium text-primary hover:cursor-pointer hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                <div class="mt-auto grid grid-cols-3 items-center gap-3">
                  <Pagination
                    class="col-start-2 justify-self-center"
                    v-model:page="pendingSubjectPage"
                    :total="filteredPendingSubjects.length"
                    :page-size="pendingSubjectPageSize"
                  />
                  <PageSizeSelect
                    class="col-start-3 justify-self-end"
                    v-model="pendingSubjectPageSize"
                    :options="PAGE_SIZE_OPTIONS"
                    direction="up"
                  />
                </div>
              </template>

              <!-- Pending Documents -->
              <template v-if="pendingDocGroups.length > 0 && approvalsSection === 'documents'">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-semibold text-gray-900">Pending Documents</h2>
                  <span
                    class="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >{{ pendingFiltersActive ? `${filteredDocGroups.length}/` : ''
                    }}{{ pendingDocGroups.length }}</span
                  >

                  <div class="ml-auto flex flex-wrap items-center gap-2">
                    <SearchDashboard
                      v-model="pendingSearch"
                      placeholder="Search by name..."
                      width="w-52"
                    />
                    <FilterDashboard
                      v-model="pendingMajor"
                      :options="pendingMajors"
                      all-label="All departments"
                    />
                    <FilterDashboard
                      v-model="pendingUploader"
                      :options="pendingUploaders"
                      all-label="All uploaders"
                    />
                    <FilterDashboard v-model="pendingPeriod" :options="PERIOD_OPTIONS" />

                    <button
                      v-if="pendingFiltersActive"
                      @click="clearPendingFilters"
                      class="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:cursor-pointer hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  class="flex min-h-0 flex-col overflow-y-auto overscroll-none rounded-2xl border border-gray-100 bg-white"
                >
                  <div
                    class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-b border-gray-100 bg-primary px-6 py-3"
                  >
                    <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">
                      Document
                    </p>
                    <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                      Type
                    </p>
                    <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                      Subject
                    </p>
                    <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                      Major
                    </p>
                    <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                      Uploader
                    </p>
                    <p
                      class="col-span-1 whitespace-nowrap text-xs font-semibold text-white uppercase tracking-wide"
                    >
                      Submitted
                    </p>
                    <p
                      class="col-span-1 text-right text-xs font-semibold text-white uppercase tracking-wide"
                    >
                      Actions
                    </p>
                  </div>

                  <div
                    v-for="(doc, i) in pagedDocGroups"
                    :key="doc.group_id"
                    :class="i !== pagedDocGroups.length - 1 ? 'border-b border-gray-100' : ''"
                  >
                    <div
                      :class="[
                        'group grid cursor-pointer grid-cols-12 items-center gap-4 px-6 py-4 transition-colors',
                        expandedGroups.has(doc.group_id) ? 'bg-primary/10' : 'hover:bg-primary/5',
                      ]"
                      @click="toggleGroup(doc.group_id)"
                    >
                      <div class="col-span-3 flex min-w-0 items-center gap-2">
                        <svg
                          :class="[
                            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                            expandedGroups.has(doc.group_id) ? 'rotate-90' : '',
                          ]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <FolderIcon class="h-9 w-9 text-primary" />
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <p
                              class="truncate text-sm font-medium text-gray-900 group-hover:text-primary"
                            >
                              {{ doc.title }}
                            </p>
                            <!-- Tells the reviewer this is not a new submission:
                                 the document is already live and only these
                                 added files are waiting. -->
                            <span
                              v-if="doc.review_scope === 'file'"
                              class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                              >Added file{{ doc.fileCount > 1 ? 's' : '' }}</span
                            >
                            <span
                              v-if="doc.fileCount > 1"
                              class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              >{{ doc.fileCount }} files</span
                            >
                          </div>
                        </div>
                      </div>

                      <div class="col-span-2 min-w-0">
                        <span
                          class="inline-block max-w-full truncate rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
                          >{{ doc.doc_type }}</span
                        >
                      </div>

                      <p class="col-span-2 truncate text-sm text-gray-600">
                        {{ doc.subjects?.name ?? '—' }}
                      </p>
                      <p class="col-span-1 truncate text-sm text-gray-600">
                        {{ doc.majors?.acronym ?? '—' }}
                      </p>
                      <p class="col-span-2 truncate text-sm text-gray-600">
                        {{ doc.users?.first_name }} {{ doc.users?.last_name }}
                      </p>
                      <p
                        class="col-span-1 whitespace-nowrap text-xs text-gray-400"
                        :title="formatDate(doc.uploaded_at)"
                      >
                        {{ formatRelativeDate(doc.uploaded_at) }}
                      </p>

                      <div class="col-span-1 flex items-center justify-end" @click.stop>
                        <RowActionsMenu
                          :disabled="actioningId === doc.group_id"
                          :items="[
                            { key: 'approve', label: 'Approve', tone: 'success' },
                            { key: 'reject', label: 'Reject', tone: 'danger' },
                          ]"
                          @select="(key) => onDocAction(key, doc.group_id)"
                        />
                      </div>
                    </div>

                    <!-- Files in this submission -->
                    <div
                      v-if="expandedGroups.has(doc.group_id)"
                      class="bg-primary/10 py-3 pl-23 pr-6"
                    >
                      <button
                        v-for="file in doc.files"
                        :key="file.id"
                        type="button"
                        class="flex w-full items-center gap-3 border-b border-gray-100 py-2 text-left transition-colors last:border-0 hover:cursor-pointer"
                        @click.stop="openPreview(file)"
                      >
                        <FilePreviewThumb
                          :name="file.original_name"
                          :url="file.file_url"
                          :preview-url="file.preview_url"
                          :size="28"
                        />
                        <p class="flex-1 truncate text-sm text-gray-700 hover:text-primary">
                          {{ file.original_name ?? '—' }}
                        </p>
                        <p class="shrink-0 text-xs text-gray-400">
                          {{ formatSize(file.file_size_kb ?? 0) }}
                        </p>
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="filteredDocGroups.length === 0"
                    class="flex flex-col items-center gap-2 py-16 text-center"
                  >
                    <p class="text-sm font-medium text-gray-600">
                      No documents match these filters.
                    </p>
                    <button
                      @click="clearPendingFilters"
                      class="text-sm font-medium text-primary hover:cursor-pointer hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                <div class="mt-auto grid grid-cols-3 items-center gap-3">
                  <Pagination
                    class="col-start-2 justify-self-center"
                    v-model:page="pendingDocPage"
                    :total="filteredDocGroups.length"
                    :page-size="pendingDocPageSize"
                  />
                  <PageSizeSelect
                    class="col-start-3 justify-self-end"
                    v-model="pendingDocPageSize"
                    :options="PAGE_SIZE_OPTIONS"
                    direction="up"
                  />
                </div>
              </template>
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
            <div class="flex flex-wrap items-center gap-2">
              <FilterDashboard
                v-model="subjectMajorFilter"
                :options="majorOptions"
                all-label="All departments"
              />
              <FilterDashboard
                v-model="subjectStatusFilter"
                :options="STATUS_OPTIONS"
                all-label="Any status"
              />
              <SearchDashboard v-model="subjectSearch" placeholder="Search subjects..." />

              <button
                v-if="subjectFiltersActive"
                @click="clearSubjectFilters"
                class="px-3 py-2 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-100 hover:cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div v-if="subjectsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <div
            v-else
            class="min-h-0 overflow-y-auto overscroll-none bg-white rounded-2xl border border-gray-100"
          >
            <div
              class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-b border-gray-100 bg-primary px-6 py-3"
            >
              <p class="col-span-4 text-xs font-semibold text-white uppercase tracking-wide">
                Subject
              </p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Major
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                Year
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">Sem</p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Status
              </p>
              <p
                class="col-span-2 text-right text-xs font-semibold text-white uppercase tracking-wide"
              >
                Actions
              </p>
            </div>

            <div v-if="allSubjects.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No subjects found.
            </div>

            <div
              v-for="(subject, i) in pagedSubjects"
              :key="subject.id"
              :class="[
                'transition-colors',
                i !== pagedSubjects.length - 1 ? 'border-b border-gray-100' : '',
              ]"
            >
              <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50">
                <div class="col-span-4 flex items-center gap-3 min-w-0">
                  <img
                    v-if="subject.subject_url"
                    :src="subject.subject_url"
                    class="h-9 w-9 rounded-xl object-cover shrink-0"
                  />
                  <div
                    v-else
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 px-1 text-[11px] font-bold text-primary"
                  >
                    <span class="truncate">{{ subject.acronym ?? '—' }}</span>
                  </div>
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
                <div class="col-span-2 flex items-center justify-end">
                  <RowActionsMenu
                    :disabled="deletingAdminSubjectId === subject.id"
                    :items="[
                      { key: 'edit', label: 'Edit' },
                      { key: 'delete', label: 'Delete', tone: 'danger' },
                    ]"
                    @select="(key) => onAdminSubjectAction(key, subject)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="!subjectsLoading" class="mt-auto grid grid-cols-3 items-center gap-3">
            <Pagination
              class="col-start-2 justify-self-center"
              v-model:page="subjectPage"
              :total="allSubjects.length"
              :page-size="subjectPageSize"
            />
            <PageSizeSelect
              class="col-start-3 justify-self-end"
              v-model="subjectPageSize"
              :options="PAGE_SIZE_OPTIONS"
              direction="up"
            />
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
                class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
          </div>

          <div v-if="usersLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <div
            v-else
            class="min-h-0 overflow-y-auto overscroll-none bg-white rounded-2xl border border-gray-100"
          >
            <div
              class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-b border-gray-100 bg-primary px-6 py-3"
            >
              <p class="col-span-4 text-xs font-semibold text-white uppercase tracking-wide">
                Name
              </p>
              <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">
                Email
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                Major
              </p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Moderates
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                Role
              </p>
              <p
                class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide text-right"
              >
                Actions
              </p>
            </div>

            <div v-if="users.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No users found.
            </div>

            <div
              v-for="(user, i) in pagedUsers"
              :key="user.id"
              :class="[
                'grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors',
                i !== pagedUsers.length - 1 ? 'border-b border-gray-100' : '',
              ]"
            >
              <div class="col-span-4 flex items-center gap-3 min-w-0">
                <div
                  class="h-8 w-8 rounded-full bg-[#E8EEF8] flex items-center justify-center text-primary text-xs font-bold shrink-0"
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
              <p class="col-span-3 text-sm text-gray-500 truncate">{{ user.email }}</p>
              <p class="col-span-1 text-xs text-gray-500">{{ user.majors?.acronym ?? '—' }}</p>

              <!-- Departments this person reviews. Admins review everything, so
                   an assignment would add nothing. -->
              <div class="col-span-2 flex flex-wrap gap-1">
                <span v-if="user.role === 'admin'" class="text-xs text-gray-400">all</span>
                <span
                  v-for="dept in user.moderates ?? []"
                  v-else-if="(user.moderates ?? []).length"
                  :key="dept.id"
                  class="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  {{ dept.acronym }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </div>

              <div class="col-span-1 flex">
                <span
                  :class="[
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    user.banned_at
                      ? 'bg-red-100 text-red-600'
                      : user.role === 'admin'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600',
                  ]"
                  :title="user.ban_reason ?? undefined"
                >
                  {{ user.banned_at ? 'banned' : user.role }}
                </span>
              </div>

              <!-- Actions. Hidden on your own row: the API refuses self-demotion
                   and self-banning, so offering them would only produce errors. -->
              <div class="col-span-1 flex items-center justify-end gap-1">
                <template v-if="user.id !== auth.user?.id">
                  <RingSpinner
                    v-if="busyUserId === user.id"
                    :size="16"
                    :stroke="2.5"
                    class="text-primary"
                  />
                  <template v-else>
                    <!-- Moderator departments -->
                    <div class="relative">
                      <button
                        type="button"
                        class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-primary hover:cursor-pointer disabled:opacity-40"
                        :disabled="user.role === 'admin' || !!user.banned_at"
                        title="Moderator departments"
                        @click="moderatorMenuFor = moderatorMenuFor === user.id ? null : user.id"
                      >
                        <svg
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>

                      <div
                        v-if="moderatorMenuFor === user.id"
                        class="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                      >
                        <p
                          class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                        >
                          Moderates
                        </p>
                        <button
                          v-for="major in majors"
                          :key="major.id"
                          type="button"
                          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:cursor-pointer"
                          @click="toggleModerator(user, major.id)"
                        >
                          {{ major.acronym }}
                          <svg
                            v-if="moderates(user, major.id)"
                            class="h-4 w-4 text-primary"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- Demote only. Promotion here is to MODERATOR (the
                         dropdown above); handing someone the whole system is
                         deliberately not a one-click action in a list. -->
                    <button
                      v-if="user.role === 'admin'"
                      type="button"
                      class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-primary hover:cursor-pointer"
                      title="Remove admin"
                      @click="setRole(user)"
                    >
                      <svg
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 15a4 4 0 100-8 4 4 0 000 8zm0 0c-3.3 0-6 2.2-6 5h12c0-2.8-2.7-5-6-5z"
                        />
                      </svg>
                    </button>

                    <!-- Ban / unban -->
                    <button
                      type="button"
                      class="rounded-lg p-1.5 transition hover:cursor-pointer"
                      :class="
                        user.banned_at
                          ? 'text-green-500 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                      "
                      :title="user.banned_at ? 'Reinstate' : 'Ban'"
                      @click="user.banned_at ? unbanUser(user) : confirmBan(user)"
                    >
                      <svg
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path
                          v-if="user.banned_at"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                        <path
                          v-else
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M18.4 5.6a9 9 0 11-12.8 12.8 9 9 0 0112.8-12.8zM5.6 5.6l12.8 12.8"
                        />
                      </svg>
                    </button>
                  </template>
                </template>
              </div>
            </div>
          </div>

          <div v-if="!usersLoading" class="mt-auto grid grid-cols-3 items-center gap-3">
            <Pagination
              class="col-start-2 justify-self-center"
              v-model:page="userPage"
              :total="users.length"
              :page-size="userPageSize"
            />
            <PageSizeSelect
              class="col-start-3 justify-self-end"
              v-model="userPageSize"
              :options="PAGE_SIZE_OPTIONS"
              direction="up"
            />
          </div>
        </template>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- DEPARTMENTS TAB                                                  -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-if="activeTab === 'departments'">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <p class="text-sm text-gray-500">
              <span class="font-semibold text-gray-900">{{ majors.length }}</span> departments
            </p>
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#006B9C] hover:cursor-pointer"
              @click="showCreateMajor = true"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              New Department
            </button>
          </div>

          <!-- Nobody assigned yet: admins still review these, so it's a nudge. -->
          <div
            v-if="majorsWithoutModerator.length"
            class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <svg
              class="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
              />
            </svg>
            <div class="text-sm text-amber-800">
              <p class="font-medium">
                {{ majorsWithoutModerator.length }} department(s) have no moderator
              </p>
              <p class="mt-0.5 text-amber-700">
                Their submissions are reviewed by admins only. Assign someone from the
                <button class="underline hover:cursor-pointer" @click="activeTab = 'users'">
                  Users
                </button>
                tab.
              </p>
            </div>
          </div>

          <div
            class="min-h-0 overflow-y-auto overscroll-none bg-white rounded-2xl border border-gray-100"
          >
            <div v-if="majors.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No departments yet.
            </div>
            <div
              v-for="(major, i) in majors"
              :key="major.id"
              :class="[
                'flex items-center gap-4 px-6 py-4',
                i !== majors.length - 1 ? 'border-b border-gray-100' : '',
              ]"
            >
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
              >
                <img
                  v-if="major.image_url"
                  :src="major.image_url"
                  :alt="major.acronym"
                  class="h-full w-full object-contain"
                />
                <span v-else class="text-[11px] font-bold text-gray-300">
                  {{ major.acronym }}
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900">{{ major.acronym }}</p>
                <p class="truncate text-xs text-gray-500">{{ major.name }}</p>
              </div>

              <span
                v-if="needsModerator(major.id)"
                class="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700"
              >
                No moderator
              </span>
              <code class="shrink-0 text-[11px] text-gray-400">
                /dep/{{ major.acronym.toLowerCase() }}
              </code>

              <RowActionsMenu
                :disabled="deletingMajorId === major.id"
                :items="[
                  { key: 'edit', label: 'Edit' },
                  { key: 'delete', label: 'Delete', tone: 'danger' },
                ]"
                @select="(key) => onMajorAction(key, major)"
              />
            </div>
          </div>
        </template>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- DOCUMENTS TAB                                                    -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <template v-else-if="activeTab === 'documents'">
          <div class="flex items-center justify-end flex-wrap gap-3">
            <SearchDashboard v-model="docSearch" placeholder="Search by name..." width="w-52" />
            <FilterDashboard
              v-model="docMajorFilter"
              :options="majorOptions"
              all-label="All departments"
            />
            <FilterDashboard
              v-model="docUploaderFilter"
              :options="uploaderOptions"
              all-label="All uploaders"
            />
            <FilterDashboard
              v-model="docTypeFilter"
              :options="docTypeOptions"
              all-label="All types"
            />
            <FilterDashboard v-model="docPeriodFilter" :options="PERIOD_OPTIONS" />

            <button
              v-if="docFiltersActive"
              @click="clearDocFilters"
              class="px-3 py-2 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-100 hover:cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div v-if="docsLoading" class="flex justify-center py-24"><LoadingSpinner /></div>

          <div
            v-else
            class="min-h-0 overflow-y-auto overscroll-none bg-white rounded-2xl border border-gray-100"
          >
            <div
              class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-b border-gray-100 bg-primary px-6 py-3"
            >
              <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">
                Document
              </p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Type
              </p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Subject
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                Major
              </p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Uploader
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                Date
              </p>
              <p
                class="col-span-1 text-right text-xs font-semibold text-white uppercase tracking-wide"
              >
                Actions
              </p>
            </div>

            <div v-if="allDocs.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No documents found.
            </div>

            <div
              v-for="(doc, i) in pagedDocs"
              :key="doc.id"
              :class="i !== pagedDocs.length - 1 ? 'border-b border-gray-100' : ''"
            >
              <!-- ── Upload row (click to expand) ── -->
              <div
                :class="[
                  'grid grid-cols-12 gap-4 px-6 py-3.5 items-center transition-colors cursor-pointer',
                  expandedUploads.has(doc.id) ? 'bg-primary/10' : 'hover:bg-primary/5',
                ]"
                @click="toggleUpload(doc.id)"
              >
                <div class="col-span-3 min-w-0 flex items-center gap-2">
                  <svg
                    class="h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200"
                    :class="expandedUploads.has(doc.id) ? 'rotate-90' : ''"
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
                  <FolderIcon class="h-9 w-9 text-primary" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                      <span
                        v-if="doc.documents?.length > 1"
                        class="shrink-0 text-[10px] font-bold bg-blue-100 text-primary px-1.5 py-0.5 rounded-full"
                        >{{ doc.documents.length }} files</span
                      >
                    </div>
                  </div>
                </div>

                <div class="col-span-2 min-w-0">
                  <span
                    class="inline-block max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {{ doc.doc_type }}
                  </span>
                </div>
                <p class="col-span-2 truncate text-sm text-gray-600">
                  {{ doc.subjects?.name ?? '—' }}
                </p>
                <p class="col-span-1 truncate text-sm text-gray-600">
                  {{ doc.majors?.acronym ?? '—' }}
                </p>
                <p class="col-span-2 truncate text-sm text-gray-600">
                  {{ doc.users?.first_name }} {{ doc.users?.last_name }}
                </p>
                <p
                  class="col-span-1 whitespace-nowrap text-xs text-gray-400"
                  :title="`${formatSize(totalSize(doc.documents))} · ${formatDate(doc.uploaded_at)}`"
                >
                  {{ formatDate(doc.uploaded_at) }}
                </p>
                <div class="col-span-1 flex justify-end" @click.stop>
                  <RowActionsMenu
                    :disabled="deletingDocId === doc.id"
                    :items="[{ key: 'delete', label: 'Delete', tone: 'danger' }]"
                    @select="deleteDocument(doc)"
                  />
                </div>
              </div>

              <!-- ── Expanded file list ── -->
              <div
                v-if="expandedUploads.has(doc.id)"
                class="bg-primary/10 border-gray-100 pl-22 pr-6"
              >
                <button
                  v-for="file in doc.documents"
                  :key="file.id"
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-gray-100 py-2 text-left last:border-0 hover:cursor-pointer"
                  @click.stop="openPreview(file)"
                >
                  <FilePreviewThumb
                    :name="file.original_name"
                    :url="file.file_url"
                    :preview-url="file.preview_url"
                    :size="28"
                  />
                  <p class="flex-1 truncate text-sm text-gray-700 hover:text-primary">
                    {{ file.original_name ?? '—' }}
                  </p>
                  <p class="shrink-0 text-xs text-gray-400">{{ formatSize(file.file_size_kb) }}</p>
                </button>
              </div>
            </div>
          </div>

          <div v-if="!docsLoading" class="mt-auto grid grid-cols-3 items-center gap-3">
            <Pagination
              class="col-start-2 justify-self-center"
              v-model:page="docPage"
              :total="allDocs.length"
              :page-size="docPageSize"
            />
            <PageSizeSelect
              class="col-start-3 justify-self-end"
              v-model="docPageSize"
              :options="PAGE_SIZE_OPTIONS"
              direction="up"
            />
          </div>
        </template>
      </main>
    </div>
  </div>

  <DocumentPreviewModal v-model="previewOpen" :file="previewTarget" @download="downloadFile" />

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

  <!-- Banning cuts the person's access, so it asks first. Unbanning doesn't. -->
  <ConfirmDeleteModal
    v-if="banTarget"
    :target="banTarget.name"
    title="Ban user"
    :loading="busyUserId === banTarget.id"
    @cancel="banTarget = null"
    @confirm="banUser"
  />

  <EditSubjectModal
    v-if="editingAdminSubject"
    :subject="editingAdminSubject"
    :saving="savingAdminSubjectId === editingAdminSubject.id"
    @close="closeAdminSubjectEdit"
    @save="saveAdminSubjectEdit"
  />

  <CreateMajorModal
    v-if="showCreateMajor || editingMajor"
    :major="editingMajor"
    @close="closeMajorModal"
    @created="onMajorCreated"
  />

  <ConfirmDeleteModal
    v-if="deletingMajor"
    :target="deletingMajor.acronym"
    title="Delete department"
    :loading="deletingMajorId === deletingMajor.id"
    @cancel="deletingMajor = null"
    @confirm="deleteMajor"
  />
</template>
