<script setup lang="ts">
/**
 * A numbered step track: done steps tick, the current one is ringed, the rest
 * are grey.
 *
 * Labels come in already translated, so the same track serves both sides of a
 * handover — the requester's Requested → Accepted → Received and the donor's
 * Listed → Requested → Reserved → Donated — without either one hardcoding the
 * other's vocabulary.
 */
defineProps<{
  /** Translated labels, one per step. */
  steps: string[]
  /** Index of the step currently reached; -1 renders nothing as done. */
  current: number
}>()
</script>

<template>
  <div class="flex items-start">
    <template v-for="(step, i) in steps" :key="step">
      <!-- Connector before every step but the first. Filled only when the step
           it leads into is already reached. -->
      <div
        v-if="i > 0"
        class="mt-2.5 h-0.5 flex-1 rounded-full"
        :class="i <= current ? 'bg-primary' : 'bg-gray-200'"
      />

      <div class="flex w-14 shrink-0 flex-col items-center gap-1">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors"
          :class="
            i < current
              ? 'bg-primary text-white'
              : i === current
                ? 'bg-primary text-white ring-4 ring-primary/20'
                : 'bg-gray-200 text-gray-500'
          "
        >
          <!-- Done steps show a tick; the current and future ones show numbers,
               so 'where am I' reads at a glance. -->
          <svg
            v-if="i < current"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else>{{ i + 1 }}</span>
        </div>
        <span
          class="text-center text-[10px] leading-tight"
          :class="i <= current ? 'font-semibold text-gray-700' : 'text-gray-400'"
        >
          {{ step }}
        </span>
      </div>
    </template>
  </div>
</template>
