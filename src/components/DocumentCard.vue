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
    id: string
    group_id: string 
    title: string
    doc_type: string
    file_url: string
    original_name?: string | null
    academic_year: string 
    file_size_kb: number
    download_count: number
    view_count: number
    uploaded_at: string
    users: { id: string; first_name: string; last_name: string }
    subjects: { id: string; slug: string } 
    document_tags: { tag: string }[]
  }
  fileCount?: number
  isSaved?: boolean
}>()

const emit = defineEmits<{ (e: 'deleted', id: string): void }>()

const showDeleteModal = ref(false)

// ── Computed helpers ────────────────────────────────────────────────────────

const isOwner = computed(() => auth.user?.id === props.doc.users?.id)

const postBy = computed(() =>
  `${props.doc.users?.first_name ?? ''} ${props.doc.users?.last_name ?? ''}`.trim(),
)

const dateText = computed(() =>
  new Date(props.doc.uploaded_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }),
)

const sizeText = computed(() => {
  const kb = props.doc.file_size_kb
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
})

const tags = computed(() => props.doc.document_tags?.map((t) => t.tag) ?? [])

// Map doc_type → image (keep your existing asset paths)
const docTypeImg: Record<string, string> = {
  notes: '/src/assets/images/note.png',
  assignment: '/src/assets/images/assignment.jpg',
  past_exam: '/src/assets/images/exam.jpg',
  lab: '/src/assets/images/lab.jpg',
}
const img = computed(() => docTypeImg[props.doc.doc_type] ?? '/src/assets/images/assignment.jpg')

const tagClasses = [
  'border-[#1AA8E5] bg-[#B8EDFF] text-[#0082B8]',
  'border-[#D4B100] bg-[#FFF4A6] text-[#C39D00]',
  'border-[#3FBE4E] bg-[#AEF7B9] text-[#1F9A2D]',
]

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const tagClassMap = computed(() => {
  const seed = hashString(props.doc.id ?? '')
  return tags.value.reduce<Record<string, string>>((acc, tag, index) => {
    const bucket = (seed + index) % tagClasses.length
    acc[tag] = tagClasses[bucket] ?? tagClasses[0]
    return acc
  }, {})
})

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
      group_id: props.doc.group_id || undefined,
      subject_id: subjectId || undefined,
    },
  })
}
</script>

<template>
  <article
    class="w-full max-w-70 rounded-lg border bg-white border-[#B9B9B9] px-5 py-7 relative cursor-pointer hover:border-[#008CB9] transition-colors"
    @click="goToDetails"
  >
    <!-- Delete button (owner only) -->
    <button
      v-if="isOwner"
      @click.stop="handleDelete"
      class="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
      title="Delete"
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
    <div class="flex items-center justify-center pb-3">
      <img :src="img" alt="Document Icon" class="h-30 w-40 object-contain" />
    </div>

    <div class="h-px bg-[#C7C7C7]"></div>

    <!-- Title -->
    <h2 class="mt-3 text-2xl font-semibold leading-tight text-black">{{ doc.title }}</h2>

    <!-- Subject -->
    <p v-if="doc.subjects" class="text-sm text-gray-400 mt-1">{{ doc.subjects.slug }} &nbsp;•&nbsp; {{ t('common.DocumentCard.academicYear') }} &nbsp;•&nbsp; {{ doc.academic_year }}</p>


    <!-- Tags -->
    <div class="mt-4 flex flex-wrap gap-1">
      <span
        v-for="(tag, index) in tags"
        :key="`${tag}-${index}`"
        class="inline-flex items-center rounded-full px-4 py-1 text-xs leading-none"
        :class="tagClassMap[tag] ?? tagClasses[index % tagClasses.length]"
      >
        {{ tag }}
      </span>
    </div>

    <!-- File meta -->
    <p class="mt-5 text-sm leading-none text-[#9E9E9E]">
      {{ doc.download_count }} downloads &nbsp;•&nbsp; {{ sizeText }}
      <span v-if="fileCount" class="ml-1">&nbsp;•&nbsp; {{ fileCount }} files</span>
    </p>

    <!-- Author + date -->
    <p class="mt-3 text-sm font-semibold leading-none text-[#9E9E9E]">
      by {{ postBy }} &nbsp;•&nbsp; {{ dateText }}
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
