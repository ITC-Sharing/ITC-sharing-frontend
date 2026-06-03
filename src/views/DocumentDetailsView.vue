<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents.store'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const docs = useDocumentsStore()

const uploadId = computed(() => String(route.query.upload_id ?? ''))
const canLoad = computed(() => !!uploadId.value)

const upload = computed(() => docs.currentUpload)
const files = computed(() => upload.value?.documents ?? [])
const pageTitle = computed(() => upload.value?.title || 'Document Details')

type UploadFile = {
  id: string
  file_url: string
  file_size_kb: number
  original_name?: string | null
  download_count?: number
}


function getFileIcon(name: string | null | undefined): { bg: string; label: string } {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { bg: 'bg-red-500', label: 'PDF' }
  if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-500', label: 'DOC' }
  if (['xls', 'xlsx'].includes(ext)) return { bg: 'bg-green-500', label: 'XLS' }
  if (['ppt', 'pptx'].includes(ext)) return { bg: 'bg-orange-500', label: 'PPT' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return { bg: 'bg-purple-500', label: 'IMG' }
  if (['zip', 'rar', '7z'].includes(ext)) return { bg: 'bg-yellow-500', label: 'ZIP' }
  return { bg: 'bg-gray-400', label: 'FILE' }
}

function formatSize(kb: number): string {
  if (!kb) return '—'
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay <= 3) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDownloadUrl(file: UploadFile) {
  const name = file.original_name?.trim()
  return name ? `${file.file_url}?download=${encodeURIComponent(name)}` : file.file_url
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function downloadFile(file: UploadFile) {
  await docs.trackDownload(file.id)
  triggerDownload(getDownloadUrl(file), file.original_name?.trim() || 'file')
}

function isInlinePreviewable(name: string | null | undefined): boolean {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

function previewFile(file: UploadFile) {
  // Non-previewable files (docx, xlsx, etc.) get downloaded by the browser anyway —
  // use the named URL so the saved file gets the original name, not the random storage path.
  const url = isInlinePreviewable(file.original_name) ? file.file_url : getDownloadUrl(file)
  window.open(url, '_blank')
}

async function downloadAll() {
  for (const file of files.value) {
    await docs.trackDownload(file.id)
    triggerDownload(getDownloadUrl(file), file.original_name?.trim() || 'file')
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

onMounted(async () => {
  if (!canLoad.value) return
  await docs.fetchOne(uploadId.value)
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-8">
    <!-- Breadcrumb / Back -->
    <div class="flex items-center gap-2 text-sm text-gray-400 mb-6">
      <button
        class="flex items-center gap-1 hover:text-gray-700 transition-colors"
        @click="router.back()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ pageTitle }}</h1>
        <p class="mt-1 text-sm text-gray-400">
          {{ files.length }} file{{ files.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-[#1F69F5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B58D1] disabled:opacity-40 transition-colors"
        :disabled="!files.length"
        @click="downloadAll"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"
          />
        </svg>
        Download All
      </button>
    </div>

    <!-- Loading -->
    <div v-if="docs.loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- Error states -->
    <div v-else-if="!canLoad" class="text-sm text-gray-500 py-8">Missing upload ID.</div>
    <div v-else-if="!files.length" class="text-sm text-gray-500 py-8">No files found.</div>

    <!-- File table -->
    <div v-else class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <!-- Table header -->
      <div
        class="grid grid-cols-[1fr_140px_100px_48px] items-center border-b border-gray-100 px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide"
      >
        <span>Name</span>
        <span>Post date</span>
        <span>File size</span>
        <span></span>
      </div>

      <!-- File rows — click row to preview, download icon on right -->
      <div
        v-for="(file, idx) in files"
        :key="file.id"
        class="grid grid-cols-[1fr_140px_100px_48px] items-center px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
        :class="idx !== files.length - 1 ? 'border-b border-gray-100' : ''"
        @click="previewFile(file)"
      >
        <!-- Name + icon -->
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
            :class="getFileIcon(file.original_name).bg"
          >
            {{ getFileIcon(file.original_name).label }}
          </div>
          <span class="truncate text-sm font-medium text-gray-800">
            {{ file.original_name?.trim() || upload?.title || 'Untitled' }}
          </span>
        </div>

        <!-- Date -->
        <span class="text-sm text-gray-500">{{ formatDate(upload?.uploaded_at) }}</span>

        <!-- Size -->
        <span class="text-sm text-gray-500">{{ formatSize(file.file_size_kb ?? 0) }}</span>

        <!-- Download icon -->
        <div class="flex justify-center" @click.stop>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#1F69F5] transition-colors"
            @click="downloadFile(file)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
