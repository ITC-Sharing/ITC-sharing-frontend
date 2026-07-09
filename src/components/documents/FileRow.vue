<script setup lang="ts">
import { getFileIcon, formatFileSize, formatRelativeDate } from '@/utils/format'

type UploadFile = {
  id: string
  file_url: string
  file_size_kb: number
  original_name?: string | null
}

const props = defineProps<{
  file: UploadFile
  uploadedAt?: string | null
  fallbackName?: string | null
  isLast?: boolean
}>()

const emit = defineEmits<{
  preview: [file: UploadFile]
  download: [file: UploadFile]
}>()

const icon = getFileIcon(props.file.original_name)
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer sm:grid sm:grid-cols-[1fr_140px_100px_48px]"
    :class="!isLast ? 'border-b border-gray-100' : ''"
    @click="emit('preview', file)"
  >
    <!-- Icon + name (first grid cell on desktop, flex item on mobile) -->
    <div class="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
      <div
        class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
        :class="icon.bg"
      >
        {{ icon.label }}
      </div>
      <div class="min-w-0">
        <span class="block truncate text-md font-medium text-gray-800">
          {{ file.original_name?.trim() || fallbackName || 'Untitled' }}
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

    <!-- Download -->
    <div class="shrink-0 sm:flex sm:justify-center" @click.stop>
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
    </div>
  </div>
</template>
