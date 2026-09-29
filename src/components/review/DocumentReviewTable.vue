<script setup lang="ts">
/**
 * Two root nodes (the table and the teleported tooltip) mean Vue has no single
 * element to hang fallthrough attributes on, so anything a parent passes —
 * `class` included — is dropped. Bind them to the table by hand.
 */
defineOptions({ inheritAttrs: false })

import { onMounted, reactive, ref } from 'vue'
import { useMajorsStore } from '@/stores/majors.store'
import type { UploadFile } from '@/types/documents.types'
import FilePreviewThumb from '@/components/documents/FilePreviewThumb.vue'
import FolderIcon from '@/components/base/FolderIcon.vue'
import RowActionsMenu from '@/components/base/RowActionsMenu.vue'
import {
  audienceLabel as sharedAudienceLabel,
  formatRelativeDate,
  yearMajorLabel,
} from '@/utils/format'

/**
 * The pending-documents table, shared by the admin dashboard and the moderator
 * review page so the two cannot drift apart.
 *
 * Presentation only. Rows arrive already filtered and paged, expansion is owned
 * by the parent, and every action leaves as an event — the page that owns the
 * queue owns what happens to it.
 */
export interface DocumentRow {
  id: string
  group_id: string
  title: string
  doc_type: string
  uploaded_at: string
  review_scope: 'group' | 'file'
  fileCount: number
  files: UploadFile[]
  users: { first_name?: string; last_name?: string } | null
  majors: { acronym?: string } | null
  year_level: number | null
  academic_year?: string | null
  audience?: { major_id: string; year_level: number }[]
  expires_at?: string | null
  subjects?: { name?: string; acronym?: string | null } | null
}

const props = defineProps<{
  rows: DocumentRow[]
  /** Which groups are open. An array rather than a Set so it is prop-friendly. */
  expandedIds: string[]
  actioningId?: string | null
}>()

const emit = defineEmits<{
  (e: 'toggle', groupId: string): void
  (e: 'action', key: string, doc: DocumentRow): void
  (e: 'preview', file: UploadFile): void
}>()

/**
 * Who an upload reaches, as "I3-GIC, I4-GIM".
 *
 * Resolved here rather than passed in: both pages want the same answer, and
 * when one of them supplied it and the other could not, moderators saw a bare
 * "Year 3" with no department. GET /majors is public, so this table can name
 * them wherever it is rendered.
 *
 * An empty audience means the uploader targeted no cohort — that is everyone,
 * and saying so beats a blank that could equally mean "not loaded".
 */
const majorsStore = useMajorsStore()

onMounted(() => {
  if (!majorsStore.majors.length) void majorsStore.fetchMajors()
})

/** Thin wrapper so the template keeps its one-argument call. */
function audienceLabel(audience: { major_id: string; year_level: number }[]) {
  return sharedAudienceLabel(audience, majorsStore.majors)
}

/**
 * The full subject name, on hover over its acronym.
 *
 * Owned here rather than passed in: it is how this table behaves, and wiring it
 * per page meant one page had it and the other silently did not. Teleported to
 * <body> because the table scrolls, and a scroll box cannot paint outside
 * itself — the popup would be clipped on the rows nearest the bottom.
 */
const hoveredSubject = ref('')
const hoveredAt = reactive({ left: 0, top: 0 })

function showSubjectName(name: string | null | undefined, event: MouseEvent) {
  if (!name) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  hoveredSubject.value = name
  hoveredAt.left = rect.left + rect.width / 2
  hoveredAt.top = rect.bottom + 8
}

function hideSubjectName() {
  hoveredSubject.value = ''
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
}
</script>

<template>
  <div
    v-bind="$attrs"
    class="flex min-h-0 flex-col overflow-y-auto overscroll-none rounded-2xl border border-gray-100 bg-white"
  >
    <div
      class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-b border-gray-100 bg-primary px-6 py-3"
    >
      <p class="col-span-3 text-xs font-semibold text-white uppercase tracking-wide">Document</p>
      <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">Type</p>
      <!-- The subject shows its acronym, so one column does what
       the full name needed two for. -->
      <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">Subject</p>
      <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">Major</p>
      <p
        class="col-span-2 whitespace-nowrap text-xs font-semibold text-white uppercase tracking-wide"
      >
        Academic year
      </p>
      <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">Uploader</p>
      <p
        class="col-span-1 whitespace-nowrap text-xs font-semibold text-white uppercase tracking-wide"
      >
        Submitted
      </p>
      <p class="col-span-1 text-right text-xs font-semibold text-white uppercase tracking-wide">
        Actions
      </p>
    </div>
    <!-- The line that closes a group. Primary while the group is expanded, so
         the band of colour runs from its header down to the line that ends it;
         the quiet gray otherwise. -->
    <div
      v-for="(doc, i) in props.rows"
      :key="doc.group_id"
      :class="[
        i !== props.rows.length - 1 ? 'border-b' : '',
        props.expandedIds.includes(doc.group_id) ? 'border-primary' : 'border-gray-100',
      ]"
    >
      <div
        :class="[
          'group grid cursor-pointer grid-cols-12 items-center gap-4 px-6 py-2 transition-colors',
          props.expandedIds.includes(doc.group_id) ? 'bg-primary/10' : 'hover:bg-primary/5',
        ]"
        @click="emit('toggle', doc.group_id)"
      >
        <div class="col-span-3 flex min-w-0 items-center gap-2">
          <svg
            :class="[
              'h-4 w-4 shrink-0 text-gray-400 transition-transform',
              props.expandedIds.includes(doc.group_id) ? 'rotate-90' : '',
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
              <p class="truncate text-sm font-medium text-gray-900 group-hover:text-primary">
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
            </div>
          </div>
        </div>

        <div class="col-span-2 min-w-0">
          <span
            class="inline-block max-w-full truncate rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
            >{{ doc.doc_type }}</span
          >
        </div>

        <!-- Acronym, with the full name on hover: a subject name
         can be long enough to push the row out of shape. -->
        <p
          class="col-span-1 w-fit truncate text-sm text-gray-600"
          @mouseenter="showSubjectName(doc.subjects?.name, $event)"
          @mouseleave="hideSubjectName"
        >
          {{ doc.subjects?.acronym ?? doc.subjects?.name ?? '—' }}
        </p>
        <p class="col-span-1 truncate text-sm text-gray-600">
          {{ yearMajorLabel(doc.majors?.acronym, doc.year_level) }}
        </p>
        <p class="col-span-2 whitespace-nowrap text-sm text-gray-600">
          {{ doc.academic_year ?? '—' }}
        </p>
        <p class="col-span-1 truncate text-sm text-gray-600">
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
            :disabled="props.actioningId === doc.group_id"
            :items="[
              { key: 'approve', label: 'Approve', tone: 'success' },
              { key: 'reject', label: 'Reject', tone: 'danger' },
            ]"
            @select="(key) => emit('action', key, doc)"
          />
        </div>
      </div>

      <!-- Files in this submission -->
      <div v-if="props.expandedIds.includes(doc.group_id)" class="bg-primary/10 pb-1 pl-18 pr-9">
        <button
          v-for="file in doc.files"
          :key="file.id"
          type="button"
          class="flex w-full items-center gap-3 border-b border-gray-300 py-2 text-left transition-colors last:border-0 hover:cursor-pointer"
          @click.stop="emit('preview', file)"
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

        <!-- Properties of the upload, not of any one file, so they
         sit once beneath the list. Both matter to a reviewer:
         who the material reaches, and whether it stops being
         visible on a date. -->
        <div
          class="mt-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 pt-1 pb-2 text-xs text-gray-500"
        >
          <p>
            <span class="font-semibold text-gray-600">Visible to:</span>
            {{ audienceLabel(doc.audience ?? []) }}
          </p>
          <p>
            <span class="font-semibold text-gray-600">Expires:</span>
            {{ doc.expires_at ? formatDate(doc.expires_at) : 'Never' }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Teleported out of the scrolling table so it is never clipped. -->
  <Teleport to="body">
    <p
      v-if="hoveredSubject"
      class="pointer-events-none fixed z-[60] max-w-[260px] -translate-x-1/2 truncate rounded-full bg-[#E6F4F8] px-3 py-1.5 text-center text-[11px] font-medium text-primary shadow-sm"
      :style="{ left: `${hoveredAt.left}px`, top: `${hoveredAt.top}px` }"
    >
      {{ hoveredSubject }}
    </p>
  </Teleport>
</template>
