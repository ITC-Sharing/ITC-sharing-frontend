<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { formatRelativeDate, isExpired } from '@/utils/format'
import type { Upload } from '@/types/documents.types'
import ConfirmDeleteModal from '@/components/base/ConfirmDeleteModal.vue'
import RowActionsMenu, { type RowAction } from '@/components/base/RowActionsMenu.vue'
import FolderIcon from '@/components/base/FolderIcon.vue'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const docs = useDocumentsStore()
const router = useRouter()

const props = defineProps<{
  /** A feed upload; `doc.id` is the upload id, not a file id. */
  doc: Upload
  fileCount?: number
}>()

const emit = defineEmits<{
  (e: 'deleted', id: string): void
  /** The owner asked to edit — the parent opens the editor. */
  (e: 'edit', doc: Upload): void
  /** Owner toggled visibility — the parent reloads. */
  (e: 'hidden-changed', id: string): void
  /** Owner pinned/unpinned — the parent reloads so the order updates. */
  (e: 'pinned-changed', id: string): void
}>()

const showDeleteModal = ref(false)

// ── Computed helpers ────────────────────────────────────────────────────────

const isOwner = computed(() => auth.user?.id === props.doc.users?.id)
const isHidden = computed(() => !!props.doc.hidden_at)
const isPinned = computed(() => !!props.doc.pinned_at)

/**
 * Review state, shown only when it is not the ordinary one. A card is served to
 * its owner in every state now that the dashboard lists them all, so "Under
 * review" and "Not approved" have to be legible here — otherwise a pending
 * upload looks identical to a published one.
 *
 * Expiry comes last because it only ever replaces "published": a rejected or
 * pending upload was never visible to anyone, so saying it has expired would
 * answer a question nobody asked. For an approved one it is the whole story —
 * without it an upload that has quietly left every feed still reads as live.
 */
const reviewBadge = computed(() => {
  if (props.doc.status === 'pending')
    return { label: t('dashboard.documents.statusPending'), tone: 'bg-amber-100 text-amber-700' }
  if (props.doc.status === 'rejected')
    return { label: t('dashboard.documents.statusRejected'), tone: 'bg-red-100 text-red-700' }
  if (isExpired(props.doc.expires_at))
    return { label: t('dashboard.documents.statusExpired'), tone: 'bg-gray-200 text-gray-600' }
  return null
})

async function togglePinned() {
  await docs.setPinned(props.doc.id, !isPinned.value)
  emit('pinned-changed', props.doc.id)
}
const togglingHidden = ref(false)

/**
 * Pin is offered on every card — it bookmarks someone else's document to the
 * top of YOUR listings, so it isn't an owner privilege. Editing, hiding and
 * deleting change the document itself and stay with its uploader.
 */
const cardActions = computed<RowAction[]>(() => [
  {
    // Two keys for one toggle: the menu resolves an icon from the key, so the
    // entry has to say which direction it goes, not just which feature it is.
    key: isPinned.value ? 'unpinned' : 'pinned',
    label: isPinned.value ? t('dashboard.documents.unpin') : t('dashboard.documents.pin'),
  },
  ...(isOwner.value
    ? [
        { key: 'edit', label: t('document.DocumentCard.edit') },
        {
          key: isHidden.value ? 'unhidden' : 'hidden',
          label: isHidden.value ? t('dashboard.documents.unhide') : t('dashboard.documents.hide'),
        },
        {
          key: 'delete',
          label: t('document.DocumentCard.deleteConfirm'),
          tone: 'danger' as const,
        },
      ]
    : []),
])

function onAction(key: string) {
  if (key === 'pinned' || key === 'unpinned') void togglePinned()
  else if (key === 'edit') emit('edit', props.doc)
  else if (key === 'delete') handleDelete()
  else if (key === 'hidden' || key === 'unhidden') void toggleHidden()
}

/** Owner-only, same as edit and delete — available wherever your card appears. */
async function toggleHidden() {
  togglingHidden.value = true
  try {
    await docs.setHidden(props.doc.id, !isHidden.value)
    emit('hidden-changed', props.doc.id)
  } finally {
    togglingHidden.value = false
  }
}

const postBy = computed(() =>
  `${props.doc.users?.first_name ?? ''} ${props.doc.users?.last_name ?? ''}`.trim(),
)

const dateText = computed(() => formatRelativeDate(props.doc.uploaded_at))

// ── Actions ─────────────────────────────────────────────────────────────────

async function handleDelete() {
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
}

async function confirmDelete() {
  await docs.deleteDocument(props.doc.id)
  emit('deleted', props.doc.id)
  closeDeleteModal()
}

function goToDetails() {
  const subjectId = props.doc.subjects?.id
  router.push({
    name: 'document-details',
    query: {
      upload_id: props.doc.id,
      subject_id: subjectId || undefined,
    },
  })
}
</script>

<template>
  <!-- h-full + flex-col so every card fills its grid row and the byline can be
       pinned to the bottom, keeping it aligned across cards with and without
       tags.

       On a phone the grid is a single column, so w-full stretches one card the
       whole width of the screen. max-w-64 holds it to a card shape and mx-auto
       keeps it centred; from sm up the grid decides the width again. -->
  <article
    class="mx-auto flex h-full w-full max-w-64 flex-col rounded-lg border bg-white border-[#B9B9B9] px-4 py-5 relative cursor-pointer hover:border-primary transition-colors sm:max-w-none"
    @click="goToDetails"
  >
    <!-- Shown to any signed-in viewer, since pinning is open to all; the menu
         itself drops the owner-only entries. RowActionsMenu teleports its
         dropdown to <body>, so the menu is never clipped by the card's
         rounded/overflow boundary, and its clicks cannot bubble back into the
         card's own navigate-on-click. -->
    <div v-if="auth.user" class="absolute top-3 right-3" @click.stop>
      <RowActionsMenu :items="cardActions" :disabled="togglingHidden" @select="onAction" />
    </div>

    <!-- Pinned marker, mirroring the actions menu in the opposite corner. Not
         interactive — unpinning goes through the menu, same as pinning. -->
    <svg
      v-if="isPinned"
      class="absolute top-3 left-3 h-4 w-4 text-primary"
      viewBox="0 0 640 640"
      fill="currentColor"
    >
      <path
        d="M160 96C160 78.3 174.3 64 192 64L448 64C465.7 64 480 78.3 480 96C480 113.7 465.7 128 448 128L418.5 128L428.8 262.1C465.9 283.3 494.6 318.5 507 361.8L510.8 375.2C513.6 384.9 511.6 395.2 505.6 403.3C499.6 411.4 490 416 480 416L160 416C150 416 140.5 411.3 134.5 403.3C128.5 395.3 126.5 384.9 129.3 375.2L133 361.8C145.4 318.5 174 283.3 211.2 262.1L221.5 128L192 128C174.3 128 160 113.7 160 96zM288 464L352 464L352 576C352 593.7 337.7 608 320 608C302.3 608 288 593.7 288 576L288 464z"
      />
    </svg>

    <!-- Thumbnail -->
    <div class="flex flex-col items-center justify-center pb-2 gap-1">
      <FolderIcon class="h-25 w-30 text-primary" />
    </div>

    <div class="h-px bg-[#C7C7C7]"></div>

    <!-- Title -->
    <h2 class="mt-3 truncate text-lg font-semibold leading-tight text-black" :title="doc.title">
      {{ doc.title }}
    </h2>

    <!-- Subject -->
    <p v-if="doc.subjects" class="text-[12px] text-gray-400 mt-1">
      <span class="uppercase"
        >{{ doc.subjects.acronym }} &nbsp;•&nbsp; {{ doc.academic_year }}</span
      >
    </p>

    <!-- Doc type — styled like the old tags -->
    <div class="mt-2 flex flex-wrap gap-1">
      <span
        class="inline-flex items-center rounded-full px-4 py-1 text-xs leading-none border-[#1AA8E5] bg-[#B8EDFF] text-[#0082B8]"
        >{{ doc.doc_type }}</span
      >
    </div>

    <!-- Review state and Hidden are different things — a pending upload can
         also be hidden — so they are separate badges on one wrapping row.
         Both are owner-only: nobody else is served a pending or hidden doc. -->
    <div v-if="reviewBadge || isHidden" class="mt-2 flex flex-wrap items-center gap-1.5">
      <span
        v-if="reviewBadge"
        class="inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-medium"
        :class="reviewBadge.tone"
        >{{ reviewBadge.label }}</span
      >
      <span
        v-if="isHidden"
        class="inline-block w-fit rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600"
        >{{ t('dashboard.documents.statusHidden') }}</span
      >
    </div>

    <!-- Author + date — mt-auto pins it to the bottom of the card. -->
    <p class="mt-auto pt-3 text-sm font-semibold leading-none text-[#9E9E9E]">
      {{ postBy }} &nbsp;•&nbsp; {{ dateText }}
    </p>
  </article>

  <ConfirmDeleteModal
    v-if="showDeleteModal"
    :target="doc.title"
    @cancel="closeDeleteModal"
    @confirm="confirmDelete"
  />
</template>
