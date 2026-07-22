<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import FileRow from '@/components/documents/FileRow.vue'
import FileCard from '@/components/documents/FileCard.vue'
import BackButton from '@/components/common/BackButton.vue'
import ViewToggle from '@/components/common/ViewToggle.vue'
import type { UploadFile } from '@/types'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const docs = useDocumentsStore()

const viewMode = ref<'card' | 'list'>(
  (localStorage.getItem('fileViewMode') as 'card' | 'list') ?? 'list',
)
watch(viewMode, (v) => localStorage.setItem('fileViewMode', v))

const uploadId = computed(() => String(route.query.upload_id ?? ''))
const canLoad = computed(() => !!uploadId.value)

const upload = computed(() => docs.currentUpload)
const pageTitle = computed(() => upload.value?.title || 'Document Details')

const files = computed(() => upload.value?.documents ?? [])

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

function downloadFile(file: UploadFile) {
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

onMounted(async () => {
  if (!canLoad.value) return
  await docs.fetchOne(uploadId.value)
})

// Same-route navigation (e.g. clicking another doc notification) only changes
// the query param — refetch so the page reflects the new upload_id.
watch(uploadId, async (id) => {
  if (id) await docs.fetchOne(id)
})
</script>

<template>
  <div class="w-full px-6">
    <!-- Breadcrumb / Back — aligned with navbar logo -->
    <div class="mx-auto w-full max-w-7xl md:px-6 mb-6 cursor-pointer">
      <BackButton />
    </div>

    <!-- Rest of content -->
    <div class="mx-auto w-full max-w-6xl">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 capitalize">{{ pageTitle }}</h1>
          <p class="mt-1 text-sm text-gray-400">
            {{ t('document.documentDetailsPage.filesCount', files.length) }} &nbsp;•&nbsp;
            {{ upload?.users?.first_name }} {{ upload?.users?.last_name }}
          </p>
        </div>
        <ViewToggle v-if="files.length" v-model="viewMode" />
      </div>

      <!-- Loading -->
      <div v-if="docs.loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- Error states -->
      <div v-else-if="!canLoad" class="text-sm text-gray-500 py-8">
        {{ t('common.documentDetailsPage.missingId') }}
      </div>
      <div v-else-if="!files.length" class="text-sm text-gray-500 py-8">
        {{ t('common.documentDetailsPage.noFiles') }}
      </div>

      <!-- Files: list view is desktop-only; mobile always shows cards -->
      <template v-else>
        <!-- File table (list view — desktop only) -->
        <div
          v-if="viewMode === 'list'"
          class="hidden md:block rounded-2xl border border-gray-200 bg-white"
        >
          <!-- Table header -->
          <div
            class="hidden md:grid gap-3 grid-cols-[1fr_140px_100px_48px] items-center border-b border-gray-100 px-4 py-3 text-md font-medium text-black tracking-wide"
          >
            <span>{{ t('document.documentDetailsPage.colName') }}</span>
            <span class="text-center">{{ t('document.documentDetailsPage.colPostDate') }}</span>
            <span class="text-center">{{ t('document.documentDetailsPage.colFileSize') }}</span>
            <span></span>
          </div>

          <!-- File rows -->
          <FileRow
            v-for="(file, idx) in files"
            :key="file.id"
            :file="file"
            :uploaded-at="upload?.uploaded_at"
            :fallback-name="upload?.title"
            :is-last="idx === files.length - 1"
            @preview="previewFile"
            @download="downloadFile"
          />
        </div>

        <!-- File grid (card view — always on mobile, desktop only in card mode) -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          :class="{ 'md:hidden': viewMode === 'list' }"
        >
          <FileCard
            v-for="file in files"
            :key="file.id"
            :file="file"
            :fallback-name="upload?.title"
            @preview="previewFile"
            @download="downloadFile"
          />
        </div>
      </template>
    </div>
    <!-- max-w-6xl -->
  </div>
</template>
