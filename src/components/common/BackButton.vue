<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

// Reusable "go back" button. Defaults to a text button ("← Back"); pass
// `icon-only` for a bare chevron (e.g. next to a page title). Navigates with
// router.back() unless the parent overrides @click.
const props = withDefaults(
  defineProps<{
    label?: string
    iconOnly?: boolean
  }>(),
  { iconOnly: false },
)

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()

const text = computed(() => props.label ?? t('common.common.back'))
</script>

<template>
  <button
    type="button"
    :class="
      iconOnly
        ? 'p-1 -ml-1 text-gray-500 hover:text-gray-800 transition-colors'
        : 'flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer'
    "
    :aria-label="iconOnly ? text : undefined"
    @click="router.back()"
  >
    <svg
      :class="iconOnly ? 'w-6 h-6' : 'w-4 h-4'"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    <template v-if="!iconOnly">{{ text }}</template>
  </button>
</template>
