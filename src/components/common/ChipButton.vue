<script setup lang="ts">
// A small pill/chip toggle button. `active` renders the selected (teal) look;
// otherwise it's a muted outline that highlights on hover. The label is the
// default slot; click is handled by the parent (native event falls through to
// the root <button>).
defineProps<{ active?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition hover:cursor-pointer"
    :class="
      active
        ? 'border-primary bg-[#EAF6FB] text-primary'
        : 'border-gray-200 text-gray-500 hover:border-primary hover:text-primary'
    "
  >
    <slot />
  </button>
</template>
