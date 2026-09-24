<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/http'
import { useToast } from '@/composables/useToast'
import LoadingSpinner from '@/components/base/LoadingSpinner.vue'
import SubjectReviewTable from '@/components/review/SubjectReviewTable.vue'
import SubjectReviewCard from '@/components/review/SubjectReviewCard.vue'
import DocumentReviewTable, { type DocumentRow } from '@/components/review/DocumentReviewTable.vue'
import DocumentReviewCard from '@/components/review/DocumentReviewCard.vue'
import type { UploadFile } from '@/types/documents.types'

/**
 * The review queue, for department moderators.
 *
 * Deliberately its own page rather than a doorway into the admin dashboard: a
 * moderator is an ordinary student who also reviews, and sending them into a
 * screen headed "Admin Panel" — past tabs they cannot open — reads as a place
 * they do not belong.
 *
 * It calls the same endpoints the admin screen does, so the two cannot disagree
 * about what is pending or who may act. Nothing here decides permissions: the
 * server returns only the departments this reviewer covers, and refuses any
 * action outside them whatever the client sends.
 */
const { showToast } = useToast()
const route = useRoute()
const router = useRouter()

/**
 * Which queue this page is showing. The two are separate routes rather than a
 * tab, so a reviewer can link to one and the sidebar can mark the right entry
 * active — the same shape Book Activity uses.
 */
const section = computed<'subjects' | 'documents'>(() =>
  route.name === 'dashboard-review-documents' ? 'documents' : 'subjects',
)

/**
 * Mobile tabs for the two queues, the same pattern Book Activity uses: the
 * sidebar shows these as sub-entries on desktop, but on a phone it collapses to
 * one icon per group, so without these the Documents queue is unreachable.
 */
const sections = [
  { value: 'subjects', label: 'Subjects', route: 'dashboard-review-subjects' },
  { value: 'documents', label: 'Documents', route: 'dashboard-review-documents' },
] as const

function goToSection(name: string) {
  router.push({ name })
}

/**
 * The departments this reviewer answers for, named in the header so the queue's
 * scope is visible rather than implied. Comes from the server's own assignment
 * table (GET /admin/scope) — the client is told what it may review, it never
 * says so. An admin gets `majors: null`, meaning every department.
 */
type ReviewerScope = { is_admin: boolean; majors: { id: string; acronym: string }[] | null }
const scope = ref<ReviewerScope | null>(null)

const scopeLabel = computed(() => {
  if (!scope.value) return ''
  if (scope.value.majors === null) return 'All departments'
  if (!scope.value.majors.length) return 'No departments assigned'
  return scope.value.majors.map((m) => m.acronym).join(', ')
})

interface PendingSubject {
  id: string
  name: string
  year_level: number | null
  majors?: { acronym?: string } | null
  users?: { first_name?: string; last_name?: string } | null
  created_at?: string
}

interface PendingFile {
  id: string
  group_id: string
  title: string
  original_name: string | null
  file_status?: string
  doc_type?: string
  uploaded_at?: string
  year_level: number | null
  majors?: { acronym?: string } | null
  users?: { first_name?: string; last_name?: string } | null
  /** 'group' — the whole upload is pending. 'file' — only added files are. */
  review_scope?: 'group' | 'file'
}

const subjects = ref<PendingSubject[]>([])
const files = ref<PendingFile[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
/** Which row has its reason box open; a rejection must say why. */
const rejecting = ref<string | null>(null)
const reason = ref('')

/**
 * The flat file rows, folded back into the uploads they came from — the API
 * returns one row per file and repeats the upload's details on each.
 */
const groups = computed<DocumentRow[]>(() => {
  const byGroup = new Map<string, DocumentRow>()
  for (const file of files.value) {
    const entry = byGroup.get(file.group_id)
    if (entry) {
      entry.files.push(file as unknown as UploadFile)
      entry.fileCount++
    } else {
      byGroup.set(file.group_id, {
        ...(file as unknown as DocumentRow),
        files: [file as unknown as UploadFile],
        fileCount: 1,
      })
    }
  }
  return [...byGroup.values()]
})

/** Which groups are open. The shared table takes an array, not a Set. */
const expandedIds = ref<string[]>([])

function toggleExpanded(groupId: string) {
  expandedIds.value = expandedIds.value.includes(groupId)
    ? expandedIds.value.filter((id) => id !== groupId)
    : [...expandedIds.value, groupId]
}

/** The upload awaiting a reason, when Reject was pressed on one. */
const rejectingGroup = computed(
  () => groups.value.find((g) => g.group_id === rejecting.value) ?? null,
)

/** The subject awaiting a reason, when Reject was pressed on one. */
const rejectingSubject = computed(
  () => subjects.value.find((s) => s.id === rejecting.value) ?? null,
)

const visibleCount = computed(() =>
  section.value === 'subjects' ? subjects.value.length : groups.value.length,
)

async function load() {
  loading.value = true
  try {
    const [s, d] = await Promise.all([
      api.get('/admin/pending/subjects'),
      api.get('/admin/pending/documents'),
    ])
    subjects.value = s.data
    files.value = d.data
  } catch {
    showToast('Could not load the review queue', { type: 'error' })
  } finally {
    loading.value = false
  }
}

function startReject(id: string) {
  rejecting.value = id
  reason.value = ''
}

function cancelReject() {
  rejecting.value = null
  reason.value = ''
}

/** Every action goes through here so the queue is always refetched after one. */
async function act(id: string, path: string, body?: Record<string, unknown>) {
  busyId.value = id
  try {
    await api.patch(path, body ?? {})
    showToast(body?.reason ? 'Rejected' : 'Approved', { duration: 5000 })
    cancelReject()
    await load()
  } catch (e) {
    showToast(
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'That action was refused',
      { type: 'error' },
    )
  } finally {
    busyId.value = null
  }
}

const approveSubject = (s: { id: string }) => act(s.id, `/admin/subjects/${s.id}/approve`)

/**
 * The shared table offers Edit as well, which is an admin nicety — renaming a
 * subject is not part of reviewing one. Here it is ignored, and Reject opens
 * the reason box the page already uses.
 */
function onDocAction(key: string, doc: { group_id: string }) {
  if (key === 'approve') void approveGroup(doc)
  else if (key === 'reject') startReject(doc.group_id)
}

function onSubjectAction(key: string, subject: { id: string }) {
  if (key === 'approve') void approveSubject(subject)
  else if (key === 'reject') startReject(subject.id)
}

const rejectSubject = (s: { id: string }) =>
  act(s.id, `/admin/subjects/${s.id}/reject`, { reason: reason.value.trim() })

const approveGroup = (g: { group_id: string }) =>
  act(g.group_id, `/admin/documents/group/${g.group_id}/approve`)
const rejectGroup = (g: { group_id: string }) =>
  act(g.group_id, `/admin/documents/group/${g.group_id}/reject`, {
    reason: reason.value.trim(),
  })

async function loadScope() {
  try {
    const { data } = await api.get<ReviewerScope>('/admin/scope')
    scope.value = data
  } catch {
    // The header simply stays quiet — a failed scope lookup must not stop the
    // queues from rendering.
  }
}

onMounted(() => {
  void load()
  void loadScope()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Review submissions
      </h1>
      <!-- Siblings, not nested: the row is justify-between, so the scope only
           lands on the right once it stops sharing a box with the title. It
           stays in the header rather than the empty state, so the scope is
           visible when there IS work — a short queue and a narrow scope look
           the same otherwise. -->
      <p v-if="scopeLabel" class="text-sm text-gray-500">
        Moderator: <span class="font-semibold text-gray-700">{{ scopeLabel }}</span>
      </p>
    </div>

    <!-- Mobile tabs (desktop uses the sidebar sub-nav). -->
    <div class="md:hidden flex flex-wrap justify-center items-center gap-1.5">
      <button
        v-for="tab in sections"
        :key="tab.value"
        @click="goToSection(tab.route)"
        :class="[
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
          section === tab.value
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-24"><LoadingSpinner /></div>

    <div
      v-else-if="visibleCount === 0"
      class="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center"
    >
      <p class="text-sm font-medium text-gray-600">Nothing to review</p>
      <p class="mt-1 text-xs text-gray-400">
        New submissions from your departments will appear here.
      </p>
    </div>

    <template v-else>
      <!-- Subjects — the same table the admin dashboard renders. -->
      <section
        v-if="section === 'subjects' && subjects.length"
        class="flex min-h-0 flex-1 flex-col gap-3"
      >
        <!-- The shared table has no reason field of its own, so it asks here.
             A rejection must say why: the submitter sees this and nothing else. -->
        <div
          v-if="rejectingSubject"
          class="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3"
        >
          <p class="text-sm text-gray-600">
            Rejecting <span class="font-semibold">{{ rejectingSubject.name }}</span>
          </p>
          <input
            v-model="reason"
            type="text"
            placeholder="Why is it being rejected?"
            class="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            :disabled="!reason.trim() || busyId === rejectingSubject.id"
            class="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-red-600 disabled:opacity-50"
            @click="rejectSubject(rejectingSubject)"
          >
            Confirm
          </button>
          <button
            type="button"
            class="rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 transition hover:cursor-pointer hover:bg-gray-100"
            @click="cancelReject"
          >
            Cancel
          </button>
        </div>

        <!-- min-h-0 flex-1: the table has overflow-y-auto of its own, but a
             flex child will not shrink below its content without min-h-0, so
             without this it grows and the page scrolls instead. -->
        <!-- Cards on a phone, the table from md up — the same split the
             documents queue uses, driven by the same rows and events. -->
        <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-primary md:hidden">
          <SubjectReviewCard
            v-for="subject in subjects"
            :key="subject.id"
            :subject="subject"
            :actioning-id="busyId"
            @action="onSubjectAction"
          />
        </div>

        <SubjectReviewTable
          class="hidden min-h-0 flex-1 md:flex"
          :rows="subjects"
          :actioning-id="busyId"
          @action="onSubjectAction"
        />
      </section>

      <!-- Documents — the same table the admin dashboard renders. -->
      <section
        v-if="section === 'documents' && groups.length"
        class="flex min-h-0 flex-1 flex-col gap-3"
      >
        <!-- The shared table has no reason field, so it asks here. -->
        <div
          v-if="rejectingGroup"
          class="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3"
        >
          <p class="text-sm text-gray-600">
            Rejecting <span class="font-semibold">{{ rejectingGroup.title }}</span>
          </p>
          <input
            v-model="reason"
            type="text"
            placeholder="Why is it being rejected?"
            class="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            :disabled="!reason.trim() || busyId === rejectingGroup.group_id"
            class="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-red-600 disabled:opacity-50"
            @click="rejectGroup(rejectingGroup)"
          >
            Confirm
          </button>
          <button
            type="button"
            class="rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 transition hover:cursor-pointer hover:bg-gray-100"
            @click="cancelReject"
          >
            Cancel
          </button>
        </div>

        <!-- Cards on a phone, the table from md up: seven columns cannot be read
             at 400px, and a table that also renders cards ends up with two
             layouts fighting over one set of column spans. Both are driven by
             the same rows, expansion and events. -->
        <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-primary md:hidden">
          <DocumentReviewCard
            v-for="doc in groups"
            :key="doc.group_id"
            :doc="doc"
            :actioning-id="busyId"
            @action="onDocAction"
          />
        </div>

        <DocumentReviewTable
          class="hidden min-h-0 flex-1 md:flex"
          :rows="groups"
          :expanded-ids="expandedIds"
          :actioning-id="busyId"
          @toggle="toggleExpanded"
          @action="onDocAction"
        />
      </section>
    </template>
  </div>
</template>
