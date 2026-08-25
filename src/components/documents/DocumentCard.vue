<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { formatRelativeDate } from '@/utils/format'
import type { Upload } from '@/types'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue'
import FolderIcon from '@/components/common/FolderIcon.vue'

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
}>()

const showDeleteModal = ref(false)

// ── Computed helpers ────────────────────────────────────────────────────────

const isOwner = computed(() => auth.user?.id === props.doc.users?.id)

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
       tags. -->
  <article
    class="flex h-full w-full flex-col rounded-lg border bg-white border-[#B9B9B9] px-4 py-5 relative cursor-pointer hover:border-primary transition-colors"
    @click="goToDetails"
  >
    <!-- Owner actions, each with a hover tooltip -->
    <div v-if="isOwner" class="absolute top-3 right-3 flex items-center gap-2">
      <div class="group relative">
        <button
          @click.stop="emit('edit', doc)"
          class="text-gray-300 hover:text-primary transition-colors cursor-pointer"
          :aria-label="t('document.DocumentCard.edit')"
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <span
          class="pointer-events-none absolute right-0 top-full mt-1 z-10 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
        >
          {{ t('document.DocumentCard.edit') }}
        </span>
      </div>

      <div class="group relative">
        <button
          @click.stop="handleDelete"
          class="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
          :aria-label="t('document.DocumentCard.deleteConfirm')"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"
            />
          </svg>
        </button>

        <!-- Tooltip: fades in on hover. pointer-events-none so it never blocks
           the click; right-aligned so it can't overflow the card edge. -->
        <span
          class="pointer-events-none absolute right-0 top-full mt-1 z-10 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
        >
          {{ t('document.DocumentCard.deleteConfirm') }}
        </span>
      </div>
    </div>

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

    <!-- Description
    <p v-if="doc.description" class="mt-2 line-clamp-2 text-sm text-[#9E9E9E]">
      {{ doc.description }}
    </p> -->
    <!-- Doc type — styled like the old tags -->
    <div class="mt-2 flex flex-wrap gap-1">
      <span
        class="inline-flex items-center rounded-full px-4 py-1 text-xs leading-none border-[#1AA8E5] bg-[#B8EDFF] text-[#0082B8]"
        >{{ doc.doc_type }}</span
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
