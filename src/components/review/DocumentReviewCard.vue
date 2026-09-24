<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMajorsStore } from '@/stores/majors.store'
import type { DocumentRow } from '@/components/review/DocumentReviewTable.vue'
import FolderIcon from '@/components/base/FolderIcon.vue'
import {
  audienceLabel as sharedAudienceLabel,
  formatRelativeDate,
  yearMajorLabel,
} from '@/utils/format'

/**
 * One pending submission, as a card.
 *
 * The phone counterpart to DocumentReviewTable: seven columns cannot be read at
 * 400px, so the same facts stack instead. Deliberately a sibling of the table
 * rather than a mode inside it — a table that also renders cards ends up with
 * two layouts fighting over one set of column spans.
 *
 * Presentation only, exactly like the table: rows arrive filtered, expansion is
 * owned by the parent, and every action leaves as an event.
 */
const props = defineProps<{
  doc: DocumentRow
  actioningId?: string | null
}>()

const emit = defineEmits<{
  (e: 'action', key: string, doc: DocumentRow): void
}>()

/**
 * Opening a submission is a page on a phone, not an expanding row: a card has
 * no room for a folder's worth of thumbnails.
 */
const router = useRouter()
function openGroup() {
  void router.push({ name: 'dashboard-review-files', params: { groupId: props.doc.group_id } })
}

// GET /majors is public, so the card can name the audience wherever it renders
// — the same reasoning as the table it mirrors.
const majorsStore = useMajorsStore()
onMounted(() => {
  if (!majorsStore.majors.length) void majorsStore.fetchMajors()
})

/** Set while this submission's approve/reject is in flight. */
const busy = computed(() => props.actioningId === props.doc.group_id)

const submitter = computed(() =>
  `${props.doc.users?.first_name ?? ''} ${props.doc.users?.last_name ?? ''}`.trim(),
)

/** "I3-GIC" — the department and year the submission belongs to. */
const levelLabel = computed(() => yearMajorLabel(props.doc.majors?.acronym, props.doc.year_level))

const visibleTo = computed(() => sharedAudienceLabel(props.doc.audience, majorsStore.majors))

const expiresText = computed(() => {
  const at = props.doc.expires_at
  if (!at) return 'Never'
  return new Date(at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
})
</script>

<template>
  <!-- Three bands: what it is, the submission's own facts, then its files. -->
  <article class="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <!-- Identifier row -->
    <div class="flex items-center justify-between gap-2 px-4 py-2.5">
      <p class="flex min-w-0 items-center gap-2 text-sm text-gray-500">
        <span class="truncate uppercase">{{ doc.subjects?.acronym ?? '—' }}</span>
        <span v-if="doc.academic_year" class="shrink-0 text-gray-400">
          • {{ doc.academic_year }}
        </span>
      </p>
    </div>

    <div class="h-px bg-gray-100"></div>

    <!-- The submission. The whole band opens its file list, so the tap target
         is the card rather than an arrow the thumb has to find. -->
    <button
      type="button"
      class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:cursor-pointer hover:bg-primary/5"
      @click="openGroup"
    >
      <FolderIcon class="h-9 w-11 shrink-0 text-primary" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-base font-semibold leading-tight text-black" :title="doc.title">
          {{ doc.title }}
        </p>
        <p class="mt-0.5 truncate text-xs text-gray-400">
          {{ doc.doc_type }} · {{ doc.fileCount }} {{ doc.fileCount === 1 ? 'file' : 'files' }}
        </p>
      </div>
      <svg
        class="mt-1 h-4 w-4 shrink-0 text-gray-400"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6" />
      </svg>
    </button>

    <div class="h-px bg-gray-100"></div>

    <!-- The facts a reviewer decides on. Visible to and Expires are properties
         of the submission, not of any one file, so they sit here rather than
         under the list. -->
    <dl class="flex flex-col gap-1.5 px-4 py-3 text-xs">
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Submitted by</dt>
        <dd class="truncate font-medium text-gray-700">{{ submitter || '—' }}</dd>
      </div>
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Submitted</dt>
        <dd class="font-medium text-gray-700">{{ formatRelativeDate(doc.uploaded_at) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Major</dt>
        <dd class="font-medium text-gray-700">{{ levelLabel }}</dd>
      </div>
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Visible to</dt>
        <dd class="truncate font-medium text-gray-700" :title="visibleTo">{{ visibleTo }}</dd>
      </div>
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Expires</dt>
        <dd class="font-medium text-gray-700">{{ expiresText }}</dd>
      </div>
    </dl>

    <!-- The decision, spelled out. A ⋮ menu hides the only two things this
         card exists for, and costs a tap to reach either of them. Same colours
         and wording as the per-submission review page, so one decision looks
         the same wherever it is made. -->
    <div class="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
      <button
        type="button"
        class="flex-1 rounded-x border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50"
        :disabled="busy"
        @click.stop="emit('action', 'reject', doc)"
      >
        Reject
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-primary-hover disabled:opacity-50"
        :disabled="busy"
        @click.stop="emit('action', 'approve', doc)"
      >
        Approve
      </button>
    </div>
  </article>
</template>
