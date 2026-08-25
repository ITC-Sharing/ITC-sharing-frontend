<script setup lang="ts">
/**
 * Solid folder glyph — marks a grouped upload (one submission, many files).
 * Colour comes from `currentColor`, so callers set it with a text-* class
 * (`text-primary` at every call site today). Size follows the h- and w- classes
 * unless an explicit `size` is passed.
 */
defineProps<{ size?: number }>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    :width="size"
    :height="size"
    fill="currentColor"
    aria-hidden="true"
    class="shrink-0"
  >
    <path
      d="M128 512L512 512C547.3 512 576 483.3 576 448L576 208C576 172.7 547.3 144 512 144L362.7 144C355.8 144 349 141.8 343.5 137.6L305.1 108.8C294 100.5 280.5 96 266.7 96L128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512z"
    />
  </svg>
</template>
