<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import FileRow from '@/components/FileRow.vue'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
const docs = useDocumentsStore()

const uploadId = computed(() => String(route.query.upload_id ?? ''))
const canLoad = computed(() => !!uploadId.value)

const upload = computed(() => docs.currentUpload)
const pageTitle = computed(() => upload.value?.title || 'Document Details')

type SortKey = 'name' | 'size'
const sortKey = ref<SortKey>('name')
const sortDir = ref<'asc' | 'desc'>('asc')
const sortOpen = ref(false)
const sortRef = ref<HTMLElement | null>(null)

const sortOptions = computed(() => [
  { key: 'name' as SortKey, dir: 'asc' as const, label: t('common.documentDetailsPage.sortAtoZ') },
  { key: 'name' as SortKey, dir: 'desc' as const, label: t('common.documentDetailsPage.sortZtoA') },
  { key: 'size' as SortKey, dir: 'asc' as const, label: t('common.documentDetailsPage.sortBySize') },
])

function applySort(key: SortKey, dir: 'asc' | 'desc') {
  sortKey.value = key
  sortDir.value = dir
  sortOpen.value = false
}

function isActiveSort(key: SortKey, dir: 'asc' | 'desc') {
  return sortKey.value === key && sortDir.value === dir
}

function handleSortOutside(e: MouseEvent) {
  if (sortRef.value && !sortRef.value.contains(e.target as Node)) sortOpen.value = false
}

const files = computed(() => {
  const raw = [...(upload.value?.documents ?? [])]
  raw.sort((a, b) => {
    let cmp = 0
    if (sortKey.value === 'name') {
      const an = (a.original_name ?? '').toLowerCase()
      const bn = (b.original_name ?? '').toLowerCase()
      cmp = an.localeCompare(bn)
    } else {
      cmp = (a.file_size_kb ?? 0) - (b.file_size_kb ?? 0)
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return raw
})

type UploadFile = {
  id: string
  file_url: string
  file_size_kb: number
  original_name?: string | null
  download_count?: number
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
  document.addEventListener('click', handleSortOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleSortOutside)
})
</script>

<template>
  <div class="w-full px-6 py-8">
    <!-- Breadcrumb / Back — aligned with navbar logo -->
    <div class="mx-auto w-full max-w-7xl mb-6 ml-8">
      <button
        class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        @click="router.back()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {{ t('common.documentDetailsPage.back') }}
      </button>
    </div>

    <!-- Rest of content -->
    <div class="mx-auto w-full max-w-6xl">

    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 capitalize">{{ pageTitle }}</h1>
        <p class="mt-1 text-sm text-gray-400">
          {{ t('common.documentDetailsPage.filesCount', files.length) }} &nbsp;•&nbsp; {{ upload.users.first_name }} {{ upload.users.last_name }}
        </p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-[#008CB9] px-4 py-2.5 text-md text-white hover:bg-[#006F9C] disabled:opacity-40 transition-colors cursor-pointer"
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
        {{ t('common.documentDetailsPage.downloadAll') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="docs.loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- Error states -->
    <div v-else-if="!canLoad" class="text-sm text-gray-500 py-8">{{ t('common.documentDetailsPage.missingId') }}</div>
    <div v-else-if="!files.length" class="text-sm text-gray-500 py-8">{{ t('common.documentDetailsPage.noFiles') }}</div>

    <!-- File table -->
    <div v-else class="rounded-2xl border border-gray-200 bg-white">
      <!-- Table header -->
      <div
        class="hidden md:grid gap-3 grid-cols-[1fr_140px_100px_48px] items-center border-b border-gray-100 px-4 py-3 text-md font-medium text-black tracking-wide"
      >
        <span>{{ t('common.documentDetailsPage.colName') }}</span>
        <span class="text-center">{{ t('common.documentDetailsPage.colPostDate') }}</span>
        <span class="text-center">{{ t('common.documentDetailsPage.colFileSize') }}</span>

        <!-- Sort button — aligned with download icon -->
        <div ref="sortRef" class="relative flex justify-center">
          <button
            @click.stop="sortOpen = !sortOpen"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-md font-medium text-black transition-colors select-none cursor-pointer"
          >
            {{ t('common.documentDetailsPage.sort') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-4 h-4">
              <path
                fill="rgb(0, 0, 0)"
                d="M297.4 438.6C309.9 451.1 330.2 451.1 342.7 438.6L502.7 278.6C515.2 266.1 515.2 245.8 502.7 233.3C490.2 220.8 469.9 220.8 457.4 233.3L320 370.7L182.6 233.4C170.1 220.9 149.8 220.9 137.3 233.4C124.8 245.9 124.8 266.2 137.3 278.7L297.3 438.7z"
              />
            </svg>
          </button>

          <!-- Dropdown -->
          <div
            v-if="sortOpen"
            class="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-1"
          >
            <p class="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {{ t('common.documentDetailsPage.sort') }}
            </p>
            <button
              v-for="opt in sortOptions"
              :key="`${opt.key}-${opt.dir}`"
              @click="applySort(opt.key, opt.dir)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              :class="isActiveSort(opt.key, opt.dir) ? 'bg-gray-100 font-medium' : ''"
            >
              <svg
                v-if="isActiveSort(opt.key, opt.dir)"
                class="w-4 h-4 text-gray-700 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else class="w-4 shrink-0" />
              {{ opt.label }}
            </button>
          </div>
        </div>
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
    </div> <!-- max-w-6xl -->
  </div>
</template>
