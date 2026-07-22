<script setup lang="ts">
// Reusable primary button: pass the label via `text` and the SVG via the
// `icon` slot (handles any icon — stroke or fill, any viewBox). Native events
// like @click fall through to the root <button>.
defineProps<{ text: string }>()
</script>

<template>
  <button
    type="button"
    class="cursor-pointer flex items-center gap-2 rounded-xl bg-[#008CB9] px-4 py-3 text-sm text-white transition-colors hover:bg-[#00749b] whitespace-nowrap"
  >
    <slot name="icon" />
    {{ text }}
  </button>
</template>
