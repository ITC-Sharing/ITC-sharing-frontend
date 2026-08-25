<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatFileSize, formatRelativeDate } from '@/utils/format'
import FilePreviewThumb from '@/components/common/FilePreviewThumb.vue'
import type { UploadFile } from '@/types'

const props = defineProps<{
  file: UploadFile
  uploadedAt?: string | null
  fallbackName?: string | null
  isLast?: boolean
  /** Only the upload's owner gets the delete button. */
  canDelete?: boolean
}>()

const emit = defineEmits<{
  preview: [file: UploadFile]
  download: [file: UploadFile]
  delete: [file: UploadFile]
}>()

const { t } = useI18n({ useScope: 'global' })

// Only the uploader and admins are ever served a non-active file.
const isPending = computed(() => props.file.status === 'pending')
const isRejected = computed(() => props.file.status === 'rejected')

</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer sm:grid"
    :class="[
      !isLast ? 'border-b border-gray-100' : '',
      canDelete ? 'sm:grid-cols-[1fr_140px_100px_88px]' : 'sm:grid-cols-[1fr_140px_100px_48px]',
    ]"
    @click="emit('preview', file)"
  >
    <!-- Icon + name (first grid cell on desktop, flex item on mobile) -->
    <div class="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
      <FilePreviewThumb
        :name="file.original_name"
        :url="file.file_url"
        :preview-url="file.preview_url"
        :size="40"
      />
      <div class="min-w-0">
        <span class="flex items-center gap-2 min-w-0">
          <span class="truncate text-md font-medium text-gray-800">
            {{ file.original_name?.trim() || fallbackName || 'Untitled' }}
          </span>
          <span
            v-if="isPending"
            class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          >{{ t('document.documentDetailsPage.badgePending') }}</span>
          <span
            v-else-if="isRejected"
            class="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
          >{{ t('document.documentDetailsPage.badgeRejected') }}</span>
        </span>
        <!-- Mobile-only meta -->
        <span class="block sm:hidden text-xs text-gray-400 mt-0.5">
          {{ formatRelativeDate(uploadedAt) }} · {{ formatFileSize(file.file_size_kb ?? 0) }}
        </span>
      </div>
    </div>

    <!-- Date — desktop only -->
    <span class="hidden sm:block text-sm text-gray-500 text-center">{{ formatRelativeDate(uploadedAt) }}</span>

    <!-- Size — desktop only -->
    <span class="hidden sm:block text-sm text-gray-500 text-center">{{ formatFileSize(file.file_size_kb ?? 0) }}</span>

    <!-- Download + (owner only) delete -->
    <div class="shrink-0 flex items-center gap-1 sm:justify-center" @click.stop>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#1F69F5] transition-colors"
        @click="emit('download', file)"
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
      <button
        v-if="canDelete"
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
        @click="emit('delete', file)"
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
            d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
