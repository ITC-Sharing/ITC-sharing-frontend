<script setup lang="ts">
import { computed, useSlots } from 'vue'

// Reusable primary button: pass the label via `text` and the SVG via the
// `icon` slot (handles any icon — stroke or fill, any viewBox). Native events
// like @click fall through to the root <button>.
defineProps<{ text: string }>()

const slots = useSlots()

/**
 * On a phone the label collapses and the icon stands in for it — but only when
 * there IS an icon. `Request this Book` in BookDetailView passes no icon slot,
 * and hiding its label unconditionally would render an empty button.
 *
 * sr-only rather than hidden: the text stays in the accessibility tree, so the
 * button keeps its name for a screen reader at every width and no aria-label
 * has to be kept in sync with `text`. It is positioned absolutely, so it also
 * stops counting as a flex item and leaves no dangling gap beside the icon.
 *
 * Scoped with max-sm: rather than paired with sm:not-sr-only. not-sr-only sets
 * `white-space: normal`, which beat the button's own whitespace-nowrap and let
 * a two-word label wrap onto a second line — making the button taller than the
 * filter beside it. max-sm: leaves the label completely unstyled above 640px.
 */
const labelClass = computed(() => (slots.icon ? 'max-sm:sr-only' : ''))
</script>

<template>
  <button
    type="button"
    class="cursor-pointer flex items-center gap-2 rounded-xl border border-transparent bg-primary px-4 py-2.5 text-sm text-white transition-colors hover:bg-primary-hover whitespace-nowrap"
  >
    <slot name="icon" />
    <span :class="labelClass">{{ text }}</span>
  </button>
</template>
