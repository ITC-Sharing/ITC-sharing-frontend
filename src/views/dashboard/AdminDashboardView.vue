<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { yearLevelsForMajor, yearMajorLabel } from '@/utils/format'
import ConfirmDeleteModal from '@/components/base/ConfirmDeleteModal.vue'
import RingSpinner from '@/components/base/RingSpinner.vue'
import noImage from '@/assets/images/no-image.png'

import FilePreviewThumb from '@/components/documents/FilePreviewThumb.vue'
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal.vue'
import type { UploadFile } from '@/types/documents.types'
import FolderIcon from '@/components/base/FolderIcon.vue'
import RowActionsMenu from '@/components/base/RowActionsMenu.vue'
import Pagination from '@/components/base/Pagination.vue'
import PageSizeSelect from '@/components/base/PageSizeSelect.vue'
import SearchDashboard from '@/components/dashboard/SearchDashboard.vue'
import FilterDashboard from '@/components/dashboard/FilterDashboard.vue'
import UploadsBarChart from '@/components/documents/UploadsBarChart.vue'
import CreateMajorModal from '@/components/dashboard/CreateMajorModal.vue'
import EditSubjectModal from '@/components/dashboard/EditSubjectModal.vue'
import api from '@/services/http'
import * as documentsApi from '@/services/documents.api'
import LoadingSpinner from '@/components/base/LoadingSpinner.vue'
import PromotionScheduleModal from '@/components/dashboard/PromotionScheduleModal.vue'
import SubjectReviewTable from '@/components/review/SubjectReviewTable.vue'
import DocumentReviewTable from '@/components/review/DocumentReviewTable.vue'
import NotificationBell from '@/components/notifications/NotificationBell.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { showToast } = useToast()

async function handleLogout() {
  await auth.logout()
  await router.push('/')
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'approvals' | 'departments' | 'subjects' | 'users' | 'books' | 'documents'
const TABS: Tab[] = [
  'overview',
  'approvals',
  'departments',
  'subjects',
  'users',
  'books',
  'documents',
]

/**
 * ?tab= opens the dashboard on a particular section.
 *
 * A reviewer's notification links here — landing them on Overview and leaving
 * them to find the queue again would waste the click. Validated against the
 * list rather than cast, so a hand-edited URL cannot set a tab that no panel
 * renders.
 */
/**
 * What this account may see here.
 *
 * A department moderator reaches this page for the review queue and nothing
 * else: the other tabs call admin-only endpoints that would 403 for them, and
 * showing a section that cannot load is worse than not showing it. The server
 * refuses either way — this only decides what is worth rendering.
 */
const isAdmin = computed(() => auth.user?.role?.toLowerCase() === 'admin')
const isReviewer = computed(() => isAdmin.value || !!auth.user?.is_moderator)
/** Every tab for an admin; the review queue alone for a moderator. */
const allowedTabs = computed<Tab[]>(() => (isAdmin.value ? TABS : ['approvals']))

const requestedTab = route.query.tab
const activeTab = ref<Tab>(
  typeof requestedTab === 'string' && (TABS as string[]).includes(requestedTab)
    ? (requestedTab as Tab)
    : 'overview',
)

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
const overviewLoaded = ref(false)
const statsLoading = ref(false)

async function loadOverview() {
  statsLoading.value = true
  try {
    const s = await api.get('/admin/stats')
    stats.value = s.data
    overviewLoaded.value = true
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

type Moderator = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  assigned_at: string
}

/** Which rows are open, and the roster each one has fetched. */
const expandedMajors = ref(new Set<string>())
const majorModerators = ref(new Map<string, Moderator[]>())
const loadingModeratorsFor = ref(new Set<string>())

async function loadDepartments() {
  // Assignments change from the Users tab, so a reload cannot trust what was
  // fetched before it. Collapsing as well as clearing keeps that honest — an
  // open row would otherwise sit empty until someone closed and reopened it.
  expandedMajors.value.clear()
  majorModerators.value.clear()

  await Promise.all([
    loadMajors(),
    api
      .get('/admin/majors/without-moderator')
      .then(({ data }) => (majorsWithoutModerator.value = data)),
  ])
}

/**
 * Open a department and, the first time only, fetch who reviews for it.
 *
 * Fetched per row rather than joined into the list: most rows are never opened,
 * and the roster is the one thing here that another tab can change underneath.
 */
async function toggleMajor(id: string) {
  if (expandedMajors.value.has(id)) {
    expandedMajors.value.delete(id)
    return
  }
  expandedMajors.value.add(id)
  if (majorModerators.value.has(id)) return

  loadingModeratorsFor.value.add(id)
  try {
    const { data } = await api.get(`/admin/majors/${id}/moderators`)
    majorModerators.value.set(id, data)
  } finally {
    loadingModeratorsFor.value.delete(id)
  }
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

/**
 * Clears every department in one action.
 *
 * The picker is for adjusting who covers what; this is for "they are not a
 * moderator any more", which otherwise meant unticking each department in turn
 * and hoping none was missed.
 */
function removeModerator(user: { id: string }) {
  void withBusy(user.id, async () => {
    await api.delete(`/admin/users/${user.id}/moderator`)
    showToast('Moderator access removed')
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

/**
 * Placement editing. Students cannot change their own department or year — the
 * pair decides which documents they can see — so an admin is the only way to
 * correct one. PATCH /admin/users/:id/placement rejects a year the department
 * does not have, and yearLevelsForMajor keeps this picker in step with it.
 */
const placementTarget = ref<{
  id: string
  name: string
  major_id: string
  year_level: string
} | null>(null)

const placementYears = computed(() => {
  const acronym = majors.value.find((m) => m.id === placementTarget.value?.major_id)?.acronym
  return yearLevelsForMajor(acronym)
})

function editPlacement(user: {
  id: string
  first_name: string
  last_name: string
  majors?: { id: string } | null
  year_level?: number | null
}) {
  placementTarget.value = {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    major_id: user.majors?.id ?? '',
    year_level: user.year_level ? String(user.year_level) : '',
  }
}

// A department change can invalidate the year (GIC has no year 2), so clear it.
watch(
  () => placementTarget.value?.major_id,
  (next, prev) => {
    if (placementTarget.value && prev !== undefined && next !== prev)
      placementTarget.value.year_level = ''
  },
)

function savePlacement() {
  const target = placementTarget.value
  if (!target || !target.major_id || !target.year_level) return
  void withBusy(target.id, async () => {
    await api.patch(`/admin/users/${target.id}/placement`, {
      major_id: target.major_id,
      year_level: Number(target.year_level),
    })
    placementTarget.value = null
    showToast('Placement updated')
  })
}

// ── Books ─────────────────────────────────────────────────────────────────────
// Donations go live immediately — there is no review queue. This exists to
// correct a status or take a listing down, which donors cannot always do
// themselves (their own delete is blocked once a book is requested or donated).
type AdminBook = {
  id: string
  title: string
  status: string
  hidden_at: string | null
  cover_image_url: string | null
  open_requests: number
  created_at: string
  major: { id: string; acronym: string } | null
  donor: { id: string; first_name: string; last_name: string; email: string } | null
}

const books = ref<AdminBook[]>([])
const booksLoading = ref(false)
const bookSearch = ref('')
const bookToDelete = ref<{ id: string; title: string } | null>(null)
let bookSearchTimer: ReturnType<typeof setTimeout> | undefined

async function loadBooks() {
  booksLoading.value = true
  try {
    const { data } = await api.get('/admin/books', {
      params: bookSearch.value.trim() ? { search: bookSearch.value.trim() } : {},
    })
    books.value = data
  } finally {
    booksLoading.value = false
  }
}

watch(bookSearch, () => {
  clearTimeout(bookSearchTimer)
  bookSearchTimer = setTimeout(() => void loadBooks(), 300)
})

/**
 * Its own busy helper rather than withBusy: that one reloads the USERS list
 * afterwards, which is both wasteful here and leaves the book table stale.
 * Reloading books also resyncs the status select if the request failed.
 */
const busyBookId = ref<string | null>(null)
async function withBookBusy(id: string, fn: () => Promise<unknown>) {
  busyBookId.value = id
  try {
    await fn()
  } catch (e: unknown) {
    const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(message ?? 'Action failed', { type: 'error' })
  } finally {
    busyBookId.value = null
    await loadBooks()
  }
}

function toggleBookHidden(book: AdminBook) {
  const hidden = !book.hidden_at
  void withBookBusy(book.id, async () => {
    await api.patch(`/admin/books/${book.id}/hidden`, { hidden })
    showToast(hidden ? 'Book hidden' : 'Book visible')
  })
}

function onBookAction(key: string, book: AdminBook) {
  if (key === 'hidden' || key === 'unhidden') toggleBookHidden(book)
  else if (key === 'delete') bookToDelete.value = { id: book.id, title: book.title }
}

function deleteBook() {
  const target = bookToDelete.value
  if (!target) return
  void withBookBusy(target.id, async () => {
    await api.delete(`/admin/books/${target.id}`)
    bookToDelete.value = null
    showToast('Book deleted')
  })
}

function onUserAction(
  key: string,
  user: {
    id: string
    first_name: string
    last_name: string
    role: string
    banned_at: string | null
    majors?: { id: string } | null
    year_level?: number | null
  },
) {
  if (key === 'placement') editPlacement(user)
  else if (key === 'role') setRole(user)
  else if (key === 'remove-moderator') removeModerator(user)
  else if (key === 'ban') confirmBan(user)
  else if (key === 'unban') unbanUser(user)
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
  /** The cohort the upload targets, shown beside the department as "I3-GIC". */
  year_level: number | null
  /** e.g. "2024-2025". Null on uploads that never named one. */
  academic_year: string | null
  /** (department, year) pairs that may see it. Empty means everyone. */
  audience: { major_id: string; year_level: number }[]
  /** Soft expiry, ISO. Null = never. */
  expires_at: string | null
  /** `acronym` is what the review tables show; `name` is the hover title. */
  subjects: { id: string; name: string; acronym?: string | null } | null
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

async function downloadFile(file: UploadFile) {
  // The bucket is private: ask the API for a fresh authorised link rather than
  // using the one embedded in the list, which expires within minutes.
  const { url } = await documentsApi.fileAccessUrl(file.id, 'download')
  const link = document.createElement('a')
  link.href = url
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
      // The review queue never serves hidden files.
      hidden_at: null,
    })
  }
  return Array.from(groups.values())
})

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

function onSubjectAction(key: string, subject: { id: string }) {
  if (key === 'approve') approveSubject(subject.id)
  else if (key === 'reject') rejectSubject(subject.id)
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
  if (tab === 'overview' && !overviewLoaded.value) loadOverview()
  if (tab === 'approvals' && pendingSubjects.value.length === 0 && pendingDocs.value.length === 0)
    loadApprovals()
  if (tab === 'users' && users.value.length === 0) loadUsers()
  if (tab === 'books' && books.value.length === 0) void loadBooks()
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

// ─── Promotion schedule ──────────────────────────────────────────────────────
// When the whole institute moves up a year. Students advance lazily, on their
// next visit after the moment passes, so nothing happens on the stroke of the
// clock and nobody is missed for having been away.
type PromotionSchedule = {
  rollover_at: string | null
  has_passed: boolean
  updated_at: string | null
}
const promotion = ref<PromotionSchedule | null>(null)
const promotionSaving = ref(false)
const promotionModalOpen = ref(false)

/**
 * Ticks once a second, but only while there is a future rollover to count down
 * to. A dashboard left open all day should not hold a timer for something that
 * already happened.
 */
const now = ref(Date.now())
let promotionTicker: ReturnType<typeof setInterval> | undefined

function stopPromotionTicker() {
  clearInterval(promotionTicker)
  promotionTicker = undefined
}

function startPromotionTicker() {
  stopPromotionTicker()
  if (!promotion.value?.rollover_at || promotion.value.has_passed) return
  promotionTicker = setInterval(() => {
    now.value = Date.now()
    // The moment it lands, ask the server rather than deciding locally — it
    // owns `has_passed`, and the card should say "In effect" without a reload.
    if (
      promotion.value?.rollover_at &&
      now.value >= new Date(promotion.value.rollover_at).getTime()
    ) {
      stopPromotionTicker()
      void loadPromotion()
    }
  }, 1000)
}

/** "2d 4h 11m" far out, seconds once it is close. Null once it has passed. */
const promotionCountdown = computed(() => {
  const at = promotion.value?.rollover_at
  if (!at) return null
  const remaining = new Date(at).getTime() - now.value
  if (remaining <= 0) return null

  const total = Math.floor(remaining / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
})

async function loadPromotion() {
  try {
    const { data } = await api.get('/admin/promotion')
    promotion.value = data
    now.value = Date.now()
    startPromotionTicker()
  } catch {
    // The rest of the dashboard is unaffected by this one card failing.
  }
}

/** `isoOrNull` comes from the modal: an instant to schedule, or null to clear. */
async function savePromotion(isoOrNull: string | null) {
  if (promotionSaving.value) return
  promotionSaving.value = true
  try {
    const { data } = await api.put('/admin/promotion', { rollover_at: isoOrNull })
    promotion.value = data
    now.value = Date.now()
    startPromotionTicker()
    promotionModalOpen.value = false
    showToast(isoOrNull ? 'Promotion scheduled' : 'Promotion schedule cleared', { duration: 6000 })
  } catch (e) {
    showToast(
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save the promotion date',
      { type: 'error' },
    )
  } finally {
    promotionSaving.value = false
  }
}

const currentDateStr = new Date().toLocaleDateString('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

onBeforeUnmount(stopPromotionTicker)

onMounted(async () => {
  await auth.init()
  // The router guard already turned away anyone who is neither; this is the
  // same check after `init()` has actually resolved the user.
  if (!isReviewer.value) {
    router.replace({ name: 'home' })
    return
  }

  // A moderator lands on the queue — it is the only thing here for them.
  if (!allowedTabs.value.includes(activeTab.value)) {
    // Never empty: an admin gets every tab, a moderator gets 'approvals'.
    activeTab.value = allowedTabs.value[0] ?? 'approvals'
  }

  // Approvals is the one queue both roles have. The rest is admin-only data,
  // and requesting it as a moderator would be 403s on every load.
  loadApprovals()
  if (isAdmin.value) {
    loadOverview()
    void loadMajors()
    void loadPromotion()
  }
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
            { tab: 'books', label: 'Books', icon: 'book' },
            { tab: 'documents', label: 'Documents', icon: 'document' },
          ].filter((item) => allowedTabs.includes(item.tab as Tab)) as {
            tab: Tab
            label: string
            icon: string
          }[]"
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
              fill="currentColor"
              viewBox="0 0 640 640"
            >
              <path
                d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM248 320C234.7 320 224 330.7 224 344C224 357.3 234.7 368 248 368L392 368C405.3 368 416 357.3 416 344C416 330.7 405.3 320 392 320L248 320zM248 416C234.7 416 224 426.7 224 440C224 453.3 234.7 464 248 464L392 464C405.3 464 416 453.3 416 440C416 426.7 405.3 416 392 416L248 416z"
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
      <!-- z-40 so the header out-ranks everything that scrolls beneath it: the
           sticky table headers inside <main> are z-20, and at equal z-index the
           later element in the DOM wins — which put them over the notification
           dropdown. The dropdown's own z-50 cannot help, because this header is
           a stacking context and caps whatever it contains. -->
      <header
        class="shrink-0 z-40 bg-white border-b border-gray-100 px-6 h-16 flex items-center gap-4"
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
          <!-- The same bell the rest of the app uses, rather than a second
               one that only counts the review queue. An admin is a user with
               notifications of their own — approvals, book handovers, their own
               uploads — and one list means one place to look. The queue count
               still shows in the sidebar, where it belongs. -->
          <NotificationBell />
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
            <!-- Promotion schedule. Sits above the statistics because it is the
                 one thing on this page that changes data rather than reporting
                 it — and it changes every student's year at once. -->
            <div class="bg-white rounded-2xl border border-gray-100 px-5 py-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="text-base font-semibold text-gray-900">Student promotion</h3>
                  <p class="mt-1 text-sm text-gray-500 max-w-prose">
                    Students only move up a year when you schedule it here. Each student advances on
                    their next visit after the date passes — nothing happens until then.
                  </p>
                  <div class="mt-3 flex items-center gap-2 text-sm">
                    <span
                      class="h-2 w-2 shrink-0 rounded-full"
                      :class="
                        !promotion?.rollover_at
                          ? 'bg-gray-300'
                          : promotion.has_passed
                            ? 'bg-green-500'
                            : 'bg-amber-500'
                      "
                    />
                    <span
                      class="font-semibold"
                      :class="
                        !promotion?.rollover_at
                          ? 'text-gray-500'
                          : promotion.has_passed
                            ? 'text-green-600'
                            : 'text-amber-600'
                      "
                    >
                      {{
                        !promotion?.rollover_at
                          ? 'No promotion scheduled'
                          : promotion.has_passed
                            ? 'In effect'
                            : 'Scheduled'
                      }}
                    </span>
                    <span v-if="promotion?.rollover_at" class="text-gray-500">
                      {{ new Date(promotion.rollover_at).toLocaleString() }}
                    </span>
                  </div>

                  <!-- Counts down only while it is still ahead; afterwards the
                       status above already says it is in effect. -->
                  <div
                    v-if="promotionCountdown"
                    class="mt-3 inline-flex items-baseline gap-2 rounded-xl bg-primary/10 px-4 py-2"
                  >
                    <span class="text-xs font-semibold uppercase tracking-wide text-primary">
                      Promotes in
                    </span>
                    <span class="font-mono text-lg font-bold tabular-nums text-primary">
                      {{ promotionCountdown }}
                    </span>
                  </div>
                  <p v-else-if="promotion?.has_passed" class="mt-3 text-xs text-gray-400">
                    Each student advances on their next visit — it is not applied all at once.
                  </p>
                </div>

                <button
                  type="button"
                  class="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-primary-hover"
                  @click="promotionModalOpen = true"
                >
                  {{ promotion?.rollover_at ? 'Change date' : 'Schedule promotion' }}
                </button>
              </div>
            </div>

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
                  <svg class="h-6 w-6 text-teal-500" fill="currentColor" viewBox="0 0 640 640">
                    <path
                      d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM248 320C234.7 320 224 330.7 224 344C224 357.3 234.7 368 248 368L392 368C405.3 368 416 357.3 416 344C416 330.7 405.3 320 392 320L248 320zM248 416C234.7 416 224 426.7 224 440C224 453.3 234.7 464 248 464L392 464C405.3 464 416 453.3 416 440C416 426.7 405.3 416 392 416L248 416z"
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

                <SubjectReviewTable
                  v-if="pagedPendingSubjects.length"
                  :rows="pagedPendingSubjects"
                  :actioning-id="actioningId"
                  @action="onSubjectAction"
                />

                <!-- Sibling of the table, not inside it: the table component
                     now renders its own card, and a filter that matches nothing
                     should not leave a bare header above the message. -->
                <div
                  v-if="filteredPendingSubjects.length === 0"
                  class="flex flex-col items-center gap-2 py-16 text-center"
                >
                  <p class="text-sm font-medium text-gray-600">No subjects match these filters.</p>
                  <button
                    @click="clearPendingSubjectFilters"
                    class="text-sm font-medium text-primary hover:cursor-pointer hover:underline"
                  >
                    Clear filters
                  </button>
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
                    :total="filteredPendingSubjects.length"
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

                <DocumentReviewTable
                  v-if="pagedDocGroups.length"
                  :rows="pagedDocGroups"
                  :expanded-ids="[...expandedGroups]"
                  :actioning-id="actioningId"
                  @toggle="toggleGroup"
                  @action="(key, doc) => onDocAction(key, doc.group_id)"
                  @preview="openPreview"
                />

                <!-- Sibling of the table: the component renders its own card, so
                     a filter matching nothing should not leave a bare header. -->
                <div
                  v-if="filteredDocGroups.length === 0"
                  class="flex flex-col items-center gap-2 py-16 text-center"
                >
                  <p class="text-sm font-medium text-gray-600">No documents match these filters.</p>
                  <button
                    @click="clearPendingFilters"
                    class="text-sm font-medium text-primary hover:cursor-pointer hover:underline"
                  >
                    Clear filters
                  </button>
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
                    :total="filteredDocGroups.length"
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
                <p class="col-span-2 text-sm text-gray-500">
                  {{ yearMajorLabel(subject.majors?.acronym, subject.year_level) }}
                </p>
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
              :total="allSubjects.length"
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
              <p class="col-span-1 text-xs text-gray-500">
                {{ user.majors?.acronym ?? '—'
                }}<span v-if="user.year_level" class="text-gray-400">
                  · Y{{ user.year_level }}</span
                >
              </p>

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
                        <!-- The department list grows with the institute, so it
                             scrolls rather than running off the card. The label
                             stays outside it: you should still be able to see
                             what you are picking once the list has moved. -->
                        <div class="max-h-56 overflow-y-auto scrollbar-hide">
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
                    </div>

                    <!-- Single actions collapse into one menu; the moderator
                         picker above stays its own control because it is a
                         multi-select submenu, not one action. -->
                    <RowActionsMenu
                      :items="[
                        { key: 'placement', label: 'Change department and year' },
                        ...(user.role === 'admin' ? [{ key: 'role', label: 'Remove admin' }] : []),
                        ...(user.moderates?.length
                          ? [
                              {
                                key: 'remove-moderator',
                                label: 'Remove as moderator',
                                tone: 'danger' as const,
                              },
                            ]
                          : []),
                        user.banned_at
                          ? { key: 'unban', label: 'Reinstate', tone: 'success' as const }
                          : { key: 'ban', label: 'Ban', tone: 'danger' as const },
                      ]"
                      @select="(key) => onUserAction(key, user)"
                    />
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
              :total="users.length"
              :options="PAGE_SIZE_OPTIONS"
              direction="up"
            />
          </div>
        </template>

        <!-- ── Books ────────────────────────────────────────────────────── -->
        <template v-else-if="activeTab === 'books'">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <p class="text-sm text-gray-500">
              <span class="font-semibold text-gray-900">{{ books.length }}</span> books
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
                v-model="bookSearch"
                type="text"
                placeholder="Search by title or donor..."
                class="w-72 rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div class="mt-5 rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div class="grid grid-cols-12 gap-4 bg-primary px-6 py-3">
              <p class="col-span-4 text-xs font-semibold text-white uppercase tracking-wide">
                Title
              </p>
              <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">
                Donor
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
                Major
              </p>
              <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">
                Status
              </p>
              <p
                class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide text-right"
              >
                Actions
              </p>
            </div>

            <div v-if="booksLoading" class="flex justify-center py-12">
              <RingSpinner :size="28" />
            </div>
            <div v-else-if="books.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No books found.
            </div>

            <div
              v-for="(book, i) in books"
              v-else
              :key="book.id"
              :class="[
                'grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors',
                i !== books.length - 1 ? 'border-b border-gray-100' : '',
              ]"
            >
              <div class="col-span-4 flex items-center gap-3 min-w-0">
                <!-- object-contain, not cover: book covers are all sorts of
                     aspect ratios and cropping one hides the title on the spine. -->
                <img
                  :src="book.cover_image_url || noImage"
                  :alt="book.title"
                  class="h-11 w-9 shrink-0 rounded border border-gray-100 bg-white object-contain"
                />
                <p class="text-sm font-medium text-gray-900 truncate">{{ book.title }}</p>
              </div>
              <p class="col-span-3 text-sm text-gray-500 truncate">
                {{ book.donor ? `${book.donor.first_name} ${book.donor.last_name}` : '—' }}
              </p>
              <p class="col-span-1 text-xs text-gray-500">{{ book.major?.acronym ?? '—' }}</p>

              <!-- Status is the donor's business and read-only here. Hiding is
                   the moderation lever, and the two are independent — a book can
                   be available and hidden at once. "Requesting" is not a stored
                   status either; it is an open request, shown as a hint. -->
              <div class="col-span-3 flex flex-wrap items-center gap-1.5">
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
                  :class="
                    book.status === 'donated'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-green-100 text-green-700'
                  "
                  >{{ book.status }}</span
                >
                <span
                  v-if="book.open_requests > 0"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                  >{{ book.open_requests }} requested</span
                >
                <span
                  v-if="book.hidden_at"
                  class="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                  >hidden</span
                >
              </div>

              <div class="col-span-1 flex items-center justify-end">
                <!-- Keys 'hidden' and 'delete' pick up their icons from
                     RowActionsMenu's shared map. -->
                <RowActionsMenu
                  :disabled="busyBookId === book.id"
                  :items="[
                    {
                      key: book.hidden_at ? 'unhidden' : 'hidden',
                      label: book.hidden_at ? 'Show' : 'Hide',
                    },
                    { key: 'delete', label: 'Delete', tone: 'danger' },
                  ]"
                  @select="(key) => onBookAction(key, book)"
                />
              </div>
            </div>
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
              class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover hover:cursor-pointer"
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

          <div
            class="min-h-0 overflow-y-auto overscroll-none bg-white rounded-2xl border border-gray-100"
          >
            <div v-if="majors.length === 0" class="text-center py-12 text-gray-400 text-sm">
              No departments yet.
            </div>
            <div
              v-for="(major, i) in majors"
              :key="major.id"
              :class="i !== majors.length - 1 ? 'border-b border-gray-100' : ''"
            >
              <!-- Click the row to see who reviews for this department. -->
              <div
                :class="[
                  'flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors',
                  expandedMajors.has(major.id) ? 'bg-primary/10' : 'hover:bg-primary/5',
                ]"
                @click="toggleMajor(major.id)"
              >
                <svg
                  class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200"
                  :class="expandedMajors.has(major.id) ? 'rotate-90' : ''"
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

                <!-- Its own click target: opening the menu is not opening the row. -->
                <div @click.stop>
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

              <!-- ── Moderators ── -->
              <div v-if="expandedMajors.has(major.id)" class="bg-primary/10 px-6 pb-4 pl-16">
                <p v-if="loadingModeratorsFor.has(major.id)" class="py-3 text-sm text-gray-400">
                  Loading moderators…
                </p>

                <template v-else>
                  <p
                    v-if="!majorModerators.get(major.id)?.length"
                    class="py-3 text-sm text-gray-500"
                  >
                    No moderator assigned. Submissions here are reviewed by admins only — assign
                    someone from the
                    <button
                      type="button"
                      class="font-semibold text-primary hover:underline"
                      @click="activeTab = 'users'"
                    >
                      Users
                    </button>
                    tab.
                  </p>

                  <div
                    v-for="mod in majorModerators.get(major.id)"
                    :key="mod.id"
                    class="flex items-center gap-3 border-b border-gray-200/60 py-2.5 last:border-0"
                  >
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary"
                    >
                      {{ (mod.first_name?.[0] ?? '') + (mod.last_name?.[0] ?? '') || '?' }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-gray-900">
                        {{ mod.first_name }} {{ mod.last_name }}
                      </p>
                      <p class="truncate text-xs text-gray-500">{{ mod.email ?? '—' }}</p>
                    </div>
                    <p class="shrink-0 text-xs text-gray-400">
                      since {{ formatDate(mod.assigned_at) }}
                    </p>
                  </div>
                </template>
              </div>
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
              class="sticky top-0 z-20 grid grid-cols-14 gap-4 border-b border-gray-100 bg-primary px-6 py-3"
            >
              <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">
                Document
              </p>
              <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">
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
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
                Approved by
              </p>
              <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
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
                  'grid grid-cols-14 gap-4 px-6 py-3.5 items-center transition-colors cursor-pointer',
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
                  <p class="min-w-0 truncate text-sm font-medium text-gray-900">
                    {{ doc.title }}
                  </p>
                </div>

                <div class="col-span-1 min-w-0">
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
                  {{ yearMajorLabel(doc.majors?.acronym, doc.year_level) }}
                </p>
                <p class="col-span-2 truncate text-sm text-gray-600">
                  {{ doc.users?.first_name }} {{ doc.users?.last_name }}
                </p>
                <p class="col-span-2 truncate text-sm text-gray-600">
                  <template v-if="doc.approved_by">
                    {{ doc.approved_by.first_name }} {{ doc.approved_by.last_name }}
                  </template>
                  <span v-else class="text-gray-400">&mdash;</span>
                </p>
                <p
                  class="col-span-2 whitespace-nowrap text-xs text-gray-400"
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
                  class="flex w-full items-center gap-3 border-b border-gray-300 py-2 text-left last:border-0 hover:cursor-pointer"
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
              :total="allDocs.length"
              :options="PAGE_SIZE_OPTIONS"
              direction="up"
            />
          </div>
        </template>
      </main>

      <PromotionScheduleModal
        v-if="promotionModalOpen"
        :current-at="promotion?.rollover_at ?? null"
        :saving="promotionSaving"
        @close="promotionModalOpen = false"
        @save="savePromotion"
      />
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
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

  <!-- Placement editor -->
  <Teleport to="body">
    <div
      v-if="placementTarget"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="placementTarget = null"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <h2 class="text-lg font-bold text-gray-900">Change department and year</h2>
        <p class="mt-1 text-sm text-gray-500">{{ placementTarget.name }}</p>

        <div class="mt-5">
          <label class="text-sm font-semibold text-gray-600">Department</label>
          <select
            v-model="placementTarget.major_id"
            class="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option disabled value="">Choose a department</option>
            <option v-for="m in majors" :key="m.id" :value="m.id">{{ m.acronym }}</option>
          </select>
        </div>

        <div class="mt-4">
          <label class="text-sm font-semibold text-gray-600">Academic year</label>
          <select
            v-model="placementTarget.year_level"
            :disabled="!placementTarget.major_id"
            class="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option disabled value="">Choose a year</option>
            <option v-for="y in placementYears" :key="y" :value="String(y)">Year {{ y }}</option>
          </select>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 hover:cursor-pointer"
            @click="placementTarget = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!placementTarget.major_id || !placementTarget.year_level"
            @click="savePlacement"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>

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
    v-if="bookToDelete"
    :target="bookToDelete.title"
    title="Delete book"
    :loading="busyBookId === bookToDelete.id"
    @cancel="bookToDelete = null"
    @confirm="deleteBook"
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
