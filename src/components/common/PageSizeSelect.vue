<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// "Show per Page: [ N ▾]" — a compact page-size chooser. Controlled: the parent
// owns the size via v-model and refetches (and resets to page 1) on change.
// Reusable anywhere a list needs a page-size control — options and label are
// props, values are numbers.
const props = withDefaults(
  defineProps<{
    modelValue: number
    options?: number[]
    /** Override the label. Defaults to the translated "Show per Page:". */
    label?: string
    disabled?: boolean
    /** Which way the menu opens. Use 'up' when the control sits near the bottom
     *  of the page (e.g. a list footer) so the menu doesn't run off-screen. */
    direction?: 'up' | 'down'
  }>(),
  {
    options: () => [5, 10, 20, 50],
    disabled: false,
    direction: 'down',
  },
)

const { t } = useI18n({ useScope: 'global' })

// The label prop wins when given; otherwise fall back to the translated string.
const displayLabel = computed(() => props.label ?? t('common.filterButton.perPage'))

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function toggleMenu() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function handleSelect(value: number) {
  isOpen.value = false
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('change', value)
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) isOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

// Stable per-instance id so multiple selectors on a page keep distinct labels.
const buttonId = `page-size-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <div class="flex items-center gap-2 text-sm text-black">
    <label :for="buttonId" class="whitespace-nowrap">{{ displayLabel }}</label>

    <div ref="rootRef" class="relative">
      <button
        :id="buttonId"
        type="button"
        :disabled="disabled"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        class="flex items-center justify-between gap-2 rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-sm text-black outline-none transition focus:border-[#008CB9] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:opacity-70"
        :class="isOpen ? 'border-[#008CB9]' : ''"
        @click="toggleMenu"
      >
        <span class="min-w-4 text-center tabular-nums">{{ modelValue }}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          class="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200"
          :class="isOpen === (direction === 'up') ? '' : 'rotate-180'"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <ul
        v-if="isOpen"
        role="listbox"
        class="absolute right-0 z-20 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        :class="direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'"
      >
        <li
          v-for="option in options"
          :key="option"
          role="option"
          :aria-selected="option === modelValue"
          class="cursor-pointer px-4 py-1.5 text-center text-sm tabular-nums transition hover:bg-[#EAF6FB] hover:text-[#008CB9]"
          :class="option === modelValue ? 'bg-[#EAF6FB] font-semibold text-[#008CB9]' : 'text-gray-700'"
          @click="handleSelect(option)"
        >
          {{ option }}
        </li>
      </ul>
    </div>
  </div>
</template>
