<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UploadFile } from '@/types'

// Fullscreen in-app previewer for a single file. Handles three kinds inline:
//  - images        → <img>
//  - pdf           → <iframe> of the raw URL (browsers render PDF natively)
//  - office docs    → <iframe> of the server-generated PDF rendition
//                    (file.preview_url), created on upload by LibreOffice. This
//                    renders client-side, so it works everywhere — localhost
//                    included. If a rendition is missing (older row, or
//                    conversion was unavailable) we fall back to the Microsoft
//                    Office Online viewer, which needs a public, internet-
//                    reachable URL (prod only, not localhost MinIO).
// Anything else isn't previewable; the parent downloads it instead.
const props = defineProps<{
  modelValue: boolean
  file: UploadFile | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  download: [file: UploadFile]
}>()

const { t } = useI18n({ useScope: 'global' })

function ext(name: string | null | undefined): string {
  return (name ?? '').split('.').pop()?.toLowerCase() ?? ''
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const OFFICE_EXTS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']

const kind = computed<'image' | 'pdf' | 'office' | 'none'>(() => {
  const e = ext(props.file?.original_name)
  if (IMAGE_EXTS.includes(e)) return 'image'
  if (e === 'pdf') return 'pdf'
  if (OFFICE_EXTS.includes(e)) return 'office'
  return 'none'
})

// Prefer the server-generated PDF rendition (renders anywhere); only fall back
// to the Office Online viewer when there's no rendition.
const officeSrc = computed(() => {
  if (!props.file) return ''
  if (props.file.preview_url) return props.file.preview_url
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(props.file.file_url)}`
})

const title = computed(() => props.file?.original_name?.trim() || 'Preview')

function close() {
  emit('update:modelValue', false)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) window.addEventListener('keydown', handleKeydown)
    else window.removeEventListener('keydown', handleKeydown)
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue && file"
      class="fixed inset-0 z-60 flex flex-col bg-black/90"
      @click.self="close"
    >
      <!-- Top bar -->
      <div class="flex items-center gap-3 px-4 py-3 text-white">
        <span class="truncate text-sm font-medium">{{ title }}</span>
        <div class="ml-auto flex items-center gap-2">
          <button
            class="flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-sm hover:bg-white/20 transition-colors cursor-pointer"
            @click="emit('download', file)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            {{ t('document.documentDetailsPage.download') }}
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close"
            @click="close"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4">
        <img
          v-if="kind === 'image'"
          :src="file.file_url"
          :alt="title"
          class="max-h-full max-w-full object-contain"
          @click.stop
        />
        <iframe
          v-else-if="kind === 'pdf'"
          :src="file.file_url"
          :title="title"
          class="h-full w-full rounded-lg bg-white"
          @click.stop
        />
        <iframe
          v-else-if="kind === 'office'"
          :src="officeSrc"
          :title="title"
          class="h-full w-full rounded-lg bg-white"
          @click.stop
        />
      </div>
    </div>
  </Teleport>
</template>
