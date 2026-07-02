<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: 'owner' | 'contact' | 'status'
    label: string
    color?: 'green' | 'yellow'
  }>(),
  { color: 'green' },
)
</script>

<template>
  <div class="flex items-center gap-2 flex-1 min-w-0">
    <svg
      :class="['h-6 w-6 shrink-0', color === 'yellow' ? 'text-gray-600' : 'text-gray-600']"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.8"
    >
      <template v-if="icon === 'owner'">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </template>
      <path
        v-else-if="icon === 'contact'"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
      <path
        v-else
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <p class="text-sm text-gray-500">{{ label }}:</p>
    <slot />
  </div>
</template>
