<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { isExpired } from '@/utils/format'
import ConfirmDeleteModal from '@/components/base/ConfirmDeleteModal.vue'
import RowActionsMenu, { type RowAction } from '@/components/base/RowActionsMenu.vue'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const docs = useDocumentsStore()
const router = useRouter()

const props = defineProps<{
  doc: {
    id: string // upload id
    title: string
    doc_type: string
    academic_year?: string | null
    description?: string | null
    uploaded_at: string
    users: { id: string; first_name: string; last_name: string } | null
    documents?: { file_size_kb?: number | null }[]
    status?: string
    hidden_at?: string | null
    /** Soft expiry (ISO). null/absent = never. */
    expires_at?: string | null
    pinned_at?: string | null
    majors?: { acronym: string } | null
    subjects?: { name: string; acronym?: string; semester?: number | null } | null
  }
  /**
   * Render the columns that only make sense on your own dashboard: review
   * status (instead of "Upload by", which is always you), plus department,
   * subject and semester. On the public feed the uploader matters and status
   * is always 'active', so it stays off there.
   */
  showOwnerColumns?: boolean
  fileCount?: number
}>()

const emit = defineEmits<{
  (e: 'deleted', id: string): void
  /** Owner toggled visibility — the parent reloads. */
  (e: 'hidden-changed', id: string): void
}>()

const isHidden = computed(() => !!props.doc.hidden_at)
const togglingHidden = ref(false)

/**
 * The one badge in the status column, as a computed rather than the nested
 * ternary this used to be in the template — a fourth state made that
 * unreadable, and the precedence is the part worth being able to see.
 *
 * Hidden first: it is the owner's own switch and outranks anything the
 * document did on its own. Then the review states. Expiry comes last because
 * it only ever replaces "published" — a pending or rejected upload was never
 * in anyone's feed, so calling it expired answers a question nobody asked.
 */
const statusBadge = computed(() => {
  if (isHidden.value)
    return { label: t('dashboard.documents.statusHidden'), tone: 'bg-gray-200 text-gray-600' }
  if (props.doc.status === 'rejected')
    return { label: t('dashboard.documents.statusRejected'), tone: 'bg-red-100 text-red-700' }
  if (props.doc.status === 'pending')
    return { label: t('dashboard.documents.statusPending'), tone: 'bg-amber-100 text-amber-700' }
  if (isExpired(props.doc.expires_at))
    return { label: t('dashboard.documents.statusExpired'), tone: 'bg-gray-200 text-gray-600' }
  return { label: t('dashboard.documents.statusActive'), tone: 'bg-primary/10 text-primary' }
})

/** Both are owner actions, available wherever your row appears. */
const rowActions = computed<RowAction[]>(() => [
  {
    key: isHidden.value ? 'unhidden' : 'hidden',
    label: isHidden.value ? t('dashboard.documents.unhide') : t('dashboard.documents.hide'),
  },
  { key: 'delete', label: t('dashboard.documents.delete'), tone: 'danger' as const },
])

function onAction(key: string) {
  if (key === 'delete') showDeleteModal.value = true
  else if (key === 'hidden' || key === 'unhidden') void toggleHidden()
}

async function toggleHidden() {
  togglingHidden.value = true
  try {
    await docs.setHidden(props.doc.id, !isHidden.value)
    emit('hidden-changed', props.doc.id)
  } finally {
    togglingHidden.value = false
  }
}

const showDeleteModal = ref(false)

const isOwner = computed(() => auth.user?.id === props.doc.users?.id)

const postBy = computed(() =>
  `${props.doc.users?.first_name ?? ''} ${props.doc.users?.last_name ?? ''}`.trim(),
)

const dateText = computed(() => new Date(props.doc.uploaded_at).toLocaleDateString('en-GB'))

const sizeText = computed(() => {
  const kb = (props.doc.documents ?? []).reduce((s, f) => s + (f.file_size_kb ?? 0), 0)
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
})

function goToDetails() {
  router.push({ name: 'document-details', query: { upload_id: props.doc.id } })
}

async function confirmDelete() {
  await docs.deleteDocument(props.doc.id)
  emit('deleted', props.doc.id)
  showDeleteModal.value = false
}
</script>

<template>
  <div
    class="grid grid-cols-1 gap-3 items-start px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
    :class="
      showOwnerColumns
        ? 'md:grid-cols-[2fr_90px_100px_90px_120px_110px_40px]'
        : 'md:grid-cols-[2fr_120px_100px_160px_110px_40px]'
    "
    @click="goToDetails"
  >
    <!-- Name col: icon + title + type -->
    <!-- items-center INSIDE the cell: the icon centres against the two-line
         title+type block. The outer grid stays items-start so the other columns
         still line up with the title. -->
    <div class="flex items-center gap-3 min-w-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="shrink-0 w-8 h-8">
        <path
          fill="#008CB9"
          d="M128 512L512 512C547.3 512 576 483.3 576 448L576 208C576 172.7 547.3 144 512 144L362.7 144C355.8 144 349 141.8 343.5 137.6L305.1 108.8C294 100.5 280.5 96 266.7 96L128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512z"
        />
      </svg>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
        <p class="text-xs text-primary font-medium mt-0.5">{{ doc.doc_type }}</p>
      </div>
    </div>

    <!-- Department / subject / semester — dashboard only -->
    <template v-if="showOwnerColumns">
      <span class="text-sm text-gray-500 pt-0.5 text-center">{{ doc.majors?.acronym || '—' }}</span>
      <span
        class="text-sm text-gray-500 truncate pt-0.5 text-center"
        :title="doc.subjects?.name ?? ''"
        >{{ doc.subjects?.acronym || doc.subjects?.name || '—' }}</span
      >
      <span class="text-sm text-gray-500 pt-0.5 text-center">{{
        doc.subjects?.semester ?? '—'
      }}</span>
    </template>

    <!-- Academic year — public feed only, like file size above. -->
    <span v-if="!showOwnerColumns" class="text-sm text-gray-500 text-center">{{
      doc.academic_year || '—'
    }}</span>

    <!-- File size — public feed only; the dashboard trades it for the
         department/subject/semester columns rather than carrying both. -->
    <div v-if="!showOwnerColumns" class="text-sm text-gray-500 text-center">
      {{ sizeText }}
      <span class="block text-xs text-gray-400">{{
        t('document.documentDetailsPage.filesCount', fileCount ?? 0)
      }}</span>
    </div>

    <!-- Upload by, or review status when the list is your own uploads -->
    <span v-if="!showOwnerColumns" class="text-sm text-gray-500 pt-0.5 text-center">{{
      postBy
    }}</span>
    <span v-else class="block pt-0.5 text-center">
      <span
        :class="['inline-block rounded-full px-2 py-0.5 text-xs font-medium', statusBadge.tone]"
        >{{ statusBadge.label }}</span
      >
    </span>

    <!-- Date -->
    <span class="text-sm text-gray-500 pt-0.5 text-center">{{ dateText }}</span>

    <!-- Owner actions. RowActionsMenu teleports its dropdown to <body>: this
         panel scrolls horizontally, which would clip an absolutely positioned
         menu. -->
    <div class="flex items-center justify-center -mt-1" @click.stop>
      <RowActionsMenu
        v-if="isOwner"
        :items="rowActions"
        :disabled="togglingHidden"
        @select="onAction"
      />
    </div>
  </div>

  <ConfirmDeleteModal
    v-if="showDeleteModal"
    :target="doc.title"
    @cancel="showDeleteModal = false"
    @confirm="confirmDelete"
  />
</template>
