<script setup lang="ts">
// Centered empty-state: an icon (default document, override via #icon slot),
// a message, and an optional action link. Emits `action` when the link is clicked.
defineProps<{
  message: string
  actionLabel?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center py-24 gap-3 text-center">
    <slot name="icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-14 w-14 text-gray-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </slot>

    <p class="text-gray-400 font-medium">{{ message }}</p>

    <button
      v-if="actionLabel"
      type="button"
      @click="$emit('action')"
      class="text-[#008CB9] text-sm underline cursor-pointer"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
