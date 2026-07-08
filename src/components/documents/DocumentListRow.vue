<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'

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
    uploaded_at: string
    users: { id: string; first_name: string; last_name: string }
    document_tags?: { tag: string }[]
    documents?: { file_size_kb?: number }[]
  }
  fileCount?: number
}>()

const emit = defineEmits<{ (e: 'deleted', id: string): void }>()

const showDeleteModal = ref(false)

const isOwner = computed(() => auth.user?.id === props.doc.users?.id)

const tags = computed(() => props.doc.document_tags?.map((tag) => tag.tag) ?? [])

const postBy = computed(() =>
  `${props.doc.users?.first_name ?? ''} ${props.doc.users?.last_name ?? ''}`.trim(),
)

const dateText = computed(() =>
  new Date(props.doc.uploaded_at).toLocaleDateString('en-GB'),
)

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
    class="grid grid-cols-1 md:grid-cols-[2fr_120px_160px_100px_160px_110px_40px] gap-3 items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
    @click="goToDetails"
  >
    <!-- Name col: icon + title + type -->
    <div class="flex items-center gap-3 min-w-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="shrink-0 w-8 h-8">
        <path fill="#008CB9" d="M128 512L512 512C547.3 512 576 483.3 576 448L576 208C576 172.7 547.3 144 512 144L362.7 144C355.8 144 349 141.8 343.5 137.6L305.1 108.8C294 100.5 280.5 96 266.7 96L128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512z"/>
      </svg>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
        <p class="text-xs text-[#008CB9] font-medium mt-0.5">{{ doc.doc_type }}</p>
      </div>
    </div>

    <!-- Academic year -->
    <span class="text-sm text-gray-500">{{ doc.academic_year || '—' }}</span>

    <!-- Tags -->
    <div class="flex items-center gap-1 flex-wrap">
      <span
        v-for="tag in tags"
        :key="tag"
        class="text-xs px-2.5 py-0.5 rounded-full bg-[#B8EDFF] text-[#0082B8]"
      >{{ tag }}</span>
      <span v-if="!tags.length" class="text-sm text-gray-300">—</span>
    </div>

    <!-- File size -->
    <div class="text-sm text-gray-500">
      {{ sizeText }}
      <span class="block text-xs text-gray-400">{{ t('document.documentDetailsPage.filesCount', fileCount ?? 0) }}</span>
    </div>

    <!-- Upload by -->
    <span class="text-sm text-gray-500">{{ postBy }}</span>

    <!-- Date -->
    <span class="text-sm text-gray-500">{{ dateText }}</span>

    <!-- Delete (owner only) -->
    <div class="flex justify-center" @click.stop>
      <button
        v-if="isOwner"
        @click="showDeleteModal = true"
        class="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Delete confirm modal -->
  <Teleport to="body">
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      @click.self="showDeleteModal = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <div class="text-center">
          <p class="text-lg font-semibold text-black">{{ t('common.DocumentCard.deleteTitle') }} {{ doc.title }}</p>
          <p class="mt-2 text-sm text-gray-500">{{ t('common.DocumentCard.deleteMessage') }}</p>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            class="rounded-xl border border-[#B0B0B0] bg-white px-4 py-2 text-sm text-black"
            @click="showDeleteModal = false"
          >{{ t('common.DocumentCard.deleteCancel') }}</button>
          <button
            class="rounded-xl bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
            @click="confirmDelete"
          >{{ t('common.DocumentCard.deleteConfirm') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
