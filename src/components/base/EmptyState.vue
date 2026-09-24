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
      <svg class="h-14 w-14 text-gray-200" fill="currentColor" viewBox="0 0 640 640">
        <path
          d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM248 320C234.7 320 224 330.7 224 344C224 357.3 234.7 368 248 368L392 368C405.3 368 416 357.3 416 344C416 330.7 405.3 320 392 320L248 320zM248 416C234.7 416 224 426.7 224 440C224 453.3 234.7 464 248 464L392 464C405.3 464 416 453.3 416 440C416 426.7 405.3 416 392 416L248 416z"
        />
      </svg>
    </slot>

    <p class="text-gray-400 font-medium text-sm">{{ message }}</p>

    <button
      v-if="actionLabel"
      type="button"
      @click="$emit('action')"
      class="text-primary text-sm underline cursor-pointer"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
