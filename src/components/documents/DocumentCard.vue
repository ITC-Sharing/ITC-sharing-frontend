<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { formatRelativeDate } from '@/utils/format'
import type { Upload } from '@/types'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const docs = useDocumentsStore()
const router = useRouter()

const props = defineProps<{
  /** A feed upload; `doc.id` is the upload id, not a file id. */
  doc: Upload
  fileCount?: number
}>()

const emit = defineEmits<{ (e: 'deleted', id: string): void }>()

const showDeleteModal = ref(false)

// ── Computed helpers ────────────────────────────────────────────────────────

const isOwner = computed(() => auth.user?.id === props.doc.users?.id)

const postBy = computed(() =>
  `${props.doc.users?.first_name ?? ''} ${props.doc.users?.last_name ?? ''}`.trim(),
)

const dateText = computed(() => formatRelativeDate(props.doc.uploaded_at))

const tags = computed(() => props.doc.document_tags?.map((t) => t.tag) ?? [])

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
    class="flex h-full w-full flex-col rounded-lg border bg-white border-[#B9B9B9] px-4 py-5 relative cursor-pointer hover:border-[#008CB9] transition-colors"
    @click="goToDetails"
  >
    <!-- Delete button (owner only) -->
    <button
      v-if="isOwner"
      @click.stop="handleDelete"
      class="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
      :title="t('common.DocumentCard.deleteConfirm')"
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

    <!-- Thumbnail -->
    <div class="flex flex-col items-center justify-center pb-3 gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-25 w-30">
        <path
          fill="#1D92BC"
          d="M128 512L512 512C547.3 512 576 483.3 576 448L576 208C576 172.7 547.3 144 512 144L362.7 144C355.8 144 349 141.8 343.5 137.6L305.1 108.8C294 100.5 280.5 96 266.7 96L128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512z"
        />
      </svg>
      <span class="text-sm font-semibold text-[#008CB9] capitalize">{{ doc.doc_type }}</span>
    </div>

    <div class="h-px bg-[#C7C7C7]"></div>

    <!-- Title -->
    <h2 class="mt-3 text-lg font-semibold leading-tight text-black">{{ doc.title }}</h2>

    <!-- Subject -->
    <p v-if="doc.subjects" class="text-[12px] text-gray-400 mt-1">
      <span class="uppercase">{{ doc.subjects.slug }} &nbsp;•&nbsp; {{ doc.academic_year }}</span>
    </p>

    <!-- Tags -->
    <div class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center rounded-full px-4 py-1 text-xs leading-none border-[#1AA8E5] bg-[#B8EDFF] text-[#0082B8]"
      >
        {{ tag }}
      </span>
    </div>

    <!-- Author + date — mt-auto pins it to the bottom of the card. -->
    <p class="mt-auto pt-3 text-sm font-semibold leading-none text-[#9E9E9E]">
      {{ postBy }} &nbsp;•&nbsp; {{ dateText }}
    </p>
  </article>

  <Teleport to="body">
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="closeDeleteModal"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <div class="text-center">
          <p class="text-lg font-semibold text-black">
            {{ t('common.DocumentCard.deleteTitle') }} {{ doc.title }}
          </p>
          <p class="mt-2 text-sm text-gray-500">
            {{ t('common.DocumentCard.deleteMessage') }}
          </p>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] bg-white px-4 py-2 text-sm text-black"
            @click="closeDeleteModal"
          >
            {{ t('common.DocumentCard.deleteCancel') }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
            @click="confirmDelete"
          >
            {{ t('common.DocumentCard.deleteConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
