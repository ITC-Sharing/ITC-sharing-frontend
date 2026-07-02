<script setup lang="ts">
// Primary "+ <label>" action button (Upload, List a Book, …).
// Parent passes the already-translated label and listens for @click.
defineProps<{ label: string }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <button
    type="button"
    @click="$emit('click')"
    class="flex items-center gap-2 shrink-0 cursor-pointer rounded-xl bg-[#008CB9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#00749b] active:scale-95"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
    {{ label }}
  </button>
</template>
