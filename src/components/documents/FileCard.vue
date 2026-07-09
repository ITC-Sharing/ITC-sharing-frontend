<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFileIcon, formatFileSize, isImageFile, fileExtension } from '@/utils/format'

type UploadFile = {
  id: string
  file_url: string
  file_size_kb: number
  original_name?: string | null
}

const props = defineProps<{
  file: UploadFile
  fallbackName?: string | null
}>()

const emit = defineEmits<{
  preview: [file: UploadFile]
  download: [file: UploadFile]
}>()

const { t } = useI18n({ useScope: 'global' })

const icon = computed(() => getFileIcon(props.file.original_name))
const isImage = computed(() => isImageFile(props.file.original_name))
const typeLabel = computed(() => fileExtension(props.file.original_name).toUpperCase() || icon.value.label)
const displayName = computed(() => props.file.original_name?.trim() || props.fallbackName || 'Untitled')

const menuOpen = ref(false)

function onPreview() {
  menuOpen.value = false
  emit('preview', props.file)
}
function onDownload() {
  menuOpen.value = false
  emit('download', props.file)
}
</script>

<template>
  <div
    class="flex flex-col mx-auto w-full max-w-78 sm:max-w-none rounded-2xl border border-gray-200 bg-white p-3 hover:border-[#008CB9] hover:shadow-sm transition-all"
  >
    <!-- Thumbnail: real image preview, else file-type placeholder -->
    <div
      class="aspect-4/3 w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 cursor-pointer"
      @click="emit('preview', file)"
    >
      <img
        v-if="isImage"
        :src="file.file_url"
        :alt="displayName"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2">
        <span
          class="rounded-md px-5 py-5 text-[15px] font-bold text-white"
          :class="icon.bg"
        >{{ icon.label }}</span>
      </div>
    </div>

    <!-- Title + overflow menu -->
    <div class="mt-3 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-gray-900" :title="displayName">
          {{ displayName }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ formatFileSize(file.file_size_kb ?? 0) }} · {{ typeLabel }}
        </p>
      </div>

      <div class="relative shrink-0">
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          :aria-label="displayName"
          @click.stop="menuOpen = !menuOpen"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

        <template v-if="menuOpen">
          <!-- click-away backdrop -->
          <div class="fixed inset-0 z-10" @click.stop="menuOpen = false" />
          <div
            class="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
          >
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              @click.stop="onPreview"
            >{{ t('common.documentDetailsPage.preview') }}</button>
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              @click.stop="onDownload"
            >{{ t('common.documentDetailsPage.download') }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
