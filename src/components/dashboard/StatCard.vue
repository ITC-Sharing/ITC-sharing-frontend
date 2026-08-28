<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  /** Small line under the number, e.g. "Total uploads". */
  sublabel?: string
  /** Tailwind text colour for the icon, e.g. "text-sky-400". */
  iconColor?: string
  /** Tailwind background for the icon tile, e.g. "bg-sky-500/10". */
  iconBg?: string
}>()
</script>

<template>
  <!-- Label above the number, icon parked top-right: the eye lands on the
       figure first, and the four cards read as a row of numbers rather than a
       row of icons. -->
  <div
    class="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-card)] p-5
           transition-colors hover:border-[var(--dash-border-hover)]"
  >
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm text-[var(--dash-muted)]">{{ label }}</p>
      <div
        :class="[
          'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center',
          iconBg ?? 'bg-[var(--dash-accent)]/10',
        ]"
      >
        <svg
          :class="['h-5 w-5', iconColor ?? 'text-[var(--dash-accent)]']"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <slot name="icon" />
        </svg>
      </div>
    </div>

    <p class="mt-3 text-3xl font-bold leading-none text-[var(--dash-text)]">{{ value }}</p>
    <p v-if="sublabel" class="mt-2 text-xs text-[var(--dash-muted)]">{{ sublabel }}</p>
  </div>
</template>
