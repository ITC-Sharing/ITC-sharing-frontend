<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { useToast } from '@/composables/useToast'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import FileRow from '@/components/documents/FileRow.vue'
import FileCard from '@/components/documents/FileCard.vue'
import BackButton from '@/components/common/BackButton.vue'
import ViewToggle from '@/components/common/ViewToggle.vue'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue'
import IconTextButton from '@/components/common/IconTextButton.vue'
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal.vue'
import type { UploadFile } from '@/types'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const docs = useDocumentsStore()
const { showToast } = useToast()

const viewMode = ref<'card' | 'list'>(
  (localStorage.getItem('fileViewMode') as 'card' | 'list') ?? 'list',
)
watch(viewMode, (v) => localStorage.setItem('fileViewMode', v))

const uploadId = computed(() => String(route.query.upload_id ?? ''))
const canLoad = computed(() => !!uploadId.value)

const upload = computed(() => docs.currentUpload)
const pageTitle = computed(() => upload.value?.title || 'Document Details')

const files = computed(() => upload.value?.documents ?? [])

// Served only to the uploader and admins — everyone else never sees these rows.
const pendingFiles = computed(() => files.value.filter((f) => f.status === 'pending'))
const rejectedFiles = computed(() => files.value.filter((f) => f.status === 'rejected'))

const isOwner = computed(() => !!auth.user?.id && auth.user.id === upload.value?.users?.id)

// ── Add files (owner only) ──────────────────────────────────────────────────

// Mirrors the server's FilesInterceptor limits in documents.controller.ts —
// checked here only so an oversized pick fails instantly with a readable
// message instead of round-tripping into a multer error.
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar'
const MAX_FILES_PER_REQUEST = 10
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

const fileInput = ref<HTMLInputElement | null>(null)
const adding = ref(false)
const addProgress = ref(0)

function pickFiles() {
  fileInput.value?.click()
}

async function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  // Reset immediately: picking the same file twice in a row fires no change
  // event unless the value is cleared.
  input.value = ''
  if (!picked.length || adding.value) return

  if (picked.length > MAX_FILES_PER_REQUEST) {
    showToast(
      t('document.documentDetailsPage.tooManyFiles', { max: MAX_FILES_PER_REQUEST }),
      { type: 'error' },
    )
    return
  }

  const oversized = picked.find((f) => f.size > MAX_FILE_SIZE_BYTES)
  if (oversized) {
    showToast(t('document.documentDetailsPage.fileTooLarge', { name: oversized.name }), {
      type: 'error',
    })
    return
  }

  adding.value = true
  addProgress.value = 0
  try {
    const result = await docs.addFiles(uploadId.value, picked, (percent) => {
      addProgress.value = percent
    })
    // The response carries only the new rows; refetch so the list, the file
    // count and the upload's own status all come from one source.
    await docs.fetchOne(uploadId.value)
    // On an approved document the new files are hidden until a moderator clears
    // them — say so, or the owner wonders why nobody else can see them.
    showToast(
      result.needs_review
        ? t('document.documentDetailsPage.filesAddedPending', picked.length)
        : t('document.documentDetailsPage.filesAdded', picked.length),
      { type: 'success' },
    )
  } catch (e: unknown) {
    const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(message ?? t('document.documentDetailsPage.addFailed'), { type: 'error' })
  } finally {
    adding.value = false
    addProgress.value = 0
  }
}

// ── Delete a file (owner only) ──────────────────────────────────────────────

const deleteTarget = ref<UploadFile | null>(null)
const deleting = ref(false)

/** The dialog names the file, so the owner can see which one is going. */
const deleteTargetName = computed(
  () => deleteTarget.value?.original_name?.trim() || upload.value?.title || '',
)

function askDelete(file: UploadFile) {
  deleteTarget.value = file
}

function cancelDelete() {
  if (!deleting.value) deleteTarget.value = null
}

async function confirmDelete() {
  const file = deleteTarget.value
  if (!file || deleting.value) return

  deleting.value = true
  try {
    const result = await docs.removeFile(file.id)
    deleteTarget.value = null

    // The last file takes the upload with it — this page now points at nothing.
    // Deep links (a notification opened in a new tab) have no history to go
    // back to, so fall through to the documents list rather than stranding the
    // user on a dead detail page.
    if (result.upload_deleted) {
      showToast(t('document.documentDetailsPage.uploadDeleted'), { type: 'success' })
      if (window.history.length > 1) router.back()
      else router.replace({ name: 'documents' })
      return
    }

    showToast(t('document.documentDetailsPage.fileDeleted'), { type: 'success' })
  } catch (e: unknown) {
    const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(message ?? t('document.documentDetailsPage.deleteFailed'), { type: 'error' })
  } finally {
    deleting.value = false
  }
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

function downloadFile(file: UploadFile) {
  triggerDownload(getDownloadUrl(file), file.original_name?.trim() || 'file')
}

// Files we can render in-app: images + pdf natively, office docs via the
// Office Online viewer (see DocumentPreviewModal). Everything else downloads.
function isInlinePreviewable(name: string | null | undefined): boolean {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  return [
    'pdf',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'ppt',
    'pptx',
    'doc',
    'docx',
    'xls',
    'xlsx',
  ].includes(ext)
}

const previewOpen = ref(false)
const previewTarget = ref<UploadFile | null>(null)

function previewFile(file: UploadFile) {
  if (isInlinePreviewable(file.original_name)) {
    previewTarget.value = file
    previewOpen.value = true
  } else {
    // Unsupported type — just download it with its original name.
    downloadFile(file)
  }
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
        <div class="flex items-center gap-3">
          <IconTextButton
            v-if="isOwner"
            :text="adding ? t('document.documentDetailsPage.adding', { percent: addProgress }) : t('document.documentDetailsPage.addFiles')"
            :disabled="adding"
            :class="adding ? 'opacity-70 cursor-not-allowed' : ''"
            @click="pickFiles"
          >
            <template #icon>
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </template>
          </IconTextButton>
          <ViewToggle v-if="files.length" v-model="viewMode" />
        </div>
      </div>

      <!-- Owner-only, and kept out of the tab order — pickFiles() drives it. -->
      <input
        v-if="isOwner"
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        :accept="ACCEPT"
        @change="onFilesPicked"
      />

      <!-- Only the uploader and admins are served a non-active file, so these
           only ever show to someone who can act on them. The document itself
           stayed in the feed the whole time — just these files are hidden. -->
      <div
        v-if="pendingFiles.length"
        class="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
        <p class="text-sm text-amber-800">
          {{ t('document.documentDetailsPage.filesPendingReview', pendingFiles.length) }}
        </p>
      </div>

      <div
        v-if="rejectedFiles.length"
        class="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
        <div class="text-sm text-red-800">
          <p>{{ t('document.documentDetailsPage.filesRejected', rejectedFiles.length) }}</p>
          <p
            v-for="file in rejectedFiles.filter((f) => f.rejection_reason)"
            :key="file.id"
            class="mt-1 break-words"
          >
            <span class="font-medium">{{ file.original_name }}</span> — {{ file.rejection_reason }}
          </p>
        </div>
      </div>

      <!-- Upload progress: the button label shows the percentage, this shows it
           as a bar so a large file doesn't look stalled. -->
      <div v-if="adding" class="mb-6 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full bg-primary transition-[width] duration-200"
          :style="{ width: `${addProgress}%` }"
        />
      </div>

      <!-- Loading -->
      <div v-if="docs.loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- Error states -->
      <div v-else-if="!canLoad" class="text-sm text-gray-500 py-8">
        {{ t('document.documentDetailsPage.missingId') }}
      </div>
      <div v-else-if="!files.length" class="text-sm text-gray-500 py-8">
        {{ t('document.documentDetailsPage.noFiles') }}
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
            class="hidden md:grid gap-3 items-center border-b border-gray-100 px-4 py-3 text-md font-medium text-black tracking-wide"
            :class="isOwner ? 'grid-cols-[1fr_140px_100px_88px]' : 'grid-cols-[1fr_140px_100px_48px]'"
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
            :can-delete="isOwner"
            @preview="previewFile"
            @download="downloadFile"
            @delete="askDelete"
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
            :can-delete="isOwner"
            @preview="previewFile"
            @download="downloadFile"
            @delete="askDelete"
          />
        </div>
      </template>
    </div>
    <!-- max-w-6xl -->

    <DocumentPreviewModal
      v-model="previewOpen"
      :file="previewTarget"
      @download="downloadFile"
    />

    <ConfirmDeleteModal
      v-if="deleteTarget"
      :target="deleteTargetName"
      :loading="deleting"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </div>
</template>
